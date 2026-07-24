import React, { useState } from 'react';
import axios from 'axios';

export default function ShipmentTracking() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tracking, setTracking] = useState('AIA-2026-005412');
  const [carrier, setCarrier] = useState('Maersk Line');

  const lookup = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const r = await axios.post(
        '/api/custom-views/shipment-track',
        { tracking_number: tracking, carrier },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(r.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { lookup(); }, []);

  return (
    <div data-testid="shipment-tracking" style={{ background: '#0e1726', borderRadius: 12, padding: 20, color: '#e6edf3', border: '1px solid #1f2a3a' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>Shipment Tracking</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={tracking} onChange={(e) => setTracking(e.target.value)} style={inputStyle} placeholder="Tracking #" />
          <input value={carrier} onChange={(e) => setCarrier(e.target.value)} style={inputStyle} placeholder="Carrier" />
          <button onClick={lookup} style={btnStyle} disabled={loading}>{loading ? 'Tracking...' : 'Track'}</button>
        </div>
      </div>

      {error && <div style={{ color: '#ff6b6b', marginBottom: 10 }}>Error: {error}</div>}

      {data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
            <Stat label="Status" value={data.status} highlight="#3fa9ff" />
            <Stat label="Carrier" value={data.carrier} />
            <Stat label="Current Location" value={data.current_location} />
            <Stat label="ETA" value={new Date(data.eta).toLocaleDateString()} highlight="#22c55e" />
          </div>

          <div style={{ background: '#0a1220', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Event Timeline</div>
            <div style={{ position: 'relative', paddingLeft: 18 }}>
              <div style={{ position: 'absolute', left: 6, top: 6, bottom: 6, width: 2, background: '#1c2940' }} />
              {data.events.slice().reverse().map((e, i) => (
                <div key={i} style={{ position: 'relative', marginBottom: 14 }}>
                  <div style={{
                    position: 'absolute',
                    left: -16,
                    top: 4,
                    width: 10, height: 10,
                    borderRadius: '50%',
                    background: i === 0 ? '#3fa9ff' : '#475569',
                    border: '2px solid #0a1220',
                  }} />
                  <div style={{ fontSize: 13, color: '#e6edf3', fontWeight: 600 }}>{e.description}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    {new Date(e.ts).toLocaleString()} • {e.location} • <span style={{ color: '#ffb454' }}>{e.code}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {data.ai_notes && (
            <div style={{ marginTop: 12, padding: 12, background: '#101a2c', borderRadius: 8, fontSize: 13, color: '#cbd5e1' }}>
              <strong style={{ color: '#3fa9ff' }}>AI Operations Note:</strong> {data.ai_notes}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const inputStyle = { background: '#0a1220', color: '#e6edf3', border: '1px solid #1f2a3a', borderRadius: 6, padding: '6px 10px', fontSize: 13 };
const btnStyle = { background: '#3fa9ff', color: '#06121f', border: 'none', borderRadius: 6, padding: '6px 14px', fontWeight: 600, cursor: 'pointer' };

function Stat({ label, value, highlight }) {
  return (
    <div style={{ background: '#101a2c', borderRadius: 8, padding: 10 }}>
      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 14, color: highlight || '#e6edf3', fontWeight: 600, marginTop: 4 }}>{value}</div>
    </div>
  );
}
