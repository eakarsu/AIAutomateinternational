require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const { validateRuntime } = require('./config/runtime');
validateRuntime();

// Startup API key validation
if (!process.env.OPENROUTER_API_KEY) {
  console.warn('WARNING: OPENROUTER_API_KEY not set - AI features disabled');
}

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Middleware
const allowedOrigins=(process.env.CORS_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
app.use(cors({origin:(origin,cb)=>!origin||allowedOrigins.includes(origin)?cb(null,true):cb(new Error('CORS origin not allowed')),credentials:true}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api', (req, res, next) => req.path === '/health' ? next() : require('./middleware/auth')(req, res, next));
app.use('/api/transfers', require('./routes/transfers'));
app.use('/api/beneficiaries', require('./routes/beneficiaries'));
app.use('/api/currencies', require('./routes/currencies'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/fx', require('./routes/fx'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/corridor-liquidity-risk', require('./routes/corridorLiquidityRisk'));
app.use('/api/trade-cases', require('./middleware/auth'), require('./routes/tradeCases'));

// Chat history cleanup: delete messages older than 30 days every hour
const pool = require('./db');
if (process.env.ENABLE_BACKGROUND_JOBS === 'true') setInterval(async () => {
  try {
    const result = await pool.query(
      `DELETE FROM chat_messages WHERE created_at < NOW() - INTERVAL '30 days'`
    );
    if (result.rowCount > 0) {
      console.log(`[cleanup] Deleted ${result.rowCount} old chat messages`);
    }
  } catch (err) {
    console.error('[cleanup] Chat history cleanup error:', err.message);
  }
}, 60 * 60 * 1000);

// FX rate refresh every 5 minutes
const fxService = require('./services/fxService');
if (process.env.ENABLE_BACKGROUND_JOBS === 'true') setInterval(() => {
  fxService.refreshRates().catch((err) => console.error('[fx] Rate refresh error:', err.message));
}, 5 * 60 * 1000);
if (process.env.ENABLE_BACKGROUND_JOBS === 'true') {
  fxService.refreshRates().catch((err) => console.warn('[fx] Initial rate load failed:', err.message));
}

// Generated AI, gap, settlement, SWIFT, sanctions, and other provider routes are quarantined.

// Custom Views (international trade visualizations + utilities)
app.use('/api/custom-views', require('./routes/customViews'));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
