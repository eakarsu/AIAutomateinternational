import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Transfers from './pages/Transfers';
import Beneficiaries from './pages/Beneficiaries';
import Currencies from './pages/Currencies';
import Transactions from './pages/Transactions';
import Chat from './pages/Chat';
import Templates from './pages/Templates';
import Alerts from './pages/Alerts';
import Customers from './pages/Customers';
// AI feature pages
import AIFeeCalculator from './pages/AIFeeCalculator';
import AIRiskAssessment from './pages/AIRiskAssessment';
import AIKycScreen from './pages/AIKycScreen';
import AIRateAnalyzer from './pages/AIRateAnalyzer';
import AIBeneficiaryRisk from './pages/AIBeneficiaryRisk';
import AIRouteOptimizer from './pages/AIRouteOptimizer';
import AISplitPlanner from './pages/AISplitPlanner';
import AIFraudCheck from './pages/AIFraudCheck';
import AIReceipts from './pages/AIReceipts';
import Webhooks from './pages/Webhooks';
import Integrations from './pages/Integrations';
import CustomViewsPage from './pages/CustomViewsPage';
import CorridorLiquidityRisk from './pages/CorridorLiquidityRisk';

import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

import TimelineView from './pages/TimelineView';

function ProtectedRoute({ token, children }) {
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AppLayout({ children, user, onLogout }) {
  return (
    <div className="app-layout">
      <Navbar user={user} onLogout={onLogout} />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken) {
      setToken(savedToken);
    }
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const handleLogin = (tokenValue, userData) => {
    localStorage.setItem('token', tokenValue);
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    }
    setToken(tokenValue);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const wrap = (El) => (
    <ProtectedRoute token={token}>
      <AppLayout user={user} onLogout={handleLogout}>{El}</AppLayout>
    </ProtectedRoute>
  );

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
      <Routes>
        <Route path="/insights/timeline" element={<ProtectedRoute><TimelineView /></ProtectedRoute>} />
        <Route path="/codex/custom-viz" element={<ProtectedRoute><CodexCustomVizFeature /></ProtectedRoute>} />
        <Route path="/codex/operations" element={<ProtectedRoute><CodexOperationsFeature /></ProtectedRoute>} />

        <Route path="/login" element={token ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />} />
        <Route path="/" element={wrap(<Dashboard user={user} />)} />
        <Route path="/transfers" element={wrap(<Transfers />)} />
        <Route path="/beneficiaries" element={wrap(<Beneficiaries />)} />
        <Route path="/currencies" element={wrap(<Currencies />)} />
        <Route path="/transactions" element={wrap(<Transactions />)} />
        <Route path="/chat" element={wrap(<Chat />)} />
        <Route path="/templates" element={wrap(<Templates />)} />
        <Route path="/alerts" element={wrap(<Alerts />)} />
        <Route path="/customers" element={wrap(<Customers />)} />
        {/* AI feature routes */}
        <Route path="/ai/fee-calculator" element={wrap(<AIFeeCalculator />)} />
        <Route path="/ai/risk-assessment" element={wrap(<AIRiskAssessment />)} />
        <Route path="/ai/kyc-screen" element={wrap(<AIKycScreen />)} />
        <Route path="/ai/rate-analyzer" element={wrap(<AIRateAnalyzer />)} />
        <Route path="/ai/beneficiary-risk" element={wrap(<AIBeneficiaryRisk />)} />
        <Route path="/ai/route-optimizer" element={wrap(<AIRouteOptimizer />)} />
        <Route path="/ai/split-planner" element={wrap(<AISplitPlanner />)} />
        <Route path="/ai/fraud-check" element={wrap(<AIFraudCheck />)} />
        <Route path="/ai/receipts" element={wrap(<AIReceipts />)} />
        <Route path="/webhooks" element={wrap(<Webhooks />)} />
        <Route path="/integrations" element={wrap(<Integrations />)} />
        <Route path="/custom-views" element={wrap(<CustomViewsPage />)} />
        <Route path="/corridor-liquidity-risk" element={wrap(<CorridorLiquidityRisk />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
