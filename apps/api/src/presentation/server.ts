import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import type { Container } from '../container.js';
import { makeRequireAuth } from './middleware/require-auth.js';
import { makeAuthRouter } from './routes/auth.js';
import { errorHandler } from './middleware/error-handler.js';
import { healthRouter } from './routes/health.js';

const ALLOWED_ORIGINS = [
  'http://localhost:5173', // admin
  'http://localhost:5174', // kiosk
  'http://localhost:5175', // marshal
];

const loginRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

export function createServer(container: Container): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
  app.use(express.json());

  const requireAuth = makeRequireAuth(container.jwtService);

  app.use('/api', healthRouter);
  app.use('/api', loginRateLimit, makeAuthRouter(container.entraProvider, requireAuth));

  app.use(errorHandler);

  return app;
}
