import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiPlus, FiSearch, FiX, FiPlay } from 'react-icons/fi';
import DetailModal from '../components/DetailModal';

const api = () => axios.create({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

function Templates() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    name: '', amount: '', source_currency: 'USD', target_currency: 'EUR',
    beneficiary_id: '', description: ''
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await api().get('/api/templates');
      const d = res.data;
      setItems(Array.isArray(d) ? d : (d.data || d.templates || []));
    } catch (err) {
      toast.error('Failed to load templates');
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode && selected) {
        await api().put(`/api/templates/${selected._id || selected.id}`, form);
        toast.success('Template updated');
      } else {
        await api().post('/api/templates', form);
        toast.success('Template created');
      }
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (item) => {
    setForm({
      name: item.name || '', amount: item.amount || '',
      source_currency: item.source_currency || 'USD', target_currency: item.target_currency || 'EUR',
      beneficiary_id: item.beneficiary_id || '',
      description: item.description || ''
    });
    setEditMode(true);
    setSelected(item);
    setShowForm(true);
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await api().delete(`/api/templates/${item._id || item.id}`);
      toast.success('Template deleted');
      setSelected(null);
      fetchData();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const handleExecute = async (item) => {
    if (!window.confirm(`Execute template "${item.name}"? This will create a new transfer.`)) return;
    try {
      await api().post('/api/transfers', {
        beneficiary_id: item.beneficiary_id,
        amount: item.amount,
        source_currency: item.source_currency,
        target_currency: item.target_currency,
        notes: `Created from template: ${item.name}`
      });
      toast.success('Transfer created from template!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to execute template');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditMode(false);
    setForm({ name: '', amount: '', source_currency: 'USD', target_currency: 'EUR', beneficiary_id: '', description: '' });
  };

  const filtered = items.filter(t => {
    const s = search.toLowerCase();
    return !s || [t.name, t.description, t.source_currency, t.target_currency]
      .filter(Boolean).some(v => String(v).toLowerCase().includes(s));
  });

  if (loading) return <div className="loading"><div className="loading-spinner"></div>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Templates</h1>
          <p className="subtitle">Reusable transfer templates</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          <FiPlus /> New Template
        </button>
      </div>

      <div className="search-bar">
        <div className="search-wrapper">
          <FiSearch />
          <input className="search-input" placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Amount</th>
              <th>From</th>
              <th>To</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="6" className="table-empty">No templates found</td></tr>
            ) : filtered.map(t => (
              <tr key={t._id || t.id}>
                <td onClick={() => setSelected(t)}><strong>{t.name || '-'}</strong></td>
                <td onClick={() => setSelected(t)}>{t.amount ? Number(t.amount).toLocaleString() : '-'}</td>
                <td onClick={() => setSelected(t)}>{t.source_currency || '-'}</td>
                <td onClick={() => setSelected(t)}>{t.target_currency || '-'}</td>
                <td onClick={() => setSelected(t)}>{t.description || '-'}</td>
                <td>
                  <button className="btn btn-success btn-sm" onClick={(e) => { e.stopPropagation(); handleExecute(t); }}>
                    <FiPlay /> Execute
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DetailModal
        isOpen={!!selected && !showForm}
        onClose={() => setSelected(null)}
        title="Template Details"
        data={selected ? {
          Name: selected.name,
          Amount: selected.amount,
          'Source Currency': selected.source_currency,
          'Target Currency': selected.target_currency,
          Beneficiary: selected.beneficiary_name || selected.beneficiary_id,
          Description: selected.description,
          'Created At': selected.created_at ? new Date(selected.created_at).toLocaleString() : '-',
        } : null}
        onEdit={() => handleEdit(selected)}
        onDelete={() => handleDelete(selected)}
      />

      {showForm && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) resetForm(); }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editMode ? 'Edit Template' : 'New Template'}</h2>
              <button className="modal-close" onClick={resetForm}><FiX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Template Name</label>
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Monthly rent payment" />
                  </div>
                  <div className="form-group">
                    <label>Amount</label>
                    <input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required placeholder="0.00" />
                  </div>
                  <div className="form-group">
                    <label>Beneficiary ID</label>
                    <input value={form.beneficiary_id} onChange={e => setForm({ ...form, beneficiary_id: e.target.value })} placeholder="Beneficiary ID" />
                  </div>
                  <div className="form-group">
                    <label>Source Currency</label>
                    <select value={form.source_currency} onChange={e => setForm({ ...form, source_currency: e.target.value })}>
                      {['USD', 'EUR', 'GBP', 'TRY', 'JPY', 'CHF', 'CAD', 'AUD'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Target Currency</label>
                    <select value={form.target_currency} onChange={e => setForm({ ...form, target_currency: e.target.value })}>
                      {['USD', 'EUR', 'GBP', 'TRY', 'JPY', 'CHF', 'CAD', 'AUD'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group full-width">
                    <label>Description</label>
                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Template description..." />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editMode ? 'Update' : 'Create Template'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Templates;
