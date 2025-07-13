const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');

// Show Login Page
exports.showLogin = (req, res) => {
  const { success } = req.query;
  res.render('login', { error: null, success });
};

// Handle Login
exports.login = async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.render('login', { error: 'Invalid username or password', success: null });
  }

  req.session.user = { username: user.username, role: user.role };
  res.redirect('/');
};

// Logout
exports.logout = (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
};

// Show Register Page
exports.showRegister = (req, res) => {
  res.render('register', { error: null, success: null });
};

// Handle Register
exports.register = async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.render('register', { error: 'All fields are required.', success: null });
  }

  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.render('register', { error: 'Username already exists', success: null });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await new User({ username, password: hashedPassword, role }).save();

  // Redirect with success message
  res.redirect('/login?success=✅ Registered successfully! You can now login.');
};

// Show Forgot Password Page
exports.showForgot = (req, res) => {
  res.render('forgot', { error: null, success: null });
};

// Handle Forgot Password
exports.forgot = async (req, res) => {
  const { username } = req.body;
  const user = await User.findOne({ username });

  if (!user) {
    return res.render('forgot', { error: 'User not found', success: null });
  }

  const token = crypto.randomBytes(32).toString('hex');
  user.resetToken = token;
  user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
  await user.save();

  const resetURL = `http://${req.headers.host}/reset/${token}`;
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  await transporter.sendMail({
    to: username,
    from: process.env.EMAIL_USER,
    subject: 'Smart Building Password Reset',
    html: `<h3>🔐 Password Reset</h3><p>Click below to reset your password:</p><a href="${resetURL}">${resetURL}</a><p>This link will expire in 1 hour.</p>`
  });

  res.render('forgot', { error: null, success: '📧 Reset email sent!' });
};

// Show Reset Page
exports.showReset = async (req, res) => {
  const user = await User.findOne({
    resetToken: req.params.token,
    resetTokenExpiry: { $gt: Date.now() }
  });

  if (!user) {
    return res.render('reset', {
      token: req.params.token,
      error: '⛔ Token expired or invalid',
      success: null
    });
  }

  res.render('reset', {
    token: req.params.token,
    error: null,
    success: null
  });
};

// Handle Reset Password
exports.reset = async (req, res) => {
  const { password, confirm } = req.body;
  const user = await User.findOne({
    resetToken: req.params.token,
    resetTokenExpiry: { $gt: Date.now() }
  });

  if (!user) {
    return res.render('reset', {
      token: req.params.token,
      error: '⛔ Token expired or invalid',
      success: null
    });
  }

  if (password !== confirm) {
    return res.render('reset', {
      token: req.params.token,
      error: '❌ Passwords do not match',
      success: null
    });
  }

  user.password = await bcrypt.hash(password, 10);
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  await user.save();

  // Redirect with password update success
  res.redirect('/login?success=✅ Password updated! You can now log in.');
};
