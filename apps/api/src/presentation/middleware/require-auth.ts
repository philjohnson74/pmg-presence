import type { RequestHandler } from 'express';
import type { JwtServicePort } from '../../domain/ports.js';
import { UnauthorisedError } from '../../application/errors.js';

export function makeRequireAuth(jwtService: JwtServicePort): RequestHandler {
  return (req, _res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      return next(new UnauthorisedError('Missing or malformed Authorization header'));
    }

    const token = authHeader.slice(7);
    try {
      const claims = jwtService.verify(token);
      req.user = {
        sub: claims.sub,
        name: claims.name,
        email: claims.preferred_username,
        roles: [...claims.roles],
      };
      next();
    } catch {
      next(new UnauthorisedError('Invalid or expired token'));
    }
  };
}
