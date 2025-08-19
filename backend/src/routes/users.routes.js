const express = require('express');
const { query } = require('../db');
const { hashPassword } = require('../utils/hash');
const { authenticateToken, requireAdmin } = require('../auth');

const router = express.Router();

/**
 * GET /users - List all users (admin only)
 */
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, username, is_admin, created_at FROM users ORDER BY created_at DESC'
    );

    res.json({
      users: result.rows,
      total: result.rows.length
    });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /users - Create new user (admin only)
 * Expects: { username, password, is_admin }
 */
router.post('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { username, password, is_admin = false } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if username already exists
    const existingUser = await query('SELECT id FROM users WHERE username = $1', [username]);
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const result = await query(
      'INSERT INTO users (username, password_hash, is_admin) VALUES ($1, $2, $3) RETURNING id, username, is_admin, created_at',
      [username, passwordHash, is_admin]
    );

    const newUser = result.rows[0];

    res.status(201).json({
      message: 'User created successfully',
      user: newUser
    });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /users/:id - Get user details (admin only)
 */
router.get('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    const result = await query(
      'SELECT id, username, is_admin, created_at FROM users WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /users/:id - Update user details (admin only)
 * Expects: { username?, password?, is_admin? }
 */
router.put('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    const { username, password, is_admin } = req.body;
    if (username === undefined && password === undefined && is_admin === undefined) {
      return res.status(400).json({ error: 'No fields provided for update' });
    }

    const fields = [];
    const params = [];
    let idx = 1;
    if (username !== undefined) {
      if (typeof username !== 'string' || username.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters' });
      }
      // Check if username taken by another user
      const existing = await query('SELECT id FROM users WHERE username = $1 AND id <> $2', [username, id]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Username already exists' });
      }
      fields.push(`username = $${idx++}`);
      params.push(username);
    }
    if (password !== undefined) {
      if (typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      const passwordHash = await hashPassword(password);
      fields.push(`password_hash = $${idx++}`);
      params.push(passwordHash);
    }
    if (is_admin !== undefined) {
      fields.push(`is_admin = $${idx++}`);
      params.push(Boolean(is_admin));
    }
    params.push(id);

    const updateQuery = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING id, username, is_admin, created_at
    `;
    const result = await query(updateQuery, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /users/:id - Delete user (admin only)
 */
router.delete('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    // Prevent admin deleting themselves
    if (req.user.id === id) {
      return res.status(400).json({ error: 'You cannot delete your own user' });
    }
    const result = await query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully', id });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
