import { useState } from 'react';
import { api } from '../api';

export default function RequestForm({ hospitals, bloodGroups, onCreated }) {
    const [form, setForm] = useState({
        hospitalId: '', bloodGroupId: '', unitsNeeded: 1, urgency: 'medium', neededBy: '',
    });
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            const request = await api.createRequest({ ...form, unitsNeeded: Number(form.unitsNeeded) });
            setForm({ hospitalId: '', bloodGroupId: '', unitsNeeded: 1, urgency: 'medium', neededBy: '' });
            onCreated(request);
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form className="card" onSubmit={handleSubmit}>
            <h3>Create a Blood Request</h3>
            {error && <p className="error">{error}</p>}
            <label>
                Hospital
                <select value={form.hospitalId} onChange={update('hospitalId')} required>
                    <option value="">Select hospital</option>
                    {hospitals.map((h) => (
                        <option key={h.hospital_id} value={h.hospital_id}>
                            {h.name}
                        </option>
                    ))}
                </select>
            </label>
            <label>
                Blood group needed
                <select value={form.bloodGroupId} onChange={update('bloodGroupId')} required>
                    <option value="">Select blood group</option>
                    {bloodGroups.map((bg) => (
                        <option key={bg.blood_group_id} value={bg.blood_group_id}>
                            {bg.group_name}
                        </option>
                    ))}
                </select>
            </label>
            <label>
                Units needed
                <input type="number" min="1" value={form.unitsNeeded} onChange={update('unitsNeeded')} required />
            </label>
            <label>
                Urgency
                <select value={form.urgency} onChange={update('urgency')}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="emergency">Emergency</option>
                </select>
            </label>
            <label>
                Needed by
                <input type="date" value={form.neededBy} onChange={update('neededBy')} />
            </label>
            <button type="submit" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create request'}
            </button>
        </form>
    );
}
