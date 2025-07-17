// mqtt/mqttController.js
const SensorData = require('../models/SensorData');
const AuditLog = require('../models/AuditLog');

module.exports = async function handleMQTTMessage(topic, message, io) {
  try {
    const str = message.toString();

    let data;
    try {
      data = JSON.parse(str);
    } catch (parseErr) {
      console.warn('⚠️ Invalid JSON payload:', str);
      return;
    }

    // Validate values
    const isNumber = (val) => typeof val === 'number' && !isNaN(val);

    const temperature = isNumber(data.temp) ? data.temp : null;
    const gas = isNumber(data.gas) ? data.gas : null;
    const humidity = isNumber(data.humidity) ? data.humidity : 0;
    const vibration = isNumber(data.vibration) ? data.vibration : 0;
    const floor = isNumber(data.floor) ? data.floor : 1;
    const prediction = typeof data.prediction === 'string' ? data.prediction : 'normal';

    if (temperature === null || gas === null) {
      console.warn('⚠️ Skipping payload due to missing critical values:', {
        temp: data.temp,
        gas: data.gas
      });
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
      timestamp: Date.now()
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
    console.error('❌ Error handling MQTT message:', err.message);
  }
};
