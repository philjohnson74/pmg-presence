import { useCallback, useEffect, useRef, useState } from 'react';
import type { QrTokenResponse } from '@pmg/contracts';
import { fetchQrToken } from '../../lib/api.js';

interface QrTokenState {
  qrToken: string | null;
  expiresAt: Date | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useQrToken(authToken: string | null): QrTokenState {
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    setError(null);
    try {
      const data: QrTokenResponse = await fetchQrToken(authToken);
      setQrToken(data.qrToken);
      setExpiresAt(new Date(data.expiresAt));
    } catch {
      setError('Could not load QR — is the API running?');
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    void load();
    // Token expires in 60s; refresh every 30s so there's always a fresh one ready
    timerRef.current = setInterval(() => { void load(); }, 30_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [load]);

  return { qrToken, expiresAt, loading, error, refresh: () => { void load(); } };
}
