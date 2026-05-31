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
import { makeQrRouter } from './routes/qr.js';
import { makeReturningVisitorRouter } from './routes/returning-visitor.js';
import { makePatientsRouter } from './routes/patients.js';
import { makeFireRouter } from './routes/fire.js';
import { makeExpectedRouter } from './routes/expected.js';
import { makeEmployeesRouter } from './routes/employees.js';
import { makeDocsRouter } from './routes/docs.js';
import { errorHandler } from './middleware/error-handler.js';
import { healthRouter } from './routes/health.js';
import { registry, registerSseBroker } from '../infrastructure/telemetry/metrics.js';

const ALLOWED_ORIGINS = [
  'http://localhost:5173', // admin
  'http://localhost:5174', // kiosk
  'http://localhost:5175', // employee / marshal
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

  // Wire SSE broker into metrics so the gauge is populated at scrape time
  registerSseBroker(() => container.broker.connectionCount);

  app.use(helmet());
  app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
  app.use(express.json());

  // Prometheus metrics — plain text, no auth needed for a private scrape endpoint
  app.get('/metrics', (_req, res) => {
    void registry.metrics().then((metrics) => {
      res.set('Content-Type', registry.contentType);
      res.end(metrics);
    });
  });

  const requireAuth = makeRequireAuth(container.jwtService);
  const requireAdminOrMarshal = requireRole('admin', 'marshal');
  const requireAdmin = requireRole('admin');

  app.use('/api', healthRouter);
  app.use('/api', makeAuthRouter(container.entraProvider, requireAuth, loginRateLimit, container.employees));

  // Employee CRUD — admin only
  app.use('/api', makeEmployeesRouter(container.employees, requireAuth, requireAdmin));

  // Public check-in/out endpoints (kiosk & employee app)
  app.use('/api', makeCheckInRouter({
    checkInEvents: container.checkInEvents,
    employees: container.employees,
    visitors: container.visitors,
    visitBookings: container.visitBookings,
    clinicalSystem: container.clinicalSystem,
    auditLog: container.auditLog,
    jwtService: container.jwtService,
    jtiStore: container.jtiStore,
    broker: container.broker,
    onsiteProjection: container.onsiteProjection,
  }));

  // QR token issuance (any authed employee)
  app.use('/api', makeQrRouter(container.employees, container.jwtService, requireAuth));

  // Patient lookup — public, rate-limited
  app.use('/api', makePatientsRouter(container.clinicalSystem));

  // Returning visitor lookup — public, rate-limited
  app.use('/api', makeReturningVisitorRouter(container.visitBookings, container.visitors));

  // Protected onsite, SSE stream, roll-call
  app.use('/api', makeOnsiteRouter({
    onsiteProjection: container.onsiteProjection,
    fireEvents: container.fireEvents,
    rollCall: container.rollCall,
    broker: container.broker,
    jwtService: container.jwtService,
    requireAuth,
    requireAdminOrMarshal,
  }));

  // Visit history
  app.use('/api', makeVisitsRouter(container.checkInEvents, requireAuth, requireAdmin));

  // Expected presence (ops view + amber source)
  app.use('/api', makeExpectedRouter(container.expectedPresence, requireAuth, requireAdminOrMarshal));

  // Fire alarm routes
  app.use('/api', makeFireRouter({
    fireEvents: container.fireEvents,
    triggerFireEvent: container.triggerFireEvent,
    broker: container.broker,
    jwtService: container.jwtService,
    requireAuth,
    requireAdmin,
    requireAdminOrMarshal,
  }));

  // OpenAPI documentation
  app.use('/api/docs', makeDocsRouter());

  app.use(errorHandler);

  return app;
}
