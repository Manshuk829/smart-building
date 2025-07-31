const express = require('express');
const router = express.Router();
const pageController = require('../controllers/pageController');
const { isAuthenticated } = require('../middleware/authMiddleware');

// Dashboard
router.get('/', isAuthenticated, pageController.dashboard);

// Live View
router.get('/live', isAuthenticated, pageController.liveView);

// History
router.get('/history', isAuthenticated, pageController.history);

// Charts
router.get('/charts', isAuthenticated, pageController.charts);

module.exports = router;
