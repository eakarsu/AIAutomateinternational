const express = require('express');
const router = express.Router();
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const pool = require('../db');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// 30 chat messages per user per hour
const chatRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => (req.user && req.user.id ? String(req.user.id) : req.ip),
  message: { error: 'Too many chat messages. Limit is 30 per hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const SYSTEM_PROMPT = `You are a professional international money transfer assistant for AIAutomate International. You help customers with currency exchange, international transfers, and banking queries. Be helpful, professional, and concise. When a customer wants to make a transfer, collect: recipient name, recipient country, amount, currency, and bank details. Provide exchange rate information when asked.`;

// POST / - send message to AI
router.post('/', chatRateLimiter, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    // Save user message to database
    await pool.query(
      'INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)',
      [req.user.id, 'user', message]
    );

    // Get recent chat history for context
    const historyResult = await pool.query(
      'SELECT role, content FROM chat_messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [req.user.id]
    );

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...historyResult.rows.reverse().map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    // Send to OpenRouter API
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: process.env.OPENROUTER_MODEL,
        messages,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const aiMessage = response.data.choices[0].message.content;

    // Save AI response to database
    await pool.query(
      'INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)',
      [req.user.id, 'assistant', aiMessage]
    );

    res.json({ message: aiMessage });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

// GET /history - get chat history
router.get('/history', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, role, content, created_at FROM chat_messages WHERE user_id = $1 ORDER BY created_at ASC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Chat history error:', err.message);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// DELETE /history/cleanup - delete messages older than 30 days (internal/admin use)
router.delete('/history/cleanup', async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM chat_messages WHERE created_at < NOW() - INTERVAL '30 days' AND user_id = $1`,
      [req.user.id]
    );
    res.json({ deleted: result.rowCount, message: 'Old messages cleaned up' });
  } catch (err) {
    console.error('Chat cleanup error:', err.message);
    res.status(500).json({ error: 'Failed to cleanup chat history' });
  }
});

module.exports = router;
