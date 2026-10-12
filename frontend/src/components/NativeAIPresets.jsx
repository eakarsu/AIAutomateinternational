import React from 'react';
import './AIWorkspace.css';

const examples = {
  fee: [
    { label: 'Family remittance', amount: '1250', from_currency: 'USD', to_currency: 'EUR', transfer_type: 'WIRE' },
    { label: 'Urgent supplier', amount: '7800', from_currency: 'USD', to_currency: 'GBP', transfer_type: 'SWIFT' },
    { label: 'Regional payroll', amount: '3200', from_currency: 'EUR', to_currency: 'USD', transfer_type: 'SEPA' },
  ],
  fraud: [
    { label: 'Routine transfer', amount: '850', country: 'United Kingdom' },
    { label: 'Large transfer', amount: '18500', country: 'Turkey' },
    { label: 'New destination', amount: '4200', country: 'Canada' },
  ],
  kyc: [
    { label: 'Existing beneficiary', name: 'Amina Rahman', country: 'United Kingdom', bank_name: 'Example City Bank' },
    { label: 'New supplier', name: 'Maya Chen', country: 'Canada', bank_name: 'Example Commerce Bank' },
    { label: 'New recipient', name: 'Daniel Ortiz', country: 'Mexico', bank_name: 'Example Regional Bank' },
  ],
  rate: [
    { label: 'USD to EUR · 30 days', from_currency: 'USD', to_currency: 'EUR', days: 30 },
    { label: 'GBP to USD · 90 days', from_currency: 'GBP', to_currency: 'USD', days: 90 },
    { label: 'EUR to CHF · 14 days', from_currency: 'EUR', to_currency: 'CHF', days: 14 },
  ],
  risk: [
    { label: 'Family support', amount: '950', purpose: 'Monthly family support' },
    { label: 'Supplier invoice', amount: '8400', purpose: 'Payment for invoice INV-2026-014' },
    { label: 'Tuition payment', amount: '12500', purpose: 'University tuition for autumn term' },
  ],
  route: [
    { label: 'Balanced remittance', amount: '1500', from_currency: 'USD', to_currency: 'EUR', urgency: 'balanced' },
    { label: 'Fast supplier payment', amount: '9000', from_currency: 'USD', to_currency: 'GBP', urgency: 'urgent' },
    { label: 'Low-cost transfer', amount: '4200', from_currency: 'EUR', to_currency: 'USD', urgency: 'cheap' },
  ],
  split: [
    { label: 'Two-part invoice', amount: '12000', from_currency: 'USD', to_currency: 'EUR', splits: 2 },
    { label: 'Staged tuition', amount: '18000', from_currency: 'GBP', to_currency: 'USD', splits: 3 },
    { label: 'Four-leg settlement', amount: '40000', from_currency: 'EUR', to_currency: 'CHF', splits: 4 },
  ],
};

export function nativePresetValues(kind, index, value, records = [], currencies = []) {
  const sample = examples[kind]?.[index] || {};
  const next = { ...value, ...sample };
  if (kind === 'beneficiary' || kind === 'receipt') {
    // Only an actual loaded record can supply a database reference.
    return records.some((record) => String(record.id) === String(value)) ? value : (records[index]?.id != null ? String(records[index].id) : '');
  }
  if (['fraud', 'risk', 'kyc'].includes(kind)) {
    const key = 'beneficiary_id';
    const existing = records.some((record) => String(record.id) === String(value[key]));
    next[key] = existing ? value[key] : (records[index]?.id != null ? String(records[index].id) : '');
  }
  if (currencies.length && ['fee', 'rate'].includes(kind)) {
    const available = currencies.map((currency) => currency.code);
    for (const key of ['from_currency', 'to_currency']) {
      if (!available.includes(next[key])) next[key] = available.includes(value[key]) ? value[key] : available[0];
    }
    if (next.from_currency === next.to_currency && available.length > 1) next.to_currency = available.find((code) => code !== next.from_currency);
  }
  return next;
}

export default function NativeAIPresets({ kind, value, onChange, records = [], currencies = [], disabled = false }) {
  const labels = examples[kind]?.map((item) => item.label) || (kind === 'beneficiary' ? ['First beneficiary', 'Second beneficiary', 'Third beneficiary'] : ['First transfer', 'Second transfer', 'Third transfer']);
  const missingRecords = ['beneficiary', 'receipt', 'fraud', 'risk', 'kyc'].includes(kind) && !records.length;
  return <div className="ai-preset-bar"><div><strong>Sample inputs</strong><p>Fill fields for review; no analysis starts. {missingRecords && (kind === 'kyc' ? 'Existing-beneficiary examples require a saved record; ad-hoc examples remain available.' : 'A saved record is required before this example can be complete.')}</p></div><div className="ai-actions">{labels.map((label, index) => <button key={label} type="button" className="btn btn-secondary" disabled={disabled} onClick={() => onChange(nativePresetValues(kind, index, value, records, currencies), index)}>{label}</button>)}</div></div>;
}
