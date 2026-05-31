import React from 'react';
import { BrowserRouter, Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import { PeacocksLogo } from '@pmg/ui';
import { SessionProvider, useSession } from './features/auth/use-session.js';
import { LoginPage } from './features/auth/login-page.js';
import { MyPassPage } from './features/my-pass/my-pass-page.js';
import { MyVisitsPage } from './features/my-visits/my-visits-page.js';
import { OnsitePage } from './features/onsite/onsite-page.js';
import { useEvacuationStream } from './features/rollcall/use-evacuation-stream.js';
import { EvacuationView } from './features/rollcall/evacuation-view.js';

// ─── App shell ────────────────────────────────────────────────────────────────

function AppShell() {
  const { user, token, logout } = useSession();
  if (!user) return <Navigate to="/login" replace />;

  const isMarshal = user.roles.includes('marshal') || user.roles.includes('admin');

  // Evacuation stream — only active for marshals/admins; harmless no-op for employees
  const evacuation = useEvacuationStream(token, isMarshal);

  const NAV_ITEMS = [
    { to: '/my-pass', label: 'My Pass' },
    { to: '/my-visits', label: 'My Visits' },
    ...(isMarshal ? [{ to: '/onsite', label: 'On Site' }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Evacuation full-screen overlay — mounted on top when a fire event is active */}
      {evacuation.rollCall && isMarshal && (
        <EvacuationView
          rollCall={evacuation.rollCall}
          lastSynced={evacuation.lastSynced}
          onMarkAccounted={(personId, accountedFor) =>
            evacuation.markAccounted(personId, accountedFor)
          }
        />
      )}

      {/* Top bar */}
      <header className="bg-pmg-navy text-white px-6 py-3 flex items-center gap-3 z-10 shadow">
        <PeacocksLogo className="h-8 w-auto" />
        <span className="text-pmg-cyan font-semibold text-xs uppercase tracking-widest">
          {isMarshal ? 'Marshal' : 'Employee'}
        </span>

        {/* Live evacuation indicator — always visible even under the overlay */}
        {evacuation.rollCall && (
          <span className="inline-flex items-center gap-1 bg-rollcall-red text-white text-xs font-semibold px-2 py-0.5 rounded-full">
            🔴 Evacuation active
          </span>
        )}

        <div className="flex-1" />
        <span className="text-sm text-white/70 hidden sm:block">{user.name}</span>
        <button
          onClick={logout}
          className="text-sm text-white/70 hover:text-white transition-colors"
        >
          Sign out
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar nav (desktop) */}
        <nav className="w-44 flex-shrink-0 bg-white border-r border-gray-200 pt-6 pb-4 hidden md:flex flex-col gap-1 px-3">
          {NAV_ITEMS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-pmg-navy text-white'
                    : 'text-gray-600 hover:bg-pmg-navy/5 hover:text-pmg-navy'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom nav (mobile) */}
        <nav className="fixed bottom-0 inset-x-0 md:hidden bg-white border-t border-gray-200 flex z-10">
          {NAV_ITEMS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-1 py-3 text-center text-xs font-medium transition-colors ${
                  isActive ? 'text-pmg-navy font-semibold' : 'text-gray-400 hover:text-pmg-navy'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────

export function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/my-pass" replace />} />
            <Route path="/my-pass" element={<MyPassPage />} />
            <Route path="/my-visits" element={<MyVisitsPage />} />
            <Route path="/onsite" element={<OnsitePage />} />
            <Route path="*" element={<Navigate to="/my-pass" replace />} />
          </Route>
        </Routes>
      </SessionProvider>
    </BrowserRouter>
  );
}
