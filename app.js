// app.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const pageRoutes = require('./routes/pageRoutes'); // ✅ new
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

// Middleware: Serve static assets
app.use(express.static(path.join(__dirname, 'public')));

// View Engine Setup
app.set('view engine', 'ejs');

// Body Parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ✅ Session Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'smart-building-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/smartbuilding',
      ttl: 24 * 60 * 60, // 1 day
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Middleware: Log user session & set res.locals.user
app.use((req, res, next) => {
  console.log('🔍 Session user:', req.session.authUser);
  res.locals.user = req.session.authUser || null;
  next();
});

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartbuilding')
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

// ✅ Route Handlers
app.use('/', authRoutes);
app.use('/', pageRoutes); // ✅ updated to pageRoutes
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);
app.use('/alerts', alertsRoutes);

module.exports = app;
