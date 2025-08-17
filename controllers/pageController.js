const SensorData = require('../models/SensorData');
const Alert = require('../models/Alert');
const Visitor = require('../models/Visitor');

const thresholds = { temperature: 50, humidity: 70, gas: 300, vibration: 5.0, flame: 100 };
const floors = [1, 2, 3, 4];
const nodesPerFloor = 4;
const sensorTypes = ['temp', 'humidity', 'gas', 'vibration', 'flame', 'motion', 'quake'];

// 📊 Dashboard Page
exports.showDashboard = async (req, res) => {
  try {
    const dataByFloor = {};
    const alerts = {};
    const flameDataByFloor = {};

    for (const floor of floors) {
      const entries = await SensorData.find({ floor: String(floor) })
        .sort({ createdAt: -1 })
        .limit(sensorTypes.length * nodesPerFloor) // Increased limit for multiple nodes
        .lean();

      const sensorData = {};
      let latestTimestamp = null;

      for (const entry of entries) {
        if (!sensorData[entry.type]) {
          sensorData[entry.type] = entry.payload;
          if (!latestTimestamp || entry.createdAt > latestTimestamp) {
            latestTimestamp = entry.createdAt;
          }
        }
      }

      // Special handling for flame sensors (4 nodes per floor)
      const flameEntries = await SensorData.find({ 
        floor: String(floor), 
        type: 'flame' 
      })
        .sort({ createdAt: -1 })
        .limit(nodesPerFloor)
        .lean();

      flameDataByFloor[floor] = flameEntries.map(entry => ({
        node: entry.node || 1,
        value: entry.payload,
        timestamp: entry.createdAt
      }));

      sensorData.createdAt = latestTimestamp;
      dataByFloor[floor] = sensorData;

      alerts[floor] = await Alert.findOne({ floor }).sort({ createdAt: -1 }).lean();
    }

    res.render('dashboard', { 
      dataByFloor, 
      flameDataByFloor,
      thresholds, 
      alerts, 
      nodesPerFloor,
      error: null 
    });
  } catch (err) {
    console.error('❌ Dashboard error:', err);
    res.render('dashboard', { 
      dataByFloor: {}, 
      flameDataByFloor: {},
      thresholds, 
      alerts: {}, 
      nodesPerFloor,
      error: 'Unable to load dashboard at this time. Please try again later.' 
    });
  }
};

// 📺 Live View Page (Gate-based)
exports.showLive = async (req, res) => {
  try {
    const gates = ['gate1', 'gate2'];
    const dataByFloor = {};
    const alerts = {};
    const visitorsByGate = {};

    for (const gate of gates) {
      // Convert gate string to floor number (e.g., "gate1" -> 1)
      const floorNumber = parseInt(gate.replace('gate', ''), 10);
      
      const entries = await SensorData.find({ floor: gate })
        .sort({ createdAt: -1 })
        .limit(sensorTypes.length)
        .lean();

      const sensorData = {};
      let latestTimestamp = null;

      for (const entry of entries) {
        if (!sensorData[entry.type]) {
          sensorData[entry.type] = entry.payload;
          if (!latestTimestamp || entry.createdAt > latestTimestamp) {
            latestTimestamp = entry.createdAt;
          }
        }
      }

      sensorData.createdAt = latestTimestamp;
      dataByFloor[gate] = sensorData;

      // Use floor number for Alert queries
      alerts[gate] = await Alert.findOne({ floor: floorNumber }).sort({ createdAt: -1 }).lean();

      // Get current visitors for this floor
      const currentVisitors = await Visitor.find({
        floor: floorNumber,
        status: 'approved',
        expectedArrival: { $lte: new Date() },
        expectedDeparture: { $gte: new Date() }
      }).lean();

      visitorsByGate[gate] = currentVisitors;
    }

    res.render('live', { 
      dataByFloor, 
      thresholds, 
      alerts, 
      visitorsByGate,
      gracePeriodMinutes: req.app.get('visitorSettings').gracePeriodMinutes
    });
  } catch (err) {
    console.error('❌ Live view error:', err.message);
    res.status(500).send('Error loading live view');
  }
};

// 📜 History Page
exports.showHistory = async (req, res) => {
  try {
    const floor = req.query.floor || '1';
    const index = parseInt(req.query.index) || 0;

    const recentData = {};
    for (const type of sensorTypes) {
      recentData[type] = await SensorData.find({ floor, type })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
    }

    const combined = [];
    for (let i = 0; i < 10; i++) {
      combined.push({
        temp: recentData.temp[i]?.payload ?? 'N/A',
        humidity: recentData.humidity[i]?.payload ?? 'N/A',
        gas: recentData.gas[i]?.payload ?? 'N/A',
        vibration: recentData.vibration[i]?.payload ?? 'N/A',
        flame: recentData.flame[i]?.payload ?? 'N/A',
        motion: recentData.motion[i]?.payload ?? 'N/A',
        quake: recentData.quake[i]?.payload ?? 'N/A',
        timestamp:
          recentData.temp[i]?.createdAt ||
          recentData.humidity[i]?.createdAt ||
          recentData.gas[i]?.createdAt ||
          new Date(),
      });
    }

    const calcAvg = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : 'N/A';
    const extract = type => recentData[type].map(d => typeof d.payload === 'number' ? d.payload : 0);

    const stats = {
      avgTemp: calcAvg(extract('temp')),
      minTemp: Math.min(...extract('temp')).toFixed(2),
      maxTemp: Math.max(...extract('temp')).toFixed(2),
      avgHumidity: calcAvg(extract('humidity')),
      avgGas: calcAvg(extract('gas')),
      avgVibration: calcAvg(extract('vibration')),
    };

    const selected = combined[index] || {};

    res.render('history', {
      record: selected,
      currentIndex: index,
      total: combined.length,
      stats,
      thresholds,
      floor,
      intruder: false,
    });
  } catch (err) {
    console.error('❌ History page error:', err.message);
    res.status(500).send('Error loading history');
  }
};

// 📈 Charts Page with ML overlay support
exports.showCharts = async (req, res) => {
  try {
    const floor = req.query.floor || '1';
    const range = req.query.range;
    const now = new Date();

    // Get sensor data for all types
    const sensorTypes = ['temp', 'humidity', 'gas', 'vibration', 'flame', 'motion'];
    const allRecords = [];

    for (const type of sensorTypes) {
      const query = { floor: String(floor), type, source: 'sensor' };
      if (range === '1h') query.createdAt = { $gte: new Date(now - 3600000) };
      else if (range === '24h') query.createdAt = { $gte: new Date(now - 86400000) };
      else if (range === '7d') query.createdAt = { $gte: new Date(now - 604800000) };

      const records = await SensorData.find(query)
        .sort({ createdAt: 1 })
        .limit(100)
        .lean();

      // Transform records to match expected structure
      records.forEach(record => {
        allRecords.push({
          createdAt: record.createdAt,
          temp: record.type === 'temp' ? record.payload : undefined,
          humidity: record.type === 'humidity' ? record.payload : undefined,
          gas: record.type === 'gas' ? record.payload : undefined,
          vibration: record.type === 'vibration' ? record.payload : undefined,
          flame: record.type === 'flame' ? record.payload : undefined,
          motion: record.type === 'motion' ? record.payload : undefined
        });
      });
    }

    // Get ML alerts
    const mlQuery = { floor: String(floor), source: 'ml' };
    if (range === '1h') mlQuery.createdAt = { $gte: new Date(now - 3600000) };
    else if (range === '24h') mlQuery.createdAt = { $gte: new Date(now - 86400000) };
    else if (range === '7d') mlQuery.createdAt = { $gte: new Date(now - 604800000) };

    const mlAlerts = await SensorData.find(mlQuery)
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();

    // Group records by timestamp to combine sensor data
    const groupedRecords = {};
    allRecords.forEach(record => {
      const timestamp = record.createdAt.toISOString();
      if (!groupedRecords[timestamp]) {
        groupedRecords[timestamp] = { createdAt: record.createdAt };
      }
      Object.keys(record).forEach(key => {
        if (key !== 'createdAt' && record[key] !== undefined) {
          groupedRecords[timestamp][key] = record[key];
        }
      });
    });

    const records = Object.values(groupedRecords).sort((a, b) => a.createdAt - b.createdAt);

    res.render('charts', {
      records,
      mlAlerts,
      query: req.query,
      thresholds,
    });
  } catch (err) {
    console.error('❌ Charts page error:', err.message);
    res.status(500).send('Error loading charts');
  }
};
