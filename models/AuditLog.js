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
    required: false, // Optional for general actions not tied to a specific floor
  },
  performedBy: {
    type: String,
    required: true,
    trim: true,
  }
}, {
  timestamps: { createdAt: true, updatedAt: false } // Adds createdAt only
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
