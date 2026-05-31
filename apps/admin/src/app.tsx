import React from 'react';
import { BrowserRouter, Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import { SessionProvider, useSession } from './features/auth/use-session.js';
import { LoginPage } from './features/auth/login-page.js';
import { OnsitePage } from './features/onsite/onsite-page.js';
import { EmployeesPage } from './features/employees/employees-page.js';
import { ExpectedPage } from './features/expected/expected-page.js';
import { HistoryPage } from './features/history/history-page.js';
import { FirePage } from './features/fire/fire-page.js';

// ─── Navigation ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { to: '/onsite', label: 'On site now' },
  { to: '/expected', label: 'Expected' },
  { to: '/employees', label: 'Employees' },
  { to: '/history', label: 'History' },
  { to: '/fire', label: 'Fire events' },
];

function AppShell() {
  const { user, logout } = useSession();
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top header */}
      <header className="bg-pmg-navy text-white px-6 py-3 flex items-center gap-4 z-10 shadow">
        <span className="font-semibold text-lg tracking-tight">PMG Presence</span>
        <span className="text-pmg-orange font-semibold text-xs uppercase tracking-widest">
          Admin
        </span>
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
        {/* Sidebar nav */}
        <nav className="w-52 flex-shrink-0 bg-white border-r border-gray-200 pt-6 pb-4 hidden md:flex flex-col gap-1 px-3">
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

        {/* Mobile bottom nav */}
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
              {label.split(' ')[0]}
            </NavLink>
          ))}
        </nav>

        {/* Main content */}
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
            <Route index element={<Navigate to="/onsite" replace />} />
            <Route path="/onsite" element={<OnsitePage />} />
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/expected" element={<ExpectedPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/fire" element={<FirePage />} />
            <Route path="*" element={<Navigate to="/onsite" replace />} />
          </Route>
        </Routes>
      </SessionProvider>
    </BrowserRouter>
  );
}
