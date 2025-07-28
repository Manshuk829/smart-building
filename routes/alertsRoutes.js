// routes/alertsRoutes.js

const express = require('express');
const router = express.Router();
const alertsController = require('../controllers/alerts');
const { requireAuth } = require('../middleware/authMiddleware');

// 🧠 Protected route to display all ML alerts
router.get('/', requireAuth, alertsController.getAlertsPage);

// Optional dev check for function existence
if (process.env.NODE_ENV !== 'production') {
  if (typeof alertsController.getAlertsPage !== 'function') {
    console.warn('⚠️ Warning: alertsController.getAlertsPage is not defined or not a function');
  }
}

module.exports = router;
