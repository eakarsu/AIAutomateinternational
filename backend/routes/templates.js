const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// GET / - list all templates for user
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, b.name AS beneficiary_name
       FROM transfer_templates t
       LEFT JOIN beneficiaries b ON t.beneficiary_id = b.id
       WHERE t.user_id = $1
       ORDER BY t.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List templates error:', err.message);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// GET /:id - get single template
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, b.name AS beneficiary_name
       FROM transfer_templates t
       LEFT JOIN beneficiaries b ON t.beneficiary_id = b.id
       WHERE t.id = $1 AND t.user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get template error:', err.message);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// POST / - create template
router.post('/', async (req, res) => {
  try {
    const { name, beneficiary_id, amount, source_currency, target_currency, description } = req.body;

    if (!name || !beneficiary_id || !amount || !source_currency || !target_currency) {
      return res.status(400).json({ error: 'name, beneficiary_id, amount, source_currency, and target_currency are required' });
    }

    const result = await pool.query(
      `INSERT INTO transfer_templates (user_id, name, beneficiary_id, amount, source_currency, target_currency, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.user.id, name, beneficiary_id, amount, source_currency, target_currency, description || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create template error:', err.message);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// PUT /:id - update template
router.put('/:id', async (req, res) => {
  try {
    const { name, beneficiary_id, amount, source_currency, target_currency, description } = req.body;

    const existing = await pool.query('SELECT * FROM transfer_templates WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const result = await pool.query(
      `UPDATE transfer_templates
       SET name = COALESCE($1, name),
           beneficiary_id = COALESCE($2, beneficiary_id),
           amount = COALESCE($3, amount),
           source_currency = COALESCE($4, source_currency),
           target_currency = COALESCE($5, target_currency),
           description = COALESCE($6, description),
           updated_at = NOW()
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [name, beneficiary_id, amount, source_currency, target_currency, description, req.params.id, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update template error:', err.message);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// DELETE /:id - delete template
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM transfer_templates WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ message: 'Template deleted successfully' });
  } catch (err) {
    console.error('Delete template error:', err.message);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// POST /:id/execute - execute a template (create a transfer from it)
router.post('/:id/execute', async (req, res) => {
  try {
    const templateResult = await pool.query(
      'SELECT * FROM transfer_templates WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (templateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = templateResult.rows[0];

    // Get exchange rates for conversion
    const sourceRate = await pool.query('SELECT exchange_rate_to_usd FROM currencies WHERE code = $1', [template.source_currency]);
    const targetRate = await pool.query('SELECT exchange_rate_to_usd FROM currencies WHERE code = $1', [template.target_currency]);

    if (sourceRate.rows.length === 0 || targetRate.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid currency in template' });
    }

    const amountInUsd = parseFloat(template.amount) / parseFloat(sourceRate.rows[0].exchange_rate_to_usd);
    const converted_amount = (amountInUsd * parseFloat(targetRate.rows[0].exchange_rate_to_usd)).toFixed(2);
    const exchange_rate = (converted_amount / parseFloat(template.amount)).toFixed(6);

    const reference_number = `TRF-${Date.now()}`;

    const transferResult = await pool.query(
      `INSERT INTO transfers (sender_id, beneficiary_id, amount, converted_amount, source_currency, target_currency, exchange_rate, status, reference_number, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9)
       RETURNING *`,
      [req.user.id, template.beneficiary_id, template.amount, converted_amount, template.source_currency, template.target_currency, exchange_rate, reference_number, template.description || null]
    );

    res.status(201).json(transferResult.rows[0]);
  } catch (err) {
    console.error('Execute template error:', err.message);
    res.status(500).json({ error: 'Failed to execute template' });
  }
});

module.exports = router;
