// middleware/authMiddleware.js

// ✅ Middleware: Only logged-in users can proceed
const isAuthenticated = (req, res, next) => {
  if (req.session?.user) {
    res.locals.user = req.session.user; // Makes user info available in EJS views
    return next();
  }
  console.warn('🔒 Access denied: not logged in');
  return res.status(401).redirect('/login');
};

// ✅ Middleware: Only admins can access
const isAdmin = (req, res, next) => {
  const user = req.session?.user;
  if (user?.role === 'admin') {
    res.locals.user = user;
    return next();
  }

  console.warn(`🚫 Admin access denied for user: ${user?.username || 'Unknown'}`);
  return res.status(403).send('Access Denied: Admins only');
};

module.exports = {
  isAuthenticated,
  isAdmin,
};
