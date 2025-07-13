// routes/pageRoutes.js
const express = require('express');
const router = express.Router();
const pageController = require('../controllers/pageController');

// Auth middleware (you can also extract this later if needed)
const isAuthenticated = (req, res, next) => req.session?.user ? next() : res.redirect('/login');

router.get('/', isAuthenticated, pageController.showDashboard);
router.get('/live', isAuthenticated, pageController.showLive);
router.get('/history', isAuthenticated, pageController.showHistory);
router.get('/charts', isAuthenticated, pageController.showCharts);

module.exports = router;
