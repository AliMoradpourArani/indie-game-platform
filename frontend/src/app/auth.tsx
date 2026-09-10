import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiGet, apiPost } from '../lib/api';

export interface AuthUser {
  id: string;
  email: string;
  role: 'PLAYER' | 'DEVELOPER' | 'ADMIN';
  profile?: { displayName: string } | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (input: { email: string; password: string; role: 'PLAYER' | 'DEVELOPER'; displayName: string; studioName?: string }) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

function loadToken(): string | null {
  return localStorage.getItem('token');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(loadToken);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(!!loadToken());

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    localStorage.setItem('token', token);
    apiGet<AuthUser>('/api/v1/auth/me', token)
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiPost<{ token: string; user: AuthUser }>('/api/v1/auth/login', { email, password });
    setToken(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(async (input: { email: string; password: string; role: 'PLAYER' | 'DEVELOPER'; displayName: string; studioName?: string }) => {
    const res = await apiPost<{ token: string; user: AuthUser }>('/api/v1/auth/register', input);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, token, loading, login, register, logout }), [user, token, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
