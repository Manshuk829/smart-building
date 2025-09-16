// routes/pageRoutes.js
const express = require('express');
const router = express.Router();
const pageController = require('../controllers/pageController');
const { requireLogin } = require('../middleware/authMiddleware');

// Dashboard (now mapped to /dashboard)
router.get('/dashboard', requireLogin, pageController.showDashboard);

// Live View
router.get('/live', requireLogin, pageController.showLive);

// History
router.get('/history', requireLogin, pageController.showHistory);

// Charts
router.get('/charts', requireLogin, pageController.showCharts);

// Evacuation Routes
router.get('/evacuation', requireLogin, pageController.showEvacuation);
router.get('/face-training', requireLogin, pageController.showFaceTraining);

module.exports = router;
