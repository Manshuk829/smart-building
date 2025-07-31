const express = require('express');
const router = express.Router();

// ✅ Use correct filename with capital "C"
const pageController = require('../controllers/pageController'); // If filename is pageController.js

const { isAuthenticated } = require('../middleware/authMiddleware');

// 📊 Dashboard
router.get('/', isAuthenticated, pageController.showDashboard);

// 📺 Live View
router.get('/live', isAuthenticated, pageController.showLive);

// 📜 History
router.get('/history', isAuthenticated, pageController.showHistory);

// 📈 Charts
router.get('/charts', isAuthenticated, pageController.showCharts);

module.exports = router;
