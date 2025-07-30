// middleware/authMiddleware.js

// ✅ Middleware: Only logged-in users can proceed
const isAuthenticated = (req, res, next) => {
  // Allow favicon.ico to bypass authentication
  if (req.path === '/favicon.ico') return next();

  const user = req.session?.user;

  if (user) {
    res.locals.user = user; // Makes user info available to EJS views
    return next();
  }

  console.warn(`🔒 Access denied to '${req.originalUrl}': not logged in`);
  return res.redirect('/login'); // ⚠️ Avoid sending 401 before redirect (Render may treat 401 differently)
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
