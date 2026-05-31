import React, { useCallback, useEffect, useState } from 'react';
import type { ExpectedPerson } from '@pmg/contracts';
import { PersonTypeBadge } from '@pmg/ui';
import { fetchExpected } from '../../lib/api.js';
import { useSession } from '../auth/use-session.js';

function today() {
  return new Date().toISOString().slice(0, 10);
}
function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

const SOURCE_LABEL: Record<string, string> = {
  'm365-calendar': 'M365 Calendar',
  'visit-booking': 'Visit Booking',
};

function DayView({ date, label }: Readonly<{ date: string; label: string }>) {
  const { token } = useSession();
  const [people, setPeople] = useState<ExpectedPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetchExpected(token, date);
      setPeople(res.expected);
    } catch {
      setError('Failed to load expected list');
    } finally {
      setLoading(false);
    }
  }, [token, date]);

  useEffect(() => { void load(); }, [load]);

  const present = people.filter((p) => p.checkedInToday);
  const absent = people.filter((p) => !p.checkedInToday);

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="bg-pmg-navy text-white px-5 py-4 flex items-center justify-between">
        <div>
          <p className="font-semibold">{label}</p>
          <p className="text-xs text-white/70">{date}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold">{people.length}</p>
          <p className="text-xs text-white/70">expected</p>
        </div>
      </div>

      {/* Stats row */}
      {!loading && !error && (
        <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
          <div className="px-5 py-3 text-center">
            <p className="text-xl font-semibold text-pmg-green">{present.length}</p>
            <p className="text-xs text-gray-500">signed in</p>
          </div>
          <div className="px-5 py-3 text-center">
            <p className="text-xl font-semibold text-rollcall-amber">{absent.length}</p>
            <p className="text-xs text-gray-500">not yet signed in</p>
          </div>
        </div>
      )}

      <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
        {loading ? (
          <p className="px-5 py-4 text-sm text-gray-400">Loading…</p>
        ) : error ? (
          <p className="px-5 py-4 text-sm text-red-500">{error}</p>
        ) : people.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-400">Nobody expected on this date.</p>
        ) : (
          people.map((person) => (
            <div key={person.personId} className="px-5 py-3 flex items-center gap-3">
              <div
                className={`h-2 w-2 rounded-full flex-shrink-0 ${
                  person.checkedInToday ? 'bg-pmg-green' : 'bg-rollcall-amber'
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-pmg-navy truncate">{person.displayName}</p>
                <p className="text-xs text-gray-400">
                  {SOURCE_LABEL[person.source] ?? person.source}
                  {person.host && ` · Host: ${person.host}`}
                  {person.visitCategory && ` · ${person.visitCategory}`}
                </p>
              </div>
              <PersonTypeBadge
                personType={person.personType}
                {...(person.visitCategory ? { visitCategory: person.visitCategory } : {})}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function ExpectedPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-pmg-navy">Expected on site</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Staff from M365 calendar + active visit bookings. Amber = not yet signed in.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DayView date={today()} label="Today" />
        <DayView date={tomorrow()} label="Tomorrow" />
      </div>
    </div>
  );
}
