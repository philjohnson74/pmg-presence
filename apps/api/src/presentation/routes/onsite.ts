import { Router } from 'express';
import { z } from 'zod';
import type { Request, Response, RequestHandler } from 'express';
import type { OnsiteProjectionService } from '../../application/services/onsite-projection-service.js';
import type { FireEventRepository, RollCallRepository } from '../../domain/repositories.js';
import type { JwtServicePort, SseBrokerPort } from '../../domain/ports.js';
import { ConflictError, ForbiddenError, UnauthorisedError, ValidationError } from '../../application/errors.js';

const onsiteQuerySchema = z.object({
  type: z.enum(['employee', 'patient', 'visitor']).optional(),
});

const markAccountedSchema = z.object({
  accountedFor: z.boolean(),
});

// Extends the base port with the SSE connection method (presentation-layer concern)
interface SseStreamBroker extends SseBrokerPort {
  connect(res: Response, userId: string, lastEventId?: number): string;
}

export interface OnsiteRouterDeps {
  onsiteProjection: OnsiteProjectionService;
  fireEvents: FireEventRepository;
  rollCall: RollCallRepository;
  broker: SseStreamBroker;
  jwtService: JwtServicePort;
  requireAuth: RequestHandler;
  requireAdminOrMarshal: RequestHandler;
}

export function makeOnsiteRouter(deps: OnsiteRouterDeps): Router {
  const router = Router();

  // Public — kiosk visitor checkout picker (data-minimised: id + name only)
  router.get('/onsite/visitors', (_req, res, next) => {
    deps.onsiteProjection
      .getSnapshot()
      .then((snapshot) => {
        const visitors = snapshot.occupants
          .filter((o) => o.personType === 'visitor')
          .map((o) => ({ personId: o.personId, displayName: o.displayName }));
        return res.json({ visitors });
      })
      .catch((err: unknown) => next(err));
  });

  router.get('/onsite', deps.requireAuth, deps.requireAdminOrMarshal, (req, res, next) => {
    const parsed = onsiteQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return next(new ValidationError(JSON.stringify(parsed.error.flatten())));
    }
    const { type } = parsed.data;

    deps.onsiteProjection
      .getSnapshot()
      .then((snapshot) => {
        if (!type) return res.json(snapshot);
        return res.json({
          ...snapshot,
          occupants: snapshot.occupants.filter((o) => o.personType === type),
          counts: {
            employee: type === 'employee' ? snapshot.counts.employee : 0,
            patient: type === 'patient' ? snapshot.counts.patient : 0,
            visitor: type === 'visitor' ? snapshot.counts.visitor : 0,
          },
        });
      })
      .catch((err: unknown) => next(err));
  });

  // SSE stream — auth via ?access_token= query param (EventSource cannot set headers)
  router.get('/onsite/stream', (req: Request, res: Response, next) => {
    const rawToken = req.query['access_token'];
    const token = typeof rawToken === 'string' ? rawToken : undefined;
    if (!token) {
      return next(new UnauthorisedError('access_token query parameter is required'));
    }

    let claims: ReturnType<typeof deps.jwtService.verify>;
    try {
      claims = deps.jwtService.verify(token);
    } catch {
      return next(new UnauthorisedError('Invalid or expired access token'));
    }

    if (!claims.roles.includes('admin') && !claims.roles.includes('marshal')) {
      return next(new ForbiddenError('Requires role: admin or marshal'));
    }

    const rawLastEventId = req.headers['last-event-id'];
    const lastEventIdStr = Array.isArray(rawLastEventId) ? rawLastEventId[0] : rawLastEventId;
    const lastEventId = lastEventIdStr ? parseInt(lastEventIdStr, 10) : undefined;

    deps.broker.connect(res, claims.sub, lastEventId);
  });

  // Roll-call — active fire event
  router.get('/onsite/rollcall', deps.requireAuth, deps.requireAdminOrMarshal, (req, res, next) => {
    deps.fireEvents
      .active()
      .then(async (fireEvent) => {
        if (!fireEvent) throw new ConflictError('No active fire event');
        const entries = await deps.rollCall.list(fireEvent.id);
        return res.json({
          fireEventId: fireEvent.id,
          triggeredAt: fireEvent.triggeredAt,
          entries,
        });
      })
      .catch((err: unknown) => next(err));
  });

  // Mark person accounted for
  router.patch('/onsite/rollcall/:personId', deps.requireAuth, deps.requireAdminOrMarshal, (req: Request, res: Response, next) => {
    const parsed = markAccountedSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new ValidationError(JSON.stringify(parsed.error.flatten())));
    }
    // req.params always has the route segment present — safe to assert string
    const personId = req.params['personId'] as string;
    const user = (req as { user?: { sub: string; name: string } }).user;
    const accountedBy = user?.sub ?? 'unknown';
    const accountedByName = user?.name ?? accountedBy;

    deps.fireEvents
      .active()
      .then(async (fireEvent) => {
        if (!fireEvent) throw new ConflictError('No active fire event');
        const entry = await deps.rollCall.markAccounted(fireEvent.id, personId, accountedByName);
        deps.broker.broadcast({
          event: 'rollcall.updated',
          data: {
            fireEventId: fireEvent.id,
            personId,
            state: entry.state,
            accountedBy: accountedByName,
            at: entry.accountedAt ?? new Date().toISOString(),
          },
        });
        return res.json(entry);
      })
      .catch((err: unknown) => next(err));
  });

  return router;
}
