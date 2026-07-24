import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiPlus, FiSearch, FiX } from 'react-icons/fi';
import DetailModal from '../components/DetailModal';

const api = () => axios.create({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

function Transactions() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'deposit', amount: '', currency: 'USD', description: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await api().get('/api/transactions');
      const d = res.data;
      setItems(Array.isArray(d) ? d : (d.data || d.transactions || []));
    } catch (err) {
      toast.error('Failed to load transactions');
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api().post('/api/transactions', form);
      toast.success('Transaction created');
      setShowForm(false);
      setForm({ type: 'deposit', amount: '', currency: 'USD', description: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const getTypeBadge = (type) => {
    const t = (type || '').toLowerCase();
    if (t === 'deposit') return <span className="badge badge-deposit">Deposit</span>;
    if (t === 'withdrawal') return <span className="badge badge-withdrawal">Withdrawal</span>;
    if (t === 'transfer') return <span className="badge badge-transfer">Transfer</span>;
    if (t === 'exchange') return <span className="badge badge-exchange">Exchange</span>;
    return <span className="badge badge-pending">{type || '-'}</span>;
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    let cls = 'badge badge-pending';
    if (s === 'completed') cls = 'badge badge-completed';
    else if (s === 'processing') cls = 'badge badge-processing';
    else if (s === 'failed' || s === 'cancelled') cls = 'badge badge-failed';
    return <span className={cls}>{status || 'pending'}</span>;
  };

  const filtered = items.filter(t => {
    const matchFilter = filter === 'all' || (t.type || '').toLowerCase() === filter;
    const s = search.toLowerCase();
    const matchSearch = !s || [t.reference, t.type, t.description, t.currency, t.status]
      .filter(Boolean).some(v => String(v).toLowerCase().includes(s));
    return matchFilter && matchSearch;
  });

  const tabs = ['all', 'deposit', 'withdrawal', 'transfer', 'exchange'];

  if (loading) return <div className="loading"><div className="loading-spinner"></div>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Transactions</h1>
          <p className="subtitle">Track all financial activity</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <FiPlus /> New Transaction
        </button>
      </div>

      <div className="filter-tabs">
        {tabs.map(t => (
          <button key={t} className={`filter-tab ${filter === t ? 'active' : ''}`} onClick={() => setFilter(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}{t === 'all' ? '' : 's'}
          </button>
        ))}
      </div>

      <div className="search-bar">
        <div className="search-wrapper">
          <FiSearch />
          <input className="search-input" placeholder="Search transactions..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Currency</th>
              <th>Description</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="7" className="table-empty">No transactions found</td></tr>
            ) : filtered.map(t => (
              <tr key={t._id || t.id} onClick={() => setSelected(t)}>
                <td>{t.reference || (t._id || t.id || '').slice(-8)}</td>
                <td>{getTypeBadge(t.type)}</td>
                <td>{t.amount ? Number(t.amount).toLocaleString() : '-'}</td>
                <td>{t.currency || '-'}</td>
                <td>{t.description || '-'}</td>
                <td>{getStatusBadge(t.status)}</td>
                <td>{t.created_at ? new Date(t.created_at).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DetailModal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title="Transaction Details"
        data={selected ? {
          Reference: selected.reference || selected._id,
          Type: selected.type,
          Amount: selected.amount,
          Currency: selected.currency,
          Description: selected.description,
          Status: selected.status,
          'Created At': selected.created_at ? new Date(selected.created_at).toLocaleString() : '-',
        } : null}
      />

      {showForm && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>New Transaction</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}><FiX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Type</label>
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                      <option value="deposit">Deposit</option>
                      <option value="withdrawal">Withdrawal</option>
                      <option value="transfer">Transfer</option>
                      <option value="exchange">Exchange</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Amount</label>
                    <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required placeholder="0.00" />
                  </div>
                  <div className="form-group">
                    <label>Currency</label>
                    <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                      {['USD', 'EUR', 'GBP', 'TRY', 'JPY', 'CHF', 'CAD', 'AUD'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group full-width">
                    <label>Description</label>
                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Transaction description..." />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Transaction</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Transactions;
