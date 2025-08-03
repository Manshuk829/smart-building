const SensorData = require('../models/SensorData');
const AuditLog = require('../models/AuditLog');
const Alert = require('../models/Alert');

module.exports = async function handleMQTTMessage(topic, message, io) {
  try {
    const str = message.toString();

    if (!str || str.trim() === '{}' || str.trim() === '') {
      console.warn('⚠️ Empty or blank MQTT message received, ignoring.');
      return;
    }

    let data;
    try {
      data = JSON.parse(str);
    } catch (parseErr) {
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
    const intruderImage = typeof data.intruderImage === 'string' ? data.intruderImage : undefined;

    const sensorEntries = [];

    // 🟢 SENSOR TOPIC HANDLER
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
            source: 'sensor'
          });
        }
      }

      if (intruderImage) {
        sensorEntries.push({
          topic,
          floor: floorStr,
          type: 'intruderImage',
          payload: intruderImage,
          source: 'sensor'
        });

        io.emit('intruder-alert', {
          floor,
          image: intruderImage
        });

        console.log(`📸 intruder-alert emitted for Floor ${floor}`);
      }

      if (sensorEntries.length > 0) {
        await SensorData.insertMany(sensorEntries);
        console.log(`✅ Sensor data saved for Floor ${floor}:`, sensorEntries.length, 'entries');
      }

      io.emit('sensor-update', {
        floor,
        temp: sensors.temp ?? null,
        humidity: sensors.humidity ?? null,
        gas: sensors.gas ?? null,
        vibration: sensors.vibration ?? null,
        flame: sensors.flame,
        motion: sensors.motion,
        intruderImage
      });

      console.log(`📡 sensor-update emitted for floor ${floor}`);
    }

    // 🔴 ML PREDICTION TOPIC HANDLER
    else if (topic === 'iot/predictions') {
      if (!data.prediction) {
        console.warn('⚠️ ML topic received without prediction field, ignoring.');
        return;
      }

      if (prediction !== 'normal') {
        const mlEntry = {
          topic,
          floor: floorStr,
          type: 'ml-alert',
          payload: prediction,
          source: 'ml'
        };

        await SensorData.create(mlEntry);
        await Alert.create({
          message: `${prediction.toUpperCase()} detected by ML`,
          floor,
          severity: prediction === 'critical' ? 'critical' : 'warning',
          alertType: 'ml'
        });

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
        console.log(`✅ ML prediction: normal for Floor ${floor}`);
      }
    }

    // 📸 ESP32-CAM IMAGE TOPIC HANDLER
    else if (topic === 'iot/esp32cam') {
      if (!intruderImage) {
        console.warn('⚠️ esp32cam topic received without image data');
        return;
      }

      const camEntry = {
        topic,
        floor: floorStr,
        type: 'intruderImage',
        payload: intruderImage,
        source: 'esp32cam'
      };

      await SensorData.create(camEntry);

      io.emit('intruder-alert', {
        floor,
        image: intruderImage
      });

      console.log(`📸 ESP32-CAM intruder image saved and emitted for Floor ${floor}`);
    }

    // ⚠️ UNHANDLED TOPIC
    else {
      console.warn(`⚠️ Received message on unhandled topic: ${topic}`);
    }

  } catch (err) {
    console.error('❌ MQTT Message Handler Error:', err.message);
  }
};
