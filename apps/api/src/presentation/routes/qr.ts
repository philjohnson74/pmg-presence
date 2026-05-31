import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { QrTokenResponse } from '@pmg/contracts';
import type { EmployeeRepository } from '../../domain/repositories.js';
import type { JwtServicePort } from '../../domain/ports.js';
import { NotFoundError, UnauthorisedError } from '../../application/errors.js';

const QR_LIFETIME_MS = 60_000; // 60 s — rotates on the device every ~30 s

export function makeQrRouter(
  employees: EmployeeRepository,
  jwtService: JwtServicePort,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.get('/employees/me/qr', requireAuth, (req, res, next) => {
    if (!req.user) return next(new UnauthorisedError());

    employees
      .findById(req.user.sub)
      .then((emp) => {
        if (!emp?.active) return next(new NotFoundError('Employee not found'));

        const jti = randomUUID();
        const expiresAt = new Date(Date.now() + QR_LIFETIME_MS);
        const qrToken = jwtService.signRaw(
          { sub: emp.id, typ: 'qr', en: emp.employeeNumber, jti },
          expiresAt,
        );

        const response: QrTokenResponse = { qrToken, expiresAt: expiresAt.toISOString() };
        res.json(response);
      })
      .catch((err: unknown) => next(err));
  });

  return router;
}
