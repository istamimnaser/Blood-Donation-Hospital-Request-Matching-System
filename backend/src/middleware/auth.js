const jwt = require('jsonwebtoken');

// Verifies the Bearer token and attaches { id, role, email } to req.user.
// Pass a role ('donor' | 'hospital') to also reject the other account type.
function requireAuth(role) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (role && payload.role !== role) {
        return res.status(403).json({ error: `This action requires a ${role} account` });
      }
      req.user = payload;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

module.exports = { requireAuth };
