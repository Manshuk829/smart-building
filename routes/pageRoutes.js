// routes/pageRoutes.js

const express = require('express');
const router = express.Router();
const pageController = require('../controllers/pageController');
const { isAuthenticated } = require('../middleware/authMiddleware');

// ✅ All below routes require authentication
router.get('/', isAuthenticated, pageController.showDashboard);
router.get('/live', isAuthenticated, pageController.showLive);
router.get('/history', isAuthenticated, pageController.showHistory);
router.get('/charts', isAuthenticated, pageController.showCharts);

module.exports = router;
