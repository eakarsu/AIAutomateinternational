// Apply pass 5 — additive backlog endpoints
// All endpoints below are NEEDS-CREDS, NEEDS-PRODUCT-DECISION, or TOO-RISKY-but-additive.
// Documented env vars:
//   SWIFT_API_KEY      — SWIFT settlement tracking (NEEDS-CREDS)
//   WISE_API_KEY       — Wise partner API (NEEDS-CREDS)
//   REMITLY_API_KEY    — Remitly partner API (NEEDS-CREDS)
//   OFAC_API_KEY       — Treasury OFAC SDN feed (NEEDS-CREDS)
// PRODUCT-DECISION: USDC settlement uses non-custodial model (no on-chain transactions
// performed server-side). Server records intent only; signing happens client-side.
//
// Bulk transfer: TOO-RISKY for real DB writes. We expose a *plan* endpoint that
// only validates and computes per-leg fees in-memory, with an explicit `dry_run` flag.
const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

function gate(envVar) {
  return (req, res, next) => {
    if (!process.env[envVar] || process.env[envVar].includes('your_') || process.env[envVar] === 'placeholder') {
      return res.status(503).json({ error: 'Integration not configured', missing: envVar });
    }
    next();
  };
}

// Lazy additive tables
async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS settlement_events (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      transfer_id INTEGER,
      provider VARCHAR(64),
      status VARCHAR(64),
      payload JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usdc_settlement_intents (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      transfer_id INTEGER,
      amount NUMERIC(20,6),
      wallet_address VARCHAR(128),
      status VARCHAR(32) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {});
}
ensureTables();

// ---- 1. SWIFT settlement tracking ----
router.post('/swift/track', gate('SWIFT_API_KEY'), async (req, res) => {
  res.json({ ok: true, provider: 'swift', message: 'SWIFT tracking would call gpi service here' });
});

// ---- 2. Wise integration ----
router.post('/wise/quote', gate('WISE_API_KEY'), async (req, res) => {
  res.json({ ok: true, provider: 'wise', message: 'Wise quote would be requested here' });
});

// ---- 3. Remitly integration ----
router.post('/remitly/quote', gate('REMITLY_API_KEY'), async (req, res) => {
  res.json({ ok: true, provider: 'remitly', message: 'Remitly quote would be requested here' });
});

// ---- 4. OFAC live screening ----
router.post('/ofac/screen', gate('OFAC_API_KEY'), async (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  res.json({ ok: true, provider: 'ofac', name, hits: [], note: 'placeholder until OFAC SDN feed is configured' });
});

// ---- 5. USDC settlement intent (PRODUCT-DECISION: non-custodial) ----
router.post('/usdc/intent', async (req, res) => {
  try {
    const { transfer_id, amount, wallet_address } = req.body || {};
    if (!amount || !wallet_address) return res.status(400).json({ error: 'amount and wallet_address required' });
    const r = await pool.query(
      `INSERT INTO usdc_settlement_intents (user_id, transfer_id, amount, wallet_address)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, transfer_id || null, amount, wallet_address]
    );
    res.json({ intent: r.rows[0], note: 'PRODUCT-DECISION: non-custodial — sign and broadcast client-side' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/usdc/intents', async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM usdc_settlement_intents WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',
      [req.user.id]
    );
    res.json({ intents: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- 6. Bulk transfer plan (TOO-RISKY → dry-run only) ----
router.post('/bulk/plan', async (req, res) => {
  const { transfers } = req.body || {};
  if (!Array.isArray(transfers) || transfers.length === 0) {
    return res.status(400).json({ error: 'transfers[] required' });
  }
  const plan = transfers.map((t, idx) => ({
    index: idx,
    amount: Number(t.amount) || 0,
    currency_from: t.currency_from || 'USD',
    currency_to: t.currency_to || 'USD',
    estimated_fee: Math.max(2.5, (Number(t.amount) || 0) * 0.005),
  }));
  const total_amount = plan.reduce((s, p) => s + p.amount, 0);
  const total_fees = plan.reduce((s, p) => s + p.estimated_fee, 0);
  res.json({ dry_run: true, plan, total_amount, total_fees });
});

// ---- 7. Settlement events log (NEEDS-CREDS for live; additive read endpoint) ----
router.get('/settlements', async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM settlement_events WHERE user_id=$1 ORDER BY created_at DESC LIMIT 200',
      [req.user.id]
    );
    res.json({ events: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
