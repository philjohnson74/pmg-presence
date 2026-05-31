import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from './error-handler.js';

function makeRes() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  } as unknown as Response;
  (res.status as ReturnType<typeof vi.fn>).mockReturnValue(res);
  return res;
}

function makeReq(path = '/api/test') {
  return { path } as Request;
}

const next = vi.fn() as unknown as NextFunction;

describe('errorHandler middleware', () => {
  it('returns 500 for a plain Error with no status', () => {
    const res = makeRes();
    errorHandler(new Error('boom'), makeReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'about:blank', status: 500, title: 'boom' }),
    );
  });

  it('uses the error status when present', () => {
    const res = makeRes();
    const err = Object.assign(new Error('Not Found'), { status: 404 });
    errorHandler(err, makeReq('/api/employees/x'), res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 404, instance: '/api/employees/x' }),
    );
  });

  it('falls back to "Internal Server Error" when message is missing', () => {
    const res = makeRes();
    errorHandler({}, makeReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Internal Server Error' }),
    );
  });

  it('sets instance to the request path', () => {
    const res = makeRes();
    errorHandler(new Error('err'), makeReq('/api/onsite'), res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ instance: '/api/onsite' }),
    );
  });

  it('returns RFC 7807 problem JSON shape', () => {
    const res = makeRes();
    errorHandler(new Error('oops'), makeReq(), res, next);

    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(body).toHaveProperty('type', 'about:blank');
    expect(body).toHaveProperty('title');
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('instance');
  });
});
