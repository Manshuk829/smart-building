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
  temperature: Number,
  humidity: Number,
  gas: Number,
  flame: Boolean,
  motion: Boolean,
  vibration: Number,

  // ESP32-CAM intruder image (optional)
  intruderImageURL: {
    type: String, // Image URL (can be local path or cloud-hosted)
    default: null,
  }

}, { timestamps: true }); // Automatically adds createdAt and updatedAt

module.exports = mongoose.model('SensorData', sensorDataSchema);