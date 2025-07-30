const express = require('express');
const router = express.Router();
const pageController = require('../controllers/pageController');
const { isAuthenticated } = require('../middleware/authMiddleware');

// ✅ All routes below are protected by session middleware
router.get('/', isAuthenticated, pageController.showDashboard);
router.get('/live', isAuthenticated, pageController.showLive);
router.get('/history', isAuthenticated, pageController.showHistory);
router.get('/charts', isAuthenticated, pageController.showCharts);

module.exports = router;
