const jwt = require('jsonwebtoken');

// Builds a demo user object for when DB is unavailable
function demoUser(email) {
  return { id: null, email: email || 'demo@ucalgary.ca', name: 'UNite Student', program: 'UCalgary' };
}

// JWT auth — accepts real JWTs, demo-* tokens, and x-unite-user-id headers
function auth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // No token at all — try header-based guest access (Pair B marketplace pattern)
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

  // Demo token issued when DB is unavailable — allow through with a placeholder user
  if (token.startsWith('demo-')) {
    req.user = demoUser();
    return next();
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
    if (token.startsWith('demo-')) { req.user = demoUser(); }
    else {
      try { req.user = jwt.verify(token, process.env.JWT_SECRET); } catch { req.user = null; }
    }
  }
  next();
}

module.exports = { auth, optionalAuth };
