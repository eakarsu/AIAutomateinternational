import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function TariffComparisonChart() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hsCode, setHsCode] = useState('8471.30');
  const [origin, setOrigin] = useState('United States');
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const r = await axios.post(
        '/api/custom-views/tariff-compare',
        { hs_code: hsCode, origin },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(r.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const max = data ? Math.max(...data.comparisons.map((c) => c.effective_pct), 1) : 1;
  const W = 720;
  const H = 320;
  const padding = { top: 30, right: 20, bottom: 60, left: 50 };
  const innerW = W - padding.left - padding.right;
  const innerH = H - padding.top - padding.bottom;

  return (
    <div data-testid="tariff-chart" style={{ background: '#0e1726', borderRadius: 12, padding: 20, color: '#e6edf3', border: '1px solid #1f2a3a' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>Tariff Comparison Chart</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={hsCode} onChange={(e) => setHsCode(e.target.value)} style={inputStyle} placeholder="HS code" />
          <input value={origin} onChange={(e) => setOrigin(e.target.value)} style={inputStyle} placeholder="Origin" />
          <button onClick={fetchData} style={btnStyle} disabled={loading}>{loading ? 'Loading...' : 'Compare'}</button>
        </div>
      </div>

      {error && <div style={{ color: '#ff6b6b', marginBottom: 10 }}>Error: {error}</div>}

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, background: '#0a1220', borderRadius: 8 }}>
        {/* Y-axis grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const y = padding.top + innerH * (1 - t);
          return (
            <g key={i}>
              <line x1={padding.left} y1={y} x2={padding.left + innerW} y2={y} stroke="#1c2940" strokeDasharray="3,3" />
              <text x={padding.left - 6} y={y + 3} fontSize="10" fill="#64748b" textAnchor="end">{(max * t).toFixed(1)}%</text>
            </g>
          );
        })}

        {/* Bars */}
        {data?.comparisons?.map((c, i) => {
          const barCount = data.comparisons.length;
          const groupW = innerW / barCount;
          const barW = groupW * 0.32;
          const x0 = padding.left + groupW * i + groupW * 0.05;
          const h1 = (c.tariff_pct / max) * innerH;
          const h2 = (c.vat_pct / max) * innerH;
          const h3 = (c.effective_pct / max) * innerH;
          return (
            <g key={i}>
              <rect x={x0} y={padding.top + innerH - h1} width={barW} height={h1} fill="#3fa9ff" />
              <rect x={x0 + barW + 2} y={padding.top + innerH - h2} width={barW} height={h2} fill="#ffb454" />
              <rect x={x0 + (barW + 2) * 2} y={padding.top + innerH - h3} width={barW} height={h3} fill={c.fta ? '#22c55e' : '#ef4444'} />
              <text x={x0 + groupW / 2 - 5} y={H - padding.bottom + 14} fontSize="10" fill="#cbd5e1" textAnchor="middle" transform={`rotate(-20 ${x0 + groupW / 2} ${H - padding.bottom + 14})`}>{c.destination}</text>
              {c.fta && <text x={x0 + groupW / 2 - 5} y={H - padding.bottom + 30} fontSize="9" fill="#22c55e" textAnchor="middle">FTA</text>}
            </g>
          );
        })}

        {/* Legend */}
        <g transform={`translate(${padding.left}, 8)`}>
          <rect width="10" height="10" fill="#3fa9ff" />
          <text x="14" y="9" fontSize="10" fill="#cbd5e1">Tariff</text>
          <rect x="70" width="10" height="10" fill="#ffb454" />
          <text x="84" y="9" fontSize="10" fill="#cbd5e1">VAT</text>
          <rect x="140" width="10" height="10" fill="#ef4444" />
          <text x="154" y="9" fontSize="10" fill="#cbd5e1">Effective</text>
        </g>
      </svg>

      {data?.cheapest && (
        <div style={{ marginTop: 12, padding: 12, background: '#0f2818', borderLeft: '3px solid #22c55e', borderRadius: 6 }}>
          <strong style={{ color: '#22c55e' }}>Cheapest landed cost:</strong>{' '}
          <span style={{ color: '#e6edf3' }}>{data.cheapest.destination} at {data.cheapest.effective_pct}% effective rate</span>
        </div>
      )}
      {data?.narrative && (
        <div style={{ marginTop: 8, padding: 12, background: '#101a2c', borderRadius: 8, fontSize: 13, color: '#cbd5e1' }}>
          <strong style={{ color: '#3fa9ff' }}>AI Insight:</strong> {data.narrative}
        </div>
      )}
    </div>
  );
}

const inputStyle = { background: '#0a1220', color: '#e6edf3', border: '1px solid #1f2a3a', borderRadius: 6, padding: '6px 10px', fontSize: 13, width: 130 };
const btnStyle = { background: '#3fa9ff', color: '#06121f', border: 'none', borderRadius: 6, padding: '6px 14px', fontWeight: 600, cursor: 'pointer' };
