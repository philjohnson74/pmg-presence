import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CheckInResponse } from '@pmg/contracts';
import { patientLookup, checkIn, ApiError } from '../../lib/api.js';
import { SuccessScreen } from '../../components/success-screen.js';

type Step = 'lookup' | 'confirm' | 'manual';

interface PatientMatch {
  patientId: string;
  displayName: string;
  patientReference: string;
}

export function PatientPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('lookup');
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<PatientMatch | null>(null);
  const [result, setResult] = useState<CheckInResponse | null>(null);

  // Manual fallback fields
  const [manualName, setManualName] = useState('');

  async function handleLookup() {
    if (!name.trim()) { setError('Please enter your name.'); return; }
    if (!dob) { setError('Please enter your date of birth.'); return; }
    const today = new Date().toISOString().slice(0, 10);
    if (dob >= today) { setError('Date of birth cannot be today or in the future.'); return; }

    setLoading(true);
    setError(null);
    try {
      const res = await patientLookup(name.trim(), dob);
      if (!res.match) {
        setStep('manual');
        setManualName(name.trim());
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
      const res = await checkIn({
        method: 'patient-lookup',
        personType: 'patient',
        patientId: match.patientId,
        locationId: 'loc-reception',
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign-in failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleManualSubmit() {
    if (!manualName.trim()) { setError('Please enter your full name.'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await checkIn({
        method: 'manual',
        personType: 'patient',
        manual: { name: manualName.trim(), note: 'No DOB match — reception to verify' },
        locationId: 'loc-reception',
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign-in failed. Please ask reception for help.');
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <SuccessScreen
        direction="in"
        displayName={result.displayName}
        personType="patient"
        message={step === 'manual' ? 'Our reception team will verify your details shortly.' : undefined}
        onDone={() => navigate('/')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-pmg-navy text-white px-6 py-5 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="text-white/70 hover:text-white text-2xl leading-none">
          ←
        </button>
        <div>
          <h1 className="font-semibold text-xl">Patient Sign In</h1>
          <p className="text-white/60 text-sm">
            {step === 'lookup' && 'Please enter your details'}
            {step === 'confirm' && 'Please confirm your details'}
            {step === 'manual' && 'No record found — manual sign in'}
          </p>
        </div>
      </div>

      <div className="flex-1 p-6 max-w-lg mx-auto w-full">
        {/* ── Lookup form ── */}
        {step === 'lookup' && (
          <div className="space-y-5">
            <div>
              <label className="block text-pmg-navy font-semibold mb-2">
                Full name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Joan Webb"
                className="w-full rounded-xl border-2 border-gray-200 px-5 py-4 text-xl focus:border-pmg-navy focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-pmg-navy font-semibold mb-2">
                Date of birth <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                max={new Date(Date.now() - 86400000).toISOString().slice(0, 10)}
                className="w-full rounded-xl border-2 border-gray-200 px-5 py-4 text-xl focus:border-pmg-navy focus:outline-none"
              />
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
              {loading ? 'Looking up…' : 'Find my appointment →'}
            </button>
          </div>
        )}

        {/* ── Confirm screen ── */}
        {step === 'confirm' && match && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-pmg-green/10 border border-pmg-green/20 p-6 text-center">
              <p className="text-pmg-green font-semibold text-lg mb-1">✓ Record found</p>
              <p className="text-pmg-navy text-3xl font-semibold">{match.displayName}</p>
              <p className="text-gray-500 text-sm mt-2">Ref: {match.patientReference}</p>
            </div>

            <p className="text-gray-600 text-center">Is this you?</p>

            {error && (
              <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
                {error}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => { setStep('lookup'); setMatch(null); setError(null); }}
                className="rounded-xl border-2 border-gray-200 py-4 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
              >
                ← Not me
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="rounded-xl bg-pmg-navy py-4 text-white text-lg font-semibold disabled:opacity-50 hover:bg-pmg-navy/90 transition-colors active:scale-95"
              >
                {loading ? '…' : 'Yes, sign in ✓'}
              </button>
            </div>
          </div>
        )}

        {/* ── Manual fallback ── */}
        {step === 'manual' && (
          <div className="space-y-5">
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-4">
              <p className="text-amber-800 font-semibold">No matching record found</p>
              <p className="text-amber-700 text-sm mt-1">
                We couldn't find a record for the details you entered. You can still sign in — our reception team will verify your details.
              </p>
            </div>

            <div>
              <label className="block text-pmg-navy font-semibold mb-2">Confirm your full name</label>
              <input
                type="text"
                autoFocus
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
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
                onClick={() => { setStep('lookup'); setError(null); }}
                className="rounded-xl border-2 border-gray-200 py-4 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
              >
                ← Try again
              </button>
              <button
                onClick={handleManualSubmit}
                disabled={loading}
                className="rounded-xl bg-pmg-navy py-4 text-white font-semibold disabled:opacity-50 hover:bg-pmg-navy/90 transition-colors active:scale-95"
              >
                {loading ? '…' : 'Sign in anyway →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
