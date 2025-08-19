const jwt = require('jsonwebtoken');
const { query } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const JWT_EXPIRES_IN = '60m';

/**
 * Generate JWT token for user
 */
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      is_admin: user.is_admin 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Middleware to verify JWT token
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verify user still exists in database
    const result = await query('SELECT id, username, is_admin FROM users WHERE id = $1', [decoded.id]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    console.error('JWT verification error:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Middleware to verify admin privileges
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  next();
};

module.exports = {
  generateToken,
  authenticateToken,
  requireAdmin,
};
