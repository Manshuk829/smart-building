// mqtt/mqttClient.js

const mqtt = require('mqtt');
const handleMQTTMessage = require('./mqttController');

module.exports = function (io) {
  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';

  // Topics to subscribe
  const topics = ['iot/predictions', 'iot/sensors', 'iot/esp32cam'];

  if (!process.env.MQTT_BROKER_URL) {
    console.warn('⚠️ MQTT_BROKER_URL not set in .env — using default localhost.');
  }

  // Connect to broker
  const client = mqtt.connect(brokerUrl, {
    clientId: `SmartBuilding_${Math.random().toString(36).substring(2, 10)}`,
    keepalive: 60,
    reconnectPeriod: 2000,
    clean: true
  });

  // Connection success
  client.on('connect', () => {
    console.log(`📡 Connected to MQTT broker at ${brokerUrl}`);

    client.subscribe(topics, (err) => {
      if (err) {
        console.error('❌ Subscription error:', err.message);
      } else {
        console.log(`✅ Subscribed to topics: ${topics.join(', ')}`);
      }
    });
  });

  // Handle incoming messages
  client.on('message', async (topic, message) => {
    try {
      console.log(`📩 MQTT Message on "${topic}": ${message.toString().slice(0, 150)}...`);
      await handleMQTTMessage(topic, message, io);
    } catch (err) {
      console.error('❌ Message Handling Error:', err.message);
    }
  });

  // Reconnection & error handling
  client.on('error', (err) => {
    console.error('❌ MQTT Error:', err.message);
  });

  client.on('close', () => {
    console.warn('🔌 MQTT connection closed');
  });

  client.on('reconnect', () => {
    console.log('🔁 Attempting MQTT reconnection...');
  });

  client.on('offline', () => {
    console.warn('📴 MQTT client is offline');
  });
};
