const URGENCY_LABEL = { low: 'Low', medium: 'Medium', high: 'High', emergency: 'Emergency' };

export default function RequestList({ requests, selectedId, onSelect }) {
    if (!requests.length) return <p className="muted">No blood requests yet.</p>;

    return (
        <table className="data-table">
            <thead>
                <tr>
                    <th>Hospital</th>
                    <th>Group</th>
                    <th>Units</th>
                    <th>Urgency</th>
                    <th>Status</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                {requests.map((r) => (
                    <tr key={r.request_id} className={r.request_id === selectedId ? 'selected-row' : ''}>
                        <td>{r.hospital_name}</td>
                        <td>{r.blood_group}</td>
                        <td>{r.units_fulfilled} / {r.units_needed}</td>
                        <td>
                            <span className={`badge badge-${r.urgency}`}>{URGENCY_LABEL[r.urgency]}</span>
                        </td>
                        <td>{r.status.replace('_', ' ')}</td>
                        <td>
                            <button type="button" onClick={() => onSelect(r.request_id)}>
                                {r.request_id === selectedId ? 'Selected' : 'View / match'}
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
