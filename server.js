// server.js
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new Server(server);

// Attach io to app so it can be accessed in controllers via app.get('io')
app.set('io', io);

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at: http://localhost:${PORT}`);
});
