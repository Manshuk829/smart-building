// models/SensorData.js

const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema({
  floor: {
    type: Number,
    required: true
  },
  temperature: Number,
  humidity: Number,
  gas: Number,
  vibration: Number,
  flame: Boolean,
  motion: Boolean,
  intruderImageURL: String,
  prediction: {
    type: String,
    default: 'normal'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('SensorData', sensorDataSchema);
