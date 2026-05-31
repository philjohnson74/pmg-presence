import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import type { ReturningVisitorResponse } from '@pmg/contracts';
import type { VisitBookingRepository, VisitorRepository } from '../../domain/repositories.js';
import { ValidationError } from '../../application/errors.js';

const querySchema = z.object({
  surname: z.string().min(1).max(100),
  code: z.string().length(6),
});

export function makeReturningVisitorRouter(
  visitBookings: VisitBookingRepository,
  visitors: VisitorRepository,
): Router {
  const router = Router();

  // Fresh per-router-instance so test app instances don't share state
  const returningRateLimit = rateLimit({
    windowMs: 30_000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { type: 'about:blank', title: 'Too Many Requests', status: 429 },
  });

  router.get('/visits/returning', returningRateLimit, (req, res, next) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return next(new ValidationError(JSON.stringify(parsed.error.flatten())));
    }
    const { surname, code } = parsed.data;

    visitBookings
      .findActiveByCode(surname, code)
      .then(async (booking) => {
        if (!booking) return res.json({ match: false } satisfies ReturningVisitorResponse);

        // Verify we are within the booking window
        const today = new Date().toISOString().slice(0, 10);
        if (today < booking.startDate || today > booking.endDate) {
          return res.json({ match: false } satisfies ReturningVisitorResponse);
        }

        const visitor = await visitors.findById(booking.visitorId);
        if (!visitor) return res.json({ match: false } satisfies ReturningVisitorResponse);

        // Surname check — must appear somewhere in the full name (case-insensitive)
        const normSurname = surname.trim().toLowerCase();
        if (!visitor.name.toLowerCase().includes(normSurname)) {
          return res.json({ match: false } satisfies ReturningVisitorResponse);
        }

        return res.json({
          match: true,
          visitorId: visitor.id,
          displayName: visitor.name,
          host: booking.host,
          validUntil: booking.endDate,
        } satisfies ReturningVisitorResponse);
      })
      .catch((err: unknown) => next(err));
  });

  return router;
}
