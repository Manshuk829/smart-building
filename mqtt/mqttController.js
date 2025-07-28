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

    const isNumber = (val) => typeof val === 'number' && !isNaN(val);

    const temperature = isNumber(data.temp) ? data.temp : null;
    const humidity = isNumber(data.humidity) ? data.humidity : null;
    const gas = isNumber(data.gas) ? data.gas : null;
    const vibration = isNumber(data.vibration) ? data.vibration : null;
    const floor = isNumber(data.floor) ? data.floor : null;
    const prediction = typeof data.prediction === 'string' ? data.prediction.toLowerCase() : 'normal';

    const motion = typeof data.motion === 'boolean' ? data.motion : false;
    const flame = typeof data.flame === 'boolean' ? data.flame : false;
    const intruderImage = typeof data.intruderImage === 'string' ? data.intruderImage : null;

    if (temperature === null || gas === null || floor === null) {
      console.warn('⚠️ Skipping payload due to missing critical values:', {
        temp: data.temp,
        gas: data.gas,
        floor: data.floor
      });
      return;
    }

    const sensorDoc = await SensorData.create({
      floor,
      temperature,
      humidity,
      gas,
      vibration,
      flame,
      motion,
      intruderImageURL: intruderImage,
      prediction
      // timestamp omitted because schema already includes timestamps
    });

    io.emit('sensorUpdate', {
      floor,
      temp: temperature,
      humidity,
      gas,
      vibration,
      flame,
      motion,
      intruderImage,
      prediction
    });

    if (prediction !== 'normal') {
      await AuditLog.create({
        action: `🚨 ${prediction.toUpperCase()} detected via ML`,
        floor,
        performedBy: 'ML-Pipeline'
      });

      io.emit('ml-alert', { type: prediction, time: new Date(), floor });
      console.log(`⚠️ ALERT: ${prediction.toUpperCase()} (Floor ${floor})`);
    } else {
      io.emit('ml-normal', { time: new Date(), floor });
    }

  } catch (err) {
    console.error('❌ Error handling MQTT message:', err.message);
  }
};
