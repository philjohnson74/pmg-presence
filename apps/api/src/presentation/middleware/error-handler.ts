import type { ErrorRequestHandler } from 'express';
import type { ApiError } from '@pmg/contracts';
import { AppError } from '../../application/errors.js';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    const body: ApiError = {
      type: 'about:blank',
      title: err.message,
      status: err.statusCode,
      ...(err.detail === undefined ? {} : { detail: err.detail }),
      instance: req.path,
    };
    res.status(err.statusCode).json(body);
    return;
  }

  const body: ApiError = {
    type: 'about:blank',
    title: 'Internal Server Error',
    status: 500,
    instance: req.path,
  };
  res.status(500).json(body);
};
