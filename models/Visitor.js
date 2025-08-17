const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  phone: {
    type: String,
    required: true,
    trim: true
  },
  
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  
  registeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  registeredFor: {
    type: String, // Name of the person they're visiting
    required: true,
    trim: true
  },
  
  floor: {
    type: Number,
    required: true,
    min: 1,
    max: 4
  },
  
  purpose: {
    type: String,
    required: true,
    trim: true
  },
  
  expectedArrival: {
    type: Date,
    required: true
  },
  
  expectedDeparture: {
    type: Date,
    required: true
  },
  
  accessCode: {
    type: String,
    required: true,
    unique: true,
    default: () => Math.random().toString(36).substring(2, 8).toUpperCase()
  },
  
  status: {
    type: String,
    enum: ['pending', 'approved', 'denied', 'expired', 'completed'],
    default: 'pending'
  },
  
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  approvedAt: {
    type: Date
  },
  
  actualArrival: {
    type: Date
  },
  
  actualDeparture: {
    type: Date
  },
  
  notes: {
    type: String,
    trim: true
  }
  
}, {
  timestamps: true
});

// Index for efficient queries
visitorSchema.index({ status: 1, expectedArrival: 1 });
visitorSchema.index({ accessCode: 1 });
visitorSchema.index({ registeredBy: 1 });

// Method to check if visitor is currently valid
visitorSchema.methods.isValid = function() {
  const now = new Date();
  return this.status === 'approved' && 
         now >= this.expectedArrival && 
         now <= this.expectedDeparture;
};

// Method to check if visitor has expired
visitorSchema.methods.isExpired = function() {
  const now = new Date();
  return now > this.expectedDeparture;
};

module.exports = mongoose.model('Visitor', visitorSchema);
