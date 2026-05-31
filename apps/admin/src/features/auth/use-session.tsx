import React, { createContext, useCallback, useContext, useState } from 'react';
import type { AuthUser, LoginResponse } from '@pmg/contracts';
import { MockAuthProvider } from '@pmg/auth-client';

const provider = new MockAuthProvider('');

interface SessionState {
  user: AuthUser | null;
  token: string | null;
  login: (userId: string) => Promise<LoginResponse>;
  logout: () => void;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const login = useCallback(async (userId: string): Promise<LoginResponse> => {
    const result = await provider.login(userId);
    setUser(result.user);
    setToken(result.token);
    return result;
  }, []);

  const logout = useCallback(() => {
    provider.logout();
    setUser(null);
    setToken(null);
  }, []);

  return (
    <SessionContext.Provider value={{ user, token, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
