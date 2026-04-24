import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiPlus, FiSearch, FiX } from 'react-icons/fi';
import DetailModal from '../components/DetailModal';

const api = () => axios.create({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

function Customers() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', account_number: '', type: 'individual',
    balance: '', currency: 'USD', kyc_status: 'pending', risk_level: 'low',
    address: '', country: ''
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await api().get('/api/customers');
      const d = res.data;
      setItems(Array.isArray(d) ? d : (d.data || d.customers || []));
    } catch (err) {
      toast.error('Failed to load customers');
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode && selected) {
        await api().put(`/api/customers/${selected._id || selected.id}`, form);
        toast.success('Customer updated');
      } else {
        await api().post('/api/customers', form);
        toast.success('Customer added');
      }
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (item) => {
    setForm({
      name: item.name || '', email: item.email || '', phone: item.phone || '',
      account_number: item.account_number || '', type: item.type || 'individual',
      balance: item.balance || '', currency: item.currency || 'USD',
      kyc_status: item.kyc_status || 'pending',
      risk_level: item.risk_level || 'low',
      address: item.address || '', country: item.country || ''
    });
    setEditMode(true);
    setSelected(item);
    setShowForm(true);
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Delete this customer?')) return;
    try {
      await api().delete(`/api/customers/${item._id || item.id}`);
      toast.success('Customer deleted');
      setSelected(null);
      fetchData();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditMode(false);
    setForm({
      name: '', email: '', phone: '', account_number: '', type: 'individual',
      balance: '', currency: 'USD', kyc_status: 'pending', risk_level: 'low',
      address: '', country: ''
    });
  };

  const getKycBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'verified') return <span className="badge badge-verified">Verified</span>;
    if (s === 'pending') return <span className="badge badge-pending">Pending</span>;
    if (s === 'rejected') return <span className="badge badge-rejected">Rejected</span>;
    return <span className="badge badge-pending">{status || '-'}</span>;
  };

  const getRiskBadge = (level) => {
    const l = (level || '').toLowerCase();
    if (l === 'low') return <span className="badge badge-low">Low</span>;
    if (l === 'medium') return <span className="badge badge-medium">Medium</span>;
    if (l === 'high') return <span className="badge badge-high">High</span>;
    return <span className="badge badge-pending">{level || '-'}</span>;
  };

  const filtered = items.filter(c => {
    const s = search.toLowerCase();
    return !s || [c.name, c.email, c.account_number, c.type, c.country, c.kyc_status, c.risk_level]
      .filter(Boolean).some(v => String(v).toLowerCase().includes(s));
  });

  if (loading) return <div className="loading"><div className="loading-spinner"></div>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Customers</h1>
          <p className="subtitle">Manage customer accounts</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          <FiPlus /> Add Customer
        </button>
      </div>

      <div className="search-bar">
        <div className="search-wrapper">
          <FiSearch />
          <input className="search-input" placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Account</th>
              <th>Type</th>
              <th>Balance</th>
              <th>KYC Status</th>
              <th>Risk Level</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="6" className="table-empty">No customers found</td></tr>
            ) : filtered.map(c => (
              <tr key={c._id || c.id} onClick={() => setSelected(c)}>
                <td><strong>{c.name || '-'}</strong></td>
                <td>{c.account_number || '-'}</td>
                <td style={{ textTransform: 'capitalize' }}>{c.type || '-'}</td>
                <td>{c.balance != null ? `${Number(c.balance).toLocaleString()} ${c.currency || 'USD'}` : '-'}</td>
                <td>{getKycBadge(c.kyc_status)}</td>
                <td>{getRiskBadge(c.risk_level)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DetailModal
        isOpen={!!selected && !showForm}
        onClose={() => setSelected(null)}
        title="Customer Details"
        data={selected ? {
          Name: selected.name,
          Email: selected.email,
          Phone: selected.phone,
          'Account Number': selected.account_number,
          Type: selected.type,
          Balance: selected.balance != null ? `${Number(selected.balance).toLocaleString()} ${selected.currency || 'USD'}` : '-',
          'KYC Status': selected.kyc_status,
          'Risk Level': selected.risk_level,
          Country: selected.country,
          Address: selected.address,
          'Created At': selected.created_at ? new Date(selected.created_at).toLocaleString() : '-',
        } : null}
        onEdit={() => handleEdit(selected)}
        onDelete={() => handleDelete(selected)}
      />

      {showForm && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) resetForm(); }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editMode ? 'Edit Customer' : 'Add Customer'}</h2>
              <button className="modal-close" onClick={resetForm}><FiX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="John Doe" />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required placeholder="john@example.com" />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1234567890" />
                  </div>
                  <div className="form-group">
                    <label>Account Number</label>
                    <input value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })} placeholder="Auto-generated if empty" />
                  </div>
                  <div className="form-group">
                    <label>Type</label>
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                      <option value="individual">Individual</option>
                      <option value="business">Business</option>
                      <option value="corporate">Corporate</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Initial Balance</label>
                    <input type="number" step="0.01" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} placeholder="0.00" />
                  </div>
                  <div className="form-group">
                    <label>Currency</label>
                    <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                      {['USD', 'EUR', 'GBP', 'TRY', 'JPY', 'CHF', 'CAD', 'AUD'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>KYC Status</label>
                    <select value={form.kyc_status} onChange={e => setForm({ ...form, kyc_status: e.target.value })}>
                      <option value="pending">Pending</option>
                      <option value="verified">Verified</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Risk Level</label>
                    <select value={form.risk_level} onChange={e => setForm({ ...form, risk_level: e.target.value })}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Country</label>
                    <input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} placeholder="Country" />
                  </div>
                  <div className="form-group full-width">
                    <label>Address</label>
                    <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Full address" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editMode ? 'Update' : 'Add Customer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Customers;
