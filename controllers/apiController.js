// controllers/apiController.js
const SensorData = require('../models/SensorData');
const AuditLog = require('../models/AuditLog');

// ✅ Save sensor data from HTTP POST
exports.saveSensorData = async (req, res) => {
  try {
    const { topic, payload, time } = req.body;

    if (!topic || payload === undefined) {
      return res.status(400).json({ error: 'Topic and payload are required' });
    }

    const newData = new SensorData({
      topic,
      payload,
      time: time || new Date()
    });

    await newData.save();

    const io = req.app.get('io');
    io.emit('sensorUpdate', newData);

    res.status(200).json({ message: '✅ Sensor data saved', data: newData });
  } catch (err) {
    console.error('❌ Sensor save error:', err.message);
    res.status(500).json({ error: 'Sensor save failed' });
  }
};

// ✅ Trigger manual alert by admin
exports.triggerAlert = async (req, res) => {
  try {
    const { floor, message } = req.body;
    const io = req.app.get('io');

    if (!floor || !message) {
      return res.status(400).json({ error: 'Floor and message are required' });
    }

    await AuditLog.create({
      action: `🚨 Manual Alert: ${message}`,
      floor,
      performedBy: req.session.user?.username || 'Admin'
    });

    // Emit real-time alert
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

