// controllers/pageController.js
const SensorData = require('../models/SensorData');

const thresholds = { temperature: 50, humidity: 70, gas: 300, vibration: 5.0 };
const floors = [1, 2, 3, 4];

exports.showDashboard = async (req, res) => {
  const dataByFloor = {};
  for (const floor of floors) {
    dataByFloor[floor] = await SensorData.findOne({ floor }).sort({ createdAt: -1 });
  }
  res.render('dashboard', { dataByFloor, thresholds });
};

exports.showLive = async (req, res) => {
  const dataByFloor = {};
  for (const floor of floors) {
    dataByFloor[floor] = await SensorData.findOne({ floor }).sort({ createdAt: -1 });
  }
  res.render('live', { dataByFloor, thresholds });
};

exports.showHistory = async (req, res) => {
  const floor = parseInt(req.query.floor) || 1;
  const intruder = req.query.intruder === 'true';
  const index = parseInt(req.query.index) || 0;

  const filter = { floor };
  if (intruder) filter.intruderImage = { $ne: null };

  const total = await SensorData.countDocuments(filter);
  const record = await SensorData.find(filter).sort({ createdAt: -1 }).skip(index).limit(1).then(d => d[0]);
  const recent = await SensorData.find(filter).sort({ createdAt: -1 }).limit(10);

  const stats = {
    avgTemp: 0, minTemp: 0, maxTemp: 0,
    avgHumidity: 0, avgGas: 0, avgVibration: 0
  };

  if (recent.length) {
    const temps = recent.map(r => r.temperature);
    const hums = recent.map(r => r.humidity);
    const gases = recent.map(r => r.gas);
    const vibes = recent.map(r => r.vibration ?? 0);

    stats.avgTemp = (temps.reduce((a, b) => a + b) / temps.length).toFixed(2);
    stats.minTemp = Math.min(...temps).toFixed(2);
    stats.maxTemp = Math.max(...temps).toFixed(2);
    stats.avgHumidity = (hums.reduce((a, b) => a + b) / hums.length).toFixed(2);
    stats.avgGas = (gases.reduce((a, b) => a + b) / gases.length).toFixed(2);
    stats.avgVibration = (vibes.reduce((a, b) => a + b) / vibes.length).toFixed(2);
  }

  res.render('history', {
    record, currentIndex: index, total,
    stats, thresholds, floor, intruder
  });
};

exports.showCharts = async (req, res) => {
  const floor = parseInt(req.query.floor) || 1;
  const intruder = req.query.intruder === 'true';
  const range = req.query.range;
  const now = new Date();

  const query = { floor };
  if (intruder) query.intruderImage = { $ne: null };

  if (range === '1h') query.createdAt = { $gte: new Date(now - 3600000) };
  else if (range === '24h') query.createdAt = { $gte: new Date(now - 86400000) };
  else if (range === '7d') query.createdAt = { $gte: new Date(now - 604800000) };

  const records = await SensorData.find(query).sort({ createdAt: 1 }).limit(100);
  res.render('charts', { records, query: req.query, thresholds });
};
