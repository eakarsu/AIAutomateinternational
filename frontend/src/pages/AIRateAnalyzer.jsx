import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiTrendingUp, FiBarChart2 } from 'react-icons/fi';
import { aiFeaturesApi, currenciesApi } from '../services/api';

function AIRateAnalyzer() {
  const [form, setForm] = useState({ from_currency: 'USD', to_currency: 'EUR', days: 30 });
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
      const res = await aiFeaturesApi.rateAnalysis({
        from_currency: form.from_currency,
        to_currency: form.to_currency,
        days: parseInt(form.days),
      });
      setResult(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const codes = currencies.length > 0 ? currencies.map((c) => c.code) : ['USD', 'EUR', 'GBP', 'TRY', 'JPY', 'CHF', 'CAD', 'AUD'];

  // Simple sparkline
  const Sparkline = ({ data }) => {
    if (!data || data.length === 0) return null;
    const w = 600, h = 120;
    const min = Math.min(...data.map((d) => d.rate));
    const max = Math.max(...data.map((d) => d.rate));
    const range = max - min || 1;
    const pts = data.map((d, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((d.rate - min) / range) * (h - 10) - 5;
      return `${x},${y}`;
    });
    return (
      <svg width={w} height={h} style={{ background: '#0f1420', borderRadius: 4 }}>
        <polyline points={pts.join(' ')} fill="none" stroke="#10b981" strokeWidth="2" />
      </svg>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><FiTrendingUp /> Historical Rate Analyzer</h1>
          <p className="subtitle">Show past FX rates and AI predicts optimal timing</p>
        </div>
      </div>

      <div style={{ background: 'var(--bg-secondary, #1a1f2e)', padding: 24, borderRadius: 8, marginBottom: 24 }}>
        <form onSubmit={submit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label>From</label>
              <select value={form.from_currency} onChange={(e) => setForm({ ...form, from_currency: e.target.value })}>{codes.map((c) => (<option key={c} value={c}>{c}</option>))}</select>
            </div>
            <div className="form-group">
              <label>To</label>
              <select value={form.to_currency} onChange={(e) => setForm({ ...form, to_currency: e.target.value })}>{codes.map((c) => (<option key={c} value={c}>{c}</option>))}</select>
            </div>
            <div className="form-group"><label>Days</label><input type="number" min="7" max="180" value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} /></div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}><FiBarChart2 /> {loading ? 'Analyzing...' : 'Analyze'}</button>
        </form>
      </div>

      {result && (
        <div className="table-container" style={{ padding: 24 }}>
          <h2>{result.from_currency} → {result.to_currency}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            <div className="stat-card"><div className="stat-label">Current</div><div className="stat-value">{result.current_rate}</div></div>
            <div className="stat-card"><div className="stat-label">Min</div><div className="stat-value">{result.stats?.min}</div></div>
            <div className="stat-card"><div className="stat-label">Max</div><div className="stat-value">{result.stats?.max}</div></div>
            <div className="stat-card"><div className="stat-label">Avg</div><div className="stat-value">{result.stats?.avg}</div></div>
          </div>
          <Sparkline data={result.history} />
          <div style={{ marginTop: 24 }}>
            <h3>AI Recommendation</h3>
            <p style={{ whiteSpace: 'pre-wrap' }}>{result.ai_recommendation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIRateAnalyzer;
