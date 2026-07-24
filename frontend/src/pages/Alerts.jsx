import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiPlus, FiSearch, FiX } from 'react-icons/fi';
import DetailModal from '../components/DetailModal';

const api = () => axios.create({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

function Alerts() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    currency_pair: 'USD/EUR', target_rate: '', direction: 'above', is_active: true
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await api().get('/api/alerts');
      const d = res.data;
      setItems(Array.isArray(d) ? d : (d.data || d.alerts || []));
    } catch (err) {
      toast.error('Failed to load alerts');
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode && selected) {
        await api().put(`/api/alerts/${selected._id || selected.id}`, form);
        toast.success('Alert updated');
      } else {
        await api().post('/api/alerts', form);
        toast.success('Alert created');
      }
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (item) => {
    setForm({
      currency_pair: item.currency_pair || '', target_rate: item.target_rate || '',
      direction: item.direction || 'above', is_active: item.is_active !== undefined ? item.is_active : true
    });
    setEditMode(true);
    setSelected(item);
    setShowForm(true);
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Delete this alert?')) return;
    try {
      await api().delete(`/api/alerts/${item._id || item.id}`);
      toast.success('Alert deleted');
      setSelected(null);
      fetchData();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const toggleStatus = async (item) => {
    const newActive = !(item.is_active === true || item.is_active === 't');
    try {
      await api().put(`/api/alerts/${item._id || item.id}`, { ...item, is_active: newActive });
      toast.success(`Alert ${newActive ? 'activated' : 'deactivated'}`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditMode(false);
    setForm({ currency_pair: 'USD/EUR', target_rate: '', direction: 'above', is_active: true });
  };

  const filtered = items.filter(a => {
    const s = search.toLowerCase();
    return !s || [a.currency_pair, a.direction]
      .filter(Boolean).some(v => String(v).toLowerCase().includes(s));
  });

  const isActive = (item) => item.is_active === true || item.is_active === 't';

  if (loading) return <div className="loading"><div className="loading-spinner"></div>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Alerts</h1>
          <p className="subtitle">Currency rate notifications</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          <FiPlus /> New Alert
        </button>
      </div>

      <div className="search-bar">
        <div className="search-wrapper">
          <FiSearch />
          <input className="search-input" placeholder="Search alerts..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Currency Pair</th>
              <th>Target Rate</th>
              <th>Direction</th>
              <th>Status</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="5" className="table-empty">No alerts found</td></tr>
            ) : filtered.map(a => (
              <tr key={a._id || a.id}>
                <td onClick={() => setSelected(a)}><strong>{a.currency_pair || '-'}</strong></td>
                <td onClick={() => setSelected(a)}>{a.target_rate || '-'}</td>
                <td onClick={() => setSelected(a)}>
                  <span className={`badge ${a.direction === 'above' ? 'badge-completed' : 'badge-failed'}`}>
                    {a.direction || '-'}
                  </span>
                </td>
                <td onClick={() => setSelected(a)}>
                  <span className={`badge ${isActive(a) ? 'badge-active' : 'badge-inactive'}`}>
                    {isActive(a) ? 'active' : 'inactive'}
                  </span>
                </td>
                <td>
                  <label className="toggle-switch" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={isActive(a)} onChange={() => toggleStatus(a)} />
                    <span className="toggle-slider"></span>
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DetailModal
        isOpen={!!selected && !showForm}
        onClose={() => setSelected(null)}
        title="Alert Details"
        data={selected ? {
          'Currency Pair': selected.currency_pair,
          'Target Rate': selected.target_rate,
          Direction: selected.direction,
          Active: isActive(selected) ? 'Yes' : 'No',
          'Created At': selected.created_at ? new Date(selected.created_at).toLocaleString() : '-',
        } : null}
        onEdit={() => handleEdit(selected)}
        onDelete={() => handleDelete(selected)}
      />

      {showForm && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) resetForm(); }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editMode ? 'Edit Alert' : 'New Alert'}</h2>
              <button className="modal-close" onClick={resetForm}><FiX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Currency Pair</label>
                    <select value={form.currency_pair} onChange={e => setForm({ ...form, currency_pair: e.target.value })}>
                      {['USD/EUR', 'USD/GBP', 'USD/TRY', 'USD/JPY', 'EUR/GBP', 'EUR/TRY', 'GBP/EUR', 'GBP/TRY'].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Target Rate</label>
                    <input type="number" step="0.000001" value={form.target_rate} onChange={e => setForm({ ...form, target_rate: e.target.value })} required placeholder="1.0850" />
                  </div>
                  <div className="form-group">
                    <label>Direction</label>
                    <select value={form.direction} onChange={e => setForm({ ...form, direction: e.target.value })}>
                      <option value="above">Above</option>
                      <option value="below">Below</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Active</label>
                    <select value={form.is_active ? 'true' : 'false'} onChange={e => setForm({ ...form, is_active: e.target.value === 'true' })}>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editMode ? 'Update' : 'Create Alert'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Alerts;
