const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// GET / - list all beneficiaries for current user
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM beneficiaries WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List beneficiaries error:', err.message);
    res.status(500).json({ error: 'Failed to fetch beneficiaries' });
  }
});

// GET /:id - get single beneficiary
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM beneficiaries WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Beneficiary not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get beneficiary error:', err.message);
    res.status(500).json({ error: 'Failed to fetch beneficiary' });
  }
});

// POST / - create beneficiary
router.post('/', async (req, res) => {
  try {
    const { name, email, bank_name, account_number, swift_code, country, currency } = req.body;

    if (!name || !bank_name || !account_number || !country || !currency) {
      return res.status(400).json({ error: 'name, bank_name, account_number, country, and currency are required' });
    }

    const result = await pool.query(
      `INSERT INTO beneficiaries (user_id, name, email, bank_name, account_number, swift_code, country, currency)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [req.user.id, name, email || null, bank_name, account_number, swift_code || null, country, currency]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create beneficiary error:', err.message);
    res.status(500).json({ error: 'Failed to create beneficiary' });
  }
});

// PUT /:id - update beneficiary
router.put('/:id', async (req, res) => {
  try {
    const { name, email, bank_name, account_number, swift_code, country, currency } = req.body;

    const existing = await pool.query('SELECT * FROM beneficiaries WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Beneficiary not found' });
    }

    const result = await pool.query(
      `UPDATE beneficiaries
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           bank_name = COALESCE($3, bank_name),
           account_number = COALESCE($4, account_number),
           swift_code = COALESCE($5, swift_code),
           country = COALESCE($6, country),
           currency = COALESCE($7, currency),
           updated_at = NOW()
       WHERE id = $8 AND user_id = $9
       RETURNING *`,
      [name, email, bank_name, account_number, swift_code, country, currency, req.params.id, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update beneficiary error:', err.message);
    res.status(500).json({ error: 'Failed to update beneficiary' });
  }
});

// DELETE /:id - delete beneficiary
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM beneficiaries WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Beneficiary not found' });
    }

    res.json({ message: 'Beneficiary deleted successfully' });
  } catch (err) {
    console.error('Delete beneficiary error:', err.message);
    res.status(500).json({ error: 'Failed to delete beneficiary' });
  }
});

module.exports = router;
