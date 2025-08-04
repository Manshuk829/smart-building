const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
    trim: true
  },
  floor: {
    type: Number,
    required: true,
    min: 1,
    max: 4 // Matches your 4-floor building
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info'
  },
  alertType: {
    type: String,
    enum: ['manual', 'ml', 'sensor', 'esp32cam'], // ✅ Added 'esp32cam' for intruder image alerts
    default: 'manual'
  },
  source: {
    type: String,
    enum: ['system', 'user', 'ml', 'esp32cam'], // ✅ Optional: clarify who/what triggered it
    default: 'system'
  }
}, {
  timestamps: { createdAt: 'timestamp', updatedAt: false } // ✅ Use 'timestamp' instead of default 'createdAt'
});

// 📌 Optional index to speed up querying recent alerts per floor
alertSchema.index({ floor: 1, timestamp: -1 });

module.exports = mongoose.model('Alert', alertSchema);
