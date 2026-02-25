import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import './Login.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const Login: React.FC = () => {
  const { isAuthenticated, isLoading, error, login, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  // Redirect to feed if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/feed');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearError();
    
    if (!email.trim() || !password.trim()) {
      return;
    }

    const result = await login({ email: email.trim(), password_hash: password });
    if (result.success) {
      navigate('/feed');
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  const handleFacebookLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/facebook`;
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>Login</h2>
          <p>Please enter your credentials</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={isLoading}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading}
              required
              autoComplete="current-password"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button 
            type="submit" 
            disabled={isLoading || !email.trim() || !password.trim()}
            className="btn-login"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>

          <div className="oauth-divider">or</div>

          <div className="oauth-buttons">
            <button
              type="button"
              className="btn-oauth btn-oauth-google"
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              Continue with Google
            </button>
          </div>

          <div className="login-footer">
            <p>Don't have an account? <Link to="/register" className="register-link">Register here</Link></p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;

