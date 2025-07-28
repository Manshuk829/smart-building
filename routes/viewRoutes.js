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

// Optional: Dev check to warn about missing handlers
if (process.env.NODE_ENV !== 'production') {
  const requiredHandlers = ['dashboard', 'liveView', 'history', 'charts'];
  requiredHandlers.forEach(fn => {
    if (typeof viewController[fn] !== 'function') {
      console.warn(`⚠️ Warning: viewController.${fn} is not defined or not a function`);
    }
  });
}

module.exports = router;
