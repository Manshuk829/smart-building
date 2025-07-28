// routes/authRoutes.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// =====================
// 🔐 AUTHENTICATION ROUTES
// =====================

// 🟢 Login
router.get('/login', authController.showLogin);       // Show login form
router.post('/login', authController.login);          // Handle login submission

// 🆕 Register
router.get('/register', authController.showRegister); // Show register form
router.post('/register', authController.register);    // Handle registration

// 🔑 Forgot Password
router.get('/forgot', authController.showForgot);     // Show forgot password form
router.post('/forgot', authController.forgot);        // Send reset link via email

// 🔁 Reset Password via Token
router.get('/reset/:token', authController.showReset); // Show reset form
router.post('/reset/:token', authController.reset);    // Handle reset submission

// 🚪 Logout
router.get('/logout', authController.logout);         // Clear session + redirect

module.exports = router;
