const express = require('express');
const router = express.Router();
const axios = require('axios');
const pool = require('../db');
const auth = require('../middleware/auth');
const fxService = require('../services/fxService');

// All routes require authentication
router.use(auth);

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function getModel() {
  return process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';
}

// Fee schedule by transfer type
const FEE_SCHEDULE = {
  SWIFT: { fixed: 25, percent: 0.005, delivery_days: 3 },   // $25 + 0.5%
  SEPA:  { fixed: 0.5, percent: 0.001, delivery_days: 1 },   // €0.50 + 0.1%
  wire:  { fixed: 15, percent: 0.003, delivery_days: 2 },    // $15 + 0.3%
  ACH:   { fixed: 0, percent: 0.001, delivery_days: 3 },     // free + 0.1%
};

// POST /api/ai/calculate-fee
// Takes { amount, from_currency, to_currency, transfer_type }
// Returns { fee_amount, fee_currency, exchange_rate, recipient_receives, estimated_delivery_days }
router.post('/calculate-fee', async (req, res) => {
  try {
    const { amount, from_currency, to_currency, transfer_type } = req.body;

    if (!amount || !from_currency || !to_currency || !transfer_type) {
      return res.status(400).json({
        error: 'amount, from_currency, to_currency, and transfer_type are required',
      });
    }

    const typeUpper = transfer_type.toUpperCase();
    const schedule = FEE_SCHEDULE[typeUpper] || FEE_SCHEDULE[transfer_type] || FEE_SCHEDULE.wire;
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number' });
    }

    // Fee in source currency
    const fee_amount = parseFloat((schedule.fixed + parsedAmount * schedule.percent).toFixed(2));
    const fee_currency = from_currency.toUpperCase();

    // Exchange rate
    let exchange_rate;
    try {
      exchange_rate = await fxService.getRate(from_currency, to_currency);
    } catch {
      // Fallback: try DB rates
      const srcRate = await pool.query('SELECT exchange_rate_to_usd FROM currencies WHERE code = $1', [from_currency.toUpperCase()]);
      const tgtRate = await pool.query('SELECT exchange_rate_to_usd FROM currencies WHERE code = $1', [to_currency.toUpperCase()]);
      if (srcRate.rows.length === 0 || tgtRate.rows.length === 0) {
        return res.status(400).json({ error: 'Could not resolve exchange rate for given currencies' });
      }
      const amtInUsd = parsedAmount / parseFloat(srcRate.rows[0].exchange_rate_to_usd);
      exchange_rate = amtInUsd * parseFloat(tgtRate.rows[0].exchange_rate_to_usd) / parsedAmount;
    }

    const amountAfterFee = parsedAmount - fee_amount;
    const recipient_receives = parseFloat((amountAfterFee * exchange_rate).toFixed(2));

    res.json({
      amount: parsedAmount,
      from_currency: from_currency.toUpperCase(),
      to_currency: to_currency.toUpperCase(),
      transfer_type: transfer_type.toUpperCase(),
      fee_amount,
      fee_currency,
      exchange_rate: parseFloat(exchange_rate.toFixed(6)),
      recipient_receives,
      estimated_delivery_days: schedule.delivery_days,
    });
  } catch (err) {
    console.error('Calculate fee error:', err.message);
    res.status(500).json({ error: 'Failed to calculate fee', details: err.message });
  }
});

// POST /api/ai/assess-transfer
// Takes { beneficiary_id, amount, purpose }
// Returns { risk_level, flags, recommended_review }
router.post('/assess-transfer', async (req, res) => {
  try {
    const { beneficiary_id, amount, purpose } = req.body;

    if (!beneficiary_id || !amount) {
      return res.status(400).json({ error: 'beneficiary_id and amount are required' });
    }

    // Fetch beneficiary info
    const benefResult = await pool.query(
      'SELECT * FROM beneficiaries WHERE id = $1 AND user_id = $2',
      [beneficiary_id, req.user.id]
    );
    if (benefResult.rows.length === 0) {
      return res.status(404).json({ error: 'Beneficiary not found' });
    }
    const beneficiary = benefResult.rows[0];

    // Fetch user transfer history for context
    const historyResult = await pool.query(
      `SELECT amount, source_currency, target_currency, created_at, status
       FROM transfers
       WHERE sender_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.user.id]
    );

    const transferHistory = historyResult.rows;
    const avgAmount = transferHistory.length > 0
      ? transferHistory.reduce((sum, t) => sum + parseFloat(t.amount), 0) / transferHistory.length
      : 0;

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI features disabled - OPENROUTER_API_KEY not set' });
    }

    const prompt = `You are an AML (Anti-Money Laundering) and transfer risk assessment expert for an international money transfer platform.

Assess the risk of this transfer:
- Beneficiary: ${beneficiary.name}, Country: ${beneficiary.country}, Bank: ${beneficiary.bank_name}
- Transfer amount: ${amount} (user's average transfer: ${avgAmount.toFixed(2)})
- Purpose: ${purpose || 'Not specified'}
- User's recent transfer count: ${transferHistory.length}

Consider:
1. Is the amount unusual compared to the user's history (more than 3x average)?
2. Is the destination country flagged for high financial crime risk (Iran, North Korea, Syria, Cuba, Venezuela, Myanmar, etc.)?
3. Is the stated purpose legitimate and clear?
4. Any other AML/CFT risk indicators?

Respond ONLY with valid JSON (no markdown):
{
  "risk_level": "low|medium|high",
  "flags": ["flag1", "flag2"],
  "recommended_review": true|false,
  "reasoning": "brief explanation"
}`;

    const aiResponse = await axios.post(
      OPENROUTER_URL,
      {
        model: getModel(),
        messages: [
          { role: 'system', content: 'You are an AML compliance expert. Respond only with valid JSON.' },
          { role: 'user', content: prompt },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    let assessment;
    try {
      let content = aiResponse.data.choices[0].message.content;
      // Strip markdown code blocks if present
      const match = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (match) content = match[1];
      assessment = JSON.parse(content.trim());
    } catch {
      assessment = {
        risk_level: 'medium',
        flags: ['AI response parsing failed'],
        recommended_review: true,
        reasoning: aiResponse.data.choices[0].message.content,
      };
    }

    res.json({
      beneficiary_id,
      amount: parseFloat(amount),
      purpose: purpose || null,
      assessed_at: new Date().toISOString(),
      ...assessment,
    });
  } catch (err) {
    console.error('Transfer risk assessment error:', err.message);
    res.status(500).json({ error: 'Failed to assess transfer risk', details: err.message });
  }
});

module.exports = router;
