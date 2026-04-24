import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiPlus, FiSearch, FiX } from 'react-icons/fi';
import DetailModal from '../components/DetailModal';

const api = () => axios.create({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

function Beneficiaries() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', bank_name: '', account_number: '', swift_code: '',
    country: '', address: '', phone: ''
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await api().get('/api/beneficiaries');
      const d = res.data;
      setItems(Array.isArray(d) ? d : (d.data || d.beneficiaries || []));
    } catch (err) {
      toast.error('Failed to load beneficiaries');
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode && selected) {
        await api().put(`/api/beneficiaries/${selected._id || selected.id}`, form);
        toast.success('Beneficiary updated');
      } else {
        await api().post('/api/beneficiaries', form);
        toast.success('Beneficiary added');
      }
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (item) => {
    setForm({
      name: item.name || '', email: item.email || '', bank_name: item.bank_name || '',
      account_number: item.account_number || '', swift_code: item.swift_code || '',
      country: item.country || '', address: item.address || '', phone: item.phone || ''
    });
    setEditMode(true);
    setSelected(item);
    setShowForm(true);
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Delete this beneficiary?')) return;
    try {
      await api().delete(`/api/beneficiaries/${item._id || item.id}`);
      toast.success('Beneficiary deleted');
      setSelected(null);
      fetchData();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditMode(false);
    setForm({ name: '', email: '', bank_name: '', account_number: '', swift_code: '', country: '', address: '', phone: '' });
  };

  const filtered = items.filter(b => {
    const s = search.toLowerCase();
    return !s || [b.name, b.bank_name, b.account_number, b.country, b.swift_code]
      .filter(Boolean).some(v => String(v).toLowerCase().includes(s));
  });

  if (loading) return <div className="loading"><div className="loading-spinner"></div>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Beneficiaries</h1>
          <p className="subtitle">Manage transfer recipients</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          <FiPlus /> Add Beneficiary
        </button>
      </div>

      <div className="search-bar">
        <div className="search-wrapper">
          <FiSearch />
          <input className="search-input" placeholder="Search beneficiaries..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Bank</th>
              <th>Account</th>
              <th>Country</th>
              <th>SWIFT</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="5" className="table-empty">No beneficiaries found</td></tr>
            ) : filtered.map(b => (
              <tr key={b._id || b.id} onClick={() => setSelected(b)}>
                <td>{b.name || '-'}</td>
                <td>{b.bank_name || '-'}</td>
                <td>{b.account_number || '-'}</td>
                <td>{b.country || '-'}</td>
                <td>{b.swift_code || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DetailModal
        isOpen={!!selected && !showForm}
        onClose={() => setSelected(null)}
        title="Beneficiary Details"
        data={selected ? {
          Name: selected.name,
          Email: selected.email,
          Phone: selected.phone,
          Bank: selected.bank_name,
          'Account Number': selected.account_number,
          'SWIFT Code': selected.swift_code,
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
              <h2>{editMode ? 'Edit Beneficiary' : 'Add Beneficiary'}</h2>
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
                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="john@example.com" />
                  </div>
                  <div className="form-group">
                    <label>Bank Name</label>
                    <input value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} required placeholder="Bank name" />
                  </div>
                  <div className="form-group">
                    <label>Account Number</label>
                    <input value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })} required placeholder="Account number" />
                  </div>
                  <div className="form-group">
                    <label>SWIFT Code</label>
                    <input value={form.swift_code} onChange={e => setForm({ ...form, swift_code: e.target.value })} placeholder="SWIFT/BIC" />
                  </div>
                  <div className="form-group">
                    <label>Country</label>
                    <input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} required placeholder="Country" />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1234567890" />
                  </div>
                  <div className="form-group">
                    <label>Address</label>
                    <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Address" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editMode ? 'Update' : 'Add Beneficiary'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Beneficiaries;
