import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPickerUsers, type PickerUser } from '../../lib/api.js';
import { useSession } from './use-session.js';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  marshal: 'Marshal',
  employee: 'Employee',
};

export function LoginPage() {
  const navigate = useNavigate();
  const { login, user } = useSession();
  const [users, setUsers] = useState<PickerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      navigate('/my-pass', { replace: true });
      return;
    }
    fetchPickerUsers()
      .then(setUsers)
      .catch(() => setError('Could not load users — is the API running?'))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  async function handleLogin(userId: string) {
    setSigningIn(userId);
    setError(null);
    try {
      await login(userId);
      navigate('/my-pass', { replace: true });
    } catch {
      setError('Login failed');
      setSigningIn(null);
    }
  }

  const admins = users.filter((u) => u.role === 'admin');
  const marshals = users.filter((u) => u.role === 'marshal');
  const employees = users.filter((u) => u.role === 'employee');

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-pmg-navy text-white px-8 py-5 flex items-center gap-4">
        <span className="font-semibold text-xl tracking-tight">PMG Presence</span>
        <span className="text-pmg-cyan font-semibold text-sm uppercase tracking-widest">
          Employee
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <h1 className="text-3xl font-semibold text-pmg-navy mb-2">Sign in</h1>
          <p className="text-gray-500 mb-8 text-sm">
            Mock SSO — select a seeded user to continue.
          </p>

          {error && (
            <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-gray-400 text-sm">Loading users…</p>
          ) : (
            <div className="space-y-6">
              {[
                { label: 'Admins', items: admins },
                { label: 'Marshals', items: marshals },
                { label: 'Employees', items: employees },
              ].map(({ label, items }) =>
                items.length > 0 ? (
                  <div key={label}>
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
                      {label}
                    </p>
                    <div className="space-y-2">
                      {items.map((u) => (
                        <button
                          key={u.id}
                          disabled={!!signingIn}
                          onClick={() => void handleLogin(u.id)}
                          className="w-full flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-left hover:border-pmg-navy hover:bg-pmg-navy/5 transition-colors disabled:opacity-50"
                        >
                          <div>
                            <p className="font-semibold text-pmg-navy text-sm">{u.name}</p>
                            <p className="text-xs text-gray-500">{u.email ?? 'No email'}</p>
                          </div>
                          <span className="text-xs font-semibold text-pmg-orange">
                            {ROLE_LABEL[u.role] ?? u.role}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null,
              )}
            </div>
          )}

          {signingIn && (
            <p className="mt-6 text-sm text-gray-500 text-center">Signing in…</p>
          )}
        </div>
      </main>
    </div>
  );
}
