const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema({
  floor: {
    type: Number,
    min: 1,
    max: 4,
    default: null,
    required: false
  },

  // Environmental sensor readings
  temperature: {
    type: Number,
    min: -20,
    max: 100,
    default: null
  },
  humidity: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  },
  gas: {
    type: Number,
    min: 0,
    default: null,
    required: false
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
    min: 0,
    default: null
  },

  // ESP32-CAM image for intruder detection (optional)
  intruderImage: {
    type: String,
    trim: true,
    default: null
  },

  // ML prediction result
  prediction: {
    type: String,
    enum: ['normal', 'fire', 'intruder', 'gas leak', 'earthquake'],
    default: 'normal'
  }

}, { timestamps: true });

// Optimize queries on recent data by floor
sensorDataSchema.index({ floor: 1, createdAt: -1 });

module.exports = mongoose.model('SensorData', sensorDataSchema);
