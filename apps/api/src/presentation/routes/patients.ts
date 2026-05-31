import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import type { PatientLookupResponse } from '@pmg/contracts';
import type { ClinicalSystemPort } from '../../domain/ports.js';
import { ValidationError } from '../../application/errors.js';
import { patientLookupCounter } from '../../infrastructure/telemetry/metrics.js';

const querySchema = z.object({
  name: z.string().min(1).max(200),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'dob must be YYYY-MM-DD')
    .refine(
      (d) => d <= new Date().toISOString().slice(0, 10),
      'dob must not be in the future',
    ),
});

export function makePatientsRouter(clinicalSystem: ClinicalSystemPort): Router {
  const router = Router();

  // Fresh per-router-instance so test app instances don't share state
  const lookupRateLimit = rateLimit({
    windowMs: 30_000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { type: 'about:blank', title: 'Too Many Requests', status: 429 },
  });

  router.get('/patients/lookup', lookupRateLimit, (req, res, next) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return next(new ValidationError(JSON.stringify(parsed.error.flatten())));
    }
    const { name, dob } = parsed.data;

    clinicalSystem
      .lookup(name, dob)
      .then((match) => {
        if (!match) {
          patientLookupCounter.inc({ outcome: 'miss' });
          return res.json({ match: false } satisfies PatientLookupResponse);
        }
        patientLookupCounter.inc({ outcome: 'match' });
        return res.json({
          match: true,
          patientId: match.patientId,
          displayName: match.displayName,
          patientReference: match.patientReference,
        } satisfies PatientLookupResponse);
      })
      .catch((err: unknown) => next(err));
  });

  return router;
}
