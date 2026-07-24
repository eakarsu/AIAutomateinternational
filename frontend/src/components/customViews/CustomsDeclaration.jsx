import React, { useState } from 'react';
import axios from 'axios';

export default function CustomsDeclaration() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    shipper: 'AIAutomate International Inc., 100 Trade Plaza, New York, NY 10001, USA',
    consignee: 'Müller GmbH, Friedrichstr. 90, 10117 Berlin, Germany',
    origin: 'United States',
    destination: 'Germany',
    incoterm: 'DAP',
    currency: 'USD',
  });

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const r = await axios.post(
        '/api/custom-views/customs-declaration',
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(r.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!data) return;
    const blob = new Blob([data.document_text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.declaration_id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div data-testid="customs-declaration" style={{ background: '#0e1726', borderRadius: 12, padding: 20, color: '#e6edf3', border: '1px solid #1f2a3a' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>Customs Declaration Generator</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={generate} style={btnStyle} disabled={loading}>{loading ? 'Generating...' : 'Generate'}</button>
          {data && <button onClick={download} style={{ ...btnStyle, background: '#22c55e' }}>Download .txt</button>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <Field label="Shipper" value={form.shipper} onChange={(v) => setForm({ ...form, shipper: v })} multiline />
        <Field label="Consignee" value={form.consignee} onChange={(v) => setForm({ ...form, consignee: v })} multiline />
        <Field label="Origin Country" value={form.origin} onChange={(v) => setForm({ ...form, origin: v })} />
        <Field label="Destination Country" value={form.destination} onChange={(v) => setForm({ ...form, destination: v })} />
        <Field label="Incoterm" value={form.incoterm} onChange={(v) => setForm({ ...form, incoterm: v })} />
        <Field label="Currency" value={form.currency} onChange={(v) => setForm({ ...form, currency: v })} />
      </div>

      {error && <div style={{ color: '#ff6b6b', marginBottom: 10 }}>Error: {error}</div>}

      {data && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
            <Pill label="Declaration ID" value={data.declaration_id} />
            <Pill label="Total Value" value={`${data.fields.currency} ${data.fields.total_value?.toLocaleString()}`} />
            <Pill label="Items" value={data.fields.items?.length || 0} />
          </div>
          <pre style={{
            background: '#0a1220',
            color: '#cbd5e1',
            padding: 16,
            borderRadius: 8,
            fontSize: 12,
            lineHeight: 1.5,
            overflow: 'auto',
            maxHeight: 480,
            whiteSpace: 'pre-wrap',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}>{data.document_text}</pre>
        </>
      )}
    </div>
  );
}

const btnStyle = { background: '#3fa9ff', color: '#06121f', border: 'none', borderRadius: 6, padding: '6px 14px', fontWeight: 600, cursor: 'pointer' };

function Field({ label, value, onChange, multiline }) {
  const common = {
    background: '#0a1220',
    color: '#e6edf3',
    border: '1px solid #1f2a3a',
    borderRadius: 6,
    padding: '6px 10px',
    fontSize: 13,
    width: '100%',
    boxSizing: 'border-box',
  };
  return (
    <div>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      {multiline
        ? <textarea value={value} onChange={(e) => onChange(e.target.value)} style={{ ...common, minHeight: 60, fontFamily: 'inherit' }} />
        : <input value={value} onChange={(e) => onChange(e.target.value)} style={common} />
      }
    </div>
  );
}

function Pill({ label, value }) {
  return (
    <div style={{ background: '#101a2c', padding: '6px 12px', borderRadius: 20, fontSize: 12 }}>
      <span style={{ color: '#64748b' }}>{label}: </span>
      <span style={{ color: '#3fa9ff', fontWeight: 600 }}>{value}</span>
    </div>
  );
}
