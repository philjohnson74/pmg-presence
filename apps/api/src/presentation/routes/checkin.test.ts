import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { buildTestContainer } from '../../container.js';
import { createServer } from '../server.js';
import { ADMIN, MARSHAL, EMPLOYEE, NO_EMAIL_EMPLOYEE, TEST_PATIENT, getToken } from './test-fixtures.js';

// ─── POST /api/checkin ─────────────────────────────────────────────────────────

describe('POST /api/checkin', () => {
  let container: ReturnType<typeof buildTestContainer>;
  let app: ReturnType<typeof createServer>;

  beforeEach(() => {
    container = buildTestContainer({ patients: [TEST_PATIENT] });
    container.employees.seed(ADMIN);
    container.employees.seed(MARSHAL);
    container.employees.seed(EMPLOYEE);
    container.employees.seed(NO_EMAIL_EMPLOYEE);
    container.locations.seed({ id: 'loc-reception', name: 'Main Reception', type: 'reception' });
    app = createServer(container);
  });

  it('checks in an employee by email (201)', async () => {
    const res = await request(app).post('/api/checkin').send({
      method: 'email',
      email: 'gary@test.com',
      locationId: 'loc-reception',
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      personType: 'employee',
      displayName: 'Gary Cooper',
      direction: 'in',
      alreadyOnsite: false,
    });
    expect(res.body.eventId).toBeTruthy();
  });

  it('returns alreadyOnsite:true when already checked in', async () => {
    // Seed an 'in' event 10s ago (outside the 5s debounce window) so the person is already on site
    await container.checkInEvents.append({
      personId: 'emp-regular',
      personType: 'employee',
      direction: 'in',
      method: 'email',
      locationId: 'loc-reception',
      displayName: 'Gary Cooper',
      timestamp: new Date(Date.now() - 10_000).toISOString(),
    });

    const res = await request(app).post('/api/checkin').send({
      method: 'email',
      email: 'gary@test.com',
      locationId: 'loc-reception',
    });

    expect(res.status).toBe(201);
    expect(res.body.alreadyOnsite).toBe(true);
  });

  it('returns 200 + debounced:true for duplicate within 5s', async () => {
    // First check-in
    const first = await request(app).post('/api/checkin').send({
      method: 'email',
      email: 'gary@test.com',
      locationId: 'loc-reception',
    });
    expect(first.status).toBe(201);

    // Immediate second check-in — within debounce window
    const second = await request(app).post('/api/checkin').send({
      method: 'email',
      email: 'gary@test.com',
      locationId: 'loc-reception',
    });
    expect(second.status).toBe(200);
    expect(second.body.debounced).toBe(true);
    expect(second.body.eventId).toBe(first.body.eventId);
  });

  it('checks in a visitor (single-day) via visitor-form (201, no pass)', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await request(app).post('/api/checkin').send({
      method: 'visitor-form',
      locationId: 'loc-reception',
      visitor: {
        name: 'Dana Okoro',
        email: null,
        company: 'Acme HVAC',
        host: 'Gary Cooper',
        visitReason: 'Installing compressor',
        visitCategory: 'contractor',
      },
      booking: { startDate: today, endDate: today },
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      personType: 'visitor',
      displayName: 'Dana Okoro',
      direction: 'in',
    });
    expect(res.body.pass).toBeUndefined();
  });

  it('checks in a multi-day visitor and returns a pass (201)', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const endDate = '2099-12-31';
    const res = await request(app).post('/api/checkin').send({
      method: 'visitor-form',
      locationId: 'loc-reception',
      visitor: {
        name: 'Dana Okoro',
        company: 'Acme HVAC',
        host: 'Gary Cooper',
        visitReason: 'Long-term install',
        visitCategory: 'contractor',
      },
      booking: { startDate: today, endDate },
    });

    expect(res.status).toBe(201);
    expect(res.body.pass).toMatchObject({
      passToken: expect.any(String),
      passCode: expect.any(String),
      validUntil: endDate,
    });
    expect(res.body.pass.passCode).toHaveLength(6);
  });

  it('checks in a no-email employee by employeeNumber via manual (201, audit-flagged)', async () => {
    const res = await request(app).post('/api/checkin').send({
      method: 'manual',
      personType: 'employee',
      locationId: 'loc-reception',
      manual: { employeeNumber: 'PMG-1187' },
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      personType: 'employee',
      displayName: 'Sam Workshop',
      direction: 'in',
    });
  });

  it('checks in a no-email employee by name via manual (201)', async () => {
    const res = await request(app).post('/api/checkin').send({
      method: 'manual',
      personType: 'employee',
      locationId: 'loc-reception',
      manual: { name: 'Sam Workshop' },
    });

    expect(res.status).toBe(201);
    expect(res.body.displayName).toBe('Sam Workshop');
  });

  it('returns 404 for unknown employee name via manual', async () => {
    const res = await request(app).post('/api/checkin').send({
      method: 'manual',
      personType: 'employee',
      locationId: 'loc-reception',
      manual: { name: 'Nobody Here' },
    });

    expect(res.status).toBe(404);
  });

  it('checks in a patient via patient-lookup (201)', async () => {
    const res = await request(app).post('/api/checkin').send({
      method: 'patient-lookup',
      personType: 'patient',
      patientId: 'pat-001',
      locationId: 'loc-reception',
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      personType: 'patient',
      displayName: 'Joan Webb',
      direction: 'in',
    });
  });

  it('returns 404 for unknown patientId in patient-lookup', async () => {
    const res = await request(app).post('/api/checkin').send({
      method: 'patient-lookup',
      patientId: 'pat-unknown',
      locationId: 'loc-reception',
    });

    expect(res.status).toBe(404);
  });

  it('checks in a patient manually (method:manual personType:patient) — audit-flagged (201)', async () => {
    const res = await request(app).post('/api/checkin').send({
      method: 'manual',
      personType: 'patient',
      locationId: 'loc-reception',
      manual: { name: 'Joan Webb', note: 'No DOB match — reception to verify' },
    });

    expect(res.status).toBe(201);
    expect(res.body.personType).toBe('patient');
    expect(res.body.displayName).toBe('Joan Webb');
  });

  it('checks in via QR token (method:qr employee) (201)', async () => {
    const qrToken = container.jwtService.signRaw(
      { sub: 'emp-regular', typ: 'qr', en: 'PMG-1001', jti: 'test-jti-1' },
      new Date(Date.now() + 60_000),
    );

    const res = await request(app).post('/api/checkin').send({
      method: 'qr',
      qrToken,
      locationId: 'loc-reception',
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      personType: 'employee',
      displayName: 'Gary Cooper',
      direction: 'in',
    });
  });

  it('returns 400 for an expired QR token', async () => {
    const expiredToken = container.jwtService.signRaw(
      { sub: 'emp-regular', typ: 'qr', jti: 'expired-jti' },
      new Date(Date.now() - 1_000), // already expired
    );

    const res = await request(app).post('/api/checkin').send({
      method: 'qr',
      qrToken: expiredToken,
      locationId: 'loc-reception',
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 when locationId is missing', async () => {
    const res = await request(app).post('/api/checkin').send({
      method: 'email',
      email: 'gary@test.com',
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 when visitor-form is missing visitor payload', async () => {
    const res = await request(app).post('/api/checkin').send({
      method: 'visitor-form',
      locationId: 'loc-reception',
    });

    expect(res.status).toBe(400);
  });
});

// ─── POST /api/checkout ────────────────────────────────────────────────────────

describe('POST /api/checkout', () => {
  let container: ReturnType<typeof buildTestContainer>;
  let app: ReturnType<typeof createServer>;

  beforeEach(async () => {
    container = buildTestContainer();
    container.employees.seed(ADMIN);
    container.employees.seed(EMPLOYEE);
    container.locations.seed({ id: 'loc-reception', name: 'Main Reception', type: 'reception' });
    app = createServer(container);

    // Pre-check-in Gary so checkout has something to do
    await container.checkInEvents.append({
      personId: 'emp-regular',
      personType: 'employee',
      direction: 'in',
      method: 'email',
      locationId: 'loc-reception',
      displayName: 'Gary Cooper',
      timestamp: new Date(Date.now() - 10_000).toISOString(),
    });
  });

  it('checks out an employee by email (201)', async () => {
    const res = await request(app).post('/api/checkout').send({
      method: 'email',
      email: 'gary@test.com',
      locationId: 'loc-reception',
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      personType: 'employee',
      displayName: 'Gary Cooper',
      direction: 'out',
    });
  });

  it('checks out a visitor by direct personId (201)', async () => {
    // Seed a visitor and their check-in event
    const visitor = await container.visitors.create({
      name: 'Dana Okoro',
      email: null,
      company: null,
      host: 'Gary Cooper',
      visitReason: 'Test visit',
      visitCategory: 'contractor',
    });
    await container.checkInEvents.append({
      personId: visitor.id,
      personType: 'visitor',
      direction: 'in',
      method: 'visitor-form',
      locationId: 'loc-reception',
      displayName: 'Dana Okoro',
      timestamp: new Date(Date.now() - 10_000).toISOString(),
    });

    const res = await request(app).post('/api/checkout').send({
      personId: visitor.id,
      personType: 'visitor',
      locationId: 'loc-reception',
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      personType: 'visitor',
      displayName: 'Dana Okoro',
      direction: 'out',
    });
  });

  it('returns 200 + debounced:true for duplicate checkout within 5s', async () => {
    const first = await request(app).post('/api/checkout').send({
      method: 'email',
      email: 'gary@test.com',
      locationId: 'loc-reception',
    });
    expect(first.status).toBe(201);

    const second = await request(app).post('/api/checkout').send({
      method: 'email',
      email: 'gary@test.com',
      locationId: 'loc-reception',
    });
    expect(second.status).toBe(200);
    expect(second.body.debounced).toBe(true);
  });
});

// ─── GET /api/onsite ──────────────────────────────────────────────────────────

describe('GET /api/onsite', () => {
  let container: ReturnType<typeof buildTestContainer>;
  let app: ReturnType<typeof createServer>;
  let adminToken: string;
  let employeeToken: string;

  beforeEach(async () => {
    container = buildTestContainer();
    container.employees.seed(ADMIN);
    container.employees.seed(MARSHAL);
    container.employees.seed(EMPLOYEE);
    container.locations.seed({ id: 'loc-reception', name: 'Main Reception', type: 'reception' });
    app = createServer(container);

    adminToken = await getToken(app, 'emp-admin');
    employeeToken = await getToken(app, 'emp-regular');

    // Seed one on-site event
    await container.checkInEvents.append({
      personId: 'emp-regular',
      personType: 'employee',
      direction: 'in',
      method: 'email',
      locationId: 'loc-reception',
      displayName: 'Gary Cooper',
    });
  });

  it('returns 200 + snapshot for admin', async () => {
    const res = await request(app)
      .get('/api/onsite')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      counts: { employee: 1, patient: 0, visitor: 0 },
      occupants: expect.arrayContaining([
        expect.objectContaining({ personId: 'emp-regular', displayName: 'Gary Cooper' }),
      ]),
    });
  });

  it('returns 200 + snapshot for marshal', async () => {
    const marshalToken = await getToken(app, 'emp-marshal');
    const res = await request(app)
      .get('/api/onsite')
      .set('Authorization', `Bearer ${marshalToken}`);

    expect(res.status).toBe(200);
  });

  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/onsite');
    expect(res.status).toBe(401);
  });

  it('returns 403 for employee role', async () => {
    const res = await request(app)
      .get('/api/onsite')
      .set('Authorization', `Bearer ${employeeToken}`);
    expect(res.status).toBe(403);
  });

  it('filters by ?type=employee', async () => {
    const res = await request(app)
      .get('/api/onsite?type=employee')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.counts.employee).toBe(1);
    expect(res.body.counts.visitor).toBe(0);
    expect(res.body.occupants.every((o: { personType: string }) => o.personType === 'employee')).toBe(true);
  });
});

// ─── GET /api/visits/history ──────────────────────────────────────────────────

describe('GET /api/visits/history', () => {
  let container: ReturnType<typeof buildTestContainer>;
  let app: ReturnType<typeof createServer>;
  let adminToken: string;
  let employeeToken: string;

  beforeEach(async () => {
    container = buildTestContainer();
    container.employees.seed(ADMIN);
    container.employees.seed(EMPLOYEE);
    container.locations.seed({ id: 'loc-reception', name: 'Main Reception', type: 'reception' });
    app = createServer(container);

    adminToken = await getToken(app, 'emp-admin');
    employeeToken = await getToken(app, 'emp-regular');

    await container.checkInEvents.append({
      personId: 'emp-regular',
      personType: 'employee',
      direction: 'in',
      method: 'email',
      locationId: 'loc-reception',
      displayName: 'Gary Cooper',
    });
  });

  it('returns 200 + records for admin', async () => {
    const res = await request(app)
      .get('/api/visits/history')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.records).toHaveLength(1);
    expect(res.body.total).toBe(1);
    expect(res.body.records[0]).toMatchObject({
      displayName: 'Gary Cooper',
      direction: 'in',
      method: 'email',
    });
  });

  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/visits/history');
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin (employee)', async () => {
    const res = await request(app)
      .get('/api/visits/history')
      .set('Authorization', `Bearer ${employeeToken}`);
    expect(res.status).toBe(403);
  });

  it('filters by ?q=Gary', async () => {
    const res = await request(app)
      .get('/api/visits/history?q=Gary')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.records).toHaveLength(1);
  });

  it('returns empty when ?q= matches nothing', async () => {
    const res = await request(app)
      .get('/api/visits/history?q=nobody')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.records).toHaveLength(0);
  });
});

// ─── GET /api/employees/me/visits ─────────────────────────────────────────────

describe('GET /api/employees/me/visits', () => {
  let container: ReturnType<typeof buildTestContainer>;
  let app: ReturnType<typeof createServer>;
  let employeeToken: string;

  beforeEach(async () => {
    container = buildTestContainer();
    container.employees.seed(ADMIN);
    container.employees.seed(EMPLOYEE);
    container.locations.seed({ id: 'loc-reception', name: 'Main Reception', type: 'reception' });
    app = createServer(container);

    employeeToken = await getToken(app, 'emp-regular');

    // Seed two events: one for Gary, one for another person
    await container.checkInEvents.append({
      personId: 'emp-regular',
      personType: 'employee',
      direction: 'in',
      method: 'email',
      locationId: 'loc-reception',
      displayName: 'Gary Cooper',
    });
    await container.checkInEvents.append({
      personId: 'emp-other',
      personType: 'employee',
      direction: 'in',
      method: 'email',
      locationId: 'loc-reception',
      displayName: 'Other Person',
    });
  });

  it('returns only the current user\'s events', async () => {
    const res = await request(app)
      .get('/api/employees/me/visits')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.records).toHaveLength(1);
    expect(res.body.records[0].displayName).toBe('Gary Cooper');
  });

  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/employees/me/visits');
    expect(res.status).toBe(401);
  });
});
