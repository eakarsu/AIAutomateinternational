import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiFileText, FiDownload } from 'react-icons/fi';
import { aiFeaturesApi, transfersApi } from '../services/api';

function AIReceipts() {
  const [transfers, setTransfers] = useState([]);
  const [selected, setSelected] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    transfersApi
      .list()
      .then((r) => {
        const d = r.data;
        setTransfers(Array.isArray(d) ? d : d.data || d.transfers || []);
      })
      .catch(() => {});
  }, []);

  const fetchReceipt = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setLoading(true);
    setReceipt(null);
    try {
      const res = await aiFeaturesApi.receipt(selected);
      setReceipt(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Receipt failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadJSON = () => {
    if (!receipt) return;
    const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${receipt.receipt_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printReceipt = () => {
    window.print();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><FiFileText /> Compliance Receipts</h1>
          <p className="subtitle">Auto-generate compliant transfer receipts with regulatory details</p>
        </div>
      </div>

      <div style={{ background: 'var(--bg-secondary, #1a1f2e)', padding: 24, borderRadius: 8, marginBottom: 24 }}>
        <form onSubmit={fetchReceipt}>
          <div className="form-group">
            <label>Transfer</label>
            <select value={selected} onChange={(e) => setSelected(e.target.value)} required>
              <option value="">Select a transfer...</option>
              {transfers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.reference_number || `#${t.id}`} | {t.amount} {t.source_currency} → {t.target_currency} | {t.status}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading || !selected}>
            <FiFileText /> {loading ? 'Generating...' : 'Generate Receipt'}
          </button>
        </form>
      </div>

      {receipt && (
        <div className="table-container" style={{ padding: 32 }} id="receipt-printable">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2>Transfer Receipt</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={printReceipt}>Print</button>
              <button className="btn btn-primary" onClick={downloadJSON}><FiDownload /> Download JSON</button>
            </div>
          </div>
          <table>
            <tbody>
              <tr><th>Receipt ID</th><td>{receipt.receipt_id}</td></tr>
              <tr><th>Reference</th><td>{receipt.reference_number}</td></tr>
              <tr><th>Issued</th><td>{receipt.issued_at}</td></tr>
              <tr><th>Sender</th><td>{receipt.sender_email}</td></tr>
              <tr><th>Beneficiary</th><td>{receipt.beneficiary?.name} ({receipt.beneficiary?.country})</td></tr>
              <tr><th>Bank</th><td>{receipt.beneficiary?.bank} | {receipt.beneficiary?.account}</td></tr>
              <tr><th>Amount</th><td>{receipt.transaction?.amount} {receipt.transaction?.source_currency}</td></tr>
              <tr><th>Converted</th><td>{receipt.transaction?.converted_amount} {receipt.transaction?.target_currency}</td></tr>
              <tr><th>Exchange rate</th><td>{receipt.transaction?.exchange_rate}</td></tr>
              <tr><th>Fee</th><td>{receipt.transaction?.fee || '-'}</td></tr>
              <tr><th>Status</th><td>{receipt.transaction?.status}</td></tr>
              <tr><th>Compliance</th><td>{receipt.regulatory?.compliance_check}</td></tr>
              <tr><th>Reporting</th><td>{receipt.regulatory?.report_to}</td></tr>
              <tr><th>Retention</th><td>{receipt.regulatory?.retention_years} years</td></tr>
              {receipt.notes && <tr><th>Notes</th><td>{receipt.notes}</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AIReceipts;
