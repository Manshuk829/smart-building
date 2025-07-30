const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// =====================
// 🔐 AUTHENTICATION ROUTES
// =====================

// 🌐 Redirect root to login page
router.get('/', (req, res) => res.redirect('/login'));

// 🟢 Login
router.get('/login', authController.showLogin);        // Show login form
router.post('/login', authController.login);           // Handle login submission

// 🆕 Register
router.get('/register', authController.showRegister);  // Show register form
router.post('/register', authController.register);     // Handle registration

// 🔑 Forgot Password
router.get('/forgot', authController.showForgot);      // Show forgot password form
router.post('/forgot', authController.forgot);         // Send reset link via email

// 🔁 Reset Password via Token
router.get('/reset/:token', authController.showReset); // Show reset form
router.post('/reset/:token', authController.reset);    // Handle reset submission

// 🚪 Logout
router.get('/logout', authController.logout);          // Clear session and redirect to login

// 🧪 Dev-only: Check current session status
router.get('/check-session', (req, res) => {
  console.log('📦 Current session:', req.session.authUser);
  res.json(req.session.authUser || { message: '❌ No session found' });
});

module.exports = router;
