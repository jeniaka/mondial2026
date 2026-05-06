import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from './api';

type AuthCtx = { user: User | null; loading: boolean; signOut: () => Promise<void> };
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/auth/me', { credentials: 'include', headers: { 'X-Requested-With': 'fetch' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: User | null) => {
        setUser(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const signOut = async () => {
    await fetch('/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-Requested-With': 'fetch' },
    });
    setUser(null);
    window.location.href = '/login';
  };

  return <Ctx.Provider value={{ user, loading, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth outside provider');
  return c;
}
