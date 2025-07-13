// controllers/adminController.js
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

exports.showUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ username: 1 }).lean();
    res.render('admin_users', { users });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).send('Internal Server Error');
  }
};

exports.promoteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { role: 'admin' });
    if (user) {
      await AuditLog.create({
        action: `Promoted user ${user.username} to admin`,
        performedBy: req.session.user?.username || 'System'
      });
    }
    res.redirect('/admin/users');
  } catch (err) {
    console.error('Error promoting user:', err);
    res.status(500).send('Internal Server Error');
  }
};

exports.demoteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { role: 'guest' });
    if (user) {
      await AuditLog.create({
        action: `Demoted admin ${user.username} to guest`,
        performedBy: req.session.user?.username || 'System'
      });
    }
    res.redirect('/admin/users');
  } catch (err) {
    console.error('Error demoting user:', err);
    res.status(500).send('Internal Server Error');
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.redirect('/admin/users');

    // Optional: prevent admin from deleting their own account
    if (req.session.user?.username === user.username) {
      return res.redirect('/admin/users');
    }

    await User.findByIdAndDelete(req.params.id);

    await AuditLog.create({
      action: `Deleted user ${user.username}`,
      performedBy: req.session.user?.username || 'System'
    });

    res.redirect('/admin/users');
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).send('Internal Server Error');
  }
};
