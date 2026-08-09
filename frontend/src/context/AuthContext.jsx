import { createContext, useContext, useState } from 'react';
import { authApi, setToken } from '../api.js';

const AuthContext = createContext(null);

const STORAGE_KEY = 'auth_user';

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function store(session) {
  if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  else localStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(loadStored);

  function applySession(res) {
    setToken(res.token);
    const next = { role: res.role, user: res.user };
    store(next);
    setSession(next);
  }

  async function login(email, password, role) {
    applySession(await authApi.login({ email, password, role }));
  }

  async function signupDonor(body) {
    applySession(await authApi.signupDonor(body));
  }

  async function signupHospital(body) {
    applySession(await authApi.signupHospital(body));
  }

  function logout() {
    setToken(null);
    store(null);
    setSession(null);
  }

  return (
    <AuthContext.Provider
      value={{
        role: session?.role || null,
        user: session?.user || null,
        isAuthenticated: Boolean(session),
        login,
        signupDonor,
        signupHospital,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
