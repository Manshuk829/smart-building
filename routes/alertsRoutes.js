const express = require('express');
const router = express.Router();
const alertsController = require('../controllers/alerts');
const { requireAuth } = require('../middleware/authMiddleware');

// 🧠 Protected route to display all ML alerts (future AI/analytics ready)
router.get('/', requireAuth, alertsController.getAlertsPage);

// Optional: Runtime safety check (only during development)
if (process.env.NODE_ENV !== 'production') {
  if (typeof alertsController.getAlertsPage !== 'function') {
    console.warn('⚠️ Warning: alertsController.getAlertsPage is not defined or not a function');
  }
}

module.exports = router;
