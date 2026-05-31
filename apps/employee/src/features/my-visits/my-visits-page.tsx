import React, { useCallback, useEffect, useState } from 'react';
import type { VisitHistoryRecord } from '@pmg/contracts';
import { fetchMyVisits } from '../../lib/api.js';
import { useSession } from '../auth/use-session.js';

function fmt(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

const METHOD_LABEL: Record<string, string> = {
  qr: 'QR scan',
  email: 'Email',
  'patient-lookup': 'Patient lookup',
  'visitor-form': 'Visitor form',
  manual: 'Manual (flagged)',
};

export function MyVisitsPage() {
  const { token } = useSession();
  const [records, setRecords] = useState<VisitHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchMyVisits(token);
      // newest first
      setRecords([...data.records].reverse());
    } catch {
      setError('Could not load visit history');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-pmg-navy">My Visits</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your personal check-in / check-out history.</p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : records.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">No visits recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-pmg-navy">When</th>
                <th className="px-4 py-3 text-left font-semibold text-pmg-navy">Direction</th>
                <th className="px-4 py-3 text-left font-semibold text-pmg-navy">Method</th>
                <th className="px-4 py-3 text-left font-semibold text-pmg-navy">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((r) => (
                <tr key={r.eventId}>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{fmt(r.timestamp)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-semibold ${r.direction === 'in' ? 'text-pmg-green' : 'text-gray-500'}`}
                    >
                      {r.direction === 'in' ? '↑ In' : '↓ Out'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {METHOD_LABEL[r.method] ?? r.method}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono">{r.locationId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
