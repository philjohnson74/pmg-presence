import React, { useEffect, useState } from 'react';
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
  lastSynced: Date | null;
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

function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const setOnline = () => setOffline(false);
    const setOfflineState = () => setOffline(true);
    window.addEventListener('online', setOnline);
    window.addEventListener('offline', setOfflineState);
    return () => {
      window.removeEventListener('online', setOnline);
      window.removeEventListener('offline', setOfflineState);
    };
  }, []);

  if (!offline) return null;

  const isIos =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  return (
    <div className="bg-amber-600/90 px-4 py-2 text-xs text-white flex items-start gap-2 flex-shrink-0">
      <span className="mt-0.5">⚠</span>
      <span>
        Network offline — showing cached roll-call.{' '}
        {isIos && (
          <span>
            On iOS, background sync requires the Capacitor native wrapper for reliable offline
            operation.{' '}
          </span>
        )}
        Accounted-for taps are queued and will replay on reconnect.
      </span>
    </div>
  );
}

export function EvacuationView({ rollCall, lastSynced, onMarkAccounted }: Readonly<Props>) {
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

  const byName = (a: RollCallEntry, b: RollCallEntry) => a.displayName.localeCompare(b.displayName);
  const unaccounted = rollCall.entries.filter((e) => e.state === 'unaccounted').slice().sort(byName);
  const amber = rollCall.entries.filter((e) => e.state === 'expected-absent').slice().sort(byName);
  const accounted = rollCall.entries.filter((e) => e.state === 'accounted').slice().sort(byName);

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
          <FreshnessClock lastSynced={lastSynced} />
        </div>
        <RollCallProgress entries={rollCall.entries} />
      </div>

      {/* Offline banner — shown when network is down */}
      <OfflineBanner />

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
