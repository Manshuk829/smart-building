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

// Express App Init
const app = express();

// Custom app settings
app.set('floors', [1, 2, 3, 4]);
app.set('thresholds', {
  temperature: 50,
  humidity: 70,
  gas: 300,
  vibration: 5.0
});

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session Middleware
const isProduction = process.env.NODE_ENV === 'production';

app.use(session({
  secret: process.env.SESSION_SECRET || 'smart-building-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    ttl: 24 * 60 * 60 // 1 day
  }),
  cookie: {
    httpOnly: true,
    secure: isProduction, // true in production (HTTPS)
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// Inject user into views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

// Routes
app.use('/', authRoutes);
app.use('/', viewRoutes);
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);
app.use('/alerts', alertsRoutes);

// Export App
module.exports = app;
