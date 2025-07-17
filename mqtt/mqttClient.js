// mqtt/mqttClient.js
const mqtt = require('mqtt');
const handleMQTTMessage = require('./mqttController');

module.exports = function (io) {
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
    await handleMQTTMessage(topic, message, io);
  });
};
