// middleware/authMiddleware.js

// ✅ Middleware: Only logged-in users can proceed
const isAuthenticated = (req, res, next) => {
  const user = req.session?.user;

  if (user) {
    res.locals.user = user; // Make user data available in views
    return next();
  }

  console.warn(`🔒 Access denied to '${req.originalUrl}': not logged in`);
  return res.status(401).redirect('/login');
};

// ✅ Middleware: Only admins can access
const isAdmin = (req, res, next) => {
  const user = req.session?.user;

  if (user?.role === 'admin') {
    res.locals.user = user;
    return next();
  }

  console.warn(`🚫 Admin access denied to '${req.originalUrl}' for user: ${user?.username || 'Unknown'}`);
  return res.status(403).send('Access Denied: Admins only');
};

module.exports = {
  isAuthenticated,
  isAdmin,
};
