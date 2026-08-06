import { useEffect, useState } from 'react';
import { api } from './api';
import DonorForm from './components/DonorForm';
import DonorList from './components/DonorList';
import HospitalForm from './components/HospitalForm';
import HospitalList from './components/HospitalList';
import RequestForm from './components/RequestForm';
import RequestList from './components/RequestList';
import RequestDetail from './components/RequestDetail';
import './App.css';

const TABS = ['Donors', 'Hospitals', 'Requests'];

export default function App() {
    const [tab, setTab] = useState('Requests');
    const [bloodGroups, setBloodGroups] = useState([]);
    const [locations, setLocations] = useState([]);
    const [donors, setDonors] = useState([]);
    const [hospitals, setHospitals] = useState([]);
    const [requests, setRequests] = useState([]);
    const [selectedRequestId, setSelectedRequestId] = useState(null);
    const [error, setError] = useState(null);

    const loadAll = async () => {
        try {
            const [bg, loc, d, h, r] = await Promise.all([
                api.getBloodGroups(),
                api.getLocations(),
                api.getDonors(),
                api.getHospitals(),
                api.getRequests(),
            ]);
            setBloodGroups(bg);
            setLocations(loc);
            setDonors(d);
            setHospitals(h);
            setRequests(r);
        } catch (err) {
            setError(err.message);
        }
    };

    useEffect(() => {
        loadAll();
    }, []);

    const handleLocationCreated = async (body) => {
        const loc = await api.createLocation(body);
        setLocations((prev) => [...prev, loc]);
        return loc;
    };

    return (
        <div className="app">
            <header>
                <h1>Blood Donation &amp; Hospital Request Matching</h1>
                <nav>
                    {TABS.map((t) => (
                        <button key={t} className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>
                            {t}
                        </button>
                    ))}
                </nav>
            </header>

            {error && <p className="error">{error}</p>}

            <main>
                {tab === 'Donors' && (
                    <section>
                        <DonorForm
                            bloodGroups={bloodGroups}
                            locations={locations}
                            onLocationCreated={handleLocationCreated}
                            onCreated={(donor) => setDonors((prev) => [donor, ...prev])}
                        />
                        <DonorList
                            donors={donors}
                            onUpdated={(updated) =>
                                setDonors((prev) => prev.map((d) => (d.donor_id === updated.donor_id ? updated : d)))
                            }
                        />
                    </section>
                )}

                {tab === 'Hospitals' && (
                    <section>
                        <HospitalForm
                            locations={locations}
                            onLocationCreated={handleLocationCreated}
                            onCreated={(hospital) => setHospitals((prev) => [hospital, ...prev])}
                        />
                        <HospitalList hospitals={hospitals} />
                    </section>
                )}

                {tab === 'Requests' && (
                    <section>
                        <RequestForm
                            hospitals={hospitals}
                            bloodGroups={bloodGroups}
                            onCreated={(request) => {
                                setRequests((prev) => [request, ...prev]);
                                setSelectedRequestId(request.request_id);
                            }}
                        />
                        <RequestList
                            requests={requests}
                            selectedId={selectedRequestId}
                            onSelect={setSelectedRequestId}
                        />
                        <RequestDetail requestId={selectedRequestId} onRequestChanged={loadAll} />
                    </section>
                )}
            </main>
        </div>
    );
}
