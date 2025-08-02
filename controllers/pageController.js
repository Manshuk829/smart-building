const SensorData = require('../models/SensorData');
const Alert = require('../models/Alert');

const thresholds = { temperature: 50, humidity: 70, gas: 300, vibration: 5.0 };
const floors = [1, 2, 3, 4];
const sensorTypes = ['temp', 'humidity', 'gas', 'vibration', 'flame', 'motion', 'quake'];

// 📊 Dashboard Page
exports.showDashboard = async (req, res) => {
  try {
    const dataByFloor = {};
    const alerts = {};

    for (const floor of floors) {
      const sensorData = {};
      for (const type of sensorTypes) {
        const entry = await SensorData.findOne({ floor: String(floor), type })
          .sort({ createdAt: -1 })
          .lean();
        if (entry) sensorData[type] = entry.payload;
      }
      dataByFloor[floor] = sensorData;

      alerts[floor] = await Alert.findOne({ floor }).sort({ createdAt: -1 }).lean();
    }

    res.render('dashboard', { dataByFloor, thresholds, alerts });
  } catch (err) {
    console.error('❌ Dashboard error:', err.message);
    res.status(500).send('Error loading dashboard');
  }
};

// 📺 Live View Page
exports.showLive = async (req, res) => {
  try {
    const dataByFloor = {};
    const alerts = {};

    for (const floor of floors) {
      const sensorData = {};
      for (const type of sensorTypes) {
        const entry = await SensorData.findOne({ floor: String(floor), type })
          .sort({ createdAt: -1 })
          .lean();
        if (entry) sensorData[type] = entry.payload;
      }
      dataByFloor[floor] = sensorData;

      alerts[floor] = await Alert.findOne({ floor }).sort({ createdAt: -1 }).lean();
    }

    res.render('live', { dataByFloor, thresholds, alerts });
  } catch (err) {
    console.error('❌ Live view error:', err.message);
    res.status(500).send('Error loading live view');
  }
};

// 📜 History Page (Rewritten)
exports.showHistory = async (req, res) => {
  try {
    const floor = req.query.floor || '1';
    const index = parseInt(req.query.index) || 0;

    // Step 1: Fetch recent 10 records per type
    const recentData = {};
    for (const type of sensorTypes) {
      recentData[type] = await SensorData.find({ floor, type })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
    }

    // Step 2: Combine records by index
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
        timestamp: recentData.temp[i]?.createdAt ||
                   recentData.humidity[i]?.createdAt ||
                   recentData.gas[i]?.createdAt || new Date()
      });
    }

    // Step 3: Stats
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
      intruder: false
    });
  } catch (err) {
    console.error('❌ History page error:', err.message);
    res.status(500).send('Error loading history');
  }
};

// 📈 Charts Page
exports.showCharts = async (req, res) => {
  try {
    const floor = req.query.floor || '1';
    const type = req.query.type || 'temp'; // You might need this
    const range = req.query.range;
    const now = new Date();

    const query = { floor, type };

    if (range === '1h') query.createdAt = { $gte: new Date(now - 3600000) };
    else if (range === '24h') query.createdAt = { $gte: new Date(now - 86400000) };
    else if (range === '7d') query.createdAt = { $gte: new Date(now - 604800000) };

    const records = await SensorData.find(query).sort({ createdAt: 1 }).limit(100).lean();

    res.render('charts', {
      records: records || [],
      query: req.query,
      thresholds,
    });
  } catch (err) {
    console.error('❌ Charts page error:', err.message);
    res.status(500).send('Error loading charts');
  }
};
