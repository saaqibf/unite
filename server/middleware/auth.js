const jwt = require('jsonwebtoken');

/**
 * Verifies JWT from Authorization header, or accepts demo headers for marketplace dev.
 */
function auth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
      return next();
    } catch (err) {
      return res.status(403).json({ error: 'Session expired. Please log in again.' });
    }
  }

  const demoId = req.headers['x-unite-user-id'];
  if (demoId) {
    req.user = {
      id: demoId,
      email: req.headers['x-unite-user-email'] || 'demo@ucalgary.ca',
      name: req.headers['x-unite-user-name'] || 'UNite Student',
      program: req.headers['x-unite-user-program'] || 'UCalgary'
    };
    return next();
  }

  return res.status(401).json({ error: 'Access denied. Please log in.' });
}

/**
 * Attaches user from JWT when present but does not block the request.
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      req.user = null;
    }
  }
  next();
}

module.exports = { auth, optionalAuth };
