const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// GET / - list all customers (admin view)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.created_at,
              COUNT(DISTINCT t.id) AS total_transfers,
              COALESCE(SUM(t.amount), 0) AS total_amount
       FROM users u
       LEFT JOIN transfers t ON u.id = t.sender_id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List customers error:', err.message);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// GET /:id - get single customer with stats
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.created_at,
              COUNT(DISTINCT t.id) AS total_transfers,
              COALESCE(SUM(t.amount), 0) AS total_amount
       FROM users u
       LEFT JOIN transfers t ON u.id = t.sender_id
       WHERE u.id = $1
       GROUP BY u.id`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get customer error:', err.message);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// POST / - create new customer profile
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, address, country } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'name and email are required' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Customer with this email already exists' });
    }

    const result = await pool.query(
      `INSERT INTO users (name, email, phone, address, country)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, phone, address, country, created_at`,
      [name, email, phone || null, address || null, country || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create customer error:', err.message);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// PUT /:id - update customer
router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, address, country } = req.body;

    const existing = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const result = await pool.query(
      `UPDATE users
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           phone = COALESCE($3, phone),
           address = COALESCE($4, address),
           country = COALESCE($5, country),
           updated_at = NOW()
       WHERE id = $6
       RETURNING id, name, email, phone, address, country, created_at, updated_at`,
      [name, email, phone, address, country, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update customer error:', err.message);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// DELETE /:id - delete customer
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    console.error('Delete customer error:', err.message);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

module.exports = router;
