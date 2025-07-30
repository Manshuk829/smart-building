// server.js
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');

// Create HTTP server from Express app
const server = http.createServer(app);

// Setup Socket.IO with CORS support
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Attach Socket.IO instance to Express app
app.set('io', io);

// Start MQTT listener (pass io for real-time updates)
try {
  require('./mqtt/mqttClient')(io);
  console.log('📡 MQTT listener initialized');
} catch (err) {
  console.error('❌ MQTT initialization failed:', err.message);
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at: http://localhost:${PORT}`);
});

// Graceful shutdown on Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 Gracefully shutting down server...');
  server.close(() => {
    console.log('✅ Server closed.');
    process.exit(0);
  });
});
