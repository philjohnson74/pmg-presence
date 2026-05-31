import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from './error-handler.js';
import {
  AppError,
  NotFoundError,
  UnauthorisedError,
  ForbiddenError,
  ValidationError,
} from '../../application/errors.js';

function makeRes() {
  const json = vi.fn();
  const status = vi.fn();
  const res = { status, json } as unknown as Response;
  status.mockReturnValue(res);
  return res;
}

function makeReq(path = '/api/test') {
  return { path } as Request;
}

const next = vi.fn() as unknown as NextFunction;

describe('errorHandler middleware', () => {
  it('returns 500 for a plain Error (no AppError subclass)', () => {
    const res = makeRes();
    errorHandler(new Error('boom'), makeReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'about:blank', status: 500, title: 'Internal Server Error' }),
    );
  });

  it('returns 500 for a non-Error object', () => {
    const res = makeRes();
    errorHandler({}, makeReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Internal Server Error' }),
    );
  });

  it('returns 404 for a NotFoundError', () => {
    const res = makeRes();
    errorHandler(new NotFoundError('Employee not found'), makeReq('/api/employees/x'), res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 404, title: 'Not Found', detail: 'Employee not found', instance: '/api/employees/x' }),
    );
  });

  it('returns 401 for an UnauthorisedError', () => {
    const res = makeRes();
    errorHandler(new UnauthorisedError(), makeReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });

  it('returns 403 for a ForbiddenError', () => {
    const res = makeRes();
    errorHandler(new ForbiddenError('Requires role: admin'), makeReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 403, detail: 'Requires role: admin' }),
    );
  });

  it('returns 400 for a ValidationError', () => {
    const res = makeRes();
    errorHandler(new ValidationError('userId is required'), makeReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
  });

  it('handles any AppError subclass with its statusCode', () => {
    const res = makeRes();
    const err = new AppError('Teapot', 418, 'IM_A_TEAPOT', 'Short and stout');
    errorHandler(err, makeReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(418);
  });

  it('sets instance to the request path', () => {
    const res = makeRes();
    errorHandler(new NotFoundError(), makeReq('/api/onsite'), res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ instance: '/api/onsite' }),
    );
  });

  it('returns RFC 7807 problem JSON shape', () => {
    const res = makeRes();
    errorHandler(new NotFoundError('oops'), makeReq(), res, next);

    const body = vi.mocked(res.json).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(body).toHaveProperty('type', 'about:blank');
    expect(body).toHaveProperty('title');
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('instance');
  });
});
