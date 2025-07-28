const mqtt = require('mqtt');
const handleMQTTMessage = require('./mqttController');

module.exports = function (io) {
  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
  const topic = 'iot/predictions';

  if (!process.env.MQTT_BROKER_URL) {
    console.warn('⚠️ MQTT_BROKER_URL not set in .env — using localhost fallback.');
  }

  const client = mqtt.connect(brokerUrl, {
    clientId: 'SmartBuildingClient_' + Math.random().toString(16).substr(2, 8),
    keepalive: 60,
    reconnectPeriod: 2000, // Retry every 2 seconds
    clean: true
  });

  client.on('connect', () => {
    console.log(`📡 Connected to MQTT broker at ${brokerUrl}`);
    client.subscribe(topic, (err) => {
      if (err) {
        console.error('❌ Failed to subscribe to topic:', err.message);
      } else {
        console.log(`✅ Subscribed to topic: ${topic}`);
      }
    });
  });

  client.on('message', async (receivedTopic, message) => {
    if (receivedTopic === topic) {
      try {
        // Optional: parse JSON if messages are structured that way
        const parsed = message.toString();
        await handleMQTTMessage(receivedTopic, parsed, io);
      } catch (err) {
        console.error('❌ Error processing MQTT message:', err.message);
      }
    } else {
      console.warn(`⚠️ Message received on unexpected topic: ${receivedTopic}`);
    }
  });

  client.on('error', (err) => {
    console.error('❌ MQTT client error:', err.message);
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
