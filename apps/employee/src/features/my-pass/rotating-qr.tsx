import React, { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';

interface Props {
  qrToken: string;
  expiresAt: Date | null;
}

export function RotatingQr({ qrToken, expiresAt }: Readonly<Props>) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      setSecondsLeft(Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const urgent = secondsLeft !== null && secondsLeft <= 10;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`p-5 bg-white rounded-2xl shadow-lg border-4 transition-colors duration-500 ${
          urgent ? 'border-amber-400' : 'border-pmg-cyan'
        }`}
      >
        <QRCode value={qrToken} size={220} bgColor="#ffffff" fgColor="#0b2551" />
      </div>

      {secondsLeft !== null && (
        <p className={`text-sm font-semibold ${urgent ? 'text-amber-600' : 'text-gray-500'}`}>
          {urgent ? `⚠ Refreshes in ${secondsLeft}s` : `Refreshes in ${secondsLeft}s`}
        </p>
      )}
    </div>
  );
}
