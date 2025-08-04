const SensorData = require('../models/SensorData');
const AuditLog = require('../models/AuditLog');
const Alert = require('../models/Alert');

module.exports = async function handleMQTTMessage(topic, message, io) {
  try {
    const str = message.toString().trim();

    if (!str || str === '{}' || str === '') {
      console.warn('⚠️ Empty or blank MQTT message received, ignoring.');
      return;
    }

    let data;
    try {
      data = JSON.parse(str);
    } catch {
      console.warn('⚠️ Invalid JSON received:', str);
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
    const predictedLabel = (typeof data.label === 'string' ? data.label : 'normal').toLowerCase(); // NEW
    const intruderImage = typeof data.intruderImage === 'string' ? data.intruderImage : undefined;
    const personName = typeof data.name === 'string' ? data.name : undefined;
    const sensorEntries = [];

    // ======================== SENSOR DATA HANDLER ========================
    if (topic === 'iot/sensors') {
      const sensors = {
        temp: toNumber(data.temp),
        humidity: toNumber(data.humidity),
        gas: toNumber(data.gas),
        vibration: toNumber(data.vibration),
        flame: parseBool(data.flame),
        motion: parseBool(data.motion),
      };

      const hasValidSensorData = Object.values(sensors).some((val) => val !== undefined) || !!intruderImage;
      if (!hasValidSensorData) {
        console.warn('⚠️ Received sensor topic with no valid data, ignoring.');
        return;
      }

      for (const [type, value] of Object.entries(sensors)) {
        if (value !== undefined) {
          sensorEntries.push({
            topic,
            floor: floorStr,
            type,
            payload: value,
            source: 'sensor',
          });
        }
      }

      if (intruderImage) {
        sensorEntries.push({
          topic,
          floor: floorStr,
          type: 'intruderImage',
          payload: intruderImage,
          source: 'sensor',
        });

        io.emit('intruder-alert', { floor, image: intruderImage });
        console.log(`📸 intruder-alert emitted for Floor ${floor}`);
      }

      if (sensorEntries.length > 0) {
        await SensorData.insertMany(sensorEntries);
        console.log(`✅ Sensor data saved for Floor ${floor}:`, sensorEntries.length, 'entries');

        io.emit('chart-update', {
          floor,
          data: sensors,
          timestamp: new Date()
        });
      }

      io.emit('sensor-update', {
        floor,
        ...sensors,
        intruderImage
      });

      console.log(`📡 sensor-update emitted for floor ${floor}`);
    }

    // ======================== ML PREDICTION HANDLER ========================
    else if (topic === 'iot/predictions') {
      const label = predictedLabel; // uses 'label' from ML script
      const timestamp = new Date(data.timestamp || Date.now());

      if (label !== 'normal') {
        const mlEntry = {
          topic,
          floor: floorStr,
          type: 'ml-alert',
          payload: label,
          source: 'ml'
        };

        await SensorData.create(mlEntry);

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

        io.emit('ml-alert', {
          type: label,
          floor,
          time: timestamp
        });

        io.emit('ml-line', {
          floor,
          prediction: label,
          timestamp
        });

        console.log(`⚠️ ALERT: ${label.toUpperCase()} detected on Floor ${floor}`);
      } else {
        io.emit('ml-normal', { floor, time: timestamp });
        console.log(`✅ ML prediction: normal for Floor ${floor}`);
      }
    }

    // ======================== ESP32-CAM HANDLER ========================
    else if (topic === 'iot/esp32cam') {
      if (!personName && !intruderImage) {
        console.warn('⚠️ esp32cam topic received without image or name');
        return;
      }

      const entry = {
        topic,
        floor: floorStr,
        type: 'intruderImage',
        source: 'esp32cam',
        payload: personName && personName.toLowerCase() !== 'intruder'
          ? personName
          : intruderImage
      };

      await SensorData.create(entry);

      io.emit('sensor-update', {
        floor,
        intruderImage,
        name: personName ?? 'Unknown'
      });

      io.emit('intruder-alert', {
        floor,
        image: personName?.toLowerCase() === 'intruder' ? intruderImage : null,
        name: personName ?? 'Unknown'
      });

      console.log(`📸 ESP32-CAM alert for Floor ${floor} — ${personName || 'Intruder'}`);
    }

    // ======================== UNKNOWN TOPIC ========================
    else {
      console.warn(`⚠️ Received message on unhandled topic: ${topic}`);
    }

  } catch (err) {
    console.error('❌ MQTT Message Handler Error:', err.message);
  }
};
