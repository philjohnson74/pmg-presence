import React, { useState } from 'react';
import type { RollCallEntry } from '@pmg/contracts';
import { RollCallTile } from './roll-call-tile.js';
import { RollCallProgress } from './roll-call-progress.js';
import { FreshnessClock } from './freshness-clock.js';

interface RollCallSnapshot {
  fireEventId: string;
  triggeredAt: string;
  entries: RollCallEntry[];
}

interface Props {
  rollCall: RollCallSnapshot;
  lastHeartbeat: Date | null;
  onMarkAccounted: (personId: string, accountedFor: boolean) => Promise<void>;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function Section({
  title,
  entries,
  onToggle,
  loadingId,
}: Readonly<{
  title: string;
  entries: RollCallEntry[];
  onToggle: (entry: RollCallEntry) => void;
  loadingId: string | null;
}>) {
  if (entries.length === 0) return null;
  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-3">
        {title} ({entries.length})
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {entries.map((entry) => (
          <RollCallTile
            key={entry.personId}
            entry={entry}
            onToggle={() => onToggle(entry)}
            loading={loadingId === entry.personId}
          />
        ))}
      </div>
    </section>
  );
}

export function EvacuationView({ rollCall, lastHeartbeat, onMarkAccounted }: Readonly<Props>) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleToggle(entry: RollCallEntry) {
    if (entry.state === 'expected-absent' || loadingId) return;
    setLoadingId(entry.personId);
    try {
      await onMarkAccounted(entry.personId, !entry.accountedFor);
    } finally {
      setLoadingId(null);
    }
  }

  const unaccounted = rollCall.entries.filter((e) => e.state === 'unaccounted');
  const amber = rollCall.entries.filter((e) => e.state === 'expected-absent');
  const accounted = rollCall.entries.filter((e) => e.state === 'accounted');

  return (
    <div className="fixed inset-0 z-50 bg-pmg-navy flex flex-col overflow-hidden">
      {/* Alarm header */}
      <div className="bg-rollcall-red px-4 py-4 flex-shrink-0">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl" role="img" aria-label="alarm">
              🔴
            </span>
            <div>
              <h1 className="text-xl font-semibold text-white leading-tight">
                EVACUATION — ROLL CALL
              </h1>
              <p className="text-xs text-white/70">
                Alarm triggered at {fmtTime(rollCall.triggeredAt)}
              </p>
            </div>
          </div>
          <FreshnessClock lastHeartbeat={lastHeartbeat} />
        </div>
        <RollCallProgress entries={rollCall.entries} />
      </div>

      {/* Tile grid — scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <Section
          title="Not yet accounted for"
          entries={unaccounted}
          onToggle={(e) => void handleToggle(e)}
          loadingId={loadingId}
        />
        <Section
          title="Expected but not signed in"
          entries={amber}
          onToggle={(e) => void handleToggle(e)}
          loadingId={loadingId}
        />
        <Section
          title="Accounted for"
          entries={accounted}
          onToggle={(e) => void handleToggle(e)}
          loadingId={loadingId}
        />

        {rollCall.entries.length === 0 && (
          <p className="text-center text-white/50 py-12 text-sm">
            No one was recorded on site at the time of the alarm.
          </p>
        )}
      </div>
    </div>
  );
}
