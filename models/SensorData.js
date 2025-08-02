// models/SensorData.js

const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema({
  floor: {
    type: String, // Using String because mqttController uses `floorStr`
    required: true
  },
  type: {
    type: String,
    required: true // e.g., 'temp', 'gas', 'ml-alert'
  },
  payload: {
    type: mongoose.Schema.Types.Mixed, // Can be number, boolean, or string
    required: true
  },
  topic: {
    type: String
  },
  source: {
    type: String,
    enum: ['sensor', 'ml'],
    default: 'sensor'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('SensorData', sensorDataSchema);
