import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiPlus, FiSearch, FiX, FiRefreshCw } from 'react-icons/fi';
import DetailModal from '../components/DetailModal';

const api = () => axios.create({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

function Currencies() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', symbol: '', exchange_rate_to_usd: '', country: '' });

  // Converter state
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [convertAmount, setConvertAmount] = useState('');
  const [convertResult, setConvertResult] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await api().get('/api/currencies');
      const d = res.data;
      setItems(Array.isArray(d) ? d : (d.data || d.currencies || []));
    } catch (err) {
      toast.error('Failed to load currencies');
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode && selected) {
        await api().put(`/api/currencies/${selected._id || selected.id}`, form);
        toast.success('Currency updated');
      } else {
        await api().post('/api/currencies', form);
        toast.success('Currency added');
      }
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (item) => {
    setForm({
      code: item.code || '', name: item.name || '', symbol: item.symbol || '',
      exchange_rate_to_usd: item.exchange_rate_to_usd || '', country: item.country || ''
    });
    setEditMode(true);
    setSelected(item);
    setShowForm(true);
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Delete this currency?')) return;
    try {
      await api().delete(`/api/currencies/${item._id || item.id}`);
      toast.success('Currency deleted');
      setSelected(null);
      fetchData();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditMode(false);
    setForm({ code: '', name: '', symbol: '', exchange_rate_to_usd: '', country: '' });
  };

  const handleConvert = () => {
    if (!convertAmount || !fromCurrency || !toCurrency) {
      toast.error('Please fill in all conversion fields');
      return;
    }
    const fromRate = items.find(c => c.code === fromCurrency);
    const toRate = items.find(c => c.code === toCurrency);

    if (!fromRate || !toRate) {
      // Fallback: try simple conversion
      const amount = parseFloat(convertAmount);
      const fRate = fromRate?.exchange_rate_to_usd || 1;
      const tRate = toRate?.exchange_rate_to_usd || 1;
      const result = (amount / fRate) * tRate;
      setConvertResult({
        from: `${amount.toLocaleString()} ${fromCurrency}`,
        to: `${result.toFixed(2).toLocaleString()} ${toCurrency}`,
        rate: (tRate / fRate).toFixed(6)
      });
      return;
    }

    const amount = parseFloat(convertAmount);
    const fRate = parseFloat(fromRate.exchange_rate_to_usd || 1);
    const tRate = parseFloat(toRate.exchange_rate_to_usd || 1);
    const result = (amount / fRate) * tRate;
    setConvertResult({
      from: `${amount.toLocaleString()} ${fromCurrency}`,
      to: `${result.toFixed(2)} ${toCurrency}`,
      rate: (tRate / fRate).toFixed(6)
    });
  };

  const filtered = items.filter(c => {
    const s = search.toLowerCase();
    return !s || [c.code, c.name, c.country, c.symbol]
      .filter(Boolean).some(v => String(v).toLowerCase().includes(s));
  });

  if (loading) return <div className="loading"><div className="loading-spinner"></div>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Currencies</h1>
          <p className="subtitle">Exchange rates and currency management</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          <FiPlus /> Add Currency
        </button>
      </div>

      <div className="converter-section">
        <h3>Currency Converter</h3>
        <div className="converter-row">
          <div className="form-group">
            <label>From</label>
            <select value={fromCurrency} onChange={e => setFromCurrency(e.target.value)}>
              {items.map(c => <option key={c._id || c.code} value={c.code}>{c.code} - {c.name}</option>)}
              {items.length === 0 && ['USD', 'EUR', 'GBP'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>To</label>
            <select value={toCurrency} onChange={e => setToCurrency(e.target.value)}>
              {items.map(c => <option key={c._id || c.code} value={c.code}>{c.code} - {c.name}</option>)}
              {items.length === 0 && ['USD', 'EUR', 'GBP'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Amount</label>
            <input type="number" step="0.01" value={convertAmount} onChange={e => setConvertAmount(e.target.value)} placeholder="Enter amount" />
          </div>
          <button className="btn btn-primary" onClick={handleConvert} style={{ marginBottom: 0 }}>
            <FiRefreshCw /> Convert
          </button>
        </div>
        {convertResult && (
          <div className="converter-result">
            <div className="result-label">{convertResult.from} =</div>
            <div className="result-value">{convertResult.to}</div>
            <div className="result-label">Rate: 1 {fromCurrency} = {convertResult.rate} {toCurrency}</div>
          </div>
        )}
      </div>

      <div className="search-bar">
        <div className="search-wrapper">
          <FiSearch />
          <input className="search-input" placeholder="Search currencies..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Code</th>
              <th>Name</th>
              <th>Rate to USD</th>
              <th>Country</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="5" className="table-empty">No currencies found</td></tr>
            ) : filtered.map(c => (
              <tr key={c._id || c.id || c.code} onClick={() => setSelected(c)}>
                <td style={{ fontSize: '18px' }}>{c.symbol || c.code?.charAt(0)}</td>
                <td><strong>{c.code}</strong></td>
                <td>{c.name || '-'}</td>
                <td>{c.exchange_rate_to_usd || '-'}</td>
                <td>{c.country || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DetailModal
        isOpen={!!selected && !showForm}
        onClose={() => setSelected(null)}
        title="Currency Details"
        data={selected ? {
          Code: selected.code,
          Name: selected.name,
          Symbol: selected.symbol,
          'Rate to USD': selected.exchange_rate_to_usd,
          Country: selected.country,
          Active: selected.is_active,
          'Updated At': selected.updated_at ? new Date(selected.updated_at).toLocaleString() : '-',
        } : null}
        onEdit={() => handleEdit(selected)}
        onDelete={() => handleDelete(selected)}
      />

      {showForm && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) resetForm(); }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editMode ? 'Edit Currency' : 'Add Currency'}</h2>
              <button className="modal-close" onClick={resetForm}><FiX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Currency Code</label>
                    <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} required placeholder="USD" maxLength={3} />
                  </div>
                  <div className="form-group">
                    <label>Name</label>
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="US Dollar" />
                  </div>
                  <div className="form-group">
                    <label>Symbol</label>
                    <input value={form.symbol} onChange={e => setForm({ ...form, symbol: e.target.value })} placeholder="$" />
                  </div>
                  <div className="form-group">
                    <label>Rate to USD</label>
                    <input type="number" step="0.000001" value={form.exchange_rate_to_usd} onChange={e => setForm({ ...form, exchange_rate_to_usd: e.target.value })} required placeholder="1.000000" />
                  </div>
                  <div className="form-group full-width">
                    <label>Country</label>
                    <input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} placeholder="United States" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editMode ? 'Update' : 'Add Currency'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Currencies;
