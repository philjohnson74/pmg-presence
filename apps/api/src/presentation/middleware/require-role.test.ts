import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireRole } from './require-role.js';
import { ForbiddenError, UnauthorisedError } from '../../application/errors.js';

function makeReq(user?: Request['user']): Request {
  return { user } as unknown as Request;
}

function makeRes(): Response {
  return {} as Response;
}

describe('requireRole middleware', () => {
  it('calls next() when the user has a matching role', () => {
    const next = vi.fn() as unknown as NextFunction;
    const req = makeReq({ sub: 'emp-001', name: 'David', email: null, roles: ['admin'] });

    requireRole('admin')(req, makeRes(), next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next() when user has one of several allowed roles', () => {
    const next = vi.fn() as unknown as NextFunction;
    const req = makeReq({ sub: 'emp-003', name: 'Priya', email: null, roles: ['marshal'] });

    requireRole('admin', 'marshal')(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it('calls next(ForbiddenError) when the user lacks the required role', () => {
    const next = vi.fn() as unknown as NextFunction;
    const req = makeReq({ sub: 'emp-006', name: 'Sam', email: null, roles: ['employee'] });

    requireRole('admin')(req, makeRes(), next);

    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(err).toBeInstanceOf(ForbiddenError);
    expect(err.statusCode).toBe(403);
  });

  it('calls next(UnauthorisedError) when req.user is absent', () => {
    const next = vi.fn() as unknown as NextFunction;
    const req = makeReq(undefined);

    requireRole('admin')(req, makeRes(), next);

    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(err).toBeInstanceOf(UnauthorisedError);
    expect(err.statusCode).toBe(401);
  });
});
