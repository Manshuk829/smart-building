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

      // Run ML prediction on sensor data (with error handling)
      let mlPrediction = { threats: [], overallThreatLevel: 'info', overallConfidence: 0 };
      try {
        const { mlEngine } = require('../ml/mlModels');
        // Get recent history for better predictions
        const recentHistory = await SensorData.find({
          floor: floorStr,
          source: 'sensor',
          createdAt: { $gte: new Date(Date.now() - 3600000) } // Last hour
        })
        .sort({ createdAt: 1 })
        .limit(50)
        .lean();
        
        // Add to anomaly detector history
        recentHistory.forEach(entry => {
          const histData = {
            temp: entry.type === 'temp' ? entry.payload : undefined,
            humidity: entry.type === 'humidity' ? entry.payload : undefined,
            gas: entry.type === 'gas' ? entry.payload : undefined,
            vibration: entry.type === 'vibration' ? entry.payload : undefined,
            flame: entry.type === 'flame' ? entry.payload : undefined
          };
          mlEngine.anomalyDetector.addDataPoint(histData);
        });
        
        // Prepare history for ML models
        const history = recentHistory.map(entry => ({
          temp: entry.type === 'temp' ? entry.payload : undefined,
          humidity: entry.type === 'humidity' ? entry.payload : undefined,
          gas: entry.type === 'gas' ? entry.payload : undefined,
          vibration: entry.type === 'vibration' ? entry.payload : undefined,
          flame: entry.type === 'flame' ? entry.payload : undefined
        })).filter(h => Object.values(h).some(v => v !== undefined));
        
        mlPrediction = await mlEngine.predictThreats(floor, sensors, { name: personName }, history);
      } catch (mlError) {
        console.error('ML prediction error:', mlError);
        // Continue without ML prediction if it fails
      }
      
      // Emit ML alerts if threats detected
      if (mlPrediction.threats.length > 0) {
        mlPrediction.threats.forEach(threat => {
          io.emit('ml-alert', {
            type: threat.type,
            floor: floor,
            severity: threat.severity,
            confidence: threat.confidence,
            message: threat.message,
            time: new Date(),
            source: 'ml'
          });
        });
      }
      
      // Emit sensor update with all sensor values
      io.emit('sensor-update', {
        floor,
        temp: sensors.temp,
        humidity: sensors.humidity,
        gas: sensors.gas,
        vibration: sensors.vibration,
        flame: sensors.flame,
        motion: sensors.motion,
        intruderImage: personName?.toLowerCase() === 'intruder' ? intruderImage : undefined,
        name: personName ?? undefined,
        mlPrediction: mlPrediction.overallThreatLevel
      });
      
      // Also emit chart update for charts page
      io.emit('chart-update', {
        floor,
        data: sensors,
        timestamp: new Date()
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
      
      // Save snapshot image if provided
      if (intruderImage) {
        const fs = require('fs');
        const path = require('path');
        try {
          const matches = intruderImage.match(/^data:image\/(jpeg|jpg|png);base64,(.+)$/);
          let base64Data = intruderImage;
          if (matches) base64Data = matches[2];
          const imgPath = path.join(__dirname, '../public/snapshot', `${gateNumber}.jpg`);
          fs.mkdirSync(path.dirname(imgPath), { recursive: true });
          fs.writeFileSync(imgPath, Buffer.from(base64Data, 'base64'));
        } catch (err) {
          console.error(`Error saving snapshot for gate ${gateNumber}:`, err);
        }
      }
      
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
