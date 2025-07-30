// server.js

const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');

// Create HTTP server
const server = http.createServer(app);

// Attach Socket.IO to the HTTP server
const io = new Server(server, {
  cors: {
    origin: '*', // ⚠️ Update this in production for security
    methods: ['GET', 'POST']
  }
});

// Attach io instance to Express app for reuse in controllers
app.set('io', io);

// 🔌 MQTT integration
const mqttHandler = require('./mqtt/mqttClient');
mqttHandler(io); // Pass Socket.IO instance to MQTT listener

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at: http://localhost:${PORT}`);
});

// Graceful shutdown (optional)
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server gracefully...');
  server.close(() => {
    console.log('✅ Server closed.');
    process.exit(0);
  });
});
