// mqtt/mqttClient.js
const mqtt = require('mqtt');
const SensorData = require('../models/SensorData');
const AuditLog = require('../models/AuditLog');

module.exports = function (io) {
  // Connect to MQTT broker
  const client = mqtt.connect('mqtt://localhost:1883');

  client.on('connect', () => {
    console.log('📡 Connected to MQTT broker');
    client.subscribe('iot/predictions', (err) => {
      if (err) {
        console.error('❌ Failed to subscribe to topic:', err.message);
      } else {
        console.log('✅ Subscribed to iot/predictions');
      }
    });
  });

  client.on('message', async (topic, message) => {
    try {
      const data = JSON.parse(message.toString());
      const prediction = data.prediction || 'normal';

      // Save to MongoDB
      await SensorData.create({
        temperature: data.temp,
        humidity: data.humidity || 0,
        gas: data.gas,
        vibration: data.vibration || 0,
        floor: data.floor || 1,
        prediction,
        timestamp: new Date()
      });

      if (prediction !== 'normal') {
        // Save alert in audit log
        await AuditLog.create({
          action: `🚨 ${prediction.toUpperCase()} detected via ML`,
          performedBy: 'ML-Pipeline'
        });

        // Emit alert to frontend
        io.emit('ml-alert', { type: prediction, time: new Date() });
        console.log(`⚠️ ALERT: ${prediction.toUpperCase()}`);
      } else {
        io.emit('ml-normal', { time: new Date() });
      }

    } catch (err) {
      console.error('❌ MQTT message error:', err.message);
    }
  });
};
