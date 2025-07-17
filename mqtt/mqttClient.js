// mqtt/mqttClient.js
const mqtt = require('mqtt');
const handleMQTTMessage = require('./mqttController');

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
      if (topic === 'iot/predictions') {
        await handleMQTTMessage(topic, message, io);
      } else {
        console.warn(`⚠️ Received message on unhandled topic: ${topic}`);
      }
    } catch (err) {
      console.error('❌ Error processing MQTT message:', err.message);
    }
  });

  client.on('error', (err) => {
    console.error('❌ MQTT connection error:', err.message);
  });
};
