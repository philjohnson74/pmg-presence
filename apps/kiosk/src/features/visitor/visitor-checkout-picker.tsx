import React, { useEffect, useState } from 'react';
import { fetchCheckedInVisitors, checkOut, ApiError, type CheckedInVisitor } from '../../lib/api.js';
import type { CheckInResponse } from '@pmg/contracts';

interface Props {
  onSuccess: (result: CheckInResponse) => void;
}

export function VisitorCheckoutPicker({ onSuccess }: Props) {
  const [visitors, setVisitors] = useState<CheckedInVisitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  useEffect(() => {
    fetchCheckedInVisitors()
      .then((vs) => setVisitors(vs.slice().sort((a, b) => a.displayName.localeCompare(b.displayName))))
      .catch(() => setError('Could not load visitor list.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleCheckout(visitor: CheckedInVisitor) {
    setCheckingOut(visitor.personId);
    setError(null);
    try {
      const result = await checkOut({
        personId: visitor.personId,
        personType: visitor.personType,
        locationId: 'loc-reception',
      });
      onSuccess(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign-out failed.');
      setCheckingOut(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400 text-lg">Loading visitors…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-6 text-center text-red-700">
        {error}
      </div>
    );
  }

  if (visitors.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-3">🏠</p>
        <p className="text-gray-500 font-medium">No one currently signed in.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-gray-600 text-sm">Select your name to sign out:</p>
      {visitors.map((v) => (
        <button
          key={v.personId}
          onClick={() => void handleCheckout(v)}
          disabled={checkingOut !== null}
          className="w-full flex items-center gap-4 rounded-xl border-2 border-gray-200 px-5 py-4 text-left hover:border-pmg-navy hover:bg-pmg-navy/5 transition-colors disabled:opacity-50 active:scale-[0.99]"
        >
          <span className="text-pmg-navy font-semibold text-lg flex-1">{v.displayName}</span>
          {checkingOut === v.personId ? (
            <span className="text-gray-400 text-sm">Signing out…</span>
          ) : (
            <span className="text-gray-400">↓</span>
          )}
        </button>
      ))}
    </div>
  );
}
