const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /convert - convert amount between currencies (must be before /:code)
router.get('/convert', async (req, res) => {
  try {
    const { from, to, amount } = req.query;

    if (!from || !to || !amount) {
      return res.status(400).json({ error: 'from, to, and amount query parameters are required' });
    }

    const fromResult = await pool.query('SELECT exchange_rate_to_usd FROM currencies WHERE code = $1', [from]);
    const toResult = await pool.query('SELECT exchange_rate_to_usd FROM currencies WHERE code = $1', [to]);

    if (fromResult.rows.length === 0) {
      return res.status(404).json({ error: `Currency ${from} not found` });
    }
    if (toResult.rows.length === 0) {
      return res.status(404).json({ error: `Currency ${to} not found` });
    }

    const fromRate = parseFloat(fromResult.rows[0].exchange_rate_to_usd);
    const toRate = parseFloat(toResult.rows[0].exchange_rate_to_usd);
    const amountInUsd = parseFloat(amount) / fromRate;
    const convertedAmount = (amountInUsd * toRate).toFixed(2);
    const exchangeRate = (toRate / fromRate).toFixed(6);

    res.json({
      from,
      to,
      amount: parseFloat(amount),
      converted_amount: parseFloat(convertedAmount),
      exchange_rate: parseFloat(exchangeRate),
    });
  } catch (err) {
    console.error('Convert currency error:', err.message);
    res.status(500).json({ error: 'Failed to convert currency' });
  }
});

// GET / - list all currencies
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM currencies ORDER BY code ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('List currencies error:', err.message);
    res.status(500).json({ error: 'Failed to fetch currencies' });
  }
});

// GET /:code - get specific currency
router.get('/:code', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM currencies WHERE code = $1', [req.params.code]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Currency not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get currency error:', err.message);
    res.status(500).json({ error: 'Failed to fetch currency' });
  }
});

// POST / - add new currency
router.post('/', async (req, res) => {
  try {
    const { code, name, symbol, exchange_rate_to_usd } = req.body;

    if (!code || !name || !exchange_rate_to_usd) {
      return res.status(400).json({ error: 'code, name, and exchange_rate_to_usd are required' });
    }

    const result = await pool.query(
      'INSERT INTO currencies (code, name, symbol, exchange_rate_to_usd) VALUES ($1, $2, $3, $4) RETURNING *',
      [code, name, symbol || null, exchange_rate_to_usd]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create currency error:', err.message);
    res.status(500).json({ error: 'Failed to create currency' });
  }
});

// PUT /:id - update currency
router.put('/:id', async (req, res) => {
  try {
    const { code, name, symbol, exchange_rate_to_usd } = req.body;

    const existing = await pool.query('SELECT * FROM currencies WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Currency not found' });
    }

    const result = await pool.query(
      `UPDATE currencies
       SET code = COALESCE($1, code),
           name = COALESCE($2, name),
           symbol = COALESCE($3, symbol),
           exchange_rate_to_usd = COALESCE($4, exchange_rate_to_usd),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [code, name, symbol, exchange_rate_to_usd, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update currency error:', err.message);
    res.status(500).json({ error: 'Failed to update currency' });
  }
});

// DELETE /:id - delete currency
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM currencies WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Currency not found' });
    }

    res.json({ message: 'Currency deleted successfully' });
  } catch (err) {
    console.error('Delete currency error:', err.message);
    res.status(500).json({ error: 'Failed to delete currency' });
  }
});

module.exports = router;
