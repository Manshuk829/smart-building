const express = require('express');
const router = express.Router();
const alertsController = require('../controllers/alerts');
const { requireLogin } = require('../middleware/authMiddleware'); // ✅ Consistent naming

// Optional warning in development
if (process.env.NODE_ENV !== 'production') {
  if (typeof alertsController.getAlertsPage !== 'function') {
    console.warn('⚠️ Warning: alertsController.getAlertsPage is not defined or not a function');
  }
}

// ✅ Protected route for alerts page
router.get('/', requireLogin, alertsController.getAlertsPage);

module.exports = router;
