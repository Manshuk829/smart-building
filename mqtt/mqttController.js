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

    const toNumber = (val) => {
      const num = parseFloat(val);
      return !isNaN(num) ? num : undefined;
    };

    const temperature = toNumber(data.temp);
    const humidity = toNumber(data.humidity);
    const gas = toNumber(data.gas);
    const vibration = toNumber(data.vibration);
    const floor = toNumber(data.floor);

    const prediction = typeof data.prediction === 'string'
      ? data.prediction.toLowerCase()
      : 'normal';

    const motion = typeof data.motion === 'boolean'
      ? data.motion
      : data.motion === 'true'
      ? true
      : data.motion === 'false'
      ? false
      : undefined;

    const flame = typeof data.flame === 'boolean'
      ? data.flame
      : data.flame === 'true'
      ? true
      : data.flame === 'false'
      ? false
      : undefined;

    const intruderImage = typeof data.intruderImage === 'string' ? data.intruderImage : undefined;

    if (floor === undefined) {
      console.warn('⚠️ Skipping payload due to missing floor:', { floor: data.floor });
      return;
    }

    // Save to DB
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
    });

    // Emit to all clients
    io.emit('sensorUpdate', {
      floor,
      temp: temperature ?? null,
      humidity: humidity ?? null,
      gas: gas ?? null,
      vibration: vibration ?? null,
      flame: flame ?? null,
      motion: motion ?? null,
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
