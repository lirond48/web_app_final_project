import React, { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import MarketingHero from '../ui/MarketingHero';
import './Register.css';

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    
    if (!username.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.register({
        username: username.trim(),
        email: email.trim(),
        password_hash: password,
      });

      console.log('Registration successful:', response);
      
      // Navigate to login page after successful registration
      navigate('/login', { state: { message: 'Registration successful! Please login.' } });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page ui-shell">
      <div className="auth-layout">
        <MarketingHero
          title="Join the cleanest way to publish visual content."
          subtitle="Create your account and start posting with a polished, modern interface built for creators."
          primaryLabel="Go to Login"
          primaryTo="/login"
          secondaryLabel="Open Feed"
          secondaryTo="/feed"
        />
        <div className="register-card ui-card">
          <div className="register-header">
            <h2>Create Account</h2>
            <p>Set up your profile in under a minute.</p>
          </div>

          <form onSubmit={handleSubmit} className="register-form">
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                disabled={isLoading}
                required
                autoComplete="username"
                className="ui-input"
              />
            </div>

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
                placeholder="At least 6 characters"
                disabled={isLoading}
                required
                autoComplete="new-password"
                minLength={6}
                className="ui-input"
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button
              type="submit"
              disabled={isLoading || !username.trim() || !email.trim() || !password.trim()}
              className="btn-register btn-primary"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>

            <div className="register-footer">
              <p>
                Already registered?{" "}
                <Link to="/login" className="login-link">
                  Sign in now
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;

