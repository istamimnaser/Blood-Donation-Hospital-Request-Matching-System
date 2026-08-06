import { api } from '../api';

export default function DonorList({ donors, onUpdated }) {
    const toggleAvailability = async (donor) => {
        const updated = await api.updateDonor(donor.donor_id, { isAvailable: !donor.is_available });
        onUpdated(updated);
    };

    if (!donors.length) return <p className="muted">No donors registered yet.</p>;

    return (
        <table className="data-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Group</th>
                    <th>Location</th>
                    <th>Last donation</th>
                    <th>Available</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                {donors.map((d) => (
                    <tr key={d.donor_id}>
                        <td>{d.full_name}</td>
                        <td>{d.blood_group}</td>
                        <td>{d.city} - {d.area}</td>
                        <td>{d.last_donation_date ?? '—'}</td>
                        <td>{d.is_available ? 'Yes' : 'No'}</td>
                        <td>
                            <button type="button" onClick={() => toggleAvailability(d)}>
                                Mark {d.is_available ? 'unavailable' : 'available'}
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
