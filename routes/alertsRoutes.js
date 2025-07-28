const express = require('express');
const router = express.Router();
const alertsController = require('../controllers/alerts');
const { requireAuth } = require('../middleware/authMiddleware');

// GET /alerts - Protected route to show all ML alerts
router.get('/', requireAuth, alertsController.getAlertsPage);

module.exports = router;
