import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { FiLayers, FiZap } from 'react-icons/fi';
import { aiFeaturesApi } from '../services/api';

function AISplitPlanner() {
  const [form, setForm] = useState({
    amount: '10000', from_currency: 'USD', to_currency: 'EUR', splits: 4,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await aiFeaturesApi.splitPlan({
        amount: parseFloat(form.amount),
        from_currency: form.from_currency,
        to_currency: form.to_currency,
        splits: parseInt(form.splits),
      });
      setResult(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Planning failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><FiLayers /> Multi-Leg Transfer Planner</h1>
          <p className="subtitle">Split large transfers into staggered legs to minimize FX risk</p>
        </div>
      </div>

      <div style={{ background: 'var(--bg-secondary, #1a1f2e)', padding: 24, borderRadius: 8, marginBottom: 24 }}>
        <form onSubmit={submit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
            <div className="form-group"><label>Total amount</label><input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
            <div className="form-group"><label>From</label><input value={form.from_currency} onChange={(e) => setForm({ ...form, from_currency: e.target.value.toUpperCase() })} maxLength="3" /></div>
            <div className="form-group"><label>To</label><input value={form.to_currency} onChange={(e) => setForm({ ...form, to_currency: e.target.value.toUpperCase() })} maxLength="3" /></div>
            <div className="form-group"><label>Number of legs</label><input type="number" min="2" max="10" value={form.splits} onChange={(e) => setForm({ ...form, splits: e.target.value })} /></div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}><FiZap /> {loading ? 'Planning...' : 'Generate Plan'}</button>
        </form>
      </div>

      {result && (
        <>
          <div className="table-container" style={{ padding: 24, marginBottom: 16 }}>
            <p>Single transfer fee: <strong>{result.single_transfer_fee}</strong></p>
            <p>Total split fees: <strong>{result.total_split_fee}</strong></p>
            <h3 style={{ marginTop: 16 }}>AI Advice</h3>
            <p style={{ whiteSpace: 'pre-wrap' }}>{result.ai_advice}</p>
          </div>
          <div className="table-container">
            <h3 style={{ padding: '12px 16px' }}>Schedule</h3>
            <table>
              <thead><tr><th>Leg</th><th>Amount</th><th>Date</th><th>Method</th><th>Estimated Fee</th></tr></thead>
              <tbody>{result.legs.map((l) => (
                <tr key={l.leg}><td>{l.leg}</td><td>{l.amount}</td><td>{l.scheduled_date}</td><td>{l.method}</td><td>{l.estimated_fee}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default AISplitPlanner;
