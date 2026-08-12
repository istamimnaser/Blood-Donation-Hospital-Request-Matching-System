import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs.jsx';
import { Button } from './components/ui/button.jsx';
import { Toaster } from './components/ui/sonner.jsx';
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

const navTriggerClass =
  'rounded-none border-transparent bg-transparent px-1 py-1 text-white/75 shadow-none data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:after:opacity-100 after:bg-white hover:text-white';

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/crescent.jpg"
        alt=""
        className="h-[42px] w-[42px] shrink-0 rounded-full object-cover shadow-[0_0_0_3px_rgba(255,255,255,0.25)]"
      />
      <div className="flex flex-col gap-0.5">
        <h1 className="font-display text-[1.25rem] font-bold tracking-tight text-white">
          Blood Donation &amp; Hospital Request Matching
        </h1>
      </div>
    </div>
  );
}

function SiteHeader({ children }) {
  const { isAuthenticated, user, role } = useAuth();

  return (
    <div className="mb-8">
      <div className="bg-brand-navy-dark text-white/75">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-[0.45rem] text-[0.78rem] tracking-wide">
          <span>Connecting willing donors with hospitals that need them</span>
          {isAuthenticated && (
            <span className="font-semibold text-white/90">
              {user.full_name || user.name} &middot; {role}
            </span>
          )}
        </div>
      </div>

      <div
        className="bg-[image:radial-gradient(rgba(255,255,255,0.09)_1px,transparent_1px),linear-gradient(100deg,var(--brand-navy),var(--primary)_120%)] bg-[length:16px_16px,cover]"
      >
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-4 px-6 py-[1.1rem]">
          <Brand />
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
        <div className="mx-auto max-w-[1180px] px-6 pb-12">
          <AuthPage onSwitch={setAuthView} />
        </div>
        <Toaster position="top-right" richColors />
      </>
    );
  }

  const Active = activeTab === 'dashboard'
    ? (role === 'donor' ? DonorDashboard : HospitalDashboard)
    : TABS.find((t) => t.id === activeTab).Component;

  return (
    <>
      <SiteHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center gap-4">
            <TabsList variant="line" className="h-auto gap-6 bg-transparent p-0">
              {TABS.map((t) => (
                <TabsTrigger key={t.id} value={t.id} className={navTriggerClass}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-white/55 hover:bg-white/10 hover:text-white"
            >
              <LogOut /> Log out
            </Button>
          </div>
        </Tabs>
      </SiteHeader>

      <div className="mx-auto max-w-[1180px] px-6 pb-12">
        <Active />
      </div>
      <Toaster position="top-right" richColors />
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
