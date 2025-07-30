// routes/viewRoutes.js

const express = require('express');
const router = express.Router();
const viewController = require('../controllers/viewController');
const alertsController = require('../controllers/alerts');
const { isAuthenticated } = require('../middleware/authMiddleware');

// 🔐 Apply authentication to all routes below
router.use(isAuthenticated);

// Protected Views
router.get('/', viewController.dashboard);
router.get('/live', viewController.liveView);
router.get('/history', viewController.history);
router.get('/charts', viewController.charts);
router.get('/alerts', alertsController.getAlertsPage);

// ✅ Dev check: warn if any handlers are missing
if (process.env.NODE_ENV !== 'production') {
  const requiredHandlers = ['dashboard', 'liveView', 'history', 'charts'];
  requiredHandlers.forEach(fn => {
    if (typeof viewController[fn] !== 'function') {
      console.warn(`⚠️ Warning: viewController.${fn} is not defined or not a function`);
    }
  });
}

module.exports = router;
