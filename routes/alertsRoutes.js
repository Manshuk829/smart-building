const express = require('express');
const router = express.Router();
const alertsController = require('../controllers/alerts');
const { isAuthenticated } = require('../middleware/authMiddleware'); // ✅ FIXED

// Optional warning in development
if (process.env.NODE_ENV !== 'production') {
  if (typeof alertsController.getAlertsPage !== 'function') {
    console.warn('⚠️ Warning: alertsController.getAlertsPage is not defined or not a function');
  }
}

// ✅ Protected route for alerts page
router.get('/', isAuthenticated, alertsController.getAlertsPage);

module.exports = router;
