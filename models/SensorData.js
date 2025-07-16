const mongoose = require('mongoose');

// Schema for sensor data collected from each floor
const sensorDataSchema = new mongoose.Schema({
  floor: {
    type: Number,
    required: true,
    min: 1,
    max: 4, // Supports 4-floor building
  },

  // Environmental sensor readings
  temperature: {
    type: Number,
    default: 0
  },
  humidity: {
    type: Number,
    default: 0
  },
  gas: {
    type: Number,
    required: true
  },
  flame: {
    type: Boolean,
    default: false
  },
  motion: {
    type: Boolean,
    default: false
  },
  vibration: {
    type: Number,
    default: 0
  },

  // Optional: ESP32-CAM intruder image URL
  intruderImageURL: {
    type: String,
    default: null
  },

  // Optional: ML prediction label (e.g., 'fire', 'intruder')
  prediction: {
    type: String,
    default: 'normal'
  }

}, { timestamps: true }); // Adds createdAt and updatedAt automatically

module.exports = mongoose.model('SensorData', sensorDataSchema);
