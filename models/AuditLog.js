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
    required: false, // For system-wide or multi-floor actions
  },
  performedBy: {
    type: String,
    required: true,
    trim: true,
    enum: ['Admin', 'User', 'ML-Pipeline', 'System'],
    default: 'System'
  },
  details: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: { createdAt: 'timestamp', updatedAt: false }
});

// Optional: Improve query performance
auditLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
