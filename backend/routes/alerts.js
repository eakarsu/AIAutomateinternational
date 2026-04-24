const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// GET / - list all alerts for user
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM rate_alerts WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List alerts error:', err.message);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// GET /:id - get single alert
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM rate_alerts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get alert error:', err.message);
    res.status(500).json({ error: 'Failed to fetch alert' });
  }
});

// POST / - create alert
router.post('/', async (req, res) => {
  try {
    const { currency_pair, target_rate, direction, is_active } = req.body;

    if (!currency_pair || !target_rate || !direction) {
      return res.status(400).json({ error: 'currency_pair, target_rate, and direction are required' });
    }

    if (!['above', 'below'].includes(direction)) {
      return res.status(400).json({ error: 'direction must be either "above" or "below"' });
    }

    const result = await pool.query(
      `INSERT INTO rate_alerts (user_id, currency_pair, target_rate, direction, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.id, currency_pair, target_rate, direction, is_active !== undefined ? is_active : true]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create alert error:', err.message);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

// PUT /:id - update alert
router.put('/:id', async (req, res) => {
  try {
    const { currency_pair, target_rate, direction, is_active } = req.body;

    const existing = await pool.query('SELECT * FROM rate_alerts WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const result = await pool.query(
      `UPDATE rate_alerts
       SET currency_pair = COALESCE($1, currency_pair),
           target_rate = COALESCE($2, target_rate),
           direction = COALESCE($3, direction),
           is_active = COALESCE($4, is_active),
           updated_at = NOW()
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [currency_pair, target_rate, direction, is_active, req.params.id, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update alert error:', err.message);
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

// DELETE /:id - delete alert
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM rate_alerts WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ message: 'Alert deleted successfully' });
  } catch (err) {
    console.error('Delete alert error:', err.message);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

// POST /:id/toggle - toggle alert active/inactive
router.post('/:id/toggle', async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM rate_alerts WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const newActive = !existing.rows[0].is_active;

    const result = await pool.query(
      'UPDATE rate_alerts SET is_active = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
      [newActive, req.params.id, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Toggle alert error:', err.message);
    res.status(500).json({ error: 'Failed to toggle alert' });
  }
});

module.exports = router;
