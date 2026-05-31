import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { triggerFire, ApiError } from '../../lib/api.js';
import { useKiosk } from '../../context/kiosk-context.js';

type Step = 'warning' | 'confirm' | 'done';

export function FirePage() {
  const navigate = useNavigate();
  const { activateFireLock } = useKiosk();
  const [step, setStep] = useState<Step>('warning');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const res = await triggerFire();
      activateFireLock(res.id);
      setStep('done');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Fire already active — lock anyway
        activateFireLock('existing');
        setStep('done');
      } else {
        setError(err instanceof ApiError ? err.message : 'Failed to trigger alarm. Call reception immediately.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (step === 'done') {
    return <EvacuationLock />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-pmg-navy text-white px-6 py-5 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="text-white/70 hover:text-white text-2xl leading-none">
          ←
        </button>
        <h1 className="font-semibold text-xl">Fire Alarm</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-md mx-auto w-full text-center">
        {step === 'warning' && (
          <>
            <div className="text-7xl mb-6">🔔</div>
            <h2 className="text-pmg-navy text-2xl font-semibold mb-3">Raise the fire alarm?</h2>
            <p className="text-gray-600 mb-2">
              Only press this if there is a genuine fire or emergency requiring evacuation.
            </p>
            <p className="text-gray-500 text-sm mb-8">
              This will immediately alert all fire marshals and begin a roll-call.
            </p>

            <div className="w-full space-y-3">
              <button
                onClick={() => setStep('confirm')}
                className="w-full rounded-2xl bg-red-600 py-5 text-white text-xl font-bold hover:bg-red-700 transition-colors active:scale-95"
              >
                🚨 Raise Alarm
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full rounded-2xl border-2 border-gray-200 py-4 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel — go back
              </button>
            </div>
          </>
        )}

        {step === 'confirm' && (
          <>
            <div className="text-7xl mb-6 animate-pulse">🚨</div>
            <h2 className="text-red-600 text-3xl font-bold mb-3">Confirm Emergency</h2>
            <p className="text-gray-700 font-semibold mb-2">
              Are you sure? This will trigger the full evacuation procedure.
            </p>
            <p className="text-gray-500 text-sm mb-8">
              Tap "Yes, trigger alarm" to proceed. This action is logged and cannot be undone.
            </p>

            {error && (
              <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm mb-4 w-full">
                {error}
              </p>
            )}

            <div className="w-full space-y-3">
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="w-full rounded-2xl bg-red-600 py-5 text-white text-xl font-bold disabled:opacity-50 hover:bg-red-700 transition-colors active:scale-95"
              >
                {loading ? 'Triggering…' : 'Yes, trigger alarm 🚨'}
              </button>
              <button
                onClick={() => { setStep('warning'); setError(null); }}
                disabled={loading}
                className="w-full rounded-2xl border-2 border-gray-300 py-4 text-gray-600 font-semibold disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >
                Cancel — go back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Evacuation lock screen ───────────────────────────────────────────────────

function EvacuationLock() {
  const { clearFireLock } = useKiosk();
  const navigate = useNavigate();
  const [showClear, setShowClear] = useState(false);

  function handleClear() {
    clearFireLock();
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-red-700 flex flex-col items-center justify-center p-8 text-white text-center">
      <div className="text-8xl mb-8 animate-pulse">🚨</div>
      <h1 className="text-4xl font-bold mb-4">EVACUATION IN PROGRESS</h1>
      <p className="text-xl text-red-100 mb-2">Follow the evacuation procedure.</p>
      <p className="text-red-200 mb-2">Proceed to the designated assembly point.</p>
      <p className="text-red-200 text-sm mb-12">
        Sign-in is suspended. An administrator will stand down the alarm via the admin portal.
      </p>

      {/* Discreet admin stand-down affordance */}
      {!showClear ? (
        <button
          onClick={() => setShowClear(true)}
          className="text-red-300/50 text-xs hover:text-red-200 transition-colors mt-4"
        >
          Administrator: stand down
        </button>
      ) : (
        <div className="bg-red-600 rounded-2xl p-6 max-w-xs w-full">
          <p className="text-sm mb-4 font-medium">
            Only proceed if the fire event has been resolved in the admin portal.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowClear(false)}
              className="rounded-xl border border-red-400 py-3 text-sm font-medium hover:bg-red-500 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleClear}
              className="rounded-xl bg-white text-red-700 py-3 text-sm font-bold hover:bg-red-50 transition-colors"
            >
              Confirm stand down
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
