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
      console.warn('⚠️ Invalid JSON received (not a valid JSON string):', str);
      return;
    }

    // Utility to safely parse numbers
    const toNumber = (val) => {
      const num = parseFloat(val);
      return isNaN(num) ? undefined : num;
    };

    const floor = toNumber(data.floor);
    if (floor === undefined) {
      console.warn('⚠️ Missing or invalid floor value:', data.floor);
      return;
    }

    const temperature = toNumber(data.temp);
    const humidity = toNumber(data.humidity);
    const gas = toNumber(data.gas);
    const vibration = toNumber(data.vibration);

    const prediction = (typeof data.prediction === 'string' ? data.prediction : 'normal').toLowerCase();

    const parseBool = (val) => {
      if (typeof val === 'boolean') return val;
      if (typeof val === 'string') return val.toLowerCase() === 'true';
      return undefined;
    };

    const motion = parseBool(data.motion);
    const flame = parseBool(data.flame);

    const intruderImage = typeof data.intruderImage === 'string' ? data.intruderImage : undefined;

    // Save sensor data to MongoDB
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

    // Emit real-time data to clients
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

    // Handle ML-based alerts
    if (prediction !== 'normal') {
      await AuditLog.create({
        action: `🚨 ${prediction.toUpperCase()} detected via ML`,
        floor,
        performedBy: 'ML-Pipeline'
      });

      io.emit('ml-alert', {
        type: prediction,
        time: new Date(),
        floor
      });

      console.log(`⚠️ ALERT: ${prediction.toUpperCase()} detected on Floor ${floor}`);
    } else {
      io.emit('ml-normal', { time: new Date(), floor });
    }

  } catch (err) {
    console.error('❌ MQTT Message Handler Error:', err.message);
  }
};
