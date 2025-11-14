const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  password: {
    type: String,
    required: true
    // Password should be hashed before save (handled in controller or pre-hook)
  },

  role: {
    type: String,
    enum: ['admin', 'guest'],
    default: 'guest'
  },

  email: {
    type: String,
    required: false,
    trim: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ // optional validation if added
  },

  resetToken: {
    type: String,
    default: null
  },

  resetTokenExpiry: {
    type: Date,
    default: null
  },

  status: {
    type: String,
    enum: ['active', 'blocked'],
    default: 'active'
  }

}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

module.exports = mongoose.model('User', userSchema);
