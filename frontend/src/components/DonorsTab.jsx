import { useEffect, useState } from 'react';
import { api, photoUrl } from '../api.js';

const emptyForm = {
  full_name: '',
  email: '',
  phone: '',
  blood_group_id: '',
  location_id: '',
  date_of_birth: '',
  is_available: true,
};

export default function DonorsTab() {
  const [donors, setDonors] = useState([]);
  const [bloodGroups, setBloodGroups] = useState([]);
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    try {
      const [d, bg, loc] = await Promise.all([api.donors(), api.bloodGroups(), api.locations()]);
      setDonors(d);
      setBloodGroups(bg);
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

  function handlePhotoChange(e) {
    const file = e.target.files[0] || null;
    setPhoto(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const formData = new FormData();
      formData.append('full_name', form.full_name);
      formData.append('phone', form.phone);
      formData.append('email', form.email);
      formData.append('blood_group_id', form.blood_group_id);
      formData.append('location_id', form.location_id);
      formData.append('date_of_birth', form.date_of_birth);
      formData.append('is_available', String(form.is_available));
      if (photo) formData.append('photo', photo);

      await api.createDonor(formData);
      setForm(emptyForm);
      setPhoto(null);
      setPhotoPreview(null);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleAvailability(donor) {
    setError('');
    try {
      await api.setDonorAvailability(donor.donor_id, !donor.is_available);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section>
      <h2>Donors</h2>
      <p className="hint">
        Registering a donor fires <code>trg_donor_availability_insert</code>; toggling "Available"
        below fires <code>trg_donor_availability_update</code> -- both log a row to{' '}
        <code>donor_availability</code>.
      </p>

      <form className="card form-grid" onSubmit={handleSubmit}>
        <input
          placeholder="Full name"
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          required
        />
        <input
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          required
        />
        <input
          placeholder="Email (optional)"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          type="date"
          placeholder="Date of birth"
          value={form.date_of_birth}
          onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
        />
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
          Photo:{' '}
          <input type="file" accept="image/*" onChange={handlePhotoChange} />
        </label>
        {photoPreview && <img src={photoPreview} alt="Preview" className="photo-preview" />}
        <button type="submit">Register donor</button>
      </form>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Photo</th>
              <th>ID</th>
              <th>Name</th>
              <th>Blood group</th>
              <th>Location</th>
              <th>Phone</th>
              <th>Available</th>
              <th>Last donation</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {donors.map((d) => (
              <tr key={d.donor_id}>
                <td>
                  {d.photo_url ? (
                    <img src={photoUrl(d.photo_url)} alt={d.full_name} className="donor-photo" />
                  ) : (
                    <span className="donor-photo-placeholder">N/A</span>
                  )}
                </td>
                <td>{d.donor_id}</td>
                <td>{d.full_name}</td>
                <td>{d.blood_group}</td>
                <td>{d.city} - {d.area}</td>
                <td>{d.phone}</td>
                <td>{d.is_available ? 'Yes' : 'No'}</td>
                <td>{d.last_donation_date ? d.last_donation_date.slice(0, 10) : '-'}</td>
                <td>
                  <button onClick={() => toggleAvailability(d)}>
                    Mark {d.is_available ? 'unavailable' : 'available'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
