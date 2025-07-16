// controllers/apiController.js

const SensorData = require('../models/SensorData');
const AuditLog = require('../models/AuditLog');

// ✅ Save sensor data (from sensors or ML service)
exports.saveSensorData = async (req, res) => {
  try {
    const { topic, payload, time } = req.body;

    if (!topic || payload === undefined) {
      return res.status(400).json({ error: '❌ "topic" and "payload" are required' });
    }

    const newData = new SensorData({
      topic,
      payload,
      time: time ? new Date(time) : new Date()
    });

    await newData.save();

    // Emit to frontend (real-time dashboard)
    const io = req.app.get('io');
    io.emit('sensorUpdate', newData);

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

    // Save to audit logs
    await AuditLog.create({
      action: `🚨 Manual Alert: ${message}`,
      floor,
      performedBy: username
    });

    // Send to frontend
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
