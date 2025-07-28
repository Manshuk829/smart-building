const express = require('express');
const router = express.Router();
const alertsController = require('../controllers/alerts');
const { requireAuth } = require('../middleware/authMiddleware');

if (process.env.NODE_ENV !== 'production') {
  if (typeof alertsController.getAlertsPage !== 'function') {
    console.warn('⚠️ Warning: alertsController.getAlertsPage is not defined or not a function');
  }
}

router.get('/', requireAuth, alertsController.getAlertsPage);

module.exports = router;
