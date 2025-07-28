// app.js

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const http = require('http');
const session = require('express-session');
const { Server } = require('socket.io');

// Models
const SensorData = require('./models/SensorData');
const AuditLog = require('./models/AuditLog');

// Routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const viewRoutes = require('./routes/viewRoutes');
const apiRoutes = require('./routes/apiRoutes');
const alertsRoutes = require('./routes/alertsRoutes'); // ✅ ML Alerts

// Initialize app and server
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// ----------------------------
// ✅ Global Config
// ----------------------------
const thresholds = {
  temperature: 50,
  humidity: 70,
  gas: 300,
  vibration: 5.0
};
const floors = [1, 2, 3, 4];

app.set('floors', floors);
app.set('thresholds', thresholds);
app.set('io', io);

// ----------------------------
// ✅ Middleware
// ----------------------------
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'smart-building-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // 🔐 Use true if using HTTPS
}));

// ✅ Inject user in EJS views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// ----------------------------
// ✅ MongoDB Connection
// ----------------------------
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

// ----------------------------
// ✅ Routes
// ----------------------------
app.use('/', authRoutes);
app.use('/', viewRoutes);
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);
app.use('/alerts', alertsRoutes); // ✅ ML Alerts

// ----------------------------
// ✅ MQTT Integration
// ----------------------------
require('./mqtt/mqttClient')(io);

// ----------------------------
// ✅ Start Server
// ----------------------------
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
