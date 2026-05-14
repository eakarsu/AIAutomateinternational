import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiAlertCircle, FiUsers } from 'react-icons/fi';
import { aiFeaturesApi, beneficiariesApi } from '../services/api';

function AIBeneficiaryRisk() {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [selected, setSelected] = useState('');
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
    if (!selected) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await aiFeaturesApi.beneficiaryRisk({ beneficiary_id: selected });
      setResult(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Risk scoring failed');
    } finally {
      setLoading(false);
    }
  };

  const lvlColor = (l) =>
    l === 'high' ? '#ef4444' : l === 'medium' ? '#f59e0b' : '#10b981';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><FiAlertCircle /> Beneficiary Risk Scorer</h1>
          <p className="subtitle">Score beneficiaries based on transfer history and country risk</p>
        </div>
      </div>

      <div style={{ background: 'var(--bg-secondary, #1a1f2e)', padding: 24, borderRadius: 8, marginBottom: 24 }}>
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Beneficiary</label>
            <select value={selected} onChange={(e) => setSelected(e.target.value)} required>
              <option value="">Select...</option>
              {beneficiaries.map((b) => (<option key={b.id} value={b.id}>{b.name} - {b.country}</option>))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading || !selected}><FiUsers /> {loading ? 'Scoring...' : 'Score Beneficiary'}</button>
        </form>
      </div>

      {result && (
        <div className="table-container" style={{ padding: 24 }}>
          <h2>{result.beneficiary_name} ({result.country})</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 16 }}>
            <div style={{ padding: '20px 32px', borderRadius: 12, background: lvlColor(result.risk_level), color: 'white', fontWeight: 700, fontSize: 28 }}>
              {result.risk_score} / 100
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{String(result.risk_level).toUpperCase()} RISK</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{result.transfer_count} transfers, total volume {result.total_volume}, {result.failed_count} failed</div>
            </div>
          </div>
          {result.risk_factors && result.risk_factors.length > 0 && (
            <div>
              <h3>Risk Factors</h3>
              <ul>{result.risk_factors.map((f, i) => (<li key={i}>{f}</li>))}</ul>
            </div>
          )}
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>Assessed: {result.assessed_at}</p>
        </div>
      )}
    </div>
  );
}

export default AIBeneficiaryRisk;
