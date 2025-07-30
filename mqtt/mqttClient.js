// mqtt/mqttClient.js

const mqtt = require('mqtt');
const handleMQTTMessage = require('./mqttController');

module.exports = function (io) {
  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
  const topic = 'iot/predictions';

  if (!process.env.MQTT_BROKER_URL) {
    console.warn('⚠️ MQTT_BROKER_URL not set in .env — using default localhost.');
  }

  // Create MQTT client
  const client = mqtt.connect(brokerUrl, {
    clientId: `SmartBuildingClient_${Math.random().toString(36).substr(2, 9)}`,
    keepalive: 60,
    reconnectPeriod: 2000,
    clean: true
  });

  client.on('connect', () => {
    console.log(`📡 Connected to MQTT broker at ${brokerUrl}`);
    
    client.subscribe(topic, (err) => {
      if (err) {
        console.error(`❌ Failed to subscribe to topic "${topic}":`, err.message);
      } else {
        console.log(`✅ Subscribed to topic: ${topic}`);
      }
    });
  });

  client.on('message', async (receivedTopic, message) => {
    try {
      if (receivedTopic === topic) {
        await handleMQTTMessage(receivedTopic, message, io);
      } else {
        console.warn(`⚠️ Unexpected topic received: ${receivedTopic}`);
      }
    } catch (err) {
      console.error('❌ Error handling MQTT message:', err.message);
    }
  });

  client.on('error', (err) => {
    console.error('❌ MQTT Client Error:', err.message);
  });

  client.on('close', () => {
    console.warn('⚠️ MQTT connection closed');
  });

  client.on('reconnect', () => {
    console.log('🔁 Reconnecting to MQTT broker...');
  });

  client.on('offline', () => {
    console.warn('📴 MQTT client went offline');
  });
};
