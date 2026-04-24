const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// GET / - list all transactions with optional type filter
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    let query = 'SELECT * FROM transactions WHERE user_id = $1';
    const params = [req.user.id];

    if (type) {
      query += ' AND type = $2';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List transactions error:', err.message);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// GET /:id - get single transaction
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM transactions WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get transaction error:', err.message);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// POST / - create transaction
router.post('/', async (req, res) => {
  try {
    const { type, amount, currency, description, reference_id } = req.body;

    if (!type || !amount || !currency) {
      return res.status(400).json({ error: 'type, amount, and currency are required' });
    }

    const validTypes = ['deposit', 'withdrawal', 'transfer', 'exchange'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
    }

    const result = await pool.query(
      `INSERT INTO transactions (user_id, type, amount, currency, description, reference_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, type, amount, currency, description || null, reference_id || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create transaction error:', err.message);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// PUT /:id - update transaction
router.put('/:id', async (req, res) => {
  try {
    const { type, amount, currency, description } = req.body;

    const existing = await pool.query('SELECT * FROM transactions WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const result = await pool.query(
      `UPDATE transactions
       SET type = COALESCE($1, type),
           amount = COALESCE($2, amount),
           currency = COALESCE($3, currency),
           description = COALESCE($4, description),
           updated_at = NOW()
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [type, amount, currency, description, req.params.id, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update transaction error:', err.message);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// DELETE /:id - delete transaction
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ message: 'Transaction deleted successfully' });
  } catch (err) {
    console.error('Delete transaction error:', err.message);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

module.exports = router;
