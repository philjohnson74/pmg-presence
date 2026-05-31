import { Router } from 'express';
import { z } from 'zod';
import type { RequestHandler } from 'express';
import type { CheckInEventRepository } from '../../domain/repositories.js';
import type { VisitHistoryResponse } from '@pmg/contracts';
import { ValidationError, UnauthorisedError } from '../../application/errors.js';

const historyQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  q: z.string().optional(),
  type: z.enum(['employee', 'patient', 'visitor']).optional(),
});

export function makeVisitsRouter(
  checkInEvents: CheckInEventRepository,
  requireAuth: RequestHandler,
  requireAdmin: RequestHandler,
): Router {
  const router = Router();

  // GET /api/visits/history — admin only; paginated event search
  router.get('/visits/history', requireAuth, requireAdmin, (req, res, next) => {
    const parsed = historyQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return next(new ValidationError(JSON.stringify(parsed.error.flatten())));
    }
    const { from, to, q, type } = parsed.data;

    checkInEvents
      .history({
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        ...(q ? { name: q } : {}),
        ...(type ? { personType: type } : {}),
      })
      .then((events) => {
        const response: VisitHistoryResponse = {
          records: events.map((e) => ({
            eventId: e.id,
            personId: e.personId,
            personType: e.personType,
            displayName: e.displayName,
            direction: e.direction,
            method: e.method,
            locationId: e.locationId,
            timestamp: e.timestamp,
          })),
          total: events.length,
        };
        res.json(response);
      })
      .catch((err: unknown) => next(err));
  });

  // GET /api/employees/me/visits — own visit history (any authed user)
  router.get('/employees/me/visits', requireAuth, (req, res, next) => {
    const user = (req as { user?: { sub: string } }).user;
    if (!user) return next(new UnauthorisedError());

    const parsed = historyQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return next(new ValidationError(JSON.stringify(parsed.error.flatten())));
    }
    const { from, to } = parsed.data;

    checkInEvents
      .history({
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        personId: user.sub,
      })
      .then((events) => {
        const response: VisitHistoryResponse = {
          records: events.map((e) => ({
            eventId: e.id,
            personId: e.personId,
            personType: e.personType,
            displayName: e.displayName,
            direction: e.direction,
            method: e.method,
            locationId: e.locationId,
            timestamp: e.timestamp,
          })),
          total: events.length,
        };
        res.json(response);
      })
      .catch((err: unknown) => next(err));
  });

  return router;
}
