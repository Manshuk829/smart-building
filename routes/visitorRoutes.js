const express = require('express');
const router = express.Router();
const visitorController = require('../controllers/visitorController');
const { requireLogin, requireAdmin } = require('../middleware/authMiddleware');

// Visitor registration (for regular users)
router.get('/visitors', requireLogin, visitorController.showRegisterVisitor);
router.post('/visitors', requireLogin, visitorController.registerVisitor);

// Visitor management (admin only)
router.get('/admin/visitors', requireAdmin, visitorController.showVisitorManagement);
router.post('/admin/visitors/:visitorId/status', requireAdmin, visitorController.updateVisitorStatus);

// API endpoints for visitor access
router.post('/api/visitor/check', visitorController.checkVisitorAccess);
router.get('/api/visitors/floor/:floor', visitorController.getCurrentVisitors);

module.exports = router;
