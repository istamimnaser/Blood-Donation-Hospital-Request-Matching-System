import { useEffect, useState } from 'react';
import { api, hospitalApi, matchApi } from '../api.js';
import { IconBadge, BuildingIcon, DropletIcon, CalendarIcon, UrgencyBadge } from './Icon.jsx';

const emptyForm = { blood_group_id: '', units_needed: 1, urgency: 'medium' };
const emptyDonation = { donor_id: '', units_donated: 1, donation_date: '' };

const statusBadge = {
  pending: 'badge-warning',
  partially_fulfilled: 'badge-warning',
  fulfilled: 'badge-success',
  cancelled: 'badge-neutral',
};
const matchBadge = { suggested: 'badge-neutral', accepted: 'badge-warning', completed: 'badge-success', declined: 'badge-danger' };

export default function HospitalDashboard() {
  const [requests, setRequests] = useState([]);
  const [bloodGroups, setBloodGroups] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState(null);
  const [eligible, setEligible] = useState([]);
  const [matches, setMatches] = useState([]);
  const [donationForm, setDonationForm] = useState(emptyDonation);
  const [panelError, setPanelError] = useState('');
  const [panelMessage, setPanelMessage] = useState('');

  async function loadAll() {
    setLoading(true);
    try {
      const [r, bg] = await Promise.all([hospitalApi.myRequests(), api.bloodGroups()]);
      setRequests(r);
      setBloodGroups(bg);
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
      await hospitalApi.createRequest({
        ...form,
        blood_group_id: Number(form.blood_group_id),
        units_needed: Number(form.units_needed),
      });
      setForm(emptyForm);
      loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function openRequest(request) {
    setSelectedId(request.request_id);
    setPanelError('');
    setPanelMessage('');
    setDonationForm(emptyDonation);
    await refreshPanel(request.request_id);
  }

  async function refreshPanel(requestId) {
    try {
      const [e, m] = await Promise.all([hospitalApi.eligibleDonors(requestId), matchApi.forRequest(requestId)]);
      setEligible(e);
      setMatches(m);
    } catch (err) {
      setPanelError(err.message);
    }
  }

  async function createMatch(donorId) {
    setPanelError('');
    setPanelMessage('');
    try {
      await matchApi.create({ request_id: selectedId, donor_id: donorId });
      setPanelMessage('Match created. A notification was sent to the donor.');
      refreshPanel(selectedId);
    } catch (err) {
      setPanelError(err.message);
    }
  }

  async function recordDonation(e) {
    e.preventDefault();
    setPanelError('');
    setPanelMessage('');
    try {
      await api.recordDonation({
        donor_id: Number(donationForm.donor_id),
        request_id: selectedId,
        units_donated: Number(donationForm.units_donated),
        donation_date: donationForm.donation_date || null,
      });
      setPanelMessage('Donation recorded. Request fulfillment, donor history, and match status all updated.');
      setDonationForm(emptyDonation);
      refreshPanel(selectedId);
      loadAll();
    } catch (err) {
      setPanelError(err.message);
    }
  }

  const selectedRequest = requests.find((r) => r.request_id === selectedId);
  const acceptedDonors = matches.filter((m) => m.match_status === 'accepted');

  return (
    <section>
      <div className="section-heading">
        <span className="eyebrow">Hospital</span>
        <h2>My requests</h2>
      </div>

      <form className="card form-grid" onSubmit={handleSubmit}>
        <select
          value={form.blood_group_id}
          onChange={(e) => setForm({ ...form, blood_group_id: e.target.value })}
          required
        >
          <option value="">Blood group needed</option>
          {bloodGroups.map((bg) => (
            <option key={bg.blood_group_id} value={bg.blood_group_id}>
              {bg.group_name}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="1"
          placeholder="Units needed"
          value={form.units_needed}
          onChange={(e) => setForm({ ...form, units_needed: e.target.value })}
          required
        />
        <select value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })}>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="emergency">emergency</option>
        </select>
        <button type="submit">Create request</button>
      </form>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p>Loading...</p>
      ) : requests.length === 0 ? (
        <p className="hint">No requests yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Blood group</th>
              <th>Needed / Fulfilled</th>
              <th>Urgency</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.request_id} className={r.request_id === selectedId ? 'selected-row' : ''}>
                <td>{r.request_id}</td>
                <td>{r.blood_group}</td>
                <td>{r.units_fulfilled} / {r.units_needed}</td>
                <td>
                  <UrgencyBadge urgency={r.urgency} />
                </td>
                <td>
                  <span className={`badge ${statusBadge[r.status] || 'badge-neutral'}`}>
                    {r.status.replace('_', ' ')}
                  </span>
                </td>
                <td>
                  <button onClick={() => openRequest(r)}>Open</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedRequest && (
        <div className="card panel">
          <div className="card-heading">
            <IconBadge>
              <BuildingIcon />
            </IconBadge>
            <h3>Request #{selectedRequest.request_id} -- {selectedRequest.blood_group}</h3>
          </div>

          {panelError && <p className="error">{panelError}</p>}
          {panelMessage && <p className="success">{panelMessage}</p>}

          <h4>Eligible donors (fn_eligible_donors)</h4>
          {eligible.length === 0 ? (
            <p className="hint">No eligible donors found (compatible group, available, 90+ days since last donation).</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Donor</th>
                  <th>Group</th>
                  <th>Location</th>
                  <th>Same location</th>
                  <th>Exact group</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {eligible.map((d) => (
                  <tr key={d.donor_id}>
                    <td>{d.full_name}</td>
                    <td>{d.blood_group}</td>
                    <td>{d.city} - {d.area}</td>
                    <td>
                      <span className={`badge ${d.same_location ? 'badge-success' : 'badge-neutral'}`}>
                        {d.same_location ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${d.exact_blood_group ? 'badge-success' : 'badge-neutral'}`}>
                        {d.exact_blood_group ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => createMatch(d.donor_id)}>Suggest match</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h4>Matches (request_matches)</h4>
          {matches.length === 0 ? (
            <p className="hint">No donors matched yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Donor</th>
                  <th>Status</th>
                  <th>Matched at</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m) => (
                  <tr key={m.match_id}>
                    <td>{m.donor_name}</td>
                    <td>
                      <span className={`badge ${matchBadge[m.match_status] || 'badge-neutral'}`}>
                        {m.match_status}
                      </span>
                    </td>
                    <td>{new Date(m.matched_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h4>Record a donation (sp_record_donation)</h4>
          {acceptedDonors.length === 0 ? (
            <p className="hint">A donor needs to accept a match before you can record their donation.</p>
          ) : (
            <form className="form-grid" onSubmit={recordDonation}>
              <select
                value={donationForm.donor_id}
                onChange={(e) => setDonationForm({ ...donationForm, donor_id: e.target.value })}
                required
              >
                <option value="">Donor</option>
                {acceptedDonors.map((m) => (
                  <option key={m.donor_id} value={m.donor_id}>
                    {m.donor_name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                placeholder="Units donated"
                value={donationForm.units_donated}
                onChange={(e) => setDonationForm({ ...donationForm, units_donated: e.target.value })}
                required
              />
              <input
                type="date"
                value={donationForm.donation_date}
                onChange={(e) => setDonationForm({ ...donationForm, donation_date: e.target.value })}
              />
              <button type="submit">Record donation</button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
