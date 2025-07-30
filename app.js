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
const viewRoutes = require('./routes/viewRoutes');
const apiRoutes = require('./routes/apiRoutes');
const alertsRoutes = require('./routes/alertsRoutes');

// Initialize Express App
const app = express();

// ✅ Trust proxy so secure cookies work behind Render's proxy
app.set('trust proxy', 1);

// App-wide Configs
app.set('floors', [1, 2, 3, 4]);
app.set('thresholds', {
  temperature: 50,
  humidity: 70,
  gas: 300,
  vibration: 5.0
});

// Middleware: Static files
app.use(express.static(path.join(__dirname, 'public')));

// View Engine
app.set('view engine', 'ejs');

// Body Parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ✅ Session Configuration using MongoDB Store
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'smart-building-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      ttl: 24 * 60 * 60, // 1 day
    }),
    cookie: {
      httpOnly: true,
      secure: true, // ✅ FIXED: Required on Render (uses HTTPS)
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    }
  })
);

// Middleware: Debug + Make user available in views
app.use((req, res, next) => {
  console.log('🔍 Session user:', req.session.authUser);
  res.locals.user = req.session.authUser || null;
  next();
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

// Route Handlers
app.use('/', authRoutes);
app.use('/', viewRoutes);
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);
app.use('/alerts', alertsRoutes);

module.exports = app;
