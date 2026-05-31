import React from 'react';
import type { RollCallEntry } from '@pmg/contracts';

interface Props {
  entries: RollCallEntry[];
}

export function RollCallProgress({ entries }: Readonly<Props>) {
  const present = entries.filter((e) => e.state !== 'expected-absent');
  const accounted = entries.filter((e) => e.accountedFor);
  const amber = entries.filter((e) => e.state === 'expected-absent');
  const pct = present.length > 0 ? Math.round((accounted.length / present.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xl font-semibold text-white">
          {accounted.length} of {present.length} accounted for
        </span>
        <span className="text-white/80 text-sm font-semibold">{pct}%</span>
      </div>

      <div className="h-2 bg-white/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-rollcall-green rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {amber.length > 0 && (
        <p className="text-xs text-white/60">
          + {amber.length} expected but not signed in (amber)
        </p>
      )}
    </div>
  );
}
