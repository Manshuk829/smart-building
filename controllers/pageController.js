const config = require('../config');
const SensorData = require('../models/SensorData');
const Alert = require('../models/Alert');
const Visitor = require('../models/Visitor');

const thresholds = config.thresholds;
const floors = config.floors;
const nodesPerFloor = config.nodesPerFloor;
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
        .lean();

      // Group by node and get the latest reading for each node
      const nodeData = {};
      flameEntries.forEach(entry => {
        const node = entry.node || 1;
        if (!nodeData[node] || entry.createdAt > nodeData[node].timestamp) {
          nodeData[node] = {
            node: node,
            value: entry.payload,
            timestamp: entry.createdAt
          };
        }
      });

      // Convert to array and ensure we have nodes 1-4
      flameDataByFloor[floor] = [];
      for (let nodeNum = 1; nodeNum <= nodesPerFloor; nodeNum++) {
        if (nodeData[nodeNum]) {
          flameDataByFloor[floor].push(nodeData[nodeNum]);
        } else {
          // Add placeholder for missing nodes
          flameDataByFloor[floor].push({
            node: nodeNum,
            value: 0,
            timestamp: new Date(),
            status: 'offline'
          });
        }
      }

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
          temperature: record.type === 'temp' ? record.payload : undefined,
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

    let records = Object.values(groupedRecords).sort((a, b) => a.createdAt - b.createdAt);

    // If no records found, generate sample data for demonstration
    if (records.length === 0) {
      console.log('No sensor data found, generating sample data for charts...');
      records = [];
      const sampleCount = 50;
      
      for (let i = 0; i < sampleCount; i++) {
        const timestamp = new Date(now.getTime() - (sampleCount - i) * 60000); // 1 min intervals
        records.push({
          createdAt: timestamp,
          temperature: 20 + Math.sin(i * 0.2) * 5 + Math.random() * 2,
          humidity: 50 + Math.cos(i * 0.3) * 10 + Math.random() * 5,
          gas: 200 + Math.sin(i * 0.1) * 50 + Math.random() * 20,
          flame: Math.random() > 0.95 ? 1 : 0,
          motion: Math.random() > 0.8 ? 1 : 0,
          vibration: Math.random() * 2 + Math.sin(i * 0.4) * 0.5
        });
      }
    }

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

// 🚨 Evacuation Routes Page
exports.showEvacuation = async (req, res) => {
  try {
    // Get current evacuation data from database
    const evacuationData = {};
    const floors = [1, 2, 3, 4];
    
    for (const floor of floors) {
      // Get latest ML data for this floor
      const mlData = await SensorData.find({ 
        floor: String(floor), 
        source: 'ml',
        type: { $in: ['evacuation', 'threat', 'emergency'] }
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

      // Get current sensor data for threat assessment
      const sensorData = await SensorData.find({ 
        floor: String(floor), 
        source: 'sensor',
        type: { $in: ['temp', 'gas', 'flame', 'motion'] }
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

      // Determine floor status based on data
      let status = 'safe';
      let threats = [];
      let evacuationTime = 3;

      // Check for fire threats
      const fireData = sensorData.filter(d => d.type === 'flame' && d.payload > 100);
      if (fireData.length > 0) {
        status = 'danger';
        threats.push('fire');
        evacuationTime = 1;
      }

      // Check for gas leaks
      const gasData = sensorData.filter(d => d.type === 'gas' && d.payload > 300);
      if (gasData.length > 0) {
        status = status === 'safe' ? 'warning' : 'danger';
        threats.push('gas');
        evacuationTime = Math.min(evacuationTime, 2);
      }

      // Check for high temperature
      const tempData = sensorData.filter(d => d.type === 'temp' && d.payload > 50);
      if (tempData.length > 0) {
        status = status === 'safe' ? 'warning' : 'danger';
        threats.push('heat');
        evacuationTime = Math.min(evacuationTime, 2);
      }

      evacuationData[floor] = {
        status,
        threats,
        evacuationTime,
        capacity: 50,
        lastUpdate: new Date(),
        routes: ['main', 'secondary', 'emergency']
      };
    }

    res.render('evacuation', {
      evacuationData,
      thresholds
    });
  } catch (err) {
    console.error('❌ Evacuation page error:', err.message);
    res.status(500).send('Error loading evacuation routes');
  }
};

exports.showFaceTraining = async (req, res) => {
  try {
    console.log('🎯 Loading face training page...');
    res.render('face_training');
  } catch (err) {
    console.error('❌ Face training page error:', err.message);
    res.status(500).send('Error loading face training page');
  }
};
