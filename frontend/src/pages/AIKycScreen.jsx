import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiUserCheck, FiSearch } from 'react-icons/fi';
import { aiFeaturesApi, beneficiariesApi } from '../services/api';

function AIKycScreen() {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [mode, setMode] = useState('existing');
  const [form, setForm] = useState({ beneficiary_id: '', name: '', country: '', bank_name: '' });
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
      const payload =
        mode === 'existing'
          ? { beneficiary_id: form.beneficiary_id }
          : { name: form.name, country: form.country, bank_name: form.bank_name };
      const res = await aiFeaturesApi.kycScreen(payload);
      setResult(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Screening failed');
    } finally {
      setLoading(false);
    }
  };

  const recColor = (r) =>
    r === 'reject' ? '#ef4444' : r === 'review' ? '#f59e0b' : '#10b981';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><FiUserCheck /> KYC / AML Screening</h1>
          <p className="subtitle">Real-time beneficiary screening against sanctions lists</p>
        </div>
      </div>

      <div style={{ background: 'var(--bg-secondary, #1a1f2e)', padding: 24, borderRadius: 8, marginBottom: 24 }}>
        <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
          <button type="button" className={`btn btn-${mode === 'existing' ? 'primary' : 'secondary'}`} onClick={() => setMode('existing')}>Existing Beneficiary</button>
          <button type="button" className={`btn btn-${mode === 'new' ? 'primary' : 'secondary'}`} onClick={() => setMode('new')}>Ad-hoc / New</button>
        </div>
        <form onSubmit={submit}>
          {mode === 'existing' ? (
            <div className="form-group">
              <label>Beneficiary</label>
              <select value={form.beneficiary_id} onChange={(e) => setForm({ ...form, beneficiary_id: e.target.value })} required>
                <option value="">Select...</option>
                {beneficiaries.map((b) => (<option key={b.id} value={b.id}>{b.name} - {b.country}</option>))}
              </select>
            </div>
          ) : (
            <>
              <div className="form-group"><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="form-group"><label>Country</label><input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} required /></div>
              <div className="form-group"><label>Bank</label><input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} /></div>
            </>
          )}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <FiSearch /> {loading ? 'Screening...' : 'Run KYC Screen'}
          </button>
        </form>
      </div>

      {result && (
        <div className="table-container" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ padding: '10px 20px', borderRadius: 8, background: recColor(result.recommendation), color: 'white', fontWeight: 700 }}>
              {String(result.recommendation || 'review').toUpperCase()}
            </div>
            {result.sanctioned_country_match && (<span className="badge badge-failed">Sanctioned country match</span>)}
            {result.sanctions_match && (<span className="badge badge-failed">Sanctions list match</span>)}
            {result.pep_status && result.pep_status !== 'none' && (<span className="badge badge-pending">PEP: {result.pep_status}</span>)}
          </div>
          {result.risk_factors && result.risk_factors.length > 0 && (
            <div>
              <h3>Risk Factors</h3>
              <ul>{result.risk_factors.map((f, i) => (<li key={i}>{f}</li>))}</ul>
            </div>
          )}
          {result.notes && (<><h3>Notes</h3><p>{result.notes}</p></>)}
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 16 }}>Screened: {result.screened_at}</p>
        </div>
      )}
    </div>
  );
}

export default AIKycScreen;
