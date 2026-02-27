import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import MarketingHero from '../ui/MarketingHero';
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
    <div className="auth-page ui-shell">
      <div className="auth-layout">
        <MarketingHero
          title="The creator workspace for modern visual posts."
          subtitle="Upload in seconds, keep your feed beautiful, and manage your profile with a smooth, startup-grade experience."
          primaryLabel="Create an Account"
          primaryTo="/register"
          secondaryLabel="Explore Feed"
          secondaryTo="/feed"
        />
        <div className="login-card ui-card" id="auth-card">
          <div className="login-header">
            <h2>Welcome Back</h2>
            <p>Sign in to continue sharing.</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                disabled={isLoading}
                required
                autoComplete="email"
                className="ui-input"
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
                className="ui-input"
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button
              type="submit"
              disabled={isLoading || !email.trim() || !password.trim()}
              className="btn-login btn-primary"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>

            <div className="oauth-divider">or</div>

            <div className="oauth-buttons">
              <button
                type="button"
                className="btn-oauth btn-secondary"
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                Continue with Google
              </button>
              <button
                type="button"
                className="btn-oauth btn-ghost"
                onClick={handleFacebookLogin}
                disabled={isLoading}
              >
                Continue with Facebook
              </button>
            </div>

            <div className="login-footer">
              <p>
                New here?{" "}
                <Link to="/register" className="register-link">
                  Create your account
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;

