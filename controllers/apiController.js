const SensorData = require('../models/SensorData');
const AuditLog = require('../models/AuditLog');

exports.saveSensorData = async (req, res) => {
  try {
    const newData = new SensorData(req.body);
    await newData.save();

    const io = req.app.get('io');
    io.emit('sensorUpdate', newData);

    res.status(200).send('✅ Data saved');
  } catch (err) {
    console.error('❌ Sensor save error:', err);
    res.status(500).send('Sensor save failed');
  }
};

exports.triggerAlert = async (req, res) => {
  try {
    const { floor } = req.body;
    await AuditLog.create({
      action: 'Triggered alert',
      floor,
      performedBy: req.session.user.username
    });

    res.json({ success: true, message: `Alert triggered for Floor ${floor}` });
  } catch (err) {
    console.error('❌ Alert error:', err);
    res.status(500).json({ success: false, message: 'Alert failed' });
  }
};
