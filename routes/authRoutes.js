const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireLogin } = require('../middleware/authMiddleware');

// =====================
// 🔐 AUTHENTICATION ROUTES
// =====================

// ✅ FIXED: Redirect root based on session
router.get('/', (req, res) => {
  if (req.session.authUser) {
    return res.redirect('/dashboard'); // Redirect to actual dashboard route
  }
  return res.redirect('/login');
});

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

// Profile routes
router.get('/profile', requireLogin, authController.showProfile);
router.post('/profile/update', requireLogin, authController.updateProfile);
router.post('/profile/delete', requireLogin, authController.deleteAccount);

// 🚪 Logout
router.get('/logout', authController.logout);          // Clear session and redirect to login

// 🧪 Dev-only: Check current session status
router.get('/check-session', (req, res) => {
  console.log('📦 Current session:', req.session.authUser);
  res.json(req.session.authUser || { message: '❌ No session found' });
});

// ✅ TEMP: Debug session creation manually
router.get('/debug-session', (req, res) => {
  req.session.test = 'Session working';
  console.log('✅ /debug-session set test session');
  res.send('✅ Session test set. Now visit /check-debug-session.');
});

router.get('/check-debug-session', (req, res) => {
  const value = req.session.test;
  res.send(`Session value: ${value || '❌ No session found'}`);
});

module.exports = router;
