import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createServer } from '../src/presentation/server.js';

describe('GET /api/health', () => {
  const app = createServer();

  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
    expect(typeof res.body.ts).toBe('string');
  });
});
