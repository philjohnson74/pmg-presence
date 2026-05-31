import React, { useState } from 'react';
import { checkIn, checkOut, ApiError } from '../../lib/api.js';
import type { CheckInResponse } from '@pmg/contracts';

interface Props {
  onSuccess: (result: CheckInResponse) => void;
}

export function EmailCheckIn({ onSuccess }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDirection(direction: 'in' | 'out') {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fn = direction === 'in' ? checkIn : checkOut;
      const result = await fn({ method: 'email', email: email.trim(), locationId: 'loc-reception' });
      onSuccess(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-pmg-navy font-semibold text-lg mb-2">
          Your work email address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleDirection('in')}
          placeholder="name@peacocksgroup.com"
          className="w-full rounded-xl border-2 border-gray-200 px-5 py-4 text-xl focus:border-pmg-navy focus:outline-none"
        />
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
