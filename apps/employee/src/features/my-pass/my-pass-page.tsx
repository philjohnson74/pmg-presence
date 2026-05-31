import React from 'react';
import { useSession } from '../auth/use-session.js';
import { useQrToken } from './use-qr-token.js';
import { RotatingQr } from './rotating-qr.js';
import { SelfCheckInButtons } from './self-check-in-buttons.js';

export function MyPassPage() {
  const { token, user } = useSession();
  const qr = useQrToken(token);

  return (
    <div className="space-y-8 max-w-sm mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-pmg-navy">My Pass</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Show this QR at a kiosk scanner to check in or out.
        </p>
      </div>

      {qr.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          {qr.error}
          <button onClick={qr.refresh} className="underline font-semibold ml-3">
            Retry
          </button>
        </div>
      )}

      {!qr.error && qr.loading && !qr.qrToken && (
        <div className="flex justify-center py-16">
          <p className="text-gray-400 text-sm">Loading QR code…</p>
        </div>
      )}

      {qr.qrToken && (
        <div className="flex flex-col items-center gap-8">
          <RotatingQr qrToken={qr.qrToken} expiresAt={qr.expiresAt} />
          {token && user?.email && (
            <SelfCheckInButtons authToken={token} email={user.email} />
          )}
        </div>
      )}
    </div>
  );
}
