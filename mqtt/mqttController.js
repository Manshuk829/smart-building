const SensorData = require('../models/SensorData');
const AuditLog = require('../models/AuditLog');
const Alert = require('../models/Alert');

module.exports = async function handleMQTTMessage(topic, message, io) {
  try {
    const str = message.toString().trim();
    if (!str || str === '{}' || str === '') return;

    let data;
    try {
      data = JSON.parse(str);
    } catch {
      console.warn('⚠️ Invalid JSON:', str);
      return;
    }

    const toNumber = val => isNaN(parseFloat(val)) ? undefined : parseFloat(val);
    const parseBool = val => (typeof val === 'boolean') ? val : (val?.toLowerCase?.() === 'true');

    const floor = toNumber(data.floor);
    if (floor === undefined) return;

    const floorStr = floor.toString();
    const prediction = (data.prediction || 'normal').toLowerCase();
    const predictedLabel = (data.label || 'normal').toLowerCase();
    const intruderImage = typeof data.intruderImage === 'string' ? data.intruderImage : undefined;
    const personName = typeof data.name === 'string' ? data.name : undefined;

    const sensorEntries = [];

    // ======================== SENSOR DATA ========================
    if (topic === 'iot/sensors') {
      const sensors = {
        temp: toNumber(data.temp),
        humidity: toNumber(data.humidity),
        gas: toNumber(data.gas),
        vibration: toNumber(data.vibration),
        flame: parseBool(data.flame),
        motion: parseBool(data.motion),
      };

      const hasValidData = Object.values(sensors).some(val => val !== undefined) || !!intruderImage;
      if (!hasValidData) return;

      for (const [type, value] of Object.entries(sensors)) {
        if (value !== undefined) {
          sensorEntries.push({ topic, floor: floorStr, type, payload: value, source: 'sensor' });
        }
      }

      if (intruderImage && (!personName || personName.toLowerCase() === 'intruder')) {
        sensorEntries.push({
          topic,
          floor: floorStr,
          type: 'intruderImage',
          payload: intruderImage,
          source: 'sensor',
        });

        io.emit('intruder-alert', { floor, image: intruderImage });
        console.log(`📸 Intruder alert emitted (sensor) — Floor ${floor}`);
      }

      if (sensorEntries.length) {
        await SensorData.insertMany(sensorEntries);
        io.emit('chart-update', { floor, data: sensors, timestamp: new Date() });
        console.log(`✅ Sensor data saved — Floor ${floor}`);
      }

      io.emit('sensor-update', {
        floor,
        ...sensors,
        intruderImage: personName?.toLowerCase() === 'intruder' ? intruderImage : undefined,
        name: personName ?? undefined
      });
    }

    // ======================== ML PREDICTIONS ========================
    else if (topic === 'iot/predictions') {
      const label = predictedLabel;
      const timestamp = new Date(data.timestamp || Date.now());

      if (label !== 'normal') {
        await SensorData.create({
          topic,
          floor: floorStr,
          type: 'ml-alert',
          payload: label,
          source: 'ml',
        });

        await Alert.create({
          message: `${label.toUpperCase()} detected by ML`,
          floor,
          severity: label === 'critical' ? 'critical' : 'warning',
          alertType: 'ml'
        });

        await AuditLog.create({
          action: `🚨 ${label.toUpperCase()} detected via ML`,
          floor,
          performedBy: 'ML-Pipeline'
        });

        io.emit('ml-alert', { type: label, floor, time: timestamp });
        io.emit('ml-line', { floor, prediction: label, timestamp });

        console.log(`⚠️ ML ALERT: ${label.toUpperCase()} — Floor ${floor}`);
      } else {
        io.emit('ml-normal', { floor, time: timestamp });
        console.log(`✅ ML Prediction: Normal — Floor ${floor}`);
      }
    }

    // ======================== ESP32-CAM (Gate 1 & 2) ========================
    else if (topic === 'iot/esp32cam') {
      if (!personName && !intruderImage) return;

      const gate = floorStr === '1' ? 'Gate 1' : (floorStr === '2' ? 'Gate 2' : `Gate ${floorStr}`);

      // 🔒 Save only if intruder or unknown
      if (personName?.toLowerCase() === 'intruder' && intruderImage) {
        await SensorData.create({
          topic,
          floor: gate,
          type: 'intruderImage',
          source: 'esp32cam',
          payload: intruderImage
        });
      }

      io.emit('sensor-update', {
        floor: gate,
        intruderImage: personName?.toLowerCase() === 'intruder' ? intruderImage : undefined,
        name: personName ?? 'Unknown'
      });

      io.emit('intruder-alert', {
        floor: gate,
        image: personName?.toLowerCase() === 'intruder' ? intruderImage : null,
        name: personName ?? 'Unknown'
      });

      console.log(`📸 ESP32-CAM Alert — ${personName ?? 'Unknown'} at ${gate}`);
    }

    // ======================== UNKNOWN TOPIC ========================
    else {
      console.warn(`⚠️ Unknown topic: ${topic}`);
    }
  } catch (err) {
    console.error('❌ MQTT Handler Error:', err.message);
  }
};
