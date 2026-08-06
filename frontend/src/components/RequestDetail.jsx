import { useEffect, useState } from 'react';
import { api } from '../api';

export default function RequestDetail({ requestId, onRequestChanged }) {
    const [request, setRequest] = useState(null);
    const [eligibleDonors, setEligibleDonors] = useState([]);
    const [matches, setMatches] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const [req, eligible, matchList] = await Promise.all([
                api.getRequest(requestId),
                api.getEligibleDonors(requestId),
                api.getMatches(requestId),
            ]);
            setRequest(req);
            setEligibleDonors(eligible);
            setMatches(matchList);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (requestId) load();
    }, [requestId]);

    const suggestDonor = async (donorId) => {
        await api.createMatches(requestId, [donorId]);
        load();
    };

    const setMatchStatus = async (matchId, matchStatus) => {
        await api.updateMatch(matchId, matchStatus);
        load();
    };

    const recordDonation = async (donorId) => {
        const unitsDonated = Number(window.prompt('Units donated?', '1'));
        if (!unitsDonated || unitsDonated <= 0) return;
        await api.recordDonation({ donorId, requestId, unitsDonated });
        load();
        onRequestChanged();
    };

    if (!requestId) return <p className="muted">Select a request above to see eligible donors and matches.</p>;
    if (loading && !request) return <p className="muted">Loading…</p>;
    if (error) return <p className="error">{error}</p>;
    if (!request) return null;

    return (
        <div className="request-detail">
            <h3>
                {request.hospital_name} needs {request.units_needed - request.units_fulfilled} more unit(s) of {request.blood_group}
            </h3>
            <p className="muted">Status: {request.status.replace('_', ' ')} · Urgency: {request.urgency}</p>

            <div className="two-col">
                <div>
                    <h4>Eligible donors</h4>
                    {!eligibleDonors.length && <p className="muted">No eligible donors found right now.</p>}
                    <ul className="donor-list">
                        {eligibleDonors.map((d) => (
                            <li key={d.donor_id}>
                                <span>
                                    {d.full_name} ({d.blood_group}) — {d.city}, {d.area}
                                    {d.sameLocation && <span className="tag">same area</span>}
                                    {d.exactGroupMatch && <span className="tag">exact match</span>}
                                </span>
                                <button type="button" onClick={() => suggestDonor(d.donor_id)}>
                                    Suggest
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <h4>Matches</h4>
                    {!matches.length && <p className="muted">No donors suggested yet.</p>}
                    <ul className="donor-list">
                        {matches.map((m) => (
                            <li key={m.match_id}>
                                <span>
                                    {m.donor_name} ({m.donor_blood_group}) — <em>{m.match_status}</em>
                                </span>
                                <span className="row-actions">
                                    {m.match_status === 'suggested' && (
                                        <>
                                            <button type="button" onClick={() => setMatchStatus(m.match_id, 'accepted')}>
                                                Accept
                                            </button>
                                            <button type="button" onClick={() => setMatchStatus(m.match_id, 'declined')}>
                                                Decline
                                            </button>
                                        </>
                                    )}
                                    {m.match_status === 'accepted' && (
                                        <button type="button" onClick={() => recordDonation(m.donor_id)}>
                                            Record donation
                                        </button>
                                    )}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
