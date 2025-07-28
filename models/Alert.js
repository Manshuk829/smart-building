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
    max: 4
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info'
  },
  alertType: {
    type: String,
    enum: ['manual', 'ml', 'sensor'],
    default: 'manual'
  }
}, {
  timestamps: { createdAt: 'timestamp', updatedAt: false } // use 'timestamp' field instead of 'createdAt'
});

// Optional: Index on floor and timestamp for efficient queries
alertSchema.index({ floor: 1, timestamp: -1 });

module.exports = mongoose.model('Alert', alertSchema);
