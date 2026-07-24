import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiDollarSign, FiZap } from 'react-icons/fi';
import { aiApi, currenciesApi } from '../services/api';

function AIFeeCalculator() {
  const [form, setForm] = useState({
    amount: '1000',
    from_currency: 'USD',
    to_currency: 'EUR',
    transfer_type: 'WIRE',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currencies, setCurrencies] = useState([]);

  useEffect(() => {
    currenciesApi
      .list()
      .then((r) => {
        const d = r.data;
        setCurrencies(Array.isArray(d) ? d : d.data || d.currencies || []);
      })
      .catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await aiApi.calculateFee({
        amount: parseFloat(form.amount),
        from_currency: form.from_currency,
        to_currency: form.to_currency,
        transfer_type: form.transfer_type,
      });
      setResult(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  const codes = currencies.length > 0 ? currencies.map((c) => c.code) : ['USD', 'EUR', 'GBP', 'TRY', 'JPY', 'CHF', 'CAD', 'AUD'];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><FiDollarSign /> Transfer Cost Calculator</h1>
          <p className="subtitle">Estimate fees, FX rate, and recipient amount before sending</p>
        </div>
      </div>

      <div style={{ background: 'var(--bg-secondary, #1a1f2e)', padding: 24, borderRadius: 8, marginBottom: 24 }}>
        <form onSubmit={submit}>
          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label>Amount</label>
              <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Transfer Type</label>
              <select value={form.transfer_type} onChange={(e) => setForm({ ...form, transfer_type: e.target.value })}>
                <option value="SWIFT">SWIFT (3 days, $25 + 0.5%)</option>
                <option value="SEPA">SEPA (1 day, €0.50 + 0.1%)</option>
                <option value="WIRE">Wire (2 days, $15 + 0.3%)</option>
                <option value="ACH">ACH (3 days, free + 0.1%)</option>
              </select>
            </div>
            <div className="form-group">
              <label>From Currency</label>
              <select value={form.from_currency} onChange={(e) => setForm({ ...form, from_currency: e.target.value })}>
                {codes.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
            <div className="form-group">
              <label>To Currency</label>
              <select value={form.to_currency} onChange={(e) => setForm({ ...form, to_currency: e.target.value })}>
                {codes.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 16 }}>
            <FiZap /> {loading ? 'Calculating...' : 'Calculate Fee'}
          </button>
        </form>
      </div>

      {result && (
        <div className="table-container" style={{ padding: 24 }}>
          <h2>Cost Breakdown</h2>
          <table>
            <tbody>
              <tr><th>You send</th><td>{result.amount?.toLocaleString()} {result.from_currency}</td></tr>
              <tr><th>Transfer fee</th><td>{result.fee_amount?.toLocaleString()} {result.fee_currency}</td></tr>
              <tr><th>Exchange rate</th><td>1 {result.from_currency} = {result.exchange_rate} {result.to_currency}</td></tr>
              <tr><th>Recipient receives</th><td style={{ color: 'var(--success, #10b981)', fontWeight: 700 }}>{result.recipient_receives?.toLocaleString()} {result.to_currency}</td></tr>
              <tr><th>Estimated delivery</th><td>{result.estimated_delivery_days} business day(s)</td></tr>
              <tr><th>Method</th><td>{result.transfer_type}</td></tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AIFeeCalculator;
