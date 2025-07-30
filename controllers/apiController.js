const SensorData = require('../models/SensorData');
const AuditLog = require('../models/AuditLog');
const Alert = require('../models/Alert'); // ✅ Required to store ML alerts

// ✅ Save sensor data (from IoT or ML)
exports.saveSensorData = async (req, res) => {
  try {
    const { topic, payload, time, source = 'sensor' } = req.body;

    if (!topic || payload === undefined) {
      return res.status(400).json({ error: '❌ "topic" and "payload" are required' });
    }

    // 🧠 Extract floor number and sensor type from topic
    const topicParts = topic.split('/');
    const floorMatch = topicParts.find(part => part.toLowerCase().startsWith('floor'));
    const type = topicParts.at(-1)?.toLowerCase() || 'unknown';

    const floor = floorMatch ? parseInt(floorMatch.replace('floor', ''), 10) : 'unknown';

    const newData = new SensorData({
      topic,
      floor,
      type,
      payload,
      time: time ? new Date(time) : new Date(),
      source
    });

    await newData.save();

    const io = req.app.get('io');
    io.emit('sensorUpdate', newData); // ✅ Real-time dashboard update

    // 🔔 Emit ML alert if applicable
    if (source === 'ml' && topic.includes('alert')) {
      const alertEntry = await Alert.create({
        type: payload,
        floor,
        source,
        createdAt: newData.time
      });

      io.emit('ml-alert', {
        type: payload,
        floor,
        time: alertEntry.createdAt
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
