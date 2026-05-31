import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { VisitorPassResponse } from '../../lib/api.js';

interface Props {
  pass: VisitorPassResponse;
  visitorName: string;
  onDone: () => void;
}

export function VisitorPassCard({ pass, visitorName, onDone }: Props) {
  const validUntil = new Date(pass.validUntil).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-pmg-navy flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center">
        {/* Header */}
        <div className="text-pmg-orange text-4xl mb-2">♥</div>
        <p className="text-pmg-navy/60 text-sm uppercase tracking-widest font-semibold mb-1">
          Visitor Return Pass
        </p>
        <h2 className="text-pmg-navy text-2xl font-semibold mb-1">{visitorName}</h2>
        <p className="text-gray-500 text-sm mb-6">Valid until {validUntil}</p>

        {/* QR code */}
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
            <QRCodeSVG value={pass.passToken} size={180} />
          </div>
        </div>

        {/* Short code */}
        <p className="text-gray-500 text-sm mb-1">Or use this code at reception:</p>
        <div className="bg-pmg-navy text-white rounded-xl py-3 px-6 text-3xl font-bold tracking-[0.3em] mb-6">
          {pass.passCode}
        </div>

        <p className="text-gray-400 text-xs mb-6">
          Scan this QR or give the code to sign in on future visits — no need to re-register.
        </p>

        <button
          onClick={onDone}
          className="w-full bg-pmg-orange text-white rounded-xl py-4 text-lg font-semibold hover:bg-pmg-orange/90 transition-colors active:scale-95"
        >
          Done
        </button>
      </div>
    </div>
  );
}
