import type { Direction, PersonType, RollCallState, VisitCategory } from './enums.js';
import type { OccupancyCounts, RollCallEntry } from './api.js';

// ─── SSE event schema ─────────────────────────────────────────────────────────
// One channel: GET /api/onsite/stream
// Browser EventSource cannot set headers — JWT passed as ?access_token= on connect.

export type SseEvent =
  | {
      event: 'onsite.changed';
      data: {
        personId: string;
        personType: PersonType;
        direction: Direction;
        displayName: string;
        visitCategory?: VisitCategory;
        counts: OccupancyCounts;
        at: string;
      };
    }
  | {
      event: 'fire.triggered';
      data: {
        fireEventId: string;
        triggeredAt: string;
        rollCall: RollCallEntry[];
      };
    }
  | {
      event: 'fire.resolved';
      data: {
        fireEventId: string;
        resolvedAt: string;
      };
    }
  | {
      event: 'rollcall.updated';
      data: {
        fireEventId: string;
        personId: string;
        state: RollCallState;
        accountedBy: string;
        at: string;
      };
    }
  | {
      // ~15s keep-alive + client-side freshness clock
      event: 'heartbeat';
      data: { at: string };
    };

export type SseEventName = SseEvent['event'];
