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
  try {
    const { username = '', password = '' } = req.body;
    const user = await User.findOne({ username: username.trim() });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.render('login', { error: '❌ Invalid username or password', success: null });
    }

    req.session.user = { username: user.username, role: user.role };
    res.redirect('/');
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).render('login', { error: 'Server error', success: null });
  }
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
  try {
    const { username = '', password = '', role } = req.body;

    if (!username || !password || !role) {
      return res.render('register', { error: 'All fields are required.', success: null });
    }

    if (password.length < 6) {
      return res.render('register', { error: 'Password must be at least 6 characters.', success: null });
    }

    const existingUser = await User.findOne({ username: username.trim() });
    if (existingUser) {
      return res.render('register', { error: 'Username already exists', success: null });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await new User({ username: username.trim(), password: hashedPassword, role }).save();

    res.redirect('/login?success=✅ Registered successfully! You can now login.');
  } catch (err) {
    console.error('❌ Registration error:', err);
    res.render('register', { error: 'Registration failed', success: null });
  }
};

// Show Forgot Password Page
exports.showForgot = (req, res) => {
  res.render('forgot', { error: null, success: null });
};

// Handle Forgot Password
exports.forgot = async (req, res) => {
  try {
    const username = req.body.username?.trim();
    const user = await User.findOne({ username });

    if (!user) {
      return res.render('forgot', { error: 'User not found', success: null });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetToken = hashedToken;
    user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
    await user.save();

    const isSecure = req.protocol === 'https' || process.env.NODE_ENV === 'production';
    const resetURL = `${isSecure ? 'https' : 'http'}://${req.headers.host}/reset/${rawToken}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      to: username,
      from: process.env.EMAIL_USER,
      subject: 'Smart Building Password Reset',
      html: `
        <h3>🔐 Password Reset</h3>
        <p>Click the link below to reset your password:</p>
        <a href="${resetURL}">${resetURL}</a>
        <p>This link will expire in 1 hour.</p>
      `,
    });

    console.log(`📧 Reset link sent to ${username}: ${resetURL}`);
    res.render('forgot', { error: null, success: '📧 Reset email sent!' });
  } catch (err) {
    console.error('❌ Forgot password error:', err);
    res.render('forgot', { error: 'Failed to send reset email.', success: null });
  }
};

// Show Reset Password Page
exports.showReset = async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      resetToken: hashedToken,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.render('reset', {
        token: req.params.token,
        error: '⛔ Token expired or invalid',
        success: null,
      });
    }

    res.render('reset', {
      token: req.params.token,
      error: null,
      success: null,
    });
  } catch (err) {
    console.error('❌ Show reset error:', err);
    res.render('reset', {
      token: req.params.token,
      error: 'Something went wrong.',
      success: null,
    });
  }
};

// Handle Reset Password
exports.reset = async (req, res) => {
  try {
    const { password, confirm } = req.body;
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      resetToken: hashedToken,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.render('reset', {
        token: req.params.token,
        error: '⛔ Token expired or invalid',
        success: null,
      });
    }

    if (password !== confirm) {
      return res.render('reset', {
        token: req.params.token,
        error: '❌ Passwords do not match',
        success: null,
      });
    }

    if (password.length < 6) {
      return res.render('reset', {
        token: req.params.token,
        error: 'Password must be at least 6 characters.',
        success: null,
      });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.redirect('/login?success=✅ Password updated! You can now log in.');
  } catch (err) {
    console.error('❌ Reset password error:', err);
    res.render('reset', {
      token: req.params.token,
      error: 'Failed to reset password.',
      success: null,
    });
  }
};
