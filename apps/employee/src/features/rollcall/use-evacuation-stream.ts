import { useCallback, useEffect, useRef, useState } from 'react';
import type { RollCallEntry, RollCallState, SseEvent } from '@pmg/contracts';
import { ApiError, fetchRollCall, patchAccountedFor } from '../../lib/api.js';

interface RollCallSnapshot {
  fireEventId: string;
  triggeredAt: string;
  entries: RollCallEntry[];
}

export interface EvacuationStreamState {
  rollCall: RollCallSnapshot | null;
  lastHeartbeat: Date | null;
  connected: boolean;
  markAccounted: (personId: string, accountedFor: boolean) => Promise<void>;
}

export function useEvacuationStream(
  token: string | null,
  enabled: boolean,
): EvacuationStreamState {
  const [rollCall, setRollCall] = useState<RollCallSnapshot | null>(null);
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  // On mount, check whether a fire event is already active
  useEffect(() => {
    if (!token || !enabled) return;
    fetchRollCall(token)
      .then((data) => {
        setRollCall({
          fireEventId: data.fireEventId,
          triggeredAt: data.triggeredAt,
          entries: data.entries,
        });
      })
      .catch((err: unknown) => {
        // 409 = no active fire event — expected, not an error
        if (err instanceof ApiError && err.status === 409) return;
      });
  }, [token, enabled]);

  // SSE subscription
  useEffect(() => {
    if (!token || !enabled) return;

    const url = `/api/onsite/stream?access_token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener('open', () => setConnected(true));
    es.addEventListener('error', () => setConnected(false));

    es.addEventListener('heartbeat', (e: MessageEvent) => {
      const data = JSON.parse(e.data) as Extract<SseEvent, { event: 'heartbeat' }>['data'];
      setLastHeartbeat(new Date(data.at));
      setConnected(true);
    });

    es.addEventListener('fire.triggered', (e: MessageEvent) => {
      const data = JSON.parse(e.data) as Extract<SseEvent, { event: 'fire.triggered' }>['data'];
      setRollCall({
        fireEventId: data.fireEventId,
        triggeredAt: data.triggeredAt,
        entries: data.rollCall,
      });
    });

    es.addEventListener('fire.resolved', () => {
      setRollCall(null);
    });

    es.addEventListener('rollcall.updated', (e: MessageEvent) => {
      const data = JSON.parse(e.data) as Extract<
        SseEvent,
        { event: 'rollcall.updated' }
      >['data'];
      setRollCall((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          entries: prev.entries.map((entry) =>
            entry.personId === data.personId
              ? {
                  ...entry,
                  state: data.state,
                  accountedFor: data.state === 'accounted',
                  accountedBy: data.accountedBy,
                  accountedAt: data.at,
                }
              : entry,
          ),
        };
      });
    });

    return () => {
      es.close();
      esRef.current = null;
      setConnected(false);
    };
  }, [token, enabled]);

  const markAccounted = useCallback(
    async (personId: string, accountedFor: boolean) => {
      if (!token) return;
      // Optimistic update while the PATCH is in flight
      setRollCall((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          entries: prev.entries.map((e) =>
            e.personId === personId
              ? {
                  ...e,
                  accountedFor,
                  state: (accountedFor ? 'accounted' : 'unaccounted') as RollCallState,
                }
              : e,
          ),
        };
      });
      // Server will confirm and broadcast rollcall.updated to all connected marshals
      await patchAccountedFor(token, personId, accountedFor);
    },
    [token],
  );

  return { rollCall, lastHeartbeat, connected, markAccounted };
}
