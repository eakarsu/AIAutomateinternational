import React from 'react';
import { FiX } from 'react-icons/fi';

function DetailModal({ isOpen, onClose, title, data, onEdit, onDelete }) {
  if (!isOpen || !data) return null;

  const formatKey = (key) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, s => s.toUpperCase())
      .trim();
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') {
      if (value instanceof Date) return value.toLocaleString();
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const getStatusClass = (key, value) => {
    const k = key.toLowerCase();
    const v = String(value).toLowerCase();
    if (k === 'status' || k === 'kyc_status' || k === 'kycstatus' || k === 'risk_level' || k === 'risklevel' || k === 'type') {
      if (['completed', 'active', 'verified', 'low'].includes(v)) return 'badge badge-completed';
      if (['pending', 'medium'].includes(v)) return 'badge badge-pending';
      if (['processing', 'in-progress', 'in_progress'].includes(v)) return 'badge badge-processing';
      if (['failed', 'cancelled', 'inactive', 'rejected', 'high'].includes(v)) return 'badge badge-failed';
      if (['deposit'].includes(v)) return 'badge badge-deposit';
      if (['withdrawal'].includes(v)) return 'badge badge-withdrawal';
      if (['exchange', 'transfer'].includes(v)) return 'badge badge-exchange';
    }
    return '';
  };

  const entries = Object.entries(data).filter(([key]) => key !== '__v');

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>{title || 'Details'}</h2>
          <button className="modal-close" onClick={onClose}><FiX /></button>
        </div>
        <div className="modal-body">
          <div className="detail-grid">
            {entries.map(([key, value]) => {
              const statusClass = getStatusClass(key, value);
              const isLongValue = String(formatValue(value)).length > 40;
              return (
                <div key={key} className={`detail-item ${isLongValue ? 'full-width' : ''}`}>
                  <div className="detail-label">{formatKey(key)}</div>
                  <div className="detail-value">
                    {statusClass ? (
                      <span className={statusClass}>{formatValue(value)}</span>
                    ) : (
                      formatValue(value)
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {(onEdit || onDelete) && (
          <div className="modal-footer">
            {onDelete && (
              <button className="btn btn-danger btn-sm" onClick={() => onDelete(data)}>
                Delete
              </button>
            )}
            {onEdit && (
              <button className="btn btn-primary btn-sm" onClick={() => onEdit(data)}>
                Edit
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DetailModal;
