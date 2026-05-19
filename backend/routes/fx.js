const express = require('express');
const router = express.Router();
const fxService = require('../services/fxService');
const auth = require('../middleware/auth');

// GET /api/fx/rates?base=USD - get cached exchange rates
router.get('/rates', auth, async (req, res) => {
  try {
    const base = (req.query.base || 'USD').toUpperCase();
    const data = await fxService.getRates(base);
    res.json({
      base: data.base,
      rates: data.rates,
      fetched_at: data.fetchedAt ? new Date(data.fetchedAt).toISOString() : null,
      cache_age_seconds: data.fetchedAt ? Math.floor((Date.now() - data.fetchedAt) / 1000) : null,
    });
  } catch (err) {
    console.error('FX rates error:', err.message);
    res.status(500).json({ error: 'Failed to fetch exchange rates', details: err.message });
  }
});

// GET /api/fx/rate?from=USD&to=EUR - get single pair rate
router.get('/rate', auth, async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: 'from and to query params are required' });
    }
    const rate = await fxService.getRate(from, to);
    res.json({ from: from.toUpperCase(), to: to.toUpperCase(), rate });
  } catch (err) {
    console.error('FX rate pair error:', err.message);
    res.status(500).json({ error: 'Failed to fetch rate', details: err.message });
  }
});

module.exports = router;
