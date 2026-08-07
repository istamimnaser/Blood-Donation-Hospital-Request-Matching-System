import { useState } from 'react';
import DonorsTab from './components/DonorsTab.jsx';
import HospitalsTab from './components/HospitalsTab.jsx';
import RequestsTab from './components/RequestsTab.jsx';
import ReportsTab from './components/ReportsTab.jsx';
import NotificationsTab from './components/NotificationsTab.jsx';
import AuditLogTab from './components/AuditLogTab.jsx';

const TABS = [
  { id: 'donors', label: 'Donors', Component: DonorsTab },
  { id: 'hospitals', label: 'Hospitals', Component: HospitalsTab },
  { id: 'requests', label: 'Requests & Matching', Component: RequestsTab },
  { id: 'reports', label: 'Reports', Component: ReportsTab },
  { id: 'notifications', label: 'Notifications', Component: NotificationsTab },
  { id: 'audit', label: 'Audit Log', Component: AuditLogTab },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('donors');
  const Active = TABS.find((t) => t.id === activeTab).Component;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Blood Donation &amp; Hospital Request Matching System</h1>
        <p className="subtitle">Demo UI for the PostgreSQL database — every screen below is a thin view over tables, functions, triggers, procedures, and views.</p>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={t.id === activeTab ? 'tab active' : 'tab'}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="tab-panel">
        <Active />
      </main>
    </div>
  );
}
