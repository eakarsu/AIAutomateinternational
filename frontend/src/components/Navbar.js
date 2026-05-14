import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FiHome, FiSend, FiUsers, FiDollarSign, FiList,
  FiMessageSquare, FiFileText, FiBell, FiUserCheck, FiLogOut,
  FiZap, FiShield, FiTrendingUp, FiAlertCircle, FiMap, FiLayers, FiAlertOctagon
} from 'react-icons/fi';

const navSections = [
  {
    title: 'Overview',
    items: [
      { path: '/', label: 'Dashboard', icon: <FiHome /> },
    ],
  },
  {
    title: 'Operations',
    items: [
      { path: '/transfers', label: 'Transfers', icon: <FiSend /> },
      { path: '/beneficiaries', label: 'Beneficiaries', icon: <FiUsers /> },
      { path: '/currencies', label: 'Currencies', icon: <FiDollarSign /> },
      { path: '/transactions', label: 'Transactions', icon: <FiList /> },
      { path: '/templates', label: 'Templates', icon: <FiFileText /> },
      { path: '/alerts', label: 'Alerts', icon: <FiBell /> },
      { path: '/customers', label: 'Customers', icon: <FiUserCheck /> },
      { path: '/webhooks', label: 'Webhooks', icon: <FiBell /> },
      { path: '/integrations', label: 'Integrations', icon: <FiZap /> },
    ],
  },
  {
    title: 'AI Tools',
    items: [
      { path: '/chat', label: 'AI Chat', icon: <FiMessageSquare /> },
      { path: '/ai/fee-calculator', label: 'Fee Calculator', icon: <FiZap /> },
      { path: '/ai/risk-assessment', label: 'AML Risk Check', icon: <FiShield /> },
      { path: '/ai/kyc-screen', label: 'KYC Screening', icon: <FiUserCheck /> },
      { path: '/ai/rate-analyzer', label: 'Rate Analyzer', icon: <FiTrendingUp /> },
      { path: '/ai/beneficiary-risk', label: 'Beneficiary Risk', icon: <FiAlertCircle /> },
      { path: '/ai/route-optimizer', label: 'Route Optimizer', icon: <FiMap /> },
      { path: '/ai/split-planner', label: 'Split Planner', icon: <FiLayers /> },
      { path: '/ai/fraud-check', label: 'Fraud Detection', icon: <FiAlertOctagon /> },
      { path: '/ai/receipts', label: 'Receipts', icon: <FiFileText /> },
    ],
  },
];

function Navbar({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>AIAutomate</h1>
        <div className="logo-subtitle">International</div>
      </div>

      <nav className="sidebar-nav">
        {navSections.map((section) => (
          <div key={section.title} className="sidebar-section">
            <div className="sidebar-section-title" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, padding: '8px 16px 4px' }}>
              {section.title}
            </div>
            {section.items.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={location.pathname === item.path ? 'active' : ''}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {getInitials(user?.name || user?.email)}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name || user?.email || 'User'}</div>
            <div className="sidebar-user-role">{user?.role || 'Member'}</div>
          </div>
        </div>
        <button className="sidebar-logout" onClick={handleLogout}>
          <FiLogOut />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default Navbar;
