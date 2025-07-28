// routes/viewRoutes.js

const express = require('express');
const router = express.Router();
const viewController = require('../controllers/viewController');
const { requireAuth } = require('../middleware/authMiddleware');

// 🔐 Protected View Routes
router.get('/', requireAuth, viewController.dashboard);
router.get('/live', requireAuth, viewController.liveView);
router.get('/history', requireAuth, viewController.history);
router.get('/charts', requireAuth, viewController.charts);

module.exports = router;
