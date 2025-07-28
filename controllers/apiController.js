const SensorData = require('../models/SensorData');
const AuditLog = require('../models/AuditLog');

// ✅ Save sensor data (from IoT or ML)
exports.saveSensorData = async (req, res) => {
  try {
    const { topic, payload, time, source = 'sensor' } = req.body;

    if (!topic || payload === undefined) {
      return res.status(400).json({ error: '❌ "topic" and "payload" are required' });
    }

    const newData = new SensorData({
      topic,
      payload,
      time: time ? new Date(time) : new Date(),
      source // e.g., 'sensor' or 'ml'
    });

    await newData.save();

    const io = req.app.get('io');
    io.emit('sensorUpdate', newData); // ✅ Real-time dashboard update

    // Optional: If data came from ML and has high risk, emit as alert
    if (source === 'ml' && topic.includes('alert')) {
      io.emit('ml-alert', {
        floor: topic.match(/\d+/)?.[0] || 'unknown',
        message: payload,
        time: newData.time
      });
    }

    res.status(200).json({ message: '✅ Sensor data saved', data: newData });

  } catch (err) {
    console.error('❌ Sensor save error:', err.message);
    res.status(500).json({ error: 'Sensor save failed' });
  }
};

// ✅ Trigger manual alert (admin only)
exports.triggerAlert = async (req, res) => {
  try {
    const { floor, message } = req.body;

    if (!floor || !message) {
      return res.status(400).json({ error: '❌ "floor" and "message" are required' });
    }

    const username = req.session.user?.username || 'Admin';

    await AuditLog.create({
      action: `🚨 Manual Alert: ${message}`,
      floor,
      performedBy: username
    });

    const io = req.app.get('io');
    io.emit('manual-alert', {
      floor,
      message,
      time: new Date()
    });

    console.log(`⚠️ Manual alert sent → Floor ${floor}: ${message}`);
    res.status(200).json({ success: true, message: `Alert triggered for Floor ${floor}` });

  } catch (err) {
    console.error('❌ Alert error:', err.message);
    res.status(500).json({ success: false, message: 'Alert failed' });
  }
};
