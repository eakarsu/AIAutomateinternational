const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    summary: { corridors: 12, liquidity_shortfalls: 3, trapped_funds: 42000, next_rebalance_hours: 6 },
    corridors: [
      { corridor: 'USD-MXN', demand: 184000, prefunded: 141000, risk: 'high', action: 'rebalance via partner bank' },
      { corridor: 'USD-PHP', demand: 92000, prefunded: 88000, risk: 'medium', action: 'slow large transfers' },
      { corridor: 'EUR-TRY', demand: 51000, prefunded: 67000, risk: 'low', action: 'normal routing' },
    ],
  });
});

router.post('/rebalance', (req, res) => {
  const { corridor = 'USD-MXN', amount = 0 } = req.body || {};
  res.json({ corridor, amount, recommendation: amount > 50000 ? 'split across two liquidity partners' : 'single partner rebalance is acceptable' });
});

module.exports = router;
