import React, { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import type { OnsiteResponse, PersonType } from '@pmg/contracts';
import { PersonTypeBadge } from '@pmg/ui';
import { fetchOnsite } from '../../lib/api.js';
import { getCachedOnsite, putCachedOnsite } from '../../offline/db.js';
import { useSession } from '../auth/use-session.js';
import { useOnsiteStream } from './use-onsite-stream.js';

function isMarshalOrAdmin(roles: string[]) {
  return roles.includes('marshal') || roles.includes('admin');
}

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const FILTERS: { label: string; value: PersonType | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Employees', value: 'employee' },
  { label: 'Patients', value: 'patient' },
  { label: 'Visitors', value: 'visitor' },
];

export function OnsitePage() {
  const { user, token } = useSession();

  // Non-marshals shouldn't reach this page — nav doesn't show it, but guard anyway
  if (!user || !isMarshalOrAdmin(user.roles)) {
    return <Navigate to="/my-pass" replace />;
  }

  return <OnsiteContent token={token} />;
}

function OnsiteContent({ token }: Readonly<{ token: string | null }>) {
  const stream = useOnsiteStream(token);
  const [filter, setFilter] = useState<PersonType | ''>('');
  const [data, setData] = useState<OnsiteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetchOnsite(token);
      setData(res);
      void putCachedOnsite(res);
    } catch {
      setError('Failed to load on-site list');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Seed from IDB cache so the list renders immediately even before the network responds
  useEffect(() => {
    void getCachedOnsite().then((cached) => {
      if (cached) setData(cached.data);
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (stream.counts) void load();
  }, [stream.counts, load]);

  const counts = stream.counts ?? data?.counts;
  const occupants = (filter
    ? (data?.occupants ?? []).filter((o) => o.personType === filter)
    : (data?.occupants ?? [])).slice().sort((a, b) => a.displayName.localeCompare(b.displayName));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-pmg-navy">On site now</h1>
          {data && (
            <p className="text-sm text-gray-500 mt-0.5">
              As of {fmt(data.asOf)}
              {stream.connected && (
                <span className="ml-2 inline-flex items-center gap-1 text-pmg-green text-xs font-semibold">
                  <span className="h-2 w-2 rounded-full bg-pmg-green inline-block" />
                  Live
                </span>
              )}
            </p>
          )}
        </div>
        {stream.lastEvent && (
          <span className="text-xs text-gray-400 italic">{stream.lastEvent}</span>
        )}
      </div>

      {/* Occupancy counters */}
      {counts && (
        <div className="grid grid-cols-3 gap-4">
          {(['employee', 'patient', 'visitor'] as PersonType[]).map((t) => (
            <div key={t} className="rounded-lg border border-gray-200 bg-white px-5 py-4">
              <p className="text-3xl font-semibold text-pmg-navy">{counts[t]}</p>
              <p className="text-sm text-gray-500 mt-0.5 capitalize">{t}s</p>
            </div>
          ))}
        </div>
      )}

      {/* Visitors by category */}
      {data?.visitorsByCategory && Object.keys(data.visitorsByCategory).length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            Visitors by category
          </p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(data.visitorsByCategory).map(([cat, count]) => (
              <span
                key={cat}
                className="rounded-full bg-pmg-green/10 px-3 py-1 text-sm font-medium text-pmg-navy"
              >
                {cat}: <strong>{count}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              filter === f.value
                ? 'border-pmg-navy text-pmg-navy'
                : 'border-transparent text-gray-500 hover:text-pmg-navy'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : occupants.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">
          No one on site{filter ? ` (${filter}s)` : ''}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-pmg-navy">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-pmg-navy">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-pmg-navy">Since</th>
                <th className="px-4 py-3 text-left font-semibold text-pmg-navy">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {occupants.map((occ) => (
                <tr key={occ.personId}>
                  <td className="px-4 py-3 font-medium text-pmg-navy">{occ.displayName}</td>
                  <td className="px-4 py-3">
                    <PersonTypeBadge
                      personType={occ.personType}
                      {...(occ.visitCategory ? { visitCategory: occ.visitCategory } : {})}
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-500">{fmt(occ.since)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                    {occ.lastLocationId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
