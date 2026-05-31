import React, { useState } from 'react';
import { returningVisitorLookup, checkIn, ApiError } from '../../lib/api.js';
import type { CheckInResponse } from '@pmg/contracts';

interface Props {
  onSuccess: (result: CheckInResponse) => void;
}

type Step = 'lookup' | 'confirm';

interface MatchedVisitor {
  visitorId: string;
  displayName: string;
  host: string;
  validUntil: string;
}

export function ReturningVisitor({ onSuccess }: Props) {
  const [step, setStep] = useState<Step>('lookup');
  const [surname, setSurname] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<MatchedVisitor | null>(null);

  async function handleLookup() {
    if (!surname.trim() || !code.trim()) {
      setError('Please enter your surname and the code from your pass.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await returningVisitorLookup(surname.trim(), code.trim().toUpperCase());
      if (!res.match) {
        setError('No active pass found for that name and code. Please try signing in as a new visitor.');
        return;
      }
      setMatch(res);
      setStep('confirm');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Lookup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!match) return;
    setLoading(true);
    setError(null);
    try {
      const result = await checkIn({
        method: 'visitor-form',
        personType: 'visitor',
        personId: match.visitorId,
        locationId: 'loc-reception',
      });
      onSuccess(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign-in failed. Please ask reception for help.');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'confirm' && match) {
    const validUntil = new Date(match.validUntil).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-pmg-navy/5 border border-pmg-navy/10 p-6 text-center">
          <p className="text-gray-500 text-sm mb-1">Signing in as</p>
          <p className="text-pmg-navy text-2xl font-semibold">{match.displayName}</p>
          <p className="text-gray-500 text-sm mt-2">Host: {match.host}</p>
          <p className="text-gray-400 text-xs mt-1">Pass valid until {validUntil}</p>
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => { setStep('lookup'); setError(null); }}
            className="rounded-xl border-2 border-gray-200 py-4 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="rounded-xl bg-pmg-navy py-4 text-white text-lg font-semibold disabled:opacity-50 hover:bg-pmg-navy/90 transition-colors active:scale-95"
          >
            {loading ? '…' : '↑ Sign In'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-gray-600">
        Enter your surname and the code from your visitor pass.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-pmg-navy font-semibold mb-2">Surname</label>
          <input
            type="text"
            autoFocus
            value={surname}
            onChange={(e) => setSurname(e.target.value)}
            placeholder="e.g. Okoro"
            className="w-full rounded-xl border-2 border-gray-200 px-5 py-4 text-xl focus:border-pmg-navy focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-pmg-navy font-semibold mb-2">Pass code</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
            placeholder="e.g. 4Q8KZP"
            maxLength={6}
            className="w-full rounded-xl border-2 border-gray-200 px-5 py-4 text-xl font-mono tracking-widest uppercase focus:border-pmg-navy focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
          {error}
        </p>
      )}

      <button
        onClick={handleLookup}
        disabled={loading}
        className="w-full rounded-xl bg-pmg-navy py-5 text-white text-lg font-semibold disabled:opacity-50 hover:bg-pmg-navy/90 transition-colors active:scale-95"
      >
        {loading ? 'Looking up…' : 'Find my pass →'}
      </button>
    </div>
  );
}
