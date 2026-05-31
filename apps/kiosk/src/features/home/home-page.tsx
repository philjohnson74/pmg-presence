import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PeacocksLogo } from '@pmg/ui';
import { useKiosk } from '../../context/kiosk-context.js';

interface TileProps {
  icon: string;
  label: string;
  sub?: string;
  to: string;
  accent?: boolean;
}

function ActionTile({ icon, label, sub, to, accent }: TileProps) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className={`flex flex-col items-center justify-center gap-3 rounded-2xl p-8 text-center transition-transform active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-pmg-orange ${
        accent
          ? 'bg-pmg-orange text-white'
          : 'bg-white text-pmg-navy shadow-md hover:shadow-lg'
      }`}
    >
      <span className="text-5xl" role="img" aria-hidden>
        {icon}
      </span>
      <span className="text-xl font-semibold leading-tight">{label}</span>
      {sub && <span className="text-sm opacity-70">{sub}</span>}
    </button>
  );
}

export function HomePage() {
  const { isFireActive } = useKiosk();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-pmg-navy">
      {/* Header */}
      <header className="flex items-center px-8 py-6">
        <PeacocksLogo className="h-10 w-auto" />
      </header>

      {/* Welcome */}
      <div className="px-8 pb-6">
        <h1 className="text-white text-4xl font-semibold">Welcome</h1>
        <p className="text-white/60 text-lg mt-1">Please select how you'd like to sign in</p>
      </div>

      {/* Action tiles */}
      <div className="flex-1 px-8 grid grid-cols-2 gap-5 content-start">
        <ActionTile icon="👤" label="Employee" sub="Sign in or out" to="/employee" />
        <ActionTile icon="🧑‍🤝‍🧑" label="Visitor" sub="New visit or return" to="/visitor" />
        <ActionTile icon="🏥" label="Patient" sub="I have an appointment" to="/patient" />
        <ActionTile icon="↩️" label="Sign Out" sub="Check out" to="/checkout" />
      </div>

      {/* Fire alarm */}
      <div className="px-8 py-8">
        {isFireActive ? (
          <div className="bg-red-600 rounded-2xl p-6 text-white text-center">
            <p className="text-2xl font-bold">🚨 EVACUATION IN PROGRESS</p>
            <p className="mt-1 opacity-80">Sign-in is suspended. Follow evacuation procedures.</p>
            <button
              onClick={() => navigate('/fire-lock')}
              className="mt-4 px-6 py-2 bg-white/20 rounded-xl text-sm font-medium hover:bg-white/30 transition-colors"
            >
              View emergency status
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/fire')}
            className="w-full rounded-2xl border-2 border-red-500 bg-red-500/10 py-5 text-red-400 text-lg font-semibold flex items-center justify-center gap-3 hover:bg-red-500/20 transition-colors active:scale-95"
          >
            <span className="text-2xl">🔔</span>
            Fire Alarm
          </button>
        )}
      </div>
    </div>
  );
}
