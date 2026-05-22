import React, { useEffect, useState } from 'react';

export default function CorridorLiquidityRisk() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch('/api/corridor-liquidity-risk').then((res) => res.json()).then(setData).catch(() => setData(null));
  }, []);
  return (
    <div className="page">
      <h1>Corridor Liquidity Risk</h1>
      <p>Forecast prefunding shortfalls and rebalance international transfer corridors.</p>
      <div className="stats-grid">
        {data && Object.entries(data.summary).map(([key, value]) => <div className="stat-card" key={key}><span>{key.replaceAll('_', ' ')}</span><strong>{value}</strong></div>)}
      </div>
      <div className="card">
        {(data?.corridors || []).map((item) => <div key={item.corridor} style={{ padding: 12, borderBottom: '1px solid #e5e7eb' }}><strong>{item.corridor}</strong><div>Demand ${item.demand} / prefunded ${item.prefunded} - {item.risk} - {item.action}</div></div>)}
      </div>
    </div>
  );
}
