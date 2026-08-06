import { useState } from 'react';
import { api } from '../api';
import LocationSelect from './LocationSelect';

export default function HospitalForm({ locations, onCreated, onLocationCreated }) {
    const [form, setForm] = useState({ name: '', locationId: '', contactPhone: '', email: '' });
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            const hospital = await api.createHospital(form);
            setForm({ name: '', locationId: '', contactPhone: '', email: '' });
            onCreated(hospital);
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form className="card" onSubmit={handleSubmit}>
            <h3>Register a Hospital</h3>
            {error && <p className="error">{error}</p>}
            <label>
                Name
                <input value={form.name} onChange={update('name')} required />
            </label>
            <label>
                Contact phone
                <input value={form.contactPhone} onChange={update('contactPhone')} required />
            </label>
            <label>
                Email
                <input type="email" value={form.email} onChange={update('email')} />
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
                {submitting ? 'Saving…' : 'Register hospital'}
            </button>
        </form>
    );
}
