import React, { useState } from 'react';
import type { VisitCategory } from '@pmg/contracts';
import { checkIn, ApiError } from '../../lib/api.js';
import type { CheckInResponse, VisitorPassResponse } from '@pmg/contracts';

interface Props {
  onSuccess: (result: CheckInResponse, pass?: VisitorPassResponse) => void;
}

const CATEGORIES: { value: VisitCategory; label: string }[] = [
  { value: 'contractor', label: 'Contractor' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'auditor', label: 'Auditor' },
  { value: 'nhs-commissioner', label: 'NHS Commissioner' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Other' },
];

export function VisitorForm({ onSuccess }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [host, setHost] = useState('');
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState<VisitCategory | ''>('');
  const [duration, setDuration] = useState<'today' | 'multi'>('today');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const minEndDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Please enter your full name.'); return; }
    if (!host.trim()) { setError('Please enter who you are visiting.'); return; }
    if (!reason.trim()) { setError('Please enter the reason for your visit.'); return; }
    if (duration === 'multi' && !endDate) { setError('Please select your last day on site.'); return; }
    if (duration === 'multi' && endDate <= today) { setError('End date must be after today.'); return; }

    setLoading(true);
    setError(null);

    try {
      const result = await checkIn({
        method: 'visitor-form',
        personType: 'visitor',
        visitor: {
          name: name.trim(),
          email: email.trim() || null,
          host: host.trim(),
          visitReason: reason.trim(),
          visitCategory: category || null,
        },
        booking: {
          startDate: today,
          endDate: duration === 'multi' ? endDate : today,
        },
        locationId: 'loc-reception',
      });
      onSuccess(result, result.pass);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign-in failed. Please ask reception for help.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name */}
      <div>
        <label className="block text-pmg-navy font-semibold mb-1">
          Full name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Dana Okoro"
          className="w-full rounded-xl border-2 border-gray-200 px-5 py-4 text-lg focus:border-pmg-navy focus:outline-none"
        />
      </div>

      {/* Email (optional) */}
      <div>
        <label className="block text-pmg-navy font-semibold mb-1">
          Email address <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full rounded-xl border-2 border-gray-200 px-5 py-4 text-lg focus:border-pmg-navy focus:outline-none"
        />
      </div>

      {/* Host */}
      <div>
        <label className="block text-pmg-navy font-semibold mb-1">
          Who are you visiting? <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder="e.g. Gary Cooper"
          className="w-full rounded-xl border-2 border-gray-200 px-5 py-4 text-lg focus:border-pmg-navy focus:outline-none"
        />
      </div>

      {/* Reason */}
      <div>
        <label className="block text-pmg-navy font-semibold mb-1">
          Reason for visit <span className="text-red-500">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Quarterly supplier meeting"
          rows={2}
          className="w-full rounded-xl border-2 border-gray-200 px-5 py-3 text-lg focus:border-pmg-navy focus:outline-none resize-none"
        />
      </div>

      {/* Category quick-pick */}
      <div>
        <label className="block text-pmg-navy font-semibold mb-2">
          Visit type <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setCategory(category === value ? '' : value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium border-2 transition-colors ${
                category === value
                  ? 'bg-pmg-navy border-pmg-navy text-white'
                  : 'border-gray-200 text-gray-600 hover:border-pmg-navy hover:text-pmg-navy'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Duration picker */}
      <div>
        <label className="block text-pmg-navy font-semibold mb-2">How long is your visit?</label>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <button
            type="button"
            onClick={() => setDuration('today')}
            className={`rounded-xl py-4 text-sm font-semibold border-2 transition-colors ${
              duration === 'today'
                ? 'bg-pmg-navy border-pmg-navy text-white'
                : 'border-gray-200 text-gray-600 hover:border-pmg-navy'
            }`}
          >
            📅 Just today
          </button>
          <button
            type="button"
            onClick={() => setDuration('multi')}
            className={`rounded-xl py-4 text-sm font-semibold border-2 transition-colors ${
              duration === 'multi'
                ? 'bg-pmg-navy border-pmg-navy text-white'
                : 'border-gray-200 text-gray-600 hover:border-pmg-navy'
            }`}
          >
            🗓 Multiple days
          </button>
        </div>
        {duration === 'multi' && (
          <div className="rounded-xl bg-pmg-cyan/10 border border-pmg-cyan/20 p-4">
            <label className="block text-pmg-navy font-semibold mb-2">Last day on site</label>
            <input
              type="date"
              value={endDate}
              min={minEndDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border-2 border-gray-200 px-5 py-3 text-lg focus:border-pmg-navy focus:outline-none"
            />
            <p className="text-pmg-cyan text-xs mt-2">
              You'll receive a return pass to use on subsequent days — no need to re-register.
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-pmg-orange py-5 text-white text-lg font-semibold disabled:opacity-50 hover:bg-pmg-orange/90 transition-colors active:scale-95"
      >
        {loading ? 'Signing in…' : '↑ Sign In'}
      </button>
    </form>
  );
}
