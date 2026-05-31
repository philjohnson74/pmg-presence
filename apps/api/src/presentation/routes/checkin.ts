import { Router } from 'express';
import { z } from 'zod';
import type { CheckInRequest } from '@pmg/contracts';
import { CheckInEventUseCase, type CheckInEventDeps } from '../../application/use-cases/check-in-event.js';
import { ValidationError } from '../../application/errors.js';

const visitCategoryEnum = z.enum([
  'commercial',
  'contractor',
  'maintenance',
  'supplier',
  'auditor',
  'nhs-commissioner',
  'other',
]);

const visitorInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().nullable().optional(),
  company: z.string().nullable().optional(),
  host: z.string().min(1),
  visitReason: z.string().min(1),
  visitCategory: visitCategoryEnum.nullable().optional(),
});

const bookingInputSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be YYYY-MM-DD'),
});

const manualInputSchema = z.object({
  name: z.string().optional(),
  employeeNumber: z.string().optional(),
  note: z.string().optional(),
});

const checkInBodySchema = z.object({
  method: z.enum(['qr', 'email', 'patient-lookup', 'visitor-form', 'manual']).optional(),
  locationId: z.string().min(1),
  qrToken: z.string().optional(),
  email: z.string().email().optional(),
  patientId: z.string().optional(),
  personId: z.string().optional(),
  personType: z.enum(['employee', 'patient', 'visitor']).optional(),
  visitor: visitorInputSchema.optional(),
  booking: bookingInputSchema.optional(),
  manual: manualInputSchema.optional(),
});

export function makeCheckInRouter(deps: CheckInEventDeps): Router {
  const router = Router();
  const useCase = new CheckInEventUseCase(deps);

  router.post('/checkin', (req, res, next) => {
    const parsed = checkInBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new ValidationError(JSON.stringify(parsed.error.flatten())));
    }
    const input = parsed.data as CheckInRequest;
    const requestedBy = (req as { user?: { sub: string } }).user?.sub ?? 'kiosk';

    useCase
      .execute(input, 'in', requestedBy)
      .then((result) => res.status(result.debounced ? 200 : 201).json(result))
      .catch((err: unknown) => next(err));
  });

  router.post('/checkout', (req, res, next) => {
    const parsed = checkInBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new ValidationError(JSON.stringify(parsed.error.flatten())));
    }
    const input = parsed.data as CheckInRequest;
    const requestedBy = (req as { user?: { sub: string } }).user?.sub ?? 'kiosk';

    useCase
      .execute(input, 'out', requestedBy)
      .then((result) => res.status(result.debounced ? 200 : 201).json(result))
      .catch((err: unknown) => next(err));
  });

  return router;
}
