import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import type { RequestHandler } from 'express';
import type { FireEventRepository } from '../../domain/repositories.js';
import type { JwtServicePort, SseBrokerPort } from '../../domain/ports.js';
import type { TriggerFireEventUseCase } from '../../application/use-cases/trigger-fire-event.js';
import { ForbiddenError, NotFoundError } from '../../application/errors.js';

export interface FireRouterDeps {
  fireEvents: FireEventRepository;
  triggerFireEvent: TriggerFireEventUseCase;
  broker: SseBrokerPort;
  jwtService: JwtServicePort;
  requireAuth: RequestHandler;
  requireAdmin: RequestHandler;
  requireAdminOrMarshal: RequestHandler;
}

export function makeFireRouter(deps: FireRouterDeps): Router {
  const router = Router();

  // Rate limit for public kiosk trigger path — 20/min allows repeated E2E test runs
  // while still guarding against accidental rapid-fire from the kiosk UI.
  const triggerRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { type: 'about:blank', title: 'Too Many Requests', status: 429 },
  });

  // POST /api/fire/trigger — public (kiosk) or admin
  router.post('/fire/trigger', triggerRateLimit, (req, res, next) => {
    // Try to resolve the caller: admin JWT or kiosk (unauthenticated)
    let triggeredBy = 'kiosk';

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const claims = deps.jwtService.verify(token);
        if (!claims.roles.includes('admin')) {
          return next(new ForbiddenError('Authenticated triggers require the admin role'));
        }
        triggeredBy = claims.sub;
      } catch {
        // Invalid token on an authenticated request — reject
        return next(new ForbiddenError('Invalid token on fire/trigger'));
      }
    }

    deps.triggerFireEvent
      .execute(triggeredBy)
      .then((result) =>
        res.status(201).json({
          fireEventId: result.fireEvent.id,
          triggeredAt: result.fireEvent.triggeredAt,
          triggeredBy: result.fireEvent.triggeredBy,
          rollCall: result.entries,
        }),
      )
      .catch((err: unknown) => next(err));
  });

  // GET /api/fire/events — admin, marshal
  router.get('/fire/events', deps.requireAuth, deps.requireAdminOrMarshal, (req, res, next) => {
    deps.fireEvents
      .list()
      .then((events) => res.json({ events }))
      .catch((err: unknown) => next(err));
  });

  // POST /api/fire/:id/resolve — admin only
  router.post('/fire/:id/resolve', deps.requireAuth, deps.requireAdmin, (req, res, next) => {
    // Route param is always present when the segment matches — safe to assert string
    const id = req.params['id'] as string;

    deps.fireEvents
      .resolve(id)
      .then((fireEvent) => {
        deps.broker.broadcast({
          event: 'fire.resolved',
          data: {
            fireEventId: fireEvent.id,
            resolvedAt: fireEvent.resolvedAt!,
          },
        });
        return res.json(fireEvent);
      })
      .catch((err: unknown) => {
        // Wrap generic Error from repo into a NotFoundError
        if (err instanceof Error && err.message.includes('not found')) {
          return next(new NotFoundError(`FireEvent ${id} not found`));
        }
        return next(err);
      });
  });

  return router;
}
