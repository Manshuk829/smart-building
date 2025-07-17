// models/AuditLog.js
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    trim: true,
  },
  floor: {
    type: Number,
    min: 1,
    max: 4,
    required: false, // Optional for general system actions
  },
  performedBy: {
    type: String,
    required: true,
    trim: true,
    enum: ['Admin', 'User', 'ML-Pipeline', 'System'],
    default: 'System'
  }
}, {
  timestamps: { createdAt: true, updatedAt: false } // Adds only createdAt
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
