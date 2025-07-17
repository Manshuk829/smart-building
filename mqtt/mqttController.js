// mqtt/mqttController.js
const SensorData = require('../models/SensorData');
const AuditLog = require('../models/AuditLog');

module.exports = async function handleMQTTMessage(topic, message, io) {
  try {
    const str = message.toString();
    const data = JSON.parse(str);

    // Validate required fields
    const isNumber = (val) => typeof val === 'number' && !isNaN(val);

    const temperature = isNumber(data.temp) ? data.temp : null;
    const gas = isNumber(data.gas) ? data.gas : null;
    const humidity = isNumber(data.humidity) ? data.humidity : 0;
    const vibration = isNumber(data.vibration) ? data.vibration : 0;
    const floor = isNumber(data.floor) ? data.floor : 1;
    const prediction = typeof data.prediction === 'string' ? data.prediction : 'normal';

    // Ensure critical values are valid
    if (temperature === null || gas === null) {
      console.warn('⚠️ Skipped invalid payload:', str);
      return;
    }

    // Save to MongoDB
    await SensorData.create({
      temperature,
      humidity,
      gas,
      vibration,
      floor,
      prediction,
      timestamp: new Date()
    });

    if (prediction !== 'normal') {
      await AuditLog.create({
        action: `🚨 ${prediction.toUpperCase()} detected via ML`,
        performedBy: 'ML-Pipeline'
      });

      io.emit('ml-alert', { type: prediction, time: new Date() });
      console.log(`⚠️ ALERT: ${prediction.toUpperCase()}`);
    } else {
      io.emit('ml-normal', { time: new Date() });
    }

  } catch (err) {
    console.error('❌ MQTT message error:', err.message);
  }
};
