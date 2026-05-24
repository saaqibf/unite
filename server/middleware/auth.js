const jwt = require('jsonwebtoken');

// JWT auth — blocks any request without a valid token
function auth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // Marketplace fallback — allow x-unite-user-id header for demo/guest access
  if (!token) {
    const guestId = req.headers['x-unite-user-id'];
    if (guestId) {
      req.user = {
        id: guestId,
        name: req.headers['x-unite-user-name'] || 'UNite Student',
        program: req.headers['x-unite-user-program'] || 'UCalgary'
      };
      return next();
    }
    return res.status(401).json({ error: 'Access denied. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ error: 'Session expired. Please log in again.' });
  }
}

// Optional auth — attaches user to req if token present, doesn't block if missing
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    try { req.user = jwt.verify(token, process.env.JWT_SECRET); } catch { req.user = null; }
  }
  next();
}

module.exports = { auth, optionalAuth };
