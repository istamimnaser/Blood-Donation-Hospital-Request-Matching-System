import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

const emptyForm = {
  full_name: '',
  email: '',
  password: '',
  phone: '',
  date_of_birth: '',
  blood_group_id: '',
  location_id: '',
  last_donation_date: '',
};

export default function DonorSignupPage({ onSwitch }) {
  const { signupDonor } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [bloodGroups, setBloodGroups] = useState([]);
  const [locations, setLocations] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([api.bloodGroups(), api.locations()])
      .then(([bg, loc]) => {
        setBloodGroups(bg);
        setLocations(loc);
      })
      .catch((err) => setError(err.message));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signupDonor({
        ...form,
        blood_group_id: Number(form.blood_group_id),
        location_id: Number(form.location_id),
        date_of_birth: form.date_of_birth || null,
        last_donation_date: form.last_donation_date || null,
      });
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
          <h2>Someone nearby needs your blood group right now.</h2>
          <p>Register once, and hospitals can find and match you when your blood type is needed.</p>
        </aside>

        <div className="auth-card">
          <h2>Donor sign up</h2>

          <form className="form-grid" onSubmit={handleSubmit}>
            <input
              placeholder="Full name"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
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
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
            <label>
              Birthday:
              <input
                type="date"
                value={form.date_of_birth}
                onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
              />
            </label>
            <select
              value={form.blood_group_id}
              onChange={(e) => setForm({ ...form, blood_group_id: e.target.value })}
              required
            >
              <option value="">Blood group</option>
              {bloodGroups.map((bg) => (
                <option key={bg.blood_group_id} value={bg.blood_group_id}>
                  {bg.group_name}
                </option>
              ))}
            </select>
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
            <label>
              Last donation date (if any):
              <input
                type="date"
                value={form.last_donation_date}
                onChange={(e) => setForm({ ...form, last_donation_date: e.target.value })}
              />
            </label>
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
