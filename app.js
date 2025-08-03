require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const pageRoutes = require('./routes/pageRoutes');
const apiRoutes = require('./routes/apiRoutes');
const alertsRoutes = require('./routes/alertsRoutes');

// Initialize Express App
const app = express();

// ✅ Trust proxy for secure cookies on Render
app.set('trust proxy', 1);

// Global App Configs
app.set('floors', [1, 2, 3, 4]);
app.set('thresholds', {
  temperature: 50,
  humidity: 70,
  gas: 300,
  vibration: 5.0,
});

// ✅ View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Ensure compatibility on Render

// ✅ Static Assets Middleware
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Body Parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '2mb' })); // In case ESP32-CAM sends base64 image

// ✅ Session Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'smart-building-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/smartbuilding',
      ttl: 86400, // 1 day in seconds
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  })
);

// ✅ Session User Logging
app.use((req, res, next) => {
  if (req.session.authUser) {
    console.log('🔍 Session user:', req.session.authUser.username);
  }
  res.locals.user = req.session.authUser || null;
  next();
});

// ✅ MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartbuilding')
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

// ✅ Route Handlers
app.use('/', authRoutes);
app.use('/', pageRoutes);
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);
app.use('/alerts', alertsRoutes);

module.exports = app;
