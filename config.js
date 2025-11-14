// Centralized configuration for Smart Building Website
require('dotenv').config();

const config = {
  // Server Configuration
  port: process.env.PORT || 3000,
  
  // Security - Critical: Remove hardcoded fallbacks
  sessionSecret: process.env.SESSION_SECRET,
  mongodbUri: process.env.MONGODB_URI,
  mqttBrokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
  
  // Email Configuration
  email: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    service: process.env.EMAIL_SERVICE || 'gmail'
  },
  
  // Application Settings
  floors: [1, 2, 3, 4], // 4 floors (each base/shelf of shoe rack = 1 floor)
  nodesPerFloor: 4,
  buildingDimensions: {
    depth: 17,    // 17 cm (Depth)
    width: 15,    // 15 cm (Width)
    height: 15,   // 15 cm (Height per floor)
    blocks: 4,    // 4 blocks/sections
    unit: 'cm'   // All dimensions in centimeters
  },
  
  // Sensor Thresholds
  thresholds: {
    temperature: 50,
    humidity: 70,
    gas: 300,
    vibration: 5.0,
    flame: 100
  },
  
  // Visitor Management Settings
  visitorSettings: {
    maxVisitorsPerPerson: 3,
    visitorExpiryHours: 24,
    gracePeriodMinutes: 5
  },
  
  // Environment
  isProduction: process.env.NODE_ENV === 'production',
  
  // Validation
  validate() {
    const required = ['sessionSecret', 'mongodbUri'];
    const missing = required.filter(key => !this[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    return true;
  }
};

// Validate configuration on load
config.validate();

module.exports = config;
