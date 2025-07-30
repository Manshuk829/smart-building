const express = require('express');
const router = express.Router();
const viewController = require('../controllers/viewController');
const alertsController = require('../controllers/alerts');
const { isAuthenticated } = require('../middleware/authMiddleware');

// 🔐 Apply authentication to all routes
router.use(isAuthenticated);

// ✅ Protected Views
router.get('/', viewController.dashboard);
router.get('/live', viewController.liveView);
router.get('/history', viewController.history);
router.get('/charts', viewController.charts);
router.get('/alerts', alertsController.getAlertsPage);

// ✅ Dev check: warn if any handlers are missing
if (process.env.NODE_ENV !== 'production') {
  const requiredViewHandlers = ['dashboard', 'liveView', 'history', 'charts'];
  requiredViewHandlers.forEach(fn => {
    if (typeof viewController[fn] !== 'function') {
      console.warn(`⚠️ Warning: viewController.${fn} is not defined or not a function`);
    }
  });

  if (typeof alertsController.getAlertsPage !== 'function') {
    console.warn(`⚠️ Warning: alertsController.getAlertsPage is not defined or not a function`);
  }
}

module.exports = router;
