import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import LoginPage from './components/LoginPage.jsx';
import DonorSignupPage from './components/DonorSignupPage.jsx';
import HospitalSignupPage from './components/HospitalSignupPage.jsx';
import DonorDashboard from './components/DonorDashboard.jsx';
import HospitalDashboard from './components/HospitalDashboard.jsx';
import ReportsTab from './components/ReportsTab.jsx';
import NotificationsTab from './components/NotificationsTab.jsx';
import AuditLogTab from './components/AuditLogTab.jsx';

const AUTH_PAGES = {
  login: LoginPage,
  'signup-donor': DonorSignupPage,
  'signup-hospital': HospitalSignupPage,
};

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'reports', label: 'Reports', Component: ReportsTab },
  { id: 'notifications', label: 'Notifications', Component: NotificationsTab },
  { id: 'audit', label: 'Audit Log', Component: AuditLogTab },
];

function SiteHeader({ children }) {
  const { isAuthenticated, user, role } = useAuth();

  return (
    <div className="site-header">
      <div className="topbar">
        <div className="topbar-inner">
          <span>Connecting willing donors with hospitals that need them</span>
          {isAuthenticated && (
            <span className="topbar-account">
              {user.full_name || user.name} &middot; {role}
            </span>
          )}
        </div>
      </div>

      <div className="header-main">
        <div className="header-main-inner">
          <div className="brand">
            <img src="/crescent.jpg" alt="" className="brand-mark" />
            <div className="brand-text">
              <h1>Blood Donation &amp; Hospital Request Matching</h1>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function AppShell() {
  const { isAuthenticated, role, logout } = useAuth();
  const [authView, setAuthView] = useState('login');
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!isAuthenticated) {
    const AuthPage = AUTH_PAGES[authView];
    return (
      <>
        <SiteHeader />
        <div className="app">
          <main className="tab-panel">
            <AuthPage onSwitch={setAuthView} />
          </main>
        </div>
      </>
    );
  }

  const Active = activeTab === 'dashboard'
    ? (role === 'donor' ? DonorDashboard : HospitalDashboard)
    : TABS.find((t) => t.id === activeTab).Component;

  return (
    <>
      <SiteHeader>
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
          <button className="tab tab-signout" onClick={logout}>
            Log out
          </button>
        </nav>
      </SiteHeader>

      <div className="app">
        <main className="tab-panel">
          <Active />
        </main>
      </div>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
