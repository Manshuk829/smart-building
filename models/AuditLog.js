const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    trim: true
  },
  floor: {
    type: Number,
    min: 1,
    max: 4,
    required: false // For system-wide actions
  },
  performedBy: {
    type: String,
    required: true,
    trim: true,
    enum: ['Admin', 'User', 'ML-Pipeline', 'ESP32-CAM', 'System'],
    default: 'System' // Most automated logs will fall here
  },
  details: {
    type: String,
    trim: true,
    default: ''
  },
  ipAddress: {
    type: String,
    trim: true,
    default: ''
  },
  success: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: { createdAt: 'timestamp', updatedAt: false }
});

// ✅ Index for efficient queries (e.g., recent logs)
auditLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
