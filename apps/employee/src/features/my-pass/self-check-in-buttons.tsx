import React, { useState } from 'react';
import { Button } from '@pmg/ui';
import { selfCheckIn, selfCheckOut } from '../../lib/api.js';

interface Props {
  authToken: string;
  qrToken: string;
}

type Status = 'idle' | 'loading' | 'checked-in' | 'checked-out' | 'error';

export function SelfCheckInButtons({ authToken, qrToken }: Readonly<Props>) {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string | null>(null);

  function resetAfterDelay() {
    setTimeout(() => {
      setStatus('idle');
      setMessage(null);
    }, 3000);
  }

  async function handleCheckIn() {
    setStatus('loading');
    try {
      const res = await selfCheckIn(authToken, qrToken, 'loc-reception');
      setStatus('checked-in');
      setMessage(res.alreadyOnsite ? 'Already checked in' : 'Checked in ✓');
    } catch {
      setStatus('error');
      setMessage('Check-in failed — try the kiosk');
    }
    resetAfterDelay();
  }

  async function handleCheckOut() {
    setStatus('loading');
    try {
      await selfCheckOut(authToken, qrToken, 'loc-reception');
      setStatus('checked-out');
      setMessage('Checked out ✓');
    } catch {
      setStatus('error');
      setMessage('Check-out failed — try the kiosk');
    }
    resetAfterDelay();
  }

  const disabled = status === 'loading';

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-xs">
      <Button className="w-full" disabled={disabled} onClick={() => void handleCheckIn()}>
        {status === 'loading' ? 'Processing…' : '↑ Check me in here'}
      </Button>
      <Button
        variant="outline"
        className="w-full"
        disabled={disabled}
        onClick={() => void handleCheckOut()}
      >
        ↓ Check me out here
      </Button>

      {message && (
        <p
          className={`text-sm font-semibold text-center ${
            status === 'error'
              ? 'text-red-600'
              : status === 'checked-out'
                ? 'text-gray-600'
                : 'text-pmg-green'
          }`}
        >
          {message}
        </p>
      )}

      <p className="text-xs text-gray-400 text-center mt-1">
        Use these buttons when there's no kiosk nearby.
      </p>
    </div>
  );
}
