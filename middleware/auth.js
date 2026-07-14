function getBearerToken(headerValue) {
  if (!headerValue) {
    return '';
  }

  var match = /^Bearer\s+(.+)$/i.exec(headerValue);
  return match ? match[1] : '';
}

function tokenFromRequest(req) {
  return req.get('x-its-auth-token') ||
    getBearerToken(req.get('authorization')) ||
    (req.cookies && req.cookies.its_auth_token) ||
    req.query.authToken ||
    '';
}

function createAuthMiddleware(options) {
  options = options || {};
  var token = options.token || process.env.ITS_AUTH_TOKEN;

  return function authMiddleware(req, res, next) {
    if (!token) {
      return next();
    }

    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return next();
    }

    if (tokenFromRequest(req) === token) {
      return next();
    }

    res.status(401).json({ Result: 'ERROR', Message: 'Unauthorized' });
  };
}

module.exports = createAuthMiddleware;
