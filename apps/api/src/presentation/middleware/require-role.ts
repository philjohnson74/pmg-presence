import type { RequestHandler } from 'express';
import type { Role } from '@pmg/contracts';
import { ForbiddenError, UnauthorisedError } from '../../application/errors.js';

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new UnauthorisedError());
    }
    const hasRole = roles.some((r) => req.user!.roles.includes(r));
    if (!hasRole) {
      return next(new ForbiddenError(`Requires role: ${roles.join(' or ')}`));
    }
    next();
  };
}
