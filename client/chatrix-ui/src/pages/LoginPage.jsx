import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-top-bar" />

      <div className="auth-container">
        <div className="auth-logo-section">
          <div className="auth-logo-icon">
            <svg viewBox="0 0 50 50" width="64" height="64">
              <circle cx="25" cy="25" r="25" fill="#25D366"/>
              <path d="M25 10C16.7 10 10 16.7 10 25c0 3.3.96 6.37 2.6 8.94L10 40l6.3-2.52A14.9 14.9 0 0 0 25 40c8.3 0 15-6.7 15-15S33.3 10 25 10zm7.5 20.5c-.35.98-1.75 1.79-2.45 1.9-.63.1-1.43.14-2.3-.14-.53-.17-1.22-.4-2.1-.79-3.7-1.59-6.1-5.3-6.28-5.55-.17-.25-1.4-1.87-1.4-3.57s.88-2.54 1.2-2.88c.31-.35.68-.44.9-.44h.65c.21 0 .5.08.78.6.3.53 1.02 2.5 1.12 2.68.1.18.17.4.03.65-.13.25-.2.4-.38.62-.18.22-.38.48-.54.65-.18.18-.37.38-.16.74.21.36.94 1.55 2.02 2.5 1.39 1.25 2.56 1.64 2.92 1.82.35.18.56.15.77-.09.21-.24.9-.96 1.14-1.29.24-.33.48-.27.8-.16.33.1 2.08.98 2.43 1.16.36.18.6.27.7.42.09.15.09.87-.27 1.77z" fill="white"/>
            </svg>
          </div>
          <h1 className="auth-brand-name">CHATRIX</h1>
          <p className="auth-brand-sub">Simple. Secure. Reliable messaging.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <div className="auth-error-msg">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="#EA0038">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              {error}
            </div>
          )}

          <div className="auth-field">
            <label>Email address</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" required autoComplete="email" autoFocus
            />
          </div>

          <div className="auth-field">
            <label>Password</label>
            <div className="auth-pass-wrap">
              <input
                type={showPass ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password" required autoComplete="current-password"
              />
              <button type="button" className="show-pass-btn" onClick={() => setShowPass(v => !v)}>
                {showPass ? (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="#8696A0"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="#8696A0"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? <span className="btn-spinner" /> : 'LOG IN'}
          </button>

          <p className="auth-switch-text">
            Don't have an account? <Link to="/register">Create Account</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
