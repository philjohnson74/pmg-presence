import React, { useCallback, useEffect, useState } from 'react';
import type { FireEvent } from '@pmg/contracts';
import { Button } from '@pmg/ui';
import { fetchFireEvents, resolveFireEvent } from '../../lib/api.js';
import { useSession } from '../auth/use-session.js';

function fmtDatetime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function duration(from: string, to: string) {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  const mins = Math.floor(ms / 60000);
  return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function FirePage() {
  const { token } = useSession();
  const [events, setEvents] = useState<FireEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchFireEvents(token);
      setEvents(data.events.slice().reverse()); // newest first
    } catch {
      setError('Failed to load fire events');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  async function handleResolve(id: string) {
    if (!token) return;
    setResolving(id);
    setError(null);
    try {
      await resolveFireEvent(token, id);
      setConfirmId(null);
      await load();
    } catch {
      setError('Resolve failed');
    } finally {
      setResolving(null);
    }
  }

  const active = events.find((e) => !e.resolvedAt);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-pmg-navy">Fire events</h1>
        <p className="text-sm text-gray-500 mt-0.5">All alarm activations and stand-downs.</p>
      </div>

      {/* Active alarm banner */}
      {active && (
        <div className="rounded-lg border-2 border-rollcall-red bg-red-50 px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-rollcall-red text-sm">
              🔴 ACTIVE FIRE ALARM
            </p>
            <p className="text-xs text-gray-600 mt-0.5">
              Triggered {fmtDatetime(active.triggeredAt)} by {active.triggeredBy}
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            disabled={!!resolving}
            onClick={() => setConfirmId(active.id)}
          >
            Stand down
          </Button>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex justify-between">
          {error}
          <button onClick={() => setError(null)} className="font-semibold">Dismiss</button>
        </div>
      )}

      {/* Events table */}
      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">No fire events recorded.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-pmg-navy">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-pmg-navy">Triggered</th>
                <th className="px-4 py-3 text-left font-semibold text-pmg-navy">By</th>
                <th className="px-4 py-3 text-left font-semibold text-pmg-navy">Resolved</th>
                <th className="px-4 py-3 text-left font-semibold text-pmg-navy">Duration</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.map((ev) => (
                <tr key={ev.id}>
                  <td className="px-4 py-3">
                    {ev.resolvedAt ? (
                      <span className="text-xs font-semibold text-pmg-green">Resolved</span>
                    ) : (
                      <span className="text-xs font-semibold text-rollcall-red">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{fmtDatetime(ev.triggeredAt)}</td>
                  <td className="px-4 py-3 text-gray-500">{ev.triggeredBy}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {ev.resolvedAt ? fmtDatetime(ev.resolvedAt) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {ev.resolvedAt ? duration(ev.triggeredAt, ev.resolvedAt) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!ev.resolvedAt && (
                      <button
                        onClick={() => setConfirmId(ev.id)}
                        className="text-xs text-rollcall-red hover:underline"
                      >
                        Stand down
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm dialog */}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-xl p-6 text-center">
            <p className="text-2xl mb-3">🔔</p>
            <h2 className="text-lg font-semibold text-pmg-navy mb-2">Confirm stand-down</h2>
            <p className="text-sm text-gray-500 mb-6">
              This will resolve the active fire event and notify all connected clients.
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="destructive"
                size="sm"
                disabled={!!resolving}
                onClick={() => void handleResolve(confirmId)}
              >
                {resolving ? 'Resolving…' : 'Confirm stand-down'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
