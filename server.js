// server.js
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');

const server = http.createServer(app);
const io = new Server(server);

// Attach io to app for reuse in controllers if needed
app.set('io', io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\u{1F680} Server running at: http://localhost:${PORT}`);
});
