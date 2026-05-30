import type { ErrorRequestHandler } from 'express';
import type { ApiError } from '@pmg/contracts';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const status: number = typeof err.status === 'number' ? err.status : 500;
  const body: ApiError = {
    type: 'about:blank',
    title: err.message ?? 'Internal Server Error',
    status,
    instance: req.path,
  };
  res.status(status).json(body);
};
