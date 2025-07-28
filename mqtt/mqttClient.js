const mqtt = require('mqtt');
const handleMQTTMessage = require('./mqttController');

module.exports = function (io) {
  // Use public broker URL from environment or fallback to localhost
  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
  const client = mqtt.connect(brokerUrl);

  client.on('connect', () => {
    console.log(`📡 Connected to MQTT broker at ${brokerUrl}`);
    client.subscribe('iot/predictions', (err) => {
      if (err) {
        console.error('❌ Failed to subscribe to topic:', err.message);
      } else {
        console.log('✅ Subscribed to topic: iot/predictions');
      }
    });
  });

  client.on('message', async (topic, message) => {
    try {
      if (topic === 'iot/predictions') {
        await handleMQTTMessage(topic, message, io);
      } else {
        console.warn(`⚠️ Unhandled MQTT topic: ${topic}`);
      }
    } catch (err) {
      console.error('❌ Error processing MQTT message:', err.message);
    }
  });

  client.on('error', (err) => {
    console.error('❌ MQTT connection error:', err.message);
  });

  client.on('close', () => {
    console.warn('⚠️ MQTT connection closed');
  });

  client.on('reconnect', () => {
    console.log('🔁 Attempting to reconnect to MQTT broker...');
  });
};
