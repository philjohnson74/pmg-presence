import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import type { Container } from '../container.js';
import { makeRequireAuth } from './middleware/require-auth.js';
import { requireRole } from './middleware/require-role.js';
import { makeAuthRouter } from './routes/auth.js';
import { makeCheckInRouter } from './routes/checkin.js';
import { makeOnsiteRouter } from './routes/onsite.js';
import { makeVisitsRouter } from './routes/visits.js';
import { errorHandler } from './middleware/error-handler.js';
import { healthRouter } from './routes/health.js';

const ALLOWED_ORIGINS = [
  'http://localhost:5173', // admin
  'http://localhost:5174', // kiosk
  'http://localhost:5175', // marshal
];

export function createServer(container: Container): Express {
  const app = express();

  // Fresh rate limiter per server instance so tests don't share state
  const loginRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(helmet());
  app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
  app.use(express.json());

  const requireAuth = makeRequireAuth(container.jwtService);
  const requireAdminOrMarshal = requireRole('admin', 'marshal');
  const requireAdmin = requireRole('admin');

  app.use('/api', healthRouter);
  app.use('/api', makeAuthRouter(container.entraProvider, requireAuth, loginRateLimit));

  // Public check-in/out endpoints (kiosk & employee app)
  app.use('/api', makeCheckInRouter({
    checkInEvents: container.checkInEvents,
    employees: container.employees,
    visitors: container.visitors,
    visitBookings: container.visitBookings,
    clinicalSystem: container.clinicalSystem,
    auditLog: container.auditLog,
    jwtService: container.jwtService,
  }));

  // Protected onsite + visit history endpoints
  app.use('/api', makeOnsiteRouter(container.onsiteProjection, requireAuth, requireAdminOrMarshal));
  app.use('/api', makeVisitsRouter(container.checkInEvents, requireAuth, requireAdmin));

  app.use(errorHandler);

  return app;
}
