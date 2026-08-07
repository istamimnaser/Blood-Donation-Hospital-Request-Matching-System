import { useEffect, useState } from 'react';
import { api } from '../api.js';

const REPORTS = [
  { id: 'pendingEmergency', label: 'Pending emergency requests (v_pending_emergency_requests)' },
  { id: 'donationHistory', label: 'Donation history (v_donation_history)' },
  { id: 'hospitalSummary', label: 'Hospital summary (v_hospital_summary)' },
  { id: 'requestFulfillment', label: 'Request fulfillment (v_request_fulfillment)' },
];

export default function ReportsTab() {
  const [data, setData] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [pendingEmergency, donationHistory, hospitalSummary, requestFulfillment] = await Promise.all([
        api.reports.pendingEmergency(),
        api.reports.donationHistory(),
        api.reports.hospitalSummary(),
        api.reports.requestFulfillment(),
      ]);
      setData({ pendingEmergency, donationHistory, hospitalSummary, requestFulfillment });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  return (
    <section>
      <h2>Reports</h2>
      <button onClick={loadAll}>Refresh reports</button>

      {error && <p className="error">{error}</p>}
      {loading && <p>Loading...</p>}

      {!loading &&
        REPORTS.map(({ id, label }) => {
          const rows = data[id] || [];
          return (
            <div className="card" key={id}>
              <h3>{label}</h3>
              {rows.length === 0 ? (
                <p className="hint">No rows.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      {Object.keys(rows[0]).map((col) => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((val, j) => (
                          <td key={j}>{String(val ?? '-')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
    </section>
  );
}
