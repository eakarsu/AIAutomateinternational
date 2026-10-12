import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const login = async (loginEmail, loginPassword) => {
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/login', { email: loginEmail, password: loginPassword });
      const { token, user } = res.data;
      onLogin(token, user);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    await login(email, password);
  };

  const handleQuickLogin = async () => {
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/demo-login');
      onLogin(res.data.token, res.data.user);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Demo login is unavailable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>AIAutomate International</h1>
          <p>Sign in to your money transfer dashboard</p>
        </div>
        <form id="login-form" className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <div className="login-divider">or</div>
          <button type="button" className="quick-login-btn" onClick={handleQuickLogin} disabled={loading}>
            {loading ? 'Signing in...' : 'Log In as Demo'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
