// server.js
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');

// Create HTTP server from the Express app
const server = http.createServer(app);

// Initialize Socket.IO with CORS settings
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Make Socket.IO instance available in app
app.set('io', io);

// Start MQTT listener and attach to Socket.IO
try {
  require('./mqtt/mqttClient')(io);
  console.log('📡 MQTT listener initialized');
} catch (err) {
  console.error('❌ MQTT initialization failed:', err.message);
}

// Start the server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  const env = process.env.NODE_ENV || 'development';
  const msg = env === 'production'
    ? `🚀 Server running on port ${PORT}`
    : `🚀 Server running at: http://localhost:${PORT}`;
  console.log(msg);
}).on('error', (err) => {
  console.error('❌ Server failed to start:', err.message);
  process.exit(1);
});

// Graceful shutdown on Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 Gracefully shutting down server...');
  server.close(() => {
    console.log('✅ Server closed.');
    process.exit(0);
  });
});
