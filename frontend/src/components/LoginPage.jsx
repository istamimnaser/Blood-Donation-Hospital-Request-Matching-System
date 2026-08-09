import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage({ onSwitch }) {
  const { login } = useAuth();
  const [role, setRole] = useState('donor');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, role);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-shell">
        <aside className="auth-aside" style={{ '--auth-aside-image': "url('/crescent.jpg')" }}>
          <span className="quote-mark">&ldquo;</span>
          <h2>Every donation is someone's second chance.</h2>
          <p>Sign in to manage your availability and matches, or find donors for a request.</p>
        </aside>

        <div className="auth-card">
          <h2>Log in</h2>

          <div className="role-toggle">
            <button
              type="button"
              className={role === 'donor' ? 'tab active' : 'tab'}
              onClick={() => setRole('donor')}
            >
              Donor
            </button>
            <button
              type="button"
              className={role === 'hospital' ? 'tab active' : 'tab'}
              onClick={() => setRole('hospital')}
            >
              Hospital
            </button>
          </div>

          <form className="form-grid" onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          {error && <p className="error">{error}</p>}

          <p className="hint">
            New {role}?{' '}
            <button type="button" className="link-button" onClick={() => onSwitch(`signup-${role}`)}>
              Sign up
            </button>
          </p>
        </div>
      </div>
    </section>
  );
}
