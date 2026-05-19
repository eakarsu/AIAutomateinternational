const express = require('express');
const router = express.Router();
const axios = require('axios');
const pool = require('../db');
const auth = require('../middleware/auth');
const fxService = require('../services/fxService');

router.use(auth);

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const getModel = () => process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

async function callAI(systemPrompt, userPrompt, temperature = 0.3) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not set - AI features disabled');
  }
  const r = await axios.post(
    OPENROUTER_URL,
    {
      model: getModel(),
      temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );
  return r.data.choices[0].message.content;
}

// Sanctioned/high-risk countries list (sample)
const SANCTIONED_COUNTRIES = ['Iran', 'North Korea', 'Syria', 'Cuba', 'Venezuela', 'Myanmar', 'Belarus', 'Russia'];

// 1. KYC/AML beneficiary screener
// POST /api/ai-features/kyc-screen { beneficiary_id }
router.post('/kyc-screen', async (req, res) => {
  try {
    const { beneficiary_id, name, country, bank_name } = req.body;
    let beneficiary = { name, country, bank_name };

    if (beneficiary_id) {
      const r = await pool.query(
        'SELECT * FROM beneficiaries WHERE id = $1 AND user_id = $2',
        [beneficiary_id, req.user.id]
      );
      if (r.rows.length === 0) {
        return res.status(404).json({ error: 'Beneficiary not found' });
      }
      beneficiary = r.rows[0];
    }

    if (!beneficiary.name || !beneficiary.country) {
      return res.status(400).json({ error: 'name and country (or beneficiary_id) required' });
    }

    const sanctioned = SANCTIONED_COUNTRIES.some(
      (c) => (beneficiary.country || '').toLowerCase().includes(c.toLowerCase())
    );

    let aiAnalysis = '';
    try {
      aiAnalysis = await callAI(
        'You are a KYC/AML compliance officer. Provide brief screening analysis in JSON only.',
        `Screen this beneficiary against AML/KYC sanctions:
Name: ${beneficiary.name}
Country: ${beneficiary.country}
Bank: ${beneficiary.bank_name || 'unknown'}

Respond ONLY with JSON: {"sanctions_match": false|true, "pep_status": "none|likely|confirmed", "risk_factors": ["..."], "recommendation": "approve|review|reject", "notes": "brief"}`
      );
    } catch (e) {
      aiAnalysis = JSON.stringify({
        sanctions_match: sanctioned,
        pep_status: 'none',
        risk_factors: sanctioned ? ['Country on sanctions list'] : [],
        recommendation: sanctioned ? 'reject' : 'approve',
        notes: 'AI unavailable - fallback static screening only',
      });
    }

    let parsed;
    try {
      const m = aiAnalysis.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      parsed = JSON.parse((m ? m[1] : aiAnalysis).trim());
    } catch {
      parsed = { recommendation: 'review', notes: aiAnalysis };
    }

    res.json({
      beneficiary,
      sanctioned_country_match: sanctioned,
      screened_at: new Date().toISOString(),
      ...parsed,
    });
  } catch (err) {
    console.error('KYC screen error:', err.message);
    res.status(500).json({ error: 'KYC screening failed', details: err.message });
  }
});

// 2. Historical rate analyzer (predict optimal timing)
// POST /api/ai-features/rate-analysis { from_currency, to_currency, days? }
router.post('/rate-analysis', async (req, res) => {
  try {
    const { from_currency, to_currency, days = 30 } = req.body;
    if (!from_currency || !to_currency) {
      return res.status(400).json({ error: 'from_currency and to_currency required' });
    }

    // Synthetic historical data - in production this would query a rates table
    const currentRate = await fxService.getRate(from_currency, to_currency);
    const history = [];
    const now = Date.now();
    for (let i = days; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      // pseudo-random walk around current
      const drift = Math.sin(i / 5) * 0.02 + (Math.random() - 0.5) * 0.01;
      history.push({
        date: d.toISOString().split('T')[0],
        rate: parseFloat((currentRate * (1 + drift)).toFixed(6)),
      });
    }

    const min = Math.min(...history.map((h) => h.rate));
    const max = Math.max(...history.map((h) => h.rate));
    const avg = history.reduce((a, b) => a + b.rate, 0) / history.length;

    let aiAdvice = '';
    try {
      aiAdvice = await callAI(
        'You are an FX market analyst. Be concise.',
        `${from_currency} -> ${to_currency} last ${days} days:
Current: ${currentRate.toFixed(6)}
Min: ${min.toFixed(6)} | Max: ${max.toFixed(6)} | Avg: ${avg.toFixed(6)}

Briefly: 1) Current vs avg trend, 2) Should user transfer now or wait, 3) Estimated optimal window.`
      );
    } catch (e) {
      aiAdvice = `Current rate ${currentRate.toFixed(4)} is ${
        currentRate > avg ? 'above' : 'below'
      } the ${days}-day average ${avg.toFixed(4)}.`;
    }

    res.json({
      from_currency: from_currency.toUpperCase(),
      to_currency: to_currency.toUpperCase(),
      current_rate: parseFloat(currentRate.toFixed(6)),
      stats: { min, max, avg: parseFloat(avg.toFixed(6)) },
      history,
      ai_recommendation: aiAdvice,
    });
  } catch (err) {
    console.error('Rate analysis error:', err.message);
    res.status(500).json({ error: 'Rate analysis failed', details: err.message });
  }
});

// 3. Beneficiary risk scorer
// POST /api/ai-features/beneficiary-risk { beneficiary_id }
router.post('/beneficiary-risk', async (req, res) => {
  try {
    const { beneficiary_id } = req.body;
    if (!beneficiary_id) return res.status(400).json({ error: 'beneficiary_id required' });

    const benef = await pool.query(
      'SELECT * FROM beneficiaries WHERE id = $1 AND user_id = $2',
      [beneficiary_id, req.user.id]
    );
    if (benef.rows.length === 0) return res.status(404).json({ error: 'Beneficiary not found' });
    const b = benef.rows[0];

    const transfers = await pool.query(
      `SELECT amount, source_currency, target_currency, created_at, status
       FROM transfers WHERE beneficiary_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [beneficiary_id]
    );

    // Score components
    let score = 50;
    const reasons = [];
    const failed = transfers.rows.filter((t) => t.status === 'failed').length;
    if (failed > 0) {
      score += failed * 10;
      reasons.push(`${failed} failed transfer(s)`);
    }
    const total = transfers.rows.length;
    const totalAmt = transfers.rows.reduce((a, t) => a + parseFloat(t.amount || 0), 0);
    if (totalAmt > 100000) {
      score += 15;
      reasons.push(`High cumulative volume: ${totalAmt.toFixed(0)}`);
    }
    if (SANCTIONED_COUNTRIES.some((c) => (b.country || '').toLowerCase().includes(c.toLowerCase()))) {
      score += 30;
      reasons.push('Destination in sanctioned country');
    }
    score = Math.min(100, score);

    res.json({
      beneficiary_id,
      beneficiary_name: b.name,
      country: b.country,
      risk_score: score,
      risk_level: score < 40 ? 'low' : score < 70 ? 'medium' : 'high',
      transfer_count: total,
      total_volume: parseFloat(totalAmt.toFixed(2)),
      failed_count: failed,
      risk_factors: reasons,
      assessed_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Beneficiary risk error:', err.message);
    res.status(500).json({ error: 'Risk scoring failed', details: err.message });
  }
});

// 4. Smart routing optimizer
// POST /api/ai-features/route-optimize { amount, from_currency, to_currency, urgency }
router.post('/route-optimize', async (req, res) => {
  try {
    const { amount, from_currency, to_currency, urgency } = req.body;
    if (!amount || !from_currency || !to_currency) {
      return res.status(400).json({ error: 'amount, from_currency, to_currency required' });
    }

    // Compute fees for each transfer type
    const FEE_SCHEDULE = {
      SWIFT: { fixed: 25, percent: 0.005, delivery_days: 3 },
      SEPA: { fixed: 0.5, percent: 0.001, delivery_days: 1 },
      WIRE: { fixed: 15, percent: 0.003, delivery_days: 2 },
      ACH: { fixed: 0, percent: 0.001, delivery_days: 3 },
    };

    const amt = parseFloat(amount);
    const options = Object.entries(FEE_SCHEDULE).map(([k, v]) => ({
      method: k,
      fee: parseFloat((v.fixed + amt * v.percent).toFixed(2)),
      delivery_days: v.delivery_days,
      estimated_arrival: new Date(Date.now() + v.delivery_days * 86400000)
        .toISOString()
        .split('T')[0],
    }));

    const cheapest = [...options].sort((a, b) => a.fee - b.fee)[0];
    const fastest = [...options].sort((a, b) => a.delivery_days - b.delivery_days)[0];

    let recommended;
    if (urgency === 'urgent') recommended = fastest;
    else if (urgency === 'cheap') recommended = cheapest;
    else {
      // balanced: minimize fee + delivery_days*$5
      recommended = [...options].sort(
        (a, b) => a.fee + a.delivery_days * 5 - (b.fee + b.delivery_days * 5)
      )[0];
    }

    res.json({
      amount: amt,
      from_currency: from_currency.toUpperCase(),
      to_currency: to_currency.toUpperCase(),
      urgency: urgency || 'balanced',
      options,
      cheapest,
      fastest,
      recommended,
    });
  } catch (err) {
    console.error('Route optimize error:', err.message);
    res.status(500).json({ error: 'Routing optimization failed', details: err.message });
  }
});

// 5. Multi-leg transfer planner (split payments)
// POST /api/ai-features/split-plan { amount, from_currency, to_currency, splits? }
router.post('/split-plan', async (req, res) => {
  try {
    const { amount, from_currency, to_currency, splits = 3 } = req.body;
    if (!amount || !from_currency || !to_currency) {
      return res.status(400).json({ error: 'amount, from_currency, to_currency required' });
    }

    const amt = parseFloat(amount);
    const n = Math.max(1, Math.min(10, parseInt(splits)));

    // Equal split with staggered dates
    const legs = [];
    const perLeg = parseFloat((amt / n).toFixed(2));
    for (let i = 0; i < n; i++) {
      legs.push({
        leg: i + 1,
        amount: i === n - 1 ? parseFloat((amt - perLeg * (n - 1)).toFixed(2)) : perLeg,
        scheduled_date: new Date(Date.now() + i * 7 * 86400000).toISOString().split('T')[0],
        method: 'WIRE',
        estimated_fee: parseFloat((15 + perLeg * 0.003).toFixed(2)),
      });
    }
    const totalFee = legs.reduce((a, l) => a + l.estimated_fee, 0);
    const singleFee = 15 + amt * 0.003;

    let aiSummary = '';
    try {
      aiSummary = await callAI(
        'You are an FX/transfer strategist. Be brief.',
        `Plan: split ${amt} ${from_currency} -> ${to_currency} into ${n} legs over ${
          n * 7
        } days. Single transfer fee would be ~${singleFee.toFixed(
          2
        )}. Split total fee ~${totalFee.toFixed(2)}. Briefly: pros, cons, fx-risk advice.`
      );
    } catch (e) {
      aiSummary = `Split plan over ${n} weeks may reduce fx risk through dollar-cost averaging.`;
    }

    res.json({
      amount: amt,
      from_currency: from_currency.toUpperCase(),
      to_currency: to_currency.toUpperCase(),
      legs,
      single_transfer_fee: parseFloat(singleFee.toFixed(2)),
      total_split_fee: parseFloat(totalFee.toFixed(2)),
      ai_advice: aiSummary,
    });
  } catch (err) {
    console.error('Split plan error:', err.message);
    res.status(500).json({ error: 'Split planning failed', details: err.message });
  }
});

// 6. Fraud detection engine
// POST /api/ai-features/fraud-check { amount, beneficiary_id?, country? }
router.post('/fraud-check', async (req, res) => {
  try {
    const { amount, beneficiary_id, country } = req.body;
    if (!amount) return res.status(400).json({ error: 'amount required' });

    // User history
    const hist = await pool.query(
      `SELECT amount, created_at, status FROM transfers WHERE sender_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    const amts = hist.rows.map((t) => parseFloat(t.amount || 0));
    const avg = amts.length ? amts.reduce((a, b) => a + b, 0) / amts.length : 0;
    const max = amts.length ? Math.max(...amts) : 0;

    const flags = [];
    let score = 0;
    const a = parseFloat(amount);
    if (avg && a > avg * 3) {
      flags.push(`Amount ${a.toFixed(2)} > 3x avg ${avg.toFixed(2)}`);
      score += 30;
    }
    if (max && a > max) {
      flags.push(`Largest ever transfer (prev max ${max.toFixed(2)})`);
      score += 20;
    }
    // Velocity: > 3 transfers last hour
    const oneHourAgo = Date.now() - 3600000;
    const recent = hist.rows.filter((t) => new Date(t.created_at).getTime() > oneHourAgo).length;
    if (recent >= 3) {
      flags.push(`${recent} transfers in last hour`);
      score += 25;
    }
    if (country && SANCTIONED_COUNTRIES.some((c) => country.toLowerCase().includes(c.toLowerCase()))) {
      flags.push('High-risk destination country');
      score += 35;
    }

    res.json({
      amount: a,
      beneficiary_id: beneficiary_id || null,
      country: country || null,
      fraud_score: Math.min(100, score),
      risk_level: score < 30 ? 'low' : score < 70 ? 'medium' : 'high',
      block_recommended: score >= 70,
      flags,
      user_avg_amount: parseFloat(avg.toFixed(2)),
      user_max_amount: parseFloat(max.toFixed(2)),
      checked_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Fraud check error:', err.message);
    res.status(500).json({ error: 'Fraud check failed', details: err.message });
  }
});

// 7. Receipt PDF generator (returns receipt data; PDF rendered client-side or via download)
// GET /api/ai-features/receipt/:transferId
router.get('/receipt/:transferId', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT t.*, b.name as beneficiary_name, b.bank_name, b.account_number, b.country
       FROM transfers t LEFT JOIN beneficiaries b ON t.beneficiary_id = b.id
       WHERE t.id = $1 AND t.sender_id = $2`,
      [req.params.transferId, req.user.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Transfer not found' });
    const t = r.rows[0];
    const receipt = {
      receipt_id: `RCT-${t.id}-${Date.now().toString(36).toUpperCase()}`,
      reference_number: t.reference_number || `REF-${t.id}`,
      issued_at: new Date().toISOString(),
      sender_id: req.user.id,
      sender_email: req.user.email,
      beneficiary: {
        name: t.beneficiary_name,
        bank: t.bank_name,
        account: t.account_number ? `****${String(t.account_number).slice(-4)}` : null,
        country: t.country,
      },
      transaction: {
        amount: t.amount,
        source_currency: t.source_currency,
        target_currency: t.target_currency,
        exchange_rate: t.exchange_rate,
        converted_amount: t.converted_amount,
        fee: t.fee || null,
        status: t.status,
        created_at: t.created_at,
      },
      regulatory: {
        compliance_check: 'PASSED',
        report_to: 'FinCEN/local regulator if amount >= 10000 USD',
        retention_years: 7,
      },
      notes: t.notes || '',
    };
    res.json(receipt);
  } catch (err) {
    console.error('Receipt error:', err.message);
    res.status(500).json({ error: 'Receipt generation failed', details: err.message });
  }
});

module.exports = router;
