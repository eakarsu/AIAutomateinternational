import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiShield, FiAlertOctagon } from 'react-icons/fi';
import { aiFeaturesApi, beneficiariesApi } from '../services/api';

function AIFraudCheck() {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [form, setForm] = useState({ amount: '', beneficiary_id: '', country: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    beneficiariesApi
      .list()
      .then((r) => {
        const d = r.data;
        setBeneficiaries(Array.isArray(d) ? d : d.data || d.beneficiaries || []);
      })
      .catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await aiFeaturesApi.fraudCheck({
        amount: parseFloat(form.amount),
        beneficiary_id: form.beneficiary_id || undefined,
        country: form.country || undefined,
      });
      setResult(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Fraud check failed');
    } finally {
      setLoading(false);
    }
  };

  const lvlColor = (l) => (l === 'high' ? '#ef4444' : l === 'medium' ? '#f59e0b' : '#10b981');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><FiShield /> Fraud Detection Engine</h1>
          <p className="subtitle">Detect unusual amounts, frequencies, and high-risk destinations</p>
        </div>
      </div>

      <div style={{ background: 'var(--bg-secondary, #1a1f2e)', padding: 24, borderRadius: 8, marginBottom: 24 }}>
        <form onSubmit={submit}>
          <div className="form-group"><label>Amount</label><input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
          <div className="form-group">
            <label>Beneficiary (optional)</label>
            <select value={form.beneficiary_id} onChange={(e) => setForm({ ...form, beneficiary_id: e.target.value })}>
              <option value="">None</option>
              {beneficiaries.map((b) => (<option key={b.id} value={b.id}>{b.name} - {b.country}</option>))}
            </select>
          </div>
          <div className="form-group"><label>Destination Country (optional)</label><input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="e.g. Turkey" /></div>
          <button type="submit" className="btn btn-primary" disabled={loading}><FiAlertOctagon /> {loading ? 'Checking...' : 'Run Fraud Check'}</button>
        </form>
      </div>

      {result && (
        <div className="table-container" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 16 }}>
            <div style={{ padding: '20px 32px', borderRadius: 12, background: lvlColor(result.risk_level), color: 'white', fontWeight: 700, fontSize: 28 }}>
              {result.fraud_score} / 100
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{String(result.risk_level).toUpperCase()} FRAUD RISK</div>
              {result.block_recommended && (<div style={{ color: '#ef4444', fontWeight: 600 }}>BLOCK RECOMMENDED</div>)}
            </div>
          </div>
          {result.flags && result.flags.length > 0 && (
            <div>
              <h3>Flags</h3>
              <ul>{result.flags.map((f, i) => (<li key={i}>{f}</li>))}</ul>
            </div>
          )}
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>User avg: {result.user_avg_amount} | Max: {result.user_max_amount}</p>
        </div>
      )}
    </div>
  );
}

export default AIFraudCheck;
