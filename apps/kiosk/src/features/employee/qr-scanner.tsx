import React, { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import { checkIn, ApiError } from '../../lib/api.js';
import type { CheckInResponse } from '@pmg/contracts';

interface Props {
  onSuccess: (result: CheckInResponse) => void;
}

const DEBOUNCE_MS = 3000;

export function QrScanner({ onSuccess }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastScan = useRef<string>('');
  const lastScanAt = useRef<number>(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reader = new BrowserQRCodeReader();
    let stopFn: (() => void) | null = null;

    async function start() {
      if (!videoRef.current) return;
      try {
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          async (result, _err) => {
            if (!result) return;
            // client-side debounce to prevent duplicate scans
            const now = Date.now();
            const token = result.getText();
            if (token === lastScan.current && now - lastScanAt.current < DEBOUNCE_MS) return;
            lastScan.current = token;
            lastScanAt.current = now;
            setScanning(true);
            setError(null);
            try {
              const res = await checkIn({ method: 'qr', qrToken: token, locationId: 'loc-reception' });
              onSuccess(res);
            } catch (e) {
              setError(e instanceof ApiError ? e.message : 'QR check-in failed. Please try another method.');
            } finally {
              setScanning(false);
            }
          },
        );
        stopFn = () => controls.stop();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setCameraError(`Camera unavailable: ${msg}`);
      }
    }

    void start();
    return () => stopFn?.();
  }, [onSuccess]);

  if (cameraError) {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 px-6 py-8 text-center">
        <p className="text-2xl mb-3">📷</p>
        <p className="text-amber-800 font-semibold">Camera not available</p>
        <p className="text-amber-700 text-sm mt-1">{cameraError}</p>
        <p className="text-gray-500 text-sm mt-4">Please use the Email or Find Me tab instead.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-600 text-center">
        Open the PMG app on your phone and hold your QR code up to the camera.
      </p>
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
        <video ref={videoRef} className="w-full h-full object-cover" />
        {/* Targeting reticle */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-48 h-48 border-4 border-pmg-orange rounded-2xl opacity-80" />
        </div>
        {scanning && (
          <div className="absolute inset-0 bg-pmg-navy/60 flex items-center justify-center">
            <p className="text-white text-lg font-semibold">Checking in…</p>
          </div>
        )}
      </div>
      {error && (
        <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm text-center">
          {error}
        </p>
      )}
    </div>
  );
}
