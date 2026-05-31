import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { JwtService } from '../../infrastructure/auth/jwt-service.js';
import { makeRequireAuth } from './require-auth.js';
import { UnauthorisedError } from '../../application/errors.js';

const SECRET = 'test-secret-at-least-16-chars';
const ISSUER = 'pmg-mock-idp';
const AUDIENCE = 'pmg-presence-api';

function buildClaims(overrides?: object) {
  return {
    sub: 'emp-001',
    name: 'David Stevens',
    preferred_username: 'david@peacocksgroup.com',
    roles: ['admin'] as const,
    oid: 'emp-001',
    iss: ISSUER,
    aud: AUDIENCE,
    ...overrides,
  };
}

function makeReq(authHeader?: string): Request {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
  } as unknown as Request;
}

function makeRes(): Response {
  return {} as Response;
}

describe('requireAuth middleware', () => {
  let jwtService: JwtService;
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jwtService = new JwtService(SECRET, 8 * 60 * 60);
    next = vi.fn();
  });

  it('calls next() and attaches req.user for a valid token', () => {
    const token = jwtService.sign(buildClaims());
    const req = makeReq(`Bearer ${token}`);
    const middleware = makeRequireAuth(jwtService);

    middleware(req, makeRes(), next as unknown as NextFunction);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({
      sub: 'emp-001',
      name: 'David Stevens',
      email: 'david@peacocksgroup.com',
      roles: ['admin'],
    });
  });

  it('calls next(UnauthorisedError) when Authorization header is absent', () => {
    const req = makeReq();
    makeRequireAuth(jwtService)(req, makeRes(), next as unknown as NextFunction);

    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0]![0]).toBeInstanceOf(UnauthorisedError);
  });

  it('calls next(UnauthorisedError) when header does not start with Bearer', () => {
    const req = makeReq('Basic sometoken');
    makeRequireAuth(jwtService)(req, makeRes(), next as unknown as NextFunction);

    expect(next.mock.calls[0]![0]).toBeInstanceOf(UnauthorisedError);
  });

  it('calls next(UnauthorisedError) for a token signed with the wrong secret', () => {
    const wrongService = new JwtService('completely-different-secret!', 8 * 60 * 60);
    const token = wrongService.sign(buildClaims());
    const req = makeReq(`Bearer ${token}`);

    makeRequireAuth(jwtService)(req, makeRes(), next as unknown as NextFunction);

    expect(next.mock.calls[0]![0]).toBeInstanceOf(UnauthorisedError);
  });

  it('calls next(UnauthorisedError) for an expired token', () => {
    const expiredService = new JwtService(SECRET, -1);
    const token = expiredService.sign(buildClaims());
    const req = makeReq(`Bearer ${token}`);

    makeRequireAuth(jwtService)(req, makeRes(), next as unknown as NextFunction);

    expect(next.mock.calls[0]![0]).toBeInstanceOf(UnauthorisedError);
  });

  it('calls next(UnauthorisedError) for a malformed token string', () => {
    const req = makeReq('Bearer not.a.jwt');
    makeRequireAuth(jwtService)(req, makeRes(), next as unknown as NextFunction);

    expect(next.mock.calls[0]![0]).toBeInstanceOf(UnauthorisedError);
  });
});
