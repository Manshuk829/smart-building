// routes/viewRoutes.js

const express = require('express');
const router = express.Router();
const viewController = require('../controllers/viewController');
const { isAuthenticated } = require('../middleware/authMiddleware');

// 🔐 Protected View Routes
router.get('/', isAuthenticated, viewController.dashboard);
router.get('/live', isAuthenticated, viewController.liveView);
router.get('/history', isAuthenticated, viewController.history);
router.get('/charts', isAuthenticated, viewController.charts);

module.exports = router;
