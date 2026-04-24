import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FiSend, FiUsers, FiDollarSign, FiList,
  FiMessageSquare, FiFileText, FiBell, FiUserCheck
} from 'react-icons/fi';

const api = () => axios.create({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

function Dashboard({ user }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    transfers: 0, beneficiaries: 0, currencies: 0, alerts: 0,
    transactions: 0, templates: 0, customers: 0
  });
  const [recentTransfers, setRecentTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const endpoints = [
        '/api/transfers', '/api/beneficiaries', '/api/currencies',
        '/api/alerts', '/api/transactions', '/api/templates', '/api/customers'
      ];
      const results = await Promise.allSettled(
        endpoints.map(ep => api().get(ep))
      );

      const getData = (res) => {
        if (res.status === 'fulfilled') {
          const d = res.value.data;
          return Array.isArray(d) ? d : (d.data || d.transfers || d.beneficiaries || d.currencies || d.alerts || d.transactions || d.templates || d.customers || []);
        }
        return [];
      };

      const transfers = getData(results[0]);
      const beneficiaries = getData(results[1]);
      const currencies = getData(results[2]);
      const alerts = getData(results[3]);
      const transactions = getData(results[4]);
      const templates = getData(results[5]);
      const customers = getData(results[6]);

      setStats({
        transfers: transfers.length,
        beneficiaries: beneficiaries.length,
        currencies: currencies.length,
        alerts: alerts.filter(a => a.is_active === true || a.is_active === 't').length,
        transactions: transactions.length,
        templates: templates.length,
        customers: customers.length
      });

      setRecentTransfers(transfers.slice(-5).reverse());
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { path: '/transfers', icon: <FiSend />, title: 'Transfers', desc: 'Manage international money transfers', count: stats.transfers },
    { path: '/beneficiaries', icon: <FiUsers />, title: 'Beneficiaries', desc: 'Manage transfer recipients', count: stats.beneficiaries },
    { path: '/currencies', icon: <FiDollarSign />, title: 'Currencies', desc: 'View exchange rates and convert', count: stats.currencies },
    { path: '/transactions', icon: <FiList />, title: 'Transactions', desc: 'Track all financial activity', count: stats.transactions },
    { path: '/chat', icon: <FiMessageSquare />, title: 'AI Chat', desc: 'Get help from our AI assistant', count: null },
    { path: '/templates', icon: <FiFileText />, title: 'Templates', desc: 'Reusable transfer templates', count: stats.templates },
    { path: '/alerts', icon: <FiBell />, title: 'Alerts', desc: 'Currency rate notifications', count: stats.alerts },
    { path: '/customers', icon: <FiUserCheck />, title: 'Customers', desc: 'Manage customer accounts', count: stats.customers },
  ];

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    let cls = 'badge badge-pending';
    if (s === 'completed') cls = 'badge badge-completed';
    else if (s === 'processing') cls = 'badge badge-processing';
    else if (s === 'failed' || s === 'cancelled') cls = 'badge badge-failed';
    return <span className={cls}>{status || 'pending'}</span>;
  };

  if (loading) {
    return <div className="loading"><div className="loading-spinner"></div>Loading dashboard...</div>;
  }

  return (
    <div>
      <div className="dashboard-welcome">
        <h1>Welcome back{user?.name ? `, ${user.name}` : ''}!</h1>
        <p>Here's an overview of your money transfer platform</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon"><FiSend /></div>
          <div className="stat-label">Total Transfers</div>
          <div className="stat-value">{stats.transfers}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FiUsers /></div>
          <div className="stat-label">Active Beneficiaries</div>
          <div className="stat-value">{stats.beneficiaries}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FiDollarSign /></div>
          <div className="stat-label">Available Currencies</div>
          <div className="stat-value">{stats.currencies}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FiBell /></div>
          <div className="stat-label">Pending Alerts</div>
          <div className="stat-value">{stats.alerts}</div>
        </div>
      </div>

      <div className="feature-grid">
        {features.map(f => (
          <div key={f.path} className="feature-card" onClick={() => navigate(f.path)}>
            <div className="card-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
            {f.count !== null && (
              <div className="card-count">{f.count} items</div>
            )}
          </div>
        ))}
      </div>

      {recentTransfers.length > 0 && (
        <div className="table-container">
          <div className="table-header">
            <h3>Recent Transfers</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/transfers')}>View All</button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Recipient</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentTransfers.map(t => (
                <tr key={t._id || t.id} onClick={() => navigate('/transfers')}>
                  <td>{t.reference_number || t._id?.slice(-8) || '-'}</td>
                  <td>{t.recipient_name || '-'}</td>
                  <td>{t.amount ? `${Number(t.amount).toLocaleString()} ${t.source_currency || t.currency || ''}` : '-'}</td>
                  <td>{getStatusBadge(t.status)}</td>
                  <td>{t.created_at ? new Date(t.created_at).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
