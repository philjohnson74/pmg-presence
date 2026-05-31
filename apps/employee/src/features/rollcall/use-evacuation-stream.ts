import { useCallback, useEffect, useRef, useState } from 'react';
import type { RollCallEntry, RollCallState, SseEvent } from '@pmg/contracts';
import { ApiError, fetchRollCall, patchAccountedFor } from '../../lib/api.js';
import {
  addToOutbox,
  clearCachedRollCall,
  getCachedRollCall,
  getOutbox,
  putCachedRollCall,
  removeFromOutbox,
  updateCachedRollCallTimestamp,
} from '../../offline/db.js';

interface RollCallSnapshot {
  fireEventId: string;
  triggeredAt: string;
  entries: RollCallEntry[];
}

export interface EvacuationStreamState {
  rollCall: RollCallSnapshot | null;
  lastSynced: Date | null;
  connected: boolean;
  markAccounted: (personId: string, accountedFor: boolean) => Promise<void>;
}

export function useEvacuationStream(
  token: string | null,
  enabled: boolean,
): EvacuationStreamState {
  const [rollCall, setRollCall] = useState<RollCallSnapshot | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  // Seed from IndexedDB cache on mount so the roll-call renders immediately offline
  useEffect(() => {
    if (!enabled) return;
    void getCachedRollCall().then((cached) => {
      if (cached) {
        setRollCall({
          fireEventId: cached.data.fireEventId,
          triggeredAt: cached.data.triggeredAt,
          entries: cached.data.entries,
        });
        setLastSynced(new Date(cached.updatedAt));
      }
    });
  }, [enabled]);

  // Live fetch on mount to check whether a fire event is already active
  useEffect(() => {
    if (!token || !enabled) return;
    fetchRollCall(token)
      .then((data) => {
        setRollCall({
          fireEventId: data.fireEventId,
          triggeredAt: data.triggeredAt,
          entries: data.entries,
        });
        setLastSynced(new Date());
        void putCachedRollCall(data);
      })
      .catch((err: unknown) => {
        // 409 = no active fire event; clear stale cache
        if (err instanceof ApiError && err.status === 409) {
          setRollCall(null);
          void clearCachedRollCall();
        }
        // network error — keep the IDB-seeded state
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
      const at = new Date(data.at);
      setLastSynced(at);
      setConnected(true);
      void updateCachedRollCallTimestamp();
    });

    es.addEventListener('fire.triggered', (e: MessageEvent) => {
      const data = JSON.parse(e.data) as Extract<SseEvent, { event: 'fire.triggered' }>['data'];
      const snapshot: RollCallSnapshot = {
        fireEventId: data.fireEventId,
        triggeredAt: data.triggeredAt,
        entries: data.rollCall,
      };
      setRollCall(snapshot);
      setLastSynced(new Date());
      void putCachedRollCall({
        fireEventId: data.fireEventId,
        triggeredAt: data.triggeredAt,
        entries: data.rollCall,
      });
    });

    es.addEventListener('fire.resolved', () => {
      setRollCall(null);
      void clearCachedRollCall();
    });

    es.addEventListener('rollcall.updated', (e: MessageEvent) => {
      const data = JSON.parse(e.data) as Extract<
        SseEvent,
        { event: 'rollcall.updated' }
      >['data'];
      setRollCall((prev) => {
        if (!prev) return prev;
        const updated: RollCallSnapshot = {
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
        // Persist updated roll-call to IDB
        void putCachedRollCall({
          fireEventId: updated.fireEventId,
          triggeredAt: updated.triggeredAt,
          entries: updated.entries,
        });
        return updated;
      });
    });

    return () => {
      es.close();
      esRef.current = null;
      setConnected(false);
    };
  }, [token, enabled]);

  // Drain the outbox when SSE reconnects
  useEffect(() => {
    if (!connected || !token) return;
    void (async () => {
      const pending = await getOutbox();
      for (const item of pending) {
        try {
          await patchAccountedFor(token, item.personId, item.accountedFor);
          await removeFromOutbox(item.personId);
        } catch {
          // leave in outbox; will retry on next reconnect
        }
      }
    })();
  }, [connected, token]);

  // Also drain on the browser 'online' event (catches reconnects when SSE was never up)
  useEffect(() => {
    if (!token || !enabled) return;
    const handleOnline = () => {
      void (async () => {
        const pending = await getOutbox();
        for (const item of pending) {
          try {
            await patchAccountedFor(token, item.personId, item.accountedFor);
            await removeFromOutbox(item.personId);
          } catch {
            // leave in outbox
          }
        }
      })();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [token, enabled]);

  const markAccounted = useCallback(
    async (personId: string, accountedFor: boolean) => {
      if (!token) return;
      // Optimistic UI — tile goes green/red immediately
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

      if (!navigator.onLine) {
        await addToOutbox(personId, accountedFor);
        return;
      }

      try {
        await patchAccountedFor(token, personId, accountedFor);
      } catch {
        // Network failed — queue for replay on reconnect
        await addToOutbox(personId, accountedFor);
      }
    },
    [token],
  );

  return { rollCall, lastSynced, connected, markAccounted };
}
