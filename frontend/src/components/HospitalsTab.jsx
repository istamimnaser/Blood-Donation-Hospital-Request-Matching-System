import { useEffect, useState } from 'react';
import { api } from '../api.js';

const emptyForm = { name: '', location_id: '', contact_phone: '', email: '' };

export default function HospitalsTab() {
  const [hospitals, setHospitals] = useState([]);
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    try {
      const [h, loc] = await Promise.all([api.hospitals(), api.locations()]);
      setHospitals(h);
      setLocations(loc);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.createHospital({ ...form, location_id: Number(form.location_id) });
      setForm(emptyForm);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section>
      <h2>Hospitals</h2>
      <p className="hint">Every hospital here can post blood requests in the "Requests &amp; Matching" tab.</p>

      <form className="card form-grid" onSubmit={handleSubmit}>
        <input
          placeholder="Hospital name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          placeholder="Contact phone"
          value={form.contact_phone}
          onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
          required
        />
        <input
          placeholder="Email (optional)"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
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
        <button type="submit">Register hospital</button>
      </form>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Location</th>
              <th>Phone</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {hospitals.map((h) => (
              <tr key={h.hospital_id}>
                <td>{h.hospital_id}</td>
                <td>{h.name}</td>
                <td>{h.city} - {h.area}</td>
                <td>{h.contact_phone}</td>
                <td>{h.email || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
