import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiShield, FiAlertTriangle } from 'react-icons/fi';
import { aiApi, beneficiariesApi } from '../services/api';

function AIRiskAssessment() {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [form, setForm] = useState({ beneficiary_id: '', amount: '', purpose: '' });
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
      const res = await aiApi.assessTransfer(form);
      setResult(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Assessment failed');
    } finally {
      setLoading(false);
    }
  };

  const riskColor = (lvl) =>
    lvl === 'high' ? '#ef4444' : lvl === 'medium' ? '#f59e0b' : '#10b981';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><FiShield /> AML Transfer Risk Assessment</h1>
          <p className="subtitle">AI-powered AML/CFT screening before sending</p>
        </div>
      </div>

      <div style={{ background: 'var(--bg-secondary, #1a1f2e)', padding: 24, borderRadius: 8, marginBottom: 24 }}>
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Beneficiary</label>
            <select value={form.beneficiary_id} onChange={(e) => setForm({ ...form, beneficiary_id: e.target.value })} required>
              <option value="">Select beneficiary...</option>
              {beneficiaries.map((b) => (<option key={b.id} value={b.id}>{b.name} - {b.country}</option>))}
            </select>
          </div>
          <div className="form-group">
            <label>Amount</label>
            <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Purpose</label>
            <input type="text" placeholder="e.g. business consulting" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <FiAlertTriangle /> {loading ? 'Assessing...' : 'Run Risk Check'}
          </button>
        </form>
      </div>

      {result && (
        <div className="table-container" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div style={{ padding: '12px 24px', borderRadius: 8, background: riskColor(result.risk_level), color: 'white', fontWeight: 700, fontSize: 18 }}>
              {String(result.risk_level || 'unknown').toUpperCase()} RISK
            </div>
            {result.recommended_review && (<span className="badge badge-pending">Manual review recommended</span>)}
          </div>
          {result.flags && result.flags.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h3>Flags</h3>
              <ul>{result.flags.map((f, i) => (<li key={i}>{f}</li>))}</ul>
            </div>
          )}
          <h3>Reasoning</h3>
          <p>{result.reasoning}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 16 }}>Assessed: {result.assessed_at}</p>
        </div>
      )}
    </div>
  );
}

export default AIRiskAssessment;
