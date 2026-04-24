import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiPlus, FiSearch, FiX } from 'react-icons/fi';
import DetailModal from '../components/DetailModal';

const api = () => axios.create({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

function Transfers() {
  const [transfers, setTransfers] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    beneficiary_id: '', amount: '', source_currency: 'USD', target_currency: 'EUR', notes: ''
  });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [tRes, bRes, cRes] = await Promise.allSettled([
        api().get('/api/transfers'),
        api().get('/api/beneficiaries'),
        api().get('/api/currencies')
      ]);
      const arr = (r) => { if (r.status === 'fulfilled') { const d = r.value.data; return Array.isArray(d) ? d : (d.data || d.transfers || d.beneficiaries || d.currencies || []); } return []; };
      setTransfers(arr(tRes));
      setBeneficiaries(arr(bRes));
      setCurrencies(arr(cRes));
    } catch (err) {
      toast.error('Failed to load transfers');
    } finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      if (editMode && selectedTransfer) {
        await api().put(`/api/transfers/${selectedTransfer._id || selectedTransfer.id}`, form);
        toast.success('Transfer updated');
      } else {
        await api().post('/api/transfers', form);
        toast.success('Transfer created');
      }
      setShowForm(false);
      setEditMode(false);
      setForm({ beneficiary_id: '', amount: '', source_currency: 'USD', target_currency: 'EUR', notes: '' });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (item) => {
    setForm({
      beneficiary_id: item.beneficiary_id || '',
      amount: item.amount || '',
      source_currency: item.source_currency || 'USD',
      target_currency: item.target_currency || 'EUR',
      notes: item.notes || ''
    });
    setEditMode(true);
    setSelectedTransfer(item);
    setShowForm(true);
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Delete this transfer?')) return;
    try {
      await api().delete(`/api/transfers/${item._id || item.id}`);
      toast.success('Transfer deleted');
      setSelectedTransfer(null);
      fetchAll();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    let cls = 'badge badge-pending';
    if (s === 'completed') cls = 'badge badge-completed';
    else if (s === 'processing') cls = 'badge badge-processing';
    else if (s === 'failed' || s === 'cancelled') cls = 'badge badge-failed';
    return <span className={cls}>{status || 'pending'}</span>;
  };

  const filtered = transfers.filter(t => {
    const s = search.toLowerCase();
    return !s || [t.reference_number, t.recipient_name, t.status, t.source_currency, t.target_currency]
      .filter(Boolean).some(v => String(v).toLowerCase().includes(s));
  });

  if (loading) return <div className="loading"><div className="loading-spinner"></div>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Transfers</h1>
          <p className="subtitle">Manage international money transfers</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditMode(false); setForm({ beneficiary_id: '', amount: '', source_currency: 'USD', target_currency: 'EUR', notes: '' }); setShowForm(true); }}>
          <FiPlus /> New Transfer
        </button>
      </div>

      <div className="search-bar">
        <div className="search-wrapper">
          <FiSearch />
          <input className="search-input" placeholder="Search transfers..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Recipient</th>
              <th>Amount</th>
              <th>Currency</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="6" className="table-empty">No transfers found</td></tr>
            ) : filtered.map(t => (
              <tr key={t._id || t.id} onClick={() => setSelectedTransfer(t)}>
                <td>{t.reference_number || (t._id || t.id || '').slice(-8)}</td>
                <td>{t.recipient_name || '-'}</td>
                <td>{t.amount ? Number(t.amount).toLocaleString() : '-'}</td>
                <td>{t.source_currency || t.currency || '-'} → {t.target_currency || '-'}</td>
                <td>{getStatusBadge(t.status)}</td>
                <td>{t.created_at ? new Date(t.created_at).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DetailModal
        isOpen={!!selectedTransfer && !showForm}
        onClose={() => setSelectedTransfer(null)}
        title="Transfer Details"
        data={selectedTransfer ? {
          Reference: selectedTransfer.reference_number || selectedTransfer._id,
          Recipient: selectedTransfer.recipient_name,
          Amount: selectedTransfer.amount,
          'Source Currency': selectedTransfer.source_currency,
          'Target Currency': selectedTransfer.target_currency,
          'Exchange Rate': selectedTransfer.exchange_rate,
          'Converted Amount': selectedTransfer.converted_amount,
          Status: selectedTransfer.status,
          Notes: selectedTransfer.notes,
          'Created At': selectedTransfer.created_at ? new Date(selectedTransfer.created_at).toLocaleString() : '-',
        } : null}
        onEdit={() => handleEdit(selectedTransfer)}
        onDelete={() => handleDelete(selectedTransfer)}
      />

      {showForm && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowForm(false); setEditMode(false); } }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editMode ? 'Edit Transfer' : 'New Transfer'}</h2>
              <button className="modal-close" onClick={() => { setShowForm(false); setEditMode(false); }}><FiX /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Beneficiary</label>
                    <select value={form.beneficiary_id} onChange={e => setForm({ ...form, beneficiary_id: e.target.value })} required>
                      <option value="">Select beneficiary...</option>
                      {beneficiaries.map(b => (
                        <option key={b._id || b.id} value={b._id || b.id}>{b.name} - {b.bank_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Amount</label>
                    <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required placeholder="0.00" />
                  </div>
                  <div className="form-group">
                    <label>Source Currency</label>
                    <select value={form.source_currency} onChange={e => setForm({ ...form, source_currency: e.target.value })}>
                      {currencies.length > 0 ? currencies.map(c => (
                        <option key={c._id || c.code} value={c.code}>{c.code} - {c.name}</option>
                      )) : ['USD', 'EUR', 'GBP', 'TRY', 'JPY'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Target Currency</label>
                    <select value={form.target_currency} onChange={e => setForm({ ...form, target_currency: e.target.value })}>
                      {currencies.length > 0 ? currencies.map(c => (
                        <option key={c._id || c.code} value={c.code}>{c.code} - {c.name}</option>
                      )) : ['USD', 'EUR', 'GBP', 'TRY', 'JPY'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group full-width">
                    <label>Notes</label>
                    <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditMode(false); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editMode ? 'Update' : 'Create Transfer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Transfers;
