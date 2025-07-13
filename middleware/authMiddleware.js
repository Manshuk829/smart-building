// middleware/authMiddleware.js

exports.isAuthenticated = (req, res, next) => {
  if (req.session?.user) {
    return next();
  }
  console.warn('🔒 Access denied: not logged in');
  return res.redirect('/login');
};

exports.isAdmin = (req, res, next) => {
  if (req.session?.user?.role === 'admin') {
    return next();
  }

  console.warn(`🚫 Admin access denied for user: ${req.session?.user?.username || 'Unknown'}`);
  res.status(403).send('Access Denied: Admins only');
};
