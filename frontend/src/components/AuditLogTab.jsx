import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function AuditLogTab() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setLogs(await api.auditLogs());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section>
      <h2>Audit Log</h2>
      <button onClick={load}>Refresh</button>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : logs.length === 0 ? (
        <p className="hint">No changes logged yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Table</th>
              <th>Record</th>
              <th>Action</th>
              <th>Old</th>
              <th>New</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.audit_id}>
                <td>{l.table_name}</td>
                <td>{l.record_id}</td>
                <td>{l.action}</td>
                <td className="json-cell">{l.old_data ? JSON.stringify(l.old_data) : '-'}</td>
                <td className="json-cell">{l.new_data ? JSON.stringify(l.new_data) : '-'}</td>
                <td>{new Date(l.changed_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
