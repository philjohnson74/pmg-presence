import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { buildTestContainer } from '../../container.js';
import { createServer } from '../server.js';
import type { QrTokenResponse } from '@pmg/contracts';
import { EMPLOYEE, ADMIN, getToken } from './test-fixtures.js';

// ─── GET /api/employees/me/qr ─────────────────────────────────────────────────

describe('GET /api/employees/me/qr', () => {
  let container: ReturnType<typeof buildTestContainer>;
  let app: ReturnType<typeof createServer>;

  beforeEach(() => {
    container = buildTestContainer();
    container.employees.seed(EMPLOYEE);
    container.employees.seed(ADMIN);
    container.locations.seed({ id: 'loc-reception', name: 'Main Reception', type: 'reception' });
    app = createServer(container);
  });

  it('returns a signed QR token for an authed employee (200)', async () => {
    const token = await getToken(app, EMPLOYEE.id);
    const res = await request(app)
      .get('/api/employees/me/qr')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const body = res.body as QrTokenResponse;
    expect(body.qrToken).toBeTruthy();
    expect(body.expiresAt).toBeTruthy();

    // Token should expire in ~60s from now
    const expiresAt = new Date(body.expiresAt).getTime();
    const delta = expiresAt - Date.now();
    expect(delta).toBeGreaterThan(55_000);
    expect(delta).toBeLessThan(65_000);
  });

  it('returns a QR token for an admin too (200)', async () => {
    const token = await getToken(app, 'emp-admin');
    const res = await request(app)
      .get('/api/employees/me/qr')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/employees/me/qr');
    expect(res.status).toBe(401);
  });

  it('issued QR token can be used to check in (method:qr)', async () => {
    const authToken = await getToken(app, EMPLOYEE.id);
    const qrRes = await request(app)
      .get('/api/employees/me/qr')
      .set('Authorization', `Bearer ${authToken}`);

    const { qrToken } = qrRes.body as QrTokenResponse;

    const checkInRes = await request(app).post('/api/checkin').send({
      method: 'qr',
      qrToken,
      locationId: 'loc-reception',
    });

    expect(checkInRes.status).toBe(201);
    expect(checkInRes.body).toMatchObject({
      personType: 'employee',
      displayName: 'Gary Cooper',
      direction: 'in',
    });
  });

  it('replayed QR token returns the same event debounced (200)', async () => {
    const authToken = await getToken(app, EMPLOYEE.id);
    const qrRes = await request(app)
      .get('/api/employees/me/qr')
      .set('Authorization', `Bearer ${authToken}`);

    const { qrToken } = qrRes.body as QrTokenResponse;

    // First scan
    const first = await request(app).post('/api/checkin').send({
      method: 'qr',
      qrToken,
      locationId: 'loc-reception',
    });
    expect(first.status).toBe(201);

    // Replay the same token — should be debounced, same eventId
    const second = await request(app).post('/api/checkin').send({
      method: 'qr',
      qrToken,
      locationId: 'loc-reception',
    });
    expect(second.status).toBe(200);
    expect(second.body.debounced).toBe(true);
    expect(second.body.eventId).toBe(first.body.eventId);
  });

  it('expired QR token is rejected (400)', async () => {
    const expiredToken = container.jwtService.signRaw(
      { sub: EMPLOYEE.id, typ: 'qr', en: EMPLOYEE.employeeNumber, jti: 'expired-jti' },
      new Date(Date.now() - 1_000),
    );

    const res = await request(app).post('/api/checkin').send({
      method: 'qr',
      qrToken: expiredToken,
      locationId: 'loc-reception',
    });

    expect(res.status).toBe(400);
  });

  it('tampered QR token is rejected (400)', async () => {
    const res = await request(app).post('/api/checkin').send({
      method: 'qr',
      qrToken: 'not.a.valid.jwt', // NOSONAR — intentionally invalid test token
      locationId: 'loc-reception',
    });

    expect(res.status).toBe(400);
  });
});

// ─── GET /api/visits/returning ────────────────────────────────────────────────

describe('GET /api/visits/returning', () => {
  let container: ReturnType<typeof buildTestContainer>;
  let app: ReturnType<typeof createServer>;

  const today = new Date().toISOString().slice(0, 10);
  const future = '2099-12-31';

  beforeEach(async () => {
    container = buildTestContainer();
    app = createServer(container);

    // Seed a multi-day visitor + booking with a passCode
    const visitor = await container.visitors.create({
      name: 'Dana Okoro',
      email: null,
      company: 'Acme HVAC',
      host: 'Gary Cooper',
      visitReason: 'Install compressor',
      visitCategory: 'contractor',
    });
    await container.visitBookings.create({
      visitorId: visitor.id,
      host: 'Gary Cooper',
      startDate: today,
      endDate: future,
      passToken: null,
      passCode: '4Q8KZP',
    });
  });

  it('returns match:true for correct surname + code (200)', async () => {
    const res = await request(app)
      .get('/api/visits/returning')
      .query({ surname: 'Okoro', code: '4Q8KZP' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      match: true,
      displayName: 'Dana Okoro',
      host: 'Gary Cooper',
      validUntil: future,
    });
    expect(res.body.visitorId).toBeTruthy();
  });

  it('returns match:false for wrong code (200)', async () => {
    const res = await request(app)
      .get('/api/visits/returning')
      .query({ surname: 'Okoro', code: 'XXXXXX' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ match: false });
  });

  it('returns match:false when surname does not match (200)', async () => {
    const res = await request(app)
      .get('/api/visits/returning')
      .query({ surname: 'Smith', code: '4Q8KZP' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ match: false });
  });

  it('returns match:false for a booking outside its date window (200)', async () => {
    // Seed a booking that ended yesterday
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10);
    const visitor2 = await container.visitors.create({
      name: 'Old Visitor',
      email: null,
      company: null,
      host: 'Someone',
      visitReason: 'Past visit',
      visitCategory: null,
    });
    await container.visitBookings.create({
      visitorId: visitor2.id,
      host: 'Someone',
      startDate: twoDaysAgo,
      endDate: yesterday,
      passToken: null,
      passCode: 'PASTCD',
    });

    const res = await request(app)
      .get('/api/visits/returning')
      .query({ surname: 'Visitor', code: 'PASTCD' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ match: false });
  });

  it('returns 400 when code is not 6 characters (200)', async () => {
    const res = await request(app)
      .get('/api/visits/returning')
      .query({ surname: 'Okoro', code: 'SHORT' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when surname is missing', async () => {
    const res = await request(app)
      .get('/api/visits/returning')
      .query({ code: '4Q8KZP' });

    expect(res.status).toBe(400);
  });
});
