import { useEffect, useState } from 'react';
import { api, donorApi, matchApi } from '../api.js';
import { IconBadge, DropletIcon, CalendarIcon, BellIcon, UrgencyBadge } from './Icon.jsx';

const matchBadge = { suggested: 'badge-neutral', accepted: 'badge-warning', completed: 'badge-success', declined: 'badge-danger' };

export default function DonorDashboard() {
  const [profile, setProfile] = useState(null);
  const [locations, setLocations] = useState([]);
  const [editForm, setEditForm] = useState(null);
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    try {
      const [me, loc, mine] = await Promise.all([donorApi.me(), api.locations(), matchApi.mine()]);
      setProfile(me);
      setLocations(loc);
      setMatches(mine);
      setEditForm({
        location_id: me.location_id,
        last_donation_date: me.last_donation_date ? me.last_donation_date.slice(0, 10) : '',
        phone: me.phone,
        is_available: me.is_available,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const updated = await donorApi.updateMe({
        ...editForm,
        location_id: Number(editForm.location_id),
        last_donation_date: editForm.last_donation_date || null,
      });
      setProfile(updated);
      setMessage('Profile updated.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function respond(matchId, status) {
    setError('');
    setMessage('');
    try {
      await matchApi.respond(matchId, status);
      setMessage(`Match ${status}.`);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading || !profile || !editForm) return <p>Loading...</p>;

  return (
    <section>
      <div className="section-heading">
        <span className="eyebrow">Donor</span>
        <h2>My dashboard</h2>
      </div>

      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}

      <div className="card card-info">
        <div className="card-heading">
          <IconBadge>
            <DropletIcon />
          </IconBadge>
          <h3>{profile.full_name}</h3>
        </div>
        <p className="hint">
          {profile.email} &middot; {profile.blood_group} &middot; {profile.city} - {profile.area}
        </p>
        <p>
          <span className={`badge ${profile.is_available ? 'badge-success' : 'badge-neutral'}`}>
            {profile.is_available ? 'Available' : 'Unavailable'}
          </span>{' '}
          Last donation: {profile.last_donation_date ? profile.last_donation_date.slice(0, 10) : 'never'}
        </p>
      </div>

      <div className="card">
        <div className="card-heading">
          <IconBadge>
            <CalendarIcon />
          </IconBadge>
          <h3>Update availability, location, and last donation</h3>
        </div>
        <form className="form-grid" onSubmit={handleSave}>
          <input
            placeholder="Phone"
            value={editForm.phone}
            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            required
          />
          <select
            value={editForm.location_id}
            onChange={(e) => setEditForm({ ...editForm, location_id: e.target.value })}
            required
          >
            {locations.map((l) => (
              <option key={l.location_id} value={l.location_id}>
                {l.city} - {l.area}
              </option>
            ))}
          </select>
          <label>
            Last donation date:{' '}
            <input
              type="date"
              value={editForm.last_donation_date}
              onChange={(e) => setEditForm({ ...editForm, last_donation_date: e.target.value })}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={editForm.is_available}
              onChange={(e) => setEditForm({ ...editForm, is_available: e.target.checked })}
            />{' '}
            Available to donate
          </label>
          <button type="submit">Save</button>
        </form>
      </div>

      <div className="card-heading">
        <IconBadge>
          <BellIcon />
        </IconBadge>
        <h3>My matches</h3>
      </div>
      {matches.length === 0 ? (
        <p className="hint">No matches yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Hospital</th>
              <th>Blood group</th>
              <th>Urgency</th>
              <th>Status</th>
              <th>Matched at</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => (
              <tr key={m.match_id}>
                <td>{m.hospital_name}</td>
                <td>{m.blood_group}</td>
                <td><UrgencyBadge urgency={m.urgency} /></td>
                <td>
                  <span className={`badge ${matchBadge[m.match_status] || 'badge-neutral'}`}>{m.match_status}</span>
                </td>
                <td>{new Date(m.matched_at).toLocaleString()}</td>
                <td>
                  {m.match_status === 'suggested' && (
                    <>
                      <button onClick={() => respond(m.match_id, 'accepted')}>Accept</button>{' '}
                      <button onClick={() => respond(m.match_id, 'declined')}>Decline</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
