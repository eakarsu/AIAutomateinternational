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
        <Route path="/login" element={
          token ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />
        } />
        <Route path="/" element={
          <ProtectedRoute token={token}>
            <AppLayout user={user} onLogout={handleLogout}>
              <Dashboard user={user} />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/transfers" element={
          <ProtectedRoute token={token}>
            <AppLayout user={user} onLogout={handleLogout}>
              <Transfers />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/beneficiaries" element={
          <ProtectedRoute token={token}>
            <AppLayout user={user} onLogout={handleLogout}>
              <Beneficiaries />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/currencies" element={
          <ProtectedRoute token={token}>
            <AppLayout user={user} onLogout={handleLogout}>
              <Currencies />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/transactions" element={
          <ProtectedRoute token={token}>
            <AppLayout user={user} onLogout={handleLogout}>
              <Transactions />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/chat" element={
          <ProtectedRoute token={token}>
            <AppLayout user={user} onLogout={handleLogout}>
              <Chat />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/templates" element={
          <ProtectedRoute token={token}>
            <AppLayout user={user} onLogout={handleLogout}>
              <Templates />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/alerts" element={
          <ProtectedRoute token={token}>
            <AppLayout user={user} onLogout={handleLogout}>
              <Alerts />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/customers" element={
          <ProtectedRoute token={token}>
            <AppLayout user={user} onLogout={handleLogout}>
              <Customers />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
