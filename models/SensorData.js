// models/SensorData.js

const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema({
  floor: {
    type: String, // e.g., "1", "2"
    required: true
  },
  type: {
    type: String,
    required: true // e.g., 'temp', 'gas', 'ml-alert', 'intruderImage'
  },
  payload: {
    type: mongoose.Schema.Types.Mixed, // Can be Number, Boolean, or Base64 String
    required: true
  },
  topic: {
    type: String // e.g., 'iot/sensors', 'iot/esp32cam'
  },
  source: {
    type: String,
    enum: ['sensor', 'ml', 'esp32cam'], // ✅ Added 'esp32cam'
    default: 'sensor'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('SensorData', sensorDataSchema);
