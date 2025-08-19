const express = require('express');
const { query } = require('../db');
const { comparePassword } = require('../utils/hash');
const { generateToken } = require('../auth');

const router = express.Router();

/**
 * POST /token - OAuth-like login endpoint
 * Expects: { username, password }
 * Returns: { access_token, token_type, expires_in }
 */
router.post('/token', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Find user by username
    const result = await query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = generateToken(user);

    res.json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: 3600, // 60 minutes in seconds
      user: {
        id: user.id,
        username: user.username,
        is_admin: user.is_admin
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
