const config = require('./config');
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');

// Modern AI/ML Services (Next-Generation Stack)
const { RealTimeMLProcessor } = require('./ml/realtimeMLProcessor');
const { RealTimeAnalytics } = require('./services/realtimeAnalytics');
const { EdgeAIService } = require('./services/edgeAI');
const { StreamingService } = require('./services/streamingService');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const pageRoutes = require('./routes/pageRoutes');
const apiRoutes = require('./routes/apiRoutes');
const alertsRoutes = require('./routes/alertsRoutes');
const visitorRoutes = require('./routes/visitorRoutes');

// Initialize Express App
const app = express();

// ✅ Trust proxy for secure cookies on Render
app.set('trust proxy', 1);

// Global App Configs - Now using centralized config
app.set('floors', config.floors);
app.set('nodesPerFloor', config.nodesPerFloor);
app.set('thresholds', config.thresholds);
app.set('visitorSettings', config.visitorSettings);

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
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: config.mongodbUri,
      ttl: 86400, // 1 day in seconds
    }),
    cookie: {
      httpOnly: true,
      secure: config.isProduction,
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
  .connect(config.mongodbUri)
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
app.use('/', visitorRoutes);

// Modern API Routes (GraphQL, Real-Time ML, Edge AI)
const modernApiRoutes = require('./routes/modernApiRoutes');
app.use('/api/modern', modernApiRoutes);

// === Automatic Cleanup of Old Images in /public/snapshot ===
const cron = require('node-cron');
const fs = require('fs');

const SNAPSHOT_DIR = path.join(__dirname, 'public', 'snapshot');
const MAX_AGE_DAYS = 7;

cron.schedule('0 3 * * *', () => { // Run daily at 3:00 AM
  try {
    if (!fs.existsSync(SNAPSHOT_DIR)) return;
    const files = fs.readdirSync(SNAPSHOT_DIR);
    const now = Date.now();
    files.forEach(file => {
      const filePath = path.join(SNAPSHOT_DIR, file);
      const stats = fs.statSync(filePath);
      const ageDays = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);
      if (ageDays > MAX_AGE_DAYS) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Deleted old snapshot: ${file}`);
      }
    });
  } catch (err) {
    console.error('❌ Error during snapshot cleanup:', err);
  }
});

// Initialize Modern AI/ML Services
let realTimeML, realTimeAnalytics, edgeAI, streamingService;

async function initializeModernServices(io) {
  try {
    // Initialize Real-Time ML Processor
    realTimeML = new RealTimeMLProcessor();
    await realTimeML.initializeModels();
    realTimeML.startProcessing(1000); // Process every second
    console.log('✅ Real-Time ML Processor initialized');

    // Initialize Real-Time Analytics
    realTimeAnalytics = new RealTimeAnalytics();
    realTimeAnalytics.initialize();
    console.log('✅ Real-Time Analytics initialized');

    // Initialize Edge AI Service
    edgeAI = new EdgeAIService();
    await edgeAI.initialize();
    console.log('✅ Edge AI Service initialized');

    // Initialize Streaming Service
    streamingService = new StreamingService();
    streamingService.initialize(io);
    console.log('✅ Streaming Service initialized');

    // Make services available globally
    app.set('realTimeML', realTimeML);
    app.set('realTimeAnalytics', realTimeAnalytics);
    app.set('edgeAI', edgeAI);
    app.set('streamingService', streamingService);

    return { success: true, message: 'All modern AI/ML services initialized' };
  } catch (error) {
    console.error('❌ Error initializing modern services:', error);
    return { success: false, error: error.message };
  }
}

// Export initialization function
app.initializeModernServices = initializeModernServices;

module.exports = app;
