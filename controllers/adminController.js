const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Alert = require('../models/Alert'); // ✅ For ML Alert Summary (AI)

exports.listUsers = async (req, res) => {
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
    const user = await User.findByIdAndUpdate(req.params.id, { role: 'admin' }, { new: true });
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
    const user = await User.findByIdAndUpdate(req.params.id, { role: 'guest' }, { new: true });
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
    const user = await User.findById(req.params.id).lean();
    if (!user) return res.redirect('/admin/users');

    if (req.session.user?.username === user.username) {
      return res.redirect('/admin/users'); // prevent self-deletion
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

exports.viewLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).lean();

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    const recentLogs = logs.filter(log => new Date(log.createdAt) > yesterday);

    const promoteCount = recentLogs.filter(log => log.action.includes('Promoted')).length;
    const demoteCount = recentLogs.filter(log => log.action.includes('Demoted')).length;
    const deleteCount = recentLogs.filter(log => log.action.includes('Deleted')).length;

    const summary = `In the last 24 hours: ${promoteCount} promoted, ${demoteCount} demoted, ${deleteCount} deleted.`;

    res.render('logs', { logs, summary });
  } catch (err) {
    console.error('Error fetching logs:', err);
    res.status(500).send('Internal Server Error');
  }
};

exports.downloadLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).lean();
    const logText = logs.map(log => `${log.createdAt} - ${log.action} by ${log.performedBy}`).join('\n');

    res.setHeader('Content-disposition', 'attachment; filename=audit-logs.txt');
    res.setHeader('Content-type', 'text/plain');
    res.send(logText);
  } catch (err) {
    console.error('Error downloading logs:', err);
    res.status(500).send('Internal Server Error');
  }
};

// ✅ ML Alert Summary for Admin Dashboard
exports.getMLAlertStats = async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const alerts = await Alert.find({ createdAt: { $gte: sevenDaysAgo } }).lean();

    if (!alerts.length) {
      return res.json({ total: 0, perType: {} });
    }

    const grouped = alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {});

    res.json({
      total: alerts.length,
      perType: grouped
    });
  } catch (err) {
    console.error('Error fetching ML alert stats:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
