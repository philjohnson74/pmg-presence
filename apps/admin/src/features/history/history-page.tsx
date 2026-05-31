import React, { useState } from 'react';
import type { VisitHistoryRecord, PersonType } from '@pmg/contracts';
import { Button, PersonTypeBadge } from '@pmg/ui';
import { fetchHistory } from '../../lib/api.js';
import { useSession } from '../auth/use-session.js';

const METHOD_LABEL: Record<string, string> = {
  qr: 'QR',
  email: 'Email',
  'patient-lookup': 'Patient lookup',
  'visitor-form': 'Visitor form',
  manual: 'Manual',
};

function fmtDatetime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function exportCsv(records: VisitHistoryRecord[]) {
  const header = 'Name,Type,Direction,Method,Location,Timestamp';
  const rows = records.map(
    (r) =>
      `"${r.displayName}",${r.personType},${r.direction},${r.method},${r.locationId},"${r.timestamp}"`,
  );
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'visit-history.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function HistoryPage() {
  const { token } = useSession();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [q, setQ] = useState('');
  const [type, setType] = useState<PersonType | ''>('');
  const [records, setRecords] = useState<VisitHistoryRecord[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params: { from?: string; to?: string; q?: string; type?: string } = {};
      if (from) params.from = from;
      if (to) params.to = to;
      if (q) params.q = q;
      if (type) params.type = type;
      const res = await fetchHistory(token, params);
      setRecords(res.records);
      setTotal(res.total);
    } catch {
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-pmg-navy">Visit history</h1>
        <p className="text-sm text-gray-500 mt-0.5">Search all check-in / check-out events.</p>
      </div>

      {/* Search form */}
      <form
        onSubmit={(e) => void handleSearch(e)}
        className="rounded-lg border border-gray-200 bg-white px-5 py-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-pmg-navy mb-1 uppercase tracking-wide">
              From
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-pmg-navy focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-pmg-navy mb-1 uppercase tracking-wide">
              To
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-pmg-navy focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-pmg-navy mb-1 uppercase tracking-wide">
              Name
            </label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name…"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-pmg-navy focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-pmg-navy mb-1 uppercase tracking-wide">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as PersonType | '')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-pmg-navy focus:outline-none"
            >
              <option value="">All types</option>
              <option value="employee">Employee</option>
              <option value="patient">Patient</option>
              <option value="visitor">Visitor</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? 'Searching…' : 'Search'}
          </Button>
          {records && records.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => exportCsv(records)}
            >
              Export CSV
            </Button>
          )}
        </div>
      </form>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Results */}
      {records !== null && (
        <>
          <p className="text-sm text-gray-500">
            {total} result{total !== 1 ? 's' : ''}
          </p>

          {records.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No results found.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-pmg-navy">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-pmg-navy">Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-pmg-navy">Direction</th>
                    <th className="px-4 py-3 text-left font-semibold text-pmg-navy">Method</th>
                    <th className="px-4 py-3 text-left font-semibold text-pmg-navy">Location</th>
                    <th className="px-4 py-3 text-left font-semibold text-pmg-navy">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {records.map((r) => (
                    <tr key={r.eventId}>
                      <td className="px-4 py-3 font-medium text-pmg-navy">{r.displayName}</td>
                      <td className="px-4 py-3">
                        <PersonTypeBadge personType={r.personType} />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold ${
                            r.direction === 'in' ? 'text-pmg-green' : 'text-pmg-orange'
                          }`}
                        >
                          {r.direction === 'in' ? '↑ In' : '↓ Out'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {METHOD_LABEL[r.method] ?? r.method}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs font-mono">{r.locationId}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{fmtDatetime(r.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
