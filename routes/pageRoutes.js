// routes/pageRoutes.js

const express = require('express');
const router = express.Router();
const pageController = require('../controllers/pageController');
const { requireAuth } = require('../middleware/authMiddleware');

// 👁️‍🗨️ Main Dashboard Routes (Protected)
router.get('/', requireAuth, pageController.showDashboard);
router.get('/live', requireAuth, pageController.showLive);
router.get('/history', requireAuth, pageController.showHistory);
router.get('/charts', requireAuth, pageController.showCharts);

module.exports = router;
