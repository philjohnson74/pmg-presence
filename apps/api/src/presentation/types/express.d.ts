import type { Role } from '@pmg/contracts';

declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: string;
        name: string;
        email: string | null;
        roles: Role[];
      };
    }
  }
}

export {};
