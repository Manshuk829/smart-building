const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAdmin } = require('../middleware/authMiddleware');

// 🧠 AI-ready: Centralized admin user management
router.get('/users', isAdmin, adminController.listUsers);
router.post('/users/:id/promote', isAdmin, adminController.promoteUser);
router.post('/users/:id/demote', isAdmin, adminController.demoteUser);
router.post('/users/:id/delete', isAdmin, adminController.deleteUser);

// 🕵️‍♂️ Audit log management for accountability
router.get('/logs', isAdmin, adminController.viewLogs);
router.get('/logs/download', isAdmin, adminController.downloadLogs);

// Optional safety: Check for missing handlers (in dev)
if (process.env.NODE_ENV !== 'production') {
  const requiredHandlers = [
    'listUsers', 'promoteUser', 'demoteUser', 'deleteUser',
    'viewLogs', 'downloadLogs'
  ];
  requiredHandlers.forEach(fn => {
    if (typeof adminController[fn] !== 'function') {
      console.warn(`⚠️ Warning: adminController.${fn} is not defined or not a function`);
    }
  });
}

module.exports = router;
