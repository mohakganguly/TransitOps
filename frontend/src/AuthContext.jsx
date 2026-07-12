import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken, clearToken } from './api';

const AuthContext = createContext(null);

export const ROLE_LABELS = {
  fleet_manager: 'Fleet Manager',
  dispatcher: 'Dispatcher',
  safety_officer: 'Safety Officer',
  financial_analyst: 'Financial Analyst',
};

// Access is scoped by role after login
export const ROLE_PAGES = {
  fleet_manager: ['/vehicles', '/maintenance', '/tracking'],
  dispatcher: ['/', '/trips', '/tracking'],
  safety_officer: ['/drivers', '/compliance'],
  financial_analyst: ['/fuel-expenses', '/reports'],
};

export const roleHome = (role) => (ROLE_PAGES[role] || ['/'])[0];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Reject sessions whose role the app doesn't know (e.g. stale tokens after a role rename)
  const applyUser = (u) => {
    if (u && ROLE_PAGES[u.role]) {
      setUser(u);
      return u;
    }
    clearToken();
    setUser(null);
    throw new Error('This account has an outdated role. Please sign in again.');
  };

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api('/auth/me')
      .then((d) => applyUser(d.user))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const d = await api('/auth/login', { method: 'POST', body: { email, password } });
    setToken(d.token);
    return applyUser(d.user);
  };

  const register = async (payload) => {
    const d = await api('/auth/register', { method: 'POST', body: payload });
    setToken(d.token);
    return applyUser(d.user);
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
