export default function HospitalList({ hospitals }) {
    if (!hospitals.length) return <p className="muted">No hospitals registered yet.</p>;

    return (
        <table className="data-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Location</th>
                    <th>Contact</th>
                </tr>
            </thead>
            <tbody>
                {hospitals.map((h) => (
                    <tr key={h.hospital_id}>
                        <td>{h.name}</td>
                        <td>{h.city} - {h.area}</td>
                        <td>{h.contact_phone}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
