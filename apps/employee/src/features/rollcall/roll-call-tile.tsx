import React from 'react';
import type { RollCallEntry } from '@pmg/contracts';

interface Props {
  entry: RollCallEntry;
  onToggle: () => void;
  loading: boolean;
}

const TILE_BG: Record<string, string> = {
  unaccounted: 'bg-rollcall-red',
  accounted: 'bg-rollcall-green',
  'expected-absent': 'bg-rollcall-amber',
};

const STATE_HINT: Record<string, string> = {
  unaccounted: 'Tap to mark accounted for',
  accounted: 'Accounted for ✓',
  'expected-absent': 'Expected — not signed in',
};

function personLabel(personType: string) {
  return personType.charAt(0).toUpperCase() + personType.slice(1);
}

export function RollCallTile({ entry, onToggle, loading }: Readonly<Props>) {
  const bg = TILE_BG[entry.state] ?? 'bg-gray-500';
  const canToggle = entry.state !== 'expected-absent';
  // accounted tiles use navy text; red and amber tiles use white text
  const textColor = entry.state === 'accounted' ? 'text-pmg-navy' : 'text-white';
  const subColor = entry.state === 'accounted' ? 'text-pmg-navy/60' : 'text-white/75';

  return (
    <button
      className={`rounded-xl p-4 text-left w-full transition-opacity ${bg} ${
        canToggle ? 'hover:opacity-90 active:opacity-75 cursor-pointer' : 'cursor-default'
      } ${loading ? 'opacity-60 cursor-wait' : ''}`}
      onClick={canToggle && !loading ? onToggle : undefined}
      disabled={loading}
      aria-label={`${entry.displayName} — ${STATE_HINT[entry.state]}`}
    >
      <p className={`font-semibold text-base leading-snug ${textColor}`}>{entry.displayName}</p>

      <span
        className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
          entry.state === 'accounted'
            ? 'bg-pmg-navy/10 text-pmg-navy'
            : 'bg-white/20 text-white'
        }`}
      >
        {personLabel(entry.personType)}
      </span>

      <p className={`text-xs mt-2 ${subColor}`}>
        {STATE_HINT[entry.state]}
        {entry.accountedBy ? ` — ${entry.accountedBy}` : ''}
      </p>
    </button>
  );
}
