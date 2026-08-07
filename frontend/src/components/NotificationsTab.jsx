import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function NotificationsTab() {
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setNotifications(await api.notifications());
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
      <h2>Notifications</h2>
      <p className="hint">
        Written automatically by <code>trg_notify_emergency_request</code>,{' '}
        <code>trg_notify_new_match</code>, and <code>trg_apply_donation</code> -- nothing here is
        inserted by the frontend.
      </p>
      <button onClick={load}>Refresh</button>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : notifications.length === 0 ? (
        <p className="hint">No notifications yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Recipient</th>
              <th>Type</th>
              <th>Message</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {notifications.map((n) => (
              <tr key={n.notification_id}>
                <td>{n.recipient_type} #{n.recipient_id}</td>
                <td>{n.notification_type}</td>
                <td>{n.message}</td>
                <td>{new Date(n.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
