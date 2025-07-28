const SensorData = require('../models/SensorData');

exports.dashboard = async (req, res) => {
  const floors = req.app.get('floors');
  const thresholds = req.app.get('thresholds');
  const dataByFloor = {};

  for (const floor of floors) {
    dataByFloor[floor] = await SensorData.findOne({ floor }).sort({ createdAt: -1 }).lean();
  }

  res.render('dashboard', { dataByFloor, thresholds });
};

exports.liveView = async (req, res) => {
  const floors = req.app.get('floors');
  const thresholds = req.app.get('thresholds');
  const dataByFloor = {};

  for (const floor of floors) {
    dataByFloor[floor] = await SensorData.findOne({ floor }).sort({ createdAt: -1 }).lean();
  }

  res.render('live', { dataByFloor, thresholds });
};

exports.history = async (req, res) => {
  const floors = req.app.get('floors');
  const thresholds = req.app.get('thresholds');

  const floor = Number(req.query.floor) || 1;
  const intruder = req.query.intruder === 'true';
  const index = Number(req.query.index) || 0;

  const filter = { floor };
  if (intruder) filter.intruderImage = { $ne: null };

  const total = await SensorData.countDocuments(filter);
  const record = await SensorData.find(filter).sort({ createdAt: -1 }).skip(index).limit(1).lean().then(r => r[0]);
  const recent = await SensorData.find(filter).sort({ createdAt: -1 }).limit(10).lean();

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
    record,
    currentIndex: index,
    total,
    stats,
    thresholds,
    floor,
    intruder
  });
};

exports.charts = async (req, res) => {
  const thresholds = req.app.get('thresholds');
  const floor = Number(req.query.floor) || 1;
  const intruder = req.query.intruder === 'true';
  const range = req.query.range;
  const now = new Date();

  const query = { floor };
  if (intruder) query.intruderImage = { $ne: null };

  if (range === '1h') query.createdAt = { $gte: new Date(now - 3600000) };
  else if (range === '24h') query.createdAt = { $gte: new Date(now - 86400000) };
  else if (range === '7d') query.createdAt = { $gte: new Date(now - 604800000) };

  const records = await SensorData.find(query).sort({ createdAt: 1 }).limit(100).lean();

  res.render('charts', { records, query: req.query, thresholds });
};
