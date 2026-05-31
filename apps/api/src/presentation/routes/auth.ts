import { Router } from 'express';
import { z } from 'zod';
import type { AuthUser } from '@pmg/contracts';
import type { MockEntraProvider } from '../../infrastructure/auth/mock-entra-provider.js';
import type { RequestHandler } from 'express';
import { NotFoundError, UnauthorisedError, ValidationError } from '../../application/errors.js';

const loginBodySchema = z.object({ userId: z.string().min(1) }).strict();

export function makeAuthRouter(
  entraProvider: MockEntraProvider,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.post('/auth/login', (req, res, next) => {
    const parsed = loginBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new ValidationError(JSON.stringify(parsed.error.flatten())));
    }

    entraProvider
      .login(parsed.data.userId)
      .then((result) => res.status(200).json(result))
      .catch((err: unknown) => {
        if (err instanceof Error && (err as NodeJS.ErrnoException).code === 'NOT_FOUND') {
          return next(new NotFoundError('Employee not found'));
        }
        next(err);
      });
  });

  router.get('/auth/me', requireAuth, (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorisedError());
    }
    const user: AuthUser = {
      sub: req.user.sub,
      name: req.user.name,
      email: req.user.email,
      roles: req.user.roles,
    };
    res.status(200).json(user);
  });

  return router;
}
