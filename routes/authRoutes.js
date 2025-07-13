const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// 🔐 Login Routes
router.get('/login', authController.showLogin);
router.post('/login', authController.login);

// 👤 Register Routes
router.get('/register', authController.showRegister);
router.post('/register', authController.register);

// 📧 Forgot Password Routes
router.get('/forgot', authController.showForgot);
router.post('/forgot', authController.forgot);

// 🔁 Reset Password Routes
router.get('/reset/:token', authController.showReset);
router.post('/reset/:token', authController.reset);

// 🚪 Logout Route
router.get('/logout', authController.logout);

module.exports = router;
