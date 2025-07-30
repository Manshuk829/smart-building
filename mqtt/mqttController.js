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

    const toNumber = (val) => {
      const num = parseFloat(val);
      return isNaN(num) ? undefined : num;
    };

    const parseBool = (val) => {
      if (typeof val === 'boolean') return val;
      if (typeof val === 'string') return val.toLowerCase() === 'true';
      return undefined;
    };

    const floor = toNumber(data.floor);
    if (floor === undefined) {
      console.warn('⚠️ Missing or invalid floor value:', data.floor);
      return;
    }

    const floorStr = floor.toString();
    const prediction = (typeof data.prediction === 'string' ? data.prediction : 'normal').toLowerCase();
    const intruderImage = typeof data.intruderImage === 'string' ? data.intruderImage : undefined;

    const sensorEntries = [];

    // Add individual sensor values if valid
    const sensors = {
      temp: toNumber(data.temp),
      humidity: toNumber(data.humidity),
      gas: toNumber(data.gas),
      vibration: toNumber(data.vibration),
      flame: parseBool(data.flame),
      motion: parseBool(data.motion),
    };

    for (const [type, value] of Object.entries(sensors)) {
      if (value !== undefined) {
        sensorEntries.push({
          topic,
          floor: floorStr,
          type,
          payload: value,
          source: 'sensor'
        });
      }
    }

    // If intruder image is present
    if (intruderImage) {
      sensorEntries.push({
        topic,
        floor: floorStr,
        type: 'intruderImage',
        payload: intruderImage,
        source: 'sensor'
      });
    }

    // If ML prediction is not normal, save as an ML alert
    if (prediction !== 'normal') {
      sensorEntries.push({
        topic,
        floor: floorStr,
        type: 'ml-alert',
        payload: prediction,
        source: 'ml'
      });

      // Log in Audit
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

    // Save all entries to DB
    if (sensorEntries.length > 0) {
      await SensorData.insertMany(sensorEntries);
    }

    // Emit all data to clients
    io.emit('sensorUpdate', {
      floor,
      temp: sensors.temp ?? null,
      humidity: sensors.humidity ?? null,
      gas: sensors.gas ?? null,
      vibration: sensors.vibration ?? null,
      flame: sensors.flame,
      motion: sensors.motion,
      intruderImage,
      prediction
    });

  } catch (err) {
    console.error('❌ MQTT Message Handler Error:', err.message);
  }
};
