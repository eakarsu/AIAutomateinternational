import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { integrationsApi } from '../services/api';

// Apply pass 5 — surfaces NEEDS-CREDS / PRODUCT-DECISION integration stubs.
// Each action shows a 503 + missing env var when not configured, otherwise a placeholder ok payload.

function Card({ title, children }) {
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 16, background: '#fff' }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {children}
    </div>
  );
}

function Integrations() {
  const [results, setResults] = useState({});
  const [bulk, setBulk] = useState('[{"amount":100,"currency_from":"USD","currency_to":"EUR"}]');
  const [usdcAmount, setUsdcAmount] = useState('');
  const [usdcWallet, setUsdcWallet] = useState('');
  const [ofacName, setOfacName] = useState('');

  const run = async (key, fn) => {
    try {
      const r = await fn();
      setResults((s) => ({ ...s, [key]: r.data }));
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 503 && data?.missing) {
        toast.warn(`Not configured: set ${data.missing}`);
      } else {
        toast.error(data?.error || err.message);
      }
      setResults((s) => ({ ...s, [key]: data || { error: err.message } }));
    }
  };

  const Result = ({ k }) =>
    results[k] ? (
      <pre style={{ background: '#f7f7f7', padding: 8, borderRadius: 4, fontSize: 12 }}>
        {JSON.stringify(results[k], null, 2)}
      </pre>
    ) : null;

  return (
    <div style={{ padding: 20, maxWidth: 900 }}>
      <h2>Integrations</h2>
      <p style={{ color: '#666' }}>
        Partner / regulatory integrations. Each calls a backend route that returns 503 + the missing env var
        when its credentials are not configured.
      </p>

      <Card title="SWIFT settlement tracking (NEEDS-CREDS: SWIFT_API_KEY)">
        <button onClick={() => run('swift', () => integrationsApi.swiftTrack({}))}>Probe SWIFT</button>
        <Result k="swift" />
      </Card>

      <Card title="Wise quote (NEEDS-CREDS: WISE_API_KEY)">
        <button onClick={() => run('wise', () => integrationsApi.wiseQuote({}))}>Probe Wise</button>
        <Result k="wise" />
      </Card>

      <Card title="Remitly quote (NEEDS-CREDS: REMITLY_API_KEY)">
        <button onClick={() => run('remitly', () => integrationsApi.remitlyQuote({}))}>Probe Remitly</button>
        <Result k="remitly" />
      </Card>

      <Card title="OFAC screening (NEEDS-CREDS: OFAC_API_KEY)">
        <input
          placeholder="Name to screen"
          value={ofacName}
          onChange={(e) => setOfacName(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <button onClick={() => run('ofac', () => integrationsApi.ofacScreen({ name: ofacName }))}>
          Screen
        </button>
        <Result k="ofac" />
      </Card>

      <Card title="USDC settlement intent (PRODUCT-DECISION: non-custodial)">
        <input
          placeholder="Amount"
          value={usdcAmount}
          onChange={(e) => setUsdcAmount(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <input
          placeholder="Wallet address"
          value={usdcWallet}
          onChange={(e) => setUsdcWallet(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <button
          onClick={() =>
            run('usdc', () => integrationsApi.usdcIntent({ amount: usdcAmount, wallet_address: usdcWallet }))
          }
        >
          Record intent
        </button>
        <button
          onClick={() => run('usdcList', () => integrationsApi.listUsdcIntents())}
          style={{ marginLeft: 8 }}
        >
          List
        </button>
        <Result k="usdc" />
        <Result k="usdcList" />
      </Card>

      <Card title="Bulk transfer plan (TOO-RISKY → dry-run only)">
        <textarea
          rows={4}
          cols={60}
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
          style={{ display: 'block', marginBottom: 8 }}
        />
        <button
          onClick={() => {
            try {
              const transfers = JSON.parse(bulk);
              run('bulk', () => integrationsApi.bulkPlan({ transfers }));
            } catch (err) {
              toast.error('Invalid JSON');
            }
          }}
        >
          Plan
        </button>
        <Result k="bulk" />
      </Card>

      <Card title="Settlement events log">
        <button onClick={() => run('settlements', () => integrationsApi.settlements())}>Refresh</button>
        <Result k="settlements" />
      </Card>
    </div>
  );
}

export default Integrations;
