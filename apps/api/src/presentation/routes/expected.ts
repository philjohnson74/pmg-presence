import { Router } from 'express';
import { z } from 'zod';
import type { RequestHandler } from 'express';
import type { ExpectedPresenceService } from '../../application/services/expected-presence-service.js';
import { ValidationError } from '../../application/errors.js';

const expectedQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
    .optional(),
});

export function makeExpectedRouter(
  expectedPresence: ExpectedPresenceService,
  requireAuth: RequestHandler,
  requireAdminOrMarshal: RequestHandler,
): Router {
  const router = Router();

  router.get('/expected', requireAuth, requireAdminOrMarshal, (req, res, next) => {
    const parsed = expectedQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return next(new ValidationError(JSON.stringify(parsed.error.flatten())));
    }

    const date = parsed.data.date ?? new Date().toISOString().slice(0, 10);

    expectedPresence
      .expectedOn(date)
      .then((expected) => res.json({ date, expected }))
      .catch((err: unknown) => next(err));
  });

  return router;
}
