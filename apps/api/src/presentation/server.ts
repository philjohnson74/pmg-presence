import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { errorHandler } from './middleware/error-handler.js';
import { healthRouter } from './routes/health.js';

const ALLOWED_ORIGINS = [
  'http://localhost:5173', // admin
  'http://localhost:5174', // kiosk
  'http://localhost:5175', // marshal
];

export function createServer(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
  app.use(express.json());

  app.use('/api', healthRouter);

  app.use(errorHandler);

  return app;
}
