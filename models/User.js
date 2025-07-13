// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'guest'], default: 'guest' },
  resetToken: { type: String },
  resetTokenExpiry: { type: Date }
});

module.exports = mongoose.model('User', userSchema);
