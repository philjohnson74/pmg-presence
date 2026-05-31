import React, { useState } from 'react';
import { checkIn, checkOut, ApiError } from '../../lib/api.js';
import type { CheckInResponse } from '@pmg/contracts';

interface Props {
  onSuccess: (result: CheckInResponse) => void;
}

export function FindMeLookup({ onSuccess }: Props) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine if input looks like an employee number (starts with PMG- or is all digits)
  function buildManual() {
    const v = value.trim();
    if (/^PMG-/i.test(v) || /^\d+$/.test(v)) {
      return { employeeNumber: v.toUpperCase().startsWith('PMG-') ? v.toUpperCase() : `PMG-${v}` };
    }
    return { name: v };
  }

  async function handleDirection(direction: 'in' | 'out') {
    if (!value.trim()) {
      setError('Please enter your employee number or full name.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fn = direction === 'in' ? checkIn : checkOut;
      const result = await fn({
        method: 'manual',
        personType: 'employee',
        manual: buildManual(),
        locationId: 'loc-reception',
      });
      onSuccess(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not find employee. Please ask reception for assistance.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
        <p className="text-amber-800 text-sm font-medium">
          Manual sign-in — for staff without a work email or phone. This will be flagged for verification.
        </p>
      </div>

      <div>
        <label htmlFor="find-me" className="block text-pmg-navy font-semibold text-lg mb-2">
          Employee number or full name
        </label>
        <input
          id="find-me"
          type="text"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleDirection('in')}
          placeholder="e.g. PMG-1187 or Sam Doyle"
          className="w-full rounded-xl border-2 border-gray-200 px-5 py-4 text-xl focus:border-pmg-navy focus:outline-none"
        />
        <p className="text-gray-500 text-sm mt-2">Enter your PMG employee number (preferred) or your full name.</p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleDirection('in')}
          disabled={loading}
          className="rounded-xl bg-pmg-navy px-6 py-5 text-white text-lg font-semibold disabled:opacity-50 hover:bg-pmg-navy/90 transition-colors active:scale-95"
        >
          {loading ? '…' : '↑ Sign In'}
        </button>
        <button
          onClick={() => handleDirection('out')}
          disabled={loading}
          className="rounded-xl border-2 border-pmg-navy px-6 py-5 text-pmg-navy text-lg font-semibold disabled:opacity-50 hover:bg-pmg-navy/5 transition-colors active:scale-95"
        >
          {loading ? '…' : '↓ Sign Out'}
        </button>
      </div>
    </div>
  );
}
