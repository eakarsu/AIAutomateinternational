require('dotenv').config({ path: '../.env' });

const express = require('express');
const cors = require('cors');

// Startup API key validation
if (!process.env.OPENROUTER_API_KEY) {
  console.warn('WARNING: OPENROUTER_API_KEY not set - AI features disabled');
}
if (!process.env.JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET not set - using insecure default');
}

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/transfers', require('./routes/transfers'));
app.use('/api/beneficiaries', require('./routes/beneficiaries'));
app.use('/api/currencies', require('./routes/currencies'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/fx', require('./routes/fx'));
app.use('/api/ai', require('./routes/aiTransfer'));
app.use('/api/ai-features', require('./routes/aiFeatures'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/integrations', require('./routes/integrations'));

// Chat history cleanup: delete messages older than 30 days every hour
const pool = require('./db');
setInterval(async () => {
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
setInterval(() => {
  fxService.refreshRates().catch((err) => console.error('[fx] Rate refresh error:', err.message));
}, 5 * 60 * 1000);
// Initial load
fxService.refreshRates().catch((err) => console.warn('[fx] Initial rate load failed:', err.message));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// BATCH_00_AUDIT_MOUNTS
app.use('/api/fx-stream', require('./routes/fxStream'));
app.use('/api/regulatory-compliance', require('./routes/regulatoryCompliance'));
app.use('/api/corridor-optimizer', require('./routes/corridorOptimizer'));
app.use('/api/usdc-settle', require('./routes/usdcSettle'));
app.use('/api/swift-bridge', require('./routes/swiftBridge'));

// === Batch 00 Gaps & Frontend Mounts ===
app.use('/api/gap-limited-ai-route-optimization-fastest', require('./routes/gap_limited_ai_route_optimization_fastest'));
app.use('/api/gap-limited-ai-kyc-screening-regulatory', require('./routes/gap_limited_ai_kyc_screening_regulatory'));
app.use('/api/gap-limited-ai-fraud-detection-suspicious', require('./routes/gap_limited_ai_fraud_detection_suspicious'));
app.use('/api/gap-ai-fx-rate-timing-optimization', require('./routes/gap_ai_fx_rate_timing_optimization'));
app.use('/api/gap-ai-beneficiary-risk-assessment-scoring', require('./routes/gap_ai_beneficiary_risk_assessment_scoring'));
app.use('/api/gap-real-time-settlement-tracking-ledger', require('./routes/gap_real_time_settlement_tracking_ledger'));
app.use('/api/gap-bulk-transfer-operations', require('./routes/gap_bulk_transfer_operations'));
app.use('/api/gap-mobile-remitter-app', require('./routes/gap_mobile_remitter_app'));
app.use('/api/gap-native-blockchain-settlement-option', require('./routes/gap_native_blockchain_settlement_option'));
