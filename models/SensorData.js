const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema({
  topic: {
    type: String,
    required: true
  },
  floor: {
    type: String,         // store as "1", "2", etc.
    required: true
  },
  type: {
    type: String,         // e.g., temp, gas, flame, motion
    required: true
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  source: {
    type: String,
    enum: ['sensor', 'ml'],
    default: 'sensor'
  },
  time: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

sensorDataSchema.index({ floor: 1, type: 1, time: -1 });

module.exports = mongoose.model('SensorData', sensorDataSchema);
