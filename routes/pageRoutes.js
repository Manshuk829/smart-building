// routes/pageRoutes.js

const express = require('express');
const router = express.Router();
const pageController = require('../controllers/pageController');
const { requireAuth } = require('../middleware/authMiddleware');

// ✅ Middleware-protected dashboard routes
router.get('/', (req, res, next) => {
  if (!req.session?.user) {
    console.warn("🔒 Access denied to '/': not logged in");
    return res.redirect('/login');
  }
  return pageController.showDashboard(req, res, next);
});

router.get('/live', requireAuth, pageController.showLive);
router.get('/history', requireAuth, pageController.showHistory);
router.get('/charts', requireAuth, pageController.showCharts);

module.exports = router;
