import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiBell, FiPlus, FiTrash2, FiSend } from 'react-icons/fi';
import { webhooksApi } from '../services/api';

const ALLOWED_EVENTS = [
  'transfer.created',
  'transfer.completed',
  'transfer.failed',
  'beneficiary.created',
  'fraud.alert',
  'fx.rate.changed',
];

function Webhooks() {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ url: '', secret: '', events: ['transfer.created'] });
  const [testResult, setTestResult] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await webhooksApi.list();
      setWebhooks(Array.isArray(r.data) ? r.data : []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleEvent = (ev) => {
    setForm((f) => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter((e) => e !== ev) : [...f.events, ev],
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.url) { toast.warn('URL is required'); return; }
    if (form.events.length === 0) { toast.warn('Select at least one event'); return; }
    setCreating(true);
    try {
      await webhooksApi.create({ url: form.url, events: form.events, secret: form.secret || null });
      toast.success('Webhook created');
      setForm({ url: '', secret: '', events: ['transfer.created'] });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create webhook');
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id) => {
    try {
      await webhooksApi.remove(id);
      toast.success('Webhook removed');
      setWebhooks((ws) => ws.filter((w) => w.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove');
    }
  };

  const test = async (id) => {
    setTestResult(null);
    try {
      const r = await webhooksApi.test(id);
      setTestResult(r.data);
      toast.success('Test payload generated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Test failed');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><FiBell /> Webhook Subscriptions</h1>
          <p className="subtitle">Subscribe external systems to transfer / fraud / FX events</p>
        </div>
      </div>

      <div style={{ background: 'var(--bg-secondary, #1a1f2e)', padding: 24, borderRadius: 8, marginBottom: 24 }}>
        <h3>New Subscription</h3>
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Endpoint URL</label>
            <input
              type="url"
              placeholder="https://example.com/hooks/aiautomate"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Signing Secret (optional)</label>
            <input
              type="text"
              placeholder="hex / base64 string"
              value={form.secret}
              onChange={(e) => setForm({ ...form, secret: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Events</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ALLOWED_EVENTS.map((ev) => (
                <label key={ev} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="checkbox"
                    checked={form.events.includes(ev)}
                    onChange={() => toggleEvent(ev)}
                  />
                  <span>{ev}</span>
                </label>
              ))}
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={creating}>
            <FiPlus /> {creating ? 'Creating...' : 'Create Subscription'}
          </button>
        </form>
      </div>

      <div className="table-container">
        <h3 style={{ padding: '16px 24px 0' }}>Active Webhooks</h3>
        {loading && <p style={{ padding: 24 }}>Loading...</p>}
        {!loading && webhooks.length === 0 && <p style={{ padding: 24 }}>No webhooks subscribed yet.</p>}
        {!loading && webhooks.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>URL</th>
                <th>Events</th>
                <th>Active</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {webhooks.map((w) => (
                <tr key={w.id}>
                  <td>{w.id}</td>
                  <td style={{ wordBreak: 'break-all', maxWidth: 320 }}>{w.url}</td>
                  <td>{(w.events || []).join(', ')}</td>
                  <td>{w.active ? 'Yes' : 'No'}</td>
                  <td>{w.created_at ? new Date(w.created_at).toLocaleString() : ''}</td>
                  <td>
                    <button className="btn btn-secondary" onClick={() => test(w.id)} style={{ marginRight: 8 }}>
                      <FiSend /> Test
                    </button>
                    <button className="btn btn-danger" onClick={() => remove(w.id)}>
                      <FiTrash2 /> Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {testResult && (
        <div className="table-container" style={{ padding: 24, marginTop: 16 }}>
          <h3>Test Payload</h3>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 400, overflow: 'auto' }}>
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default Webhooks;
