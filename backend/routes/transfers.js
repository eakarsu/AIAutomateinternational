const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const pool = require('../db');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// 10 transfer creations per user per day
const transferRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => (req.user && req.user.id ? String(req.user.id) : req.ip),
  message: { error: 'Daily transfer limit reached. Maximum 10 transfers per day.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// GET / - list all transfers with optional status filter
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT t.*, b.name AS recipient_name
      FROM transfers t
      LEFT JOIN beneficiaries b ON t.beneficiary_id = b.id
      WHERE t.sender_id = $1
    `;
    const params = [req.user.id];

    if (status) {
      query += ' AND t.status = $2';
      params.push(status);
    }

    query += ' ORDER BY t.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List transfers error:', err.message);
    res.status(500).json({ error: 'Failed to fetch transfers' });
  }
});

// GET /:id - get single transfer
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, b.name AS recipient_name, b.bank_name, b.account_number, b.swift_code, b.country
       FROM transfers t
       LEFT JOIN beneficiaries b ON t.beneficiary_id = b.id
       WHERE t.id = $1 AND t.sender_id = $2`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get transfer error:', err.message);
    res.status(500).json({ error: 'Failed to fetch transfer' });
  }
});

// POST / - create new transfer
router.post('/', transferRateLimiter, async (req, res) => {
  try {
    const { beneficiary_id, amount, source_currency, target_currency, notes } = req.body;

    if (!beneficiary_id || !amount || !source_currency || !target_currency) {
      return res.status(400).json({ error: 'beneficiary_id, amount, source_currency, and target_currency are required' });
    }

    // Get exchange rates for conversion
    const sourceRate = await pool.query('SELECT exchange_rate_to_usd FROM currencies WHERE code = $1', [source_currency]);
    const targetRate = await pool.query('SELECT exchange_rate_to_usd FROM currencies WHERE code = $1', [target_currency]);

    if (sourceRate.rows.length === 0 || targetRate.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid currency code' });
    }

    const amountInUsd = parseFloat(amount) / parseFloat(sourceRate.rows[0].exchange_rate_to_usd);
    const converted_amount = (amountInUsd * parseFloat(targetRate.rows[0].exchange_rate_to_usd)).toFixed(2);
    const exchange_rate = (converted_amount / parseFloat(amount)).toFixed(6);

    const reference_number = `TRF-${Date.now()}`;

    const result = await pool.query(
      `INSERT INTO transfers (sender_id, beneficiary_id, amount, converted_amount, source_currency, target_currency, exchange_rate, status, reference_number, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9)
       RETURNING *`,
      [req.user.id, beneficiary_id, amount, converted_amount, source_currency, target_currency, exchange_rate, reference_number, notes || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create transfer error:', err.message);
    res.status(500).json({ error: 'Failed to create transfer' });
  }
});

// PUT /:id - update transfer
router.put('/:id', async (req, res) => {
  try {
    const { amount, source_currency, target_currency, status, notes } = req.body;

    const existing = await pool.query('SELECT * FROM transfers WHERE id = $1 AND sender_id = $2', [req.params.id, req.user.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    const result = await pool.query(
      `UPDATE transfers
       SET amount = COALESCE($1, amount),
           source_currency = COALESCE($2, source_currency),
           target_currency = COALESCE($3, target_currency),
           status = COALESCE($4, status),
           notes = COALESCE($5, notes),
           updated_at = NOW()
       WHERE id = $6 AND sender_id = $7
       RETURNING *`,
      [amount, source_currency, target_currency, status, notes, req.params.id, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update transfer error:', err.message);
    res.status(500).json({ error: 'Failed to update transfer' });
  }
});

// DELETE /:id - delete transfer
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM transfers WHERE id = $1 AND sender_id = $2 RETURNING *', [req.params.id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    res.json({ message: 'Transfer deleted successfully' });
  } catch (err) {
    console.error('Delete transfer error:', err.message);
    res.status(500).json({ error: 'Failed to delete transfer' });
  }
});

module.exports = router;
