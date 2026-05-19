import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { FiMap, FiZap } from 'react-icons/fi';
import { aiFeaturesApi } from '../services/api';

function AIRouteOptimizer() {
  const [form, setForm] = useState({
    amount: '5000',
    from_currency: 'USD',
    to_currency: 'EUR',
    urgency: 'balanced',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await aiFeaturesApi.routeOptimize({
        amount: parseFloat(form.amount),
        from_currency: form.from_currency,
        to_currency: form.to_currency,
        urgency: form.urgency,
      });
      setResult(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Optimization failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><FiMap /> Smart Routing Optimizer</h1>
          <p className="subtitle">Compare SWIFT, SEPA, Wire, ACH for cheapest/fastest path</p>
        </div>
      </div>

      <div style={{ background: 'var(--bg-secondary, #1a1f2e)', padding: 24, borderRadius: 8, marginBottom: 24 }}>
        <form onSubmit={submit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
            <div className="form-group"><label>Amount</label><input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
            <div className="form-group"><label>From</label><input value={form.from_currency} onChange={(e) => setForm({ ...form, from_currency: e.target.value.toUpperCase() })} maxLength="3" /></div>
            <div className="form-group"><label>To</label><input value={form.to_currency} onChange={(e) => setForm({ ...form, to_currency: e.target.value.toUpperCase() })} maxLength="3" /></div>
            <div className="form-group"><label>Optimize for</label>
              <select value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })}>
                <option value="balanced">Balanced</option><option value="cheap">Cheapest</option><option value="urgent">Fastest</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}><FiZap /> {loading ? 'Optimizing...' : 'Find Best Route'}</button>
        </form>
      </div>

      {result && (
        <>
          <div className="table-container" style={{ padding: 24, marginBottom: 16 }}>
            <h2>Recommended: {result.recommended.method}</h2>
            <p>Fee: <strong>{result.recommended.fee}</strong> | Delivery: <strong>{result.recommended.delivery_days} days</strong> | ETA: {result.recommended.estimated_arrival}</p>
          </div>
          <div className="table-container">
            <h3 style={{ padding: '12px 16px' }}>All Options</h3>
            <table>
              <thead><tr><th>Method</th><th>Fee</th><th>Days</th><th>ETA</th></tr></thead>
              <tbody>
                {result.options.map((o) => (
                  <tr key={o.method} style={{ background: o.method === result.recommended.method ? 'rgba(16,185,129,0.1)' : '' }}>
                    <td>{o.method}</td><td>{o.fee}</td><td>{o.delivery_days}</td><td>{o.estimated_arrival}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default AIRouteOptimizer;
