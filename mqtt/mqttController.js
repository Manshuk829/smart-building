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
      console.warn('⚠️ Invalid JSON received:', str);
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
      const node = toNumber(data.node) || 1; // Default to node 1 if not specified
      const sensors = {
        temp: toNumber(data.temp),
        humidity: toNumber(data.humidity),
        gas: toNumber(data.gas),
        vibration: toNumber(data.vibration),
        flame: toNumber(data.flame), // Now numeric value for flame sensors
        motion: parseBool(data.motion),
      };

      const hasValidData = Object.values(sensors).some(val => val !== undefined) || !!intruderImage;
      if (!hasValidData) return;

      for (const [type, value] of Object.entries(sensors)) {
        if (value !== undefined) {
          sensorEntries.push({ 
            topic, 
            floor: floorStr, 
            node, // Add node information
            type, 
            payload: value, 
            source: 'sensor' 
          });
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

        io.emit('intruder-alert', { floor, image: intruderImage, name: 'Intruder' });
        console.log(`📸 Intruder (sensor) — Floor ${floor}`);
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
      // Handle ESP32-CAM data for gates
      const gateNumber = floor; // floor should be 1 or 2 for gates
      
      // Always emit sensor update to show device is online
      io.emit('sensor-update', {
        floor: gateNumber,
        intruderImage: intruderImage || undefined,
        name: personName || 'Unknown',
        motion: true, // ESP32-CAM typically indicates motion when sending data
        timestamp: new Date()
      });

      // Only process intruder detection if we have image data
      if (intruderImage) {
        if (personName?.toLowerCase() === 'intruder') {
          await SensorData.create({
            topic,
            floor: floorStr,
            type: 'intruderImage',
            source: 'esp32cam',
            payload: intruderImage
          });

          io.emit('intruder-alert', {
            floor: gateNumber,
            image: intruderImage,
            name: 'Intruder'
          });
        } else {
          // Known person or visitor
          io.emit('visitor-detected', {
            floor: gateNumber,
            image: intruderImage,
            name: personName || 'Known Person'
          });
        }
      }

      console.log(`📸 ESP32-CAM Data — ${personName || 'Motion'} at Gate ${gateNumber}`);
    }

    // ======================== UNKNOWN TOPIC ========================
    else {
      console.warn(`⚠️ Unknown topic: ${topic}`);
    }

  } catch (err) {
    console.error('❌ MQTT Handler Error:', err.message);
  }
};
