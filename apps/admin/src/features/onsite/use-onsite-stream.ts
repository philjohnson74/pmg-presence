import { useEffect, useRef, useState } from 'react';
import type { OccupancyCounts, SseEvent } from '@pmg/contracts';

export interface StreamState {
  counts: OccupancyCounts | null;
  lastEvent: string | null;
  connected: boolean;
}

export function useOnsiteStream(token: string | null): StreamState {
  const [counts, setCounts] = useState<OccupancyCounts | null>(null);
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!token) return;

    const url = `/api/onsite/stream?access_token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener('open', () => setConnected(true));
    es.addEventListener('error', () => setConnected(false));

    es.addEventListener('onsite.changed', (e: MessageEvent) => {
      const data = JSON.parse(e.data) as Extract<SseEvent, { event: 'onsite.changed' }>['data'];
      setCounts(data.counts);
      setLastEvent(`${data.direction === 'in' ? '↑' : '↓'} ${data.displayName}`);
    });

    es.addEventListener('heartbeat', () => setConnected(true));

    return () => {
      es.close();
      esRef.current = null;
      setConnected(false);
    };
  }, [token]);

  return { counts, lastEvent, connected };
}
