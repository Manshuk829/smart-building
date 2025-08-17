const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog'); // Added AuditLog import

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// Show login page
exports.showLogin = (req, res) => {
  const { success } = req.query;
  res.render('login', { error: null, success });
};

// Handle login
exports.login = async (req, res) => {
  try {
    const { username = '', password = '' } = req.body;
    const user = await User.findOne({ username: username.trim() });

    if (!user) {
      return res.render('login', { error: '❌ Invalid username or password', success: null });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render('login', { error: '❌ Invalid username or password', success: null });
    }

    // Set session
    req.session.authUser = {
      id: user._id,
      username: user.username,
      role: user.role
    };

    // Debug logging
    console.log('✅ Session assigned:', req.session.authUser);
    console.log('📦 Cookies before saving session:', req.cookies);
    console.log('🔐 Headers:', req.headers);

    // Save session explicitly before redirecting
    req.session.save(err => {
      if (err) {
        console.error("❌ Session save error:", err);
        return res.status(500).render('login', { error: 'Session error', success: null });
      }

      console.log('✅ Session saved successfully.');
      return res.redirect('/');
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).render('login', { error: 'Server error', success: null });
  }
};

// Handle logout
exports.logout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("❌ Logout error:", err);
    }
    res.redirect('/login');
  });
};

// Show register page
exports.showRegister = (req, res) => {
  res.render('register', { error: null, success: null });
};

// Handle registration
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
      return res.render('register', { error: 'Username already exists.', success: null });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await new User({ username: username.trim(), password: hashedPassword, role }).save();

    return res.redirect('/login?success=' + encodeURIComponent('✅ Registered successfully! You can now login.'));
  } catch (error) {
    console.error("❌ Registration error:", error);
    res.status(500).render('register', { error: 'Registration failed.', success: null });
  }
};

// Show forgot password page
exports.showForgot = (req, res) => {
  res.render('forgot', { error: null, success: null });
};

// Handle forgot password
exports.forgot = async (req, res) => {
  try {
    const username = req.body.username?.trim();
    const user = await User.findOne({ username });

    if (!user) {
      return res.render('forgot', { error: 'User not found.', success: null });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetToken = hashedToken;
    user.resetTokenExpiry = Date.now() + RESET_TOKEN_EXPIRY_MS;
    await user.save();

    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
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

    res.render('forgot', { error: null, success: '📧 Reset email sent!' });
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    res.render('forgot', { error: 'Failed to send reset email.', success: null });
  }
};

// Show reset password page
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

    res.render('reset', { token: req.params.token, error: null, success: null });
  } catch (error) {
    console.error("❌ Show reset error:", error);
    res.render('reset', { token: req.params.token, error: 'Something went wrong.', success: null });
  }
};

// Handle reset password
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

    return res.redirect('/login?success=' + encodeURIComponent('✅ Password updated! You can now log in.'));
  } catch (error) {
    console.error("❌ Reset password error:", error);
    res.render('reset', { token: req.params.token, error: 'Failed to reset password.', success: null });
  }
};

// User Profile Management
exports.showProfile = async (req, res) => {
  try {
    if (!req.session.authUser) {
      return res.redirect('/login');
    }
    
    const user = await User.findById(req.session.authUser._id).lean();
    if (!user) {
      req.session.destroy();
      return res.redirect('/login');
    }
    
    res.render('profile', {
      user,
      success: req.query.success,
      error: req.query.error
    });
    
  } catch (err) {
    console.error('❌ Profile error:', err);
    res.redirect('/login');
  }
};

exports.updateProfile = async (req, res) => {
  try {
    if (!req.session.authUser) {
      return res.redirect('/login');
    }
    
    const { username, email, currentPassword, newPassword, confirmPassword } = req.body;
    
    // Validate input
    if (!username || !email) {
      return res.redirect('/profile?error=Username and email are required');
    }
    
    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
      _id: { $ne: req.session.authUser._id }
    });
    
    if (existingUser) {
      return res.redirect('/profile?error=Username or email already exists');
    }
    
    // Update basic info
    const updateData = { username, email };
    
    // Handle password change
    if (currentPassword && newPassword && confirmPassword) {
      if (newPassword !== confirmPassword) {
        return res.redirect('/profile?error=New passwords do not match');
      }
      
      if (newPassword.length < 6) {
        return res.redirect('/profile?error=Password must be at least 6 characters');
      }
      
      // Verify current password
      const user = await User.findById(req.session.authUser._id);
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      
      if (!isValidPassword) {
        return res.redirect('/profile?error=Current password is incorrect');
      }
      
      // Hash new password
      updateData.password = await bcrypt.hash(newPassword, 10);
    }
    
    // Update user
    await User.findByIdAndUpdate(req.session.authUser._id, updateData);
    
    // Update session
    req.session.authUser = { ...req.session.authUser, username, email };
    
    // Log the action
    await AuditLog.create({
      action: 'Profile Updated',
      performedBy: req.session.authUser._id,
      details: `User ${username} updated their profile`
    });
    
    res.redirect('/profile?success=Profile updated successfully');
    
  } catch (err) {
    console.error('❌ Profile update error:', err);
    res.redirect('/profile?error=Failed to update profile');
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    if (!req.session.authUser) {
      return res.redirect('/login');
    }
    
    const { confirmPassword } = req.body;
    
    if (!confirmPassword) {
      return res.redirect('/profile?error=Password confirmation required');
    }
    
    // Verify password
    const user = await User.findById(req.session.authUser._id);
    const isValidPassword = await bcrypt.compare(confirmPassword, user.password);
    
    if (!isValidPassword) {
      return res.redirect('/profile?error=Password is incorrect');
    }
    
    // Log the action before deletion
    await AuditLog.create({
      action: 'Account Deleted',
      performedBy: req.session.authUser._id,
      details: `User ${user.username} deleted their account`
    });
    
    // Delete user
    await User.findByIdAndDelete(req.session.authUser._id);
    
    // Destroy session
    req.session.destroy();
    
    res.redirect('/login?message=Account deleted successfully');
    
  } catch (err) {
    console.error('❌ Account deletion error:', err);
    res.redirect('/profile?error=Failed to delete account');
  }
};
