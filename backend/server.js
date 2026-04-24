require('dotenv').config({ path: '../.env' });

const express = require('express');
const cors = require('cors');

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
