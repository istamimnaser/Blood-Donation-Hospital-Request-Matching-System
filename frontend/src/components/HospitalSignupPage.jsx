import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  contact_phone: '',
  location_id: '',
};

export default function HospitalSignupPage({ onSwitch }) {
  const { signupHospital } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [locations, setLocations] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.locations().then(setLocations).catch((err) => setError(err.message));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signupHospital({ ...form, location_id: Number(form.location_id) });
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
          <h2>Find the right donor, minutes not hours.</h2>
          <p>Register your hospital to post requests and match with eligible donors nearby.</p>
        </aside>

        <div className="auth-card">
          <h2>Hospital sign up</h2>

          <form className="form-grid" onSubmit={handleSubmit}>
            <input
              placeholder="Hospital name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <input
              placeholder="Contact phone"
              value={form.contact_phone}
              onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
              required
            />
            <select
              value={form.location_id}
              onChange={(e) => setForm({ ...form, location_id: e.target.value })}
              required
            >
              <option value="">Location</option>
              {locations.map((l) => (
                <option key={l.location_id} value={l.location_id}>
                  {l.city} - {l.area}
                </option>
              ))}
            </select>
            <button type="submit" disabled={loading}>
              {loading ? 'Signing up...' : 'Sign up'}
            </button>
          </form>

          {error && <p className="error">{error}</p>}

          <p className="hint">
            Already have an account?{' '}
            <button type="button" className="link-button" onClick={() => onSwitch('login')}>
              Log in
            </button>
          </p>
        </div>
      </div>
    </section>
  );
}
