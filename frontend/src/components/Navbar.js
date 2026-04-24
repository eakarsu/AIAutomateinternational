import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FiHome, FiSend, FiUsers, FiDollarSign, FiList,
  FiMessageSquare, FiFileText, FiBell, FiUserCheck, FiLogOut
} from 'react-icons/fi';

const navItems = [
  { path: '/', label: 'Dashboard', icon: <FiHome /> },
  { path: '/transfers', label: 'Transfers', icon: <FiSend /> },
  { path: '/beneficiaries', label: 'Beneficiaries', icon: <FiUsers /> },
  { path: '/currencies', label: 'Currencies', icon: <FiDollarSign /> },
  { path: '/transactions', label: 'Transactions', icon: <FiList /> },
  { path: '/chat', label: 'AI Chat', icon: <FiMessageSquare /> },
  { path: '/templates', label: 'Templates', icon: <FiFileText /> },
  { path: '/alerts', label: 'Alerts', icon: <FiBell /> },
  { path: '/customers', label: 'Customers', icon: <FiUserCheck /> },
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
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={location.pathname === item.path ? 'active' : ''}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
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
