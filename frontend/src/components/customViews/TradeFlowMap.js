import React, { useEffect, useState } from 'react';
import axios from 'axios';

// Equirectangular projection over a 720x360 viewBox
const project = (lat, lng) => {
  const x = ((lng + 180) / 360) * 720;
  const y = ((90 - lat) / 180) * 360;
  return [x, y];
};

const ORIGIN_COORDS = { lat: 39.8, lng: -98.6 }; // approx US centroid

export default function TradeFlowMap() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [origin, setOrigin] = useState('United States');
  const [period, setPeriod] = useState('last 30 days');
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const r = await axios.post(
        '/api/custom-views/trade-flow-map',
        { origin, period },
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

  const [ox, oy] = project(ORIGIN_COORDS.lat, ORIGIN_COORDS.lng);

  return (
    <div data-testid="trade-flow-map" style={{ background: '#0e1726', borderRadius: 12, padding: 20, color: '#e6edf3', border: '1px solid #1f2a3a' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>Trade Flow World Map</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={origin} onChange={(e) => setOrigin(e.target.value)} style={inputStyle} placeholder="Origin country" />
          <input value={period} onChange={(e) => setPeriod(e.target.value)} style={inputStyle} placeholder="Period" />
          <button onClick={fetchData} style={btnStyle} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
        </div>
      </div>

      {error && <div style={{ color: '#ff6b6b', marginBottom: 10 }}>Error: {error}</div>}

      <svg viewBox="0 0 720 360" style={{ width: '100%', height: 380, background: '#0a1220', borderRadius: 8 }}>
        {/* Ocean grid */}
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#152033" strokeWidth="0.5" />
          </pattern>
          <radialGradient id="originGlow">
            <stop offset="0%" stopColor="#3fa9ff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#3fa9ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="720" height="360" fill="url(#grid)" />

        {/* Equator + prime meridian */}
        <line x1="0" y1="180" x2="720" y2="180" stroke="#1c2940" strokeDasharray="3,4" />
        <line x1="360" y1="0" x2="360" y2="360" stroke="#1c2940" strokeDasharray="3,4" />

        {/* Origin glow */}
        <circle cx={ox} cy={oy} r="22" fill="url(#originGlow)" />

        {/* Flow arcs */}
        {data?.flows?.map((f, i) => {
          const [x, y] = project(f.lat, f.lng);
          const mx = (ox + x) / 2;
          const my = Math.min(oy, y) - 60;
          const radius = Math.max(3, Math.sqrt(f.volume_usd) / 600);
          return (
            <g key={i}>
              <path
                d={`M ${ox} ${oy} Q ${mx} ${my} ${x} ${y}`}
                stroke="#3fa9ff"
                strokeOpacity="0.55"
                strokeWidth="1.2"
                fill="none"
              />
              <circle cx={x} cy={y} r={radius} fill="#ffb454" stroke="#fff" strokeWidth="0.5" />
              <text x={x + radius + 3} y={y - 4} fontSize="9" fill="#cbd5e1">{f.destination}</text>
              <text x={x + radius + 3} y={y + 6} fontSize="8" fill="#94a3b8">${(f.volume_usd / 1_000_000).toFixed(1)}M</text>
            </g>
          );
        })}

        {/* Origin marker */}
        <circle cx={ox} cy={oy} r="4" fill="#3fa9ff" stroke="#fff" strokeWidth="1" />
        <text x={ox + 6} y={oy - 6} fontSize="10" fill="#3fa9ff" fontWeight="bold">{data?.origin || origin}</text>
      </svg>

      {data && (
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <Stat label="Total Volume" value={`$${(data.total_usd / 1_000_000).toFixed(1)}M`} />
          <Stat label="Corridors" value={data.flows?.length || 0} />
          <Stat label="Period" value={data.period} />
        </div>
      )}

      {data?.summary && (
        <div style={{ marginTop: 12, padding: 12, background: '#101a2c', borderRadius: 8, fontSize: 13, color: '#cbd5e1' }}>
          <strong style={{ color: '#3fa9ff' }}>AI Summary:</strong> {data.summary}
        </div>
      )}
    </div>
  );
}

const inputStyle = { background: '#0a1220', color: '#e6edf3', border: '1px solid #1f2a3a', borderRadius: 6, padding: '6px 10px', fontSize: 13 };
const btnStyle = { background: '#3fa9ff', color: '#06121f', border: 'none', borderRadius: 6, padding: '6px 14px', fontWeight: 600, cursor: 'pointer' };

function Stat({ label, value }) {
  return (
    <div style={{ background: '#101a2c', borderRadius: 8, padding: 10 }}>
      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 18, color: '#e6edf3', fontWeight: 600, marginTop: 4 }}>{value}</div>
    </div>
  );
}
