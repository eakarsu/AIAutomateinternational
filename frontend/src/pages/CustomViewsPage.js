import React, { useState } from 'react';
import TradeFlowMap from '../components/customViews/TradeFlowMap';
import TariffComparisonChart from '../components/customViews/TariffComparisonChart';
import CustomsDeclaration from '../components/customViews/CustomsDeclaration';
import ShipmentTracking from '../components/customViews/ShipmentTracking';

const TABS = [
  { id: 'map',         label: 'Trade Flow Map',         kind: 'viz' },
  { id: 'tariff',      label: 'Tariff Comparison',      kind: 'viz' },
  { id: 'declaration', label: 'Customs Declaration',    kind: 'tool' },
  { id: 'tracking',    label: 'Shipment Tracking',      kind: 'tool' },
];

function CustomViewsPage() {
  const [tab, setTab] = useState('map');

  return (
    <div data-testid="custom-views-page" style={{ padding: 24, color: '#e6edf3' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 26, color: '#e6edf3' }}>Trade Views</h1>
        <p style={{ color: '#94a3b8', marginTop: 6, fontSize: 14 }}>
          Cross-border automation toolkit: visualize trade corridors, compare tariffs, generate customs paperwork, and track shipments.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid #1f2a3a', paddingBottom: 8, flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: tab === t.id ? '#3fa9ff' : '#0e1726',
              color: tab === t.id ? '#06121f' : '#cbd5e1',
              border: tab === t.id ? 'none' : '1px solid #1f2a3a',
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t.kind === 'viz' ? '📊 ' : '🧾 '}{t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 20 }}>
        {tab === 'map' && <TradeFlowMap />}
        {tab === 'tariff' && <TariffComparisonChart />}
        {tab === 'declaration' && <CustomsDeclaration />}
        {tab === 'tracking' && <ShipmentTracking />}
      </div>
    </div>
  );
}

export default CustomViewsPage;
