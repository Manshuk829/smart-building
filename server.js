// server.js
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Adjust in production
    methods: ['GET', 'POST']
  }
});

// Attach io instance to app for reuse in controllers
app.set('io', io);

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
