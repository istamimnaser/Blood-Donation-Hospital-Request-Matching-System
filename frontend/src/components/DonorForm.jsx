import { useState } from 'react';
import { api } from '../api';
import LocationSelect from './LocationSelect';

export default function DonorForm({ bloodGroups, locations, onCreated, onLocationCreated }) {
    const [form, setForm] = useState({
        fullName: '', email: '', phone: '', bloodGroupId: '', locationId: '', dateOfBirth: '',
    });
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            const donor = await api.createDonor(form);
            setForm({ fullName: '', email: '', phone: '', bloodGroupId: '', locationId: '', dateOfBirth: '' });
            onCreated(donor);
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form className="card" onSubmit={handleSubmit}>
            <h3>Register as a Donor</h3>
            {error && <p className="error">{error}</p>}
            <label>
                Full name
                <input value={form.fullName} onChange={update('fullName')} required />
            </label>
            <label>
                Phone
                <input value={form.phone} onChange={update('phone')} required />
            </label>
            <label>
                Email
                <input type="email" value={form.email} onChange={update('email')} />
            </label>
            <label>
                Date of birth
                <input type="date" value={form.dateOfBirth} onChange={update('dateOfBirth')} />
            </label>
            <label>
                Blood group
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
                Location
                <LocationSelect
                    locations={locations}
                    value={form.locationId}
                    onChange={(locationId) => setForm({ ...form, locationId })}
                    onCreate={onLocationCreated}
                />
            </label>
            <button type="submit" disabled={submitting}>
                {submitting ? 'Registering…' : 'Register donor'}
            </button>
        </form>
    );
}
