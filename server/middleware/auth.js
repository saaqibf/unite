/**
 * Attaches a demo or JWT user to the request for marketplace routes.
 */
function auth(req, res, next) {
  const id = req.headers['x-unite-user-id'] || 'demo-user';
  const name = req.headers['x-unite-user-name'] || 'UNite Student';
  req.user = { id, name, program: req.headers['x-unite-user-program'] || 'UCalgary' };
  next();
}

module.exports = { auth };
