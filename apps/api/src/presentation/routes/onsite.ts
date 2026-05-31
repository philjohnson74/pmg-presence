import { Router } from 'express';
import { z } from 'zod';
import type { RequestHandler } from 'express';
import type { OnsiteProjectionService } from '../../application/services/onsite-projection-service.js';
import { ValidationError } from '../../application/errors.js';

const onsiteQuerySchema = z.object({
  type: z.enum(['employee', 'patient', 'visitor']).optional(),
});

export function makeOnsiteRouter(
  onsiteProjection: OnsiteProjectionService,
  requireAuth: RequestHandler,
  requireAdminOrMarshal: RequestHandler,
): Router {
  const router = Router();

  router.get('/onsite', requireAuth, requireAdminOrMarshal, (req, res, next) => {
    const parsed = onsiteQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return next(new ValidationError(JSON.stringify(parsed.error.flatten())));
    }
    const { type } = parsed.data;

    onsiteProjection
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

  return router;
}
