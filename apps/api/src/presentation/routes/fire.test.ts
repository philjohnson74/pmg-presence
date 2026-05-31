import { describe, it, expect } from 'vitest';
import request from 'supertest';
import * as http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Employee, Visitor, VisitBooking } from '../../domain/entities.js';
import { buildTestContainer } from '../../container.js';
import { createServer } from '../server.js';
import { ADMIN, EMPLOYEE, MARSHAL, getToken } from './test-fixtures.js';

const TODAY = new Date().toISOString().slice(0, 10);
const YESTERDAY = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
const TOMORROW = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

const AMBER_STAFF: Employee = {
  id: 'emp-amber-staff',
  name: 'Amber Staff Member',
  email: 'amber@test.com',
  role: 'employee',
  employeeNumber: 'PMG-3000',
  qrCodeToken: 'qr-amber',
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const ONSITE_EMPLOYEE: Employee = {
  id: 'emp-onsite',
  name: 'Onsite Worker',
  email: 'onsite@test.com',
  role: 'employee',
  employeeNumber: 'PMG-2000',
  qrCodeToken: 'qr-onsite',
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const AMBER_VISITOR: Visitor = {
  id: 'vis-amber',
  name: 'Amber Visitor',
  email: null,
  company: 'Acme',
  host: 'Someone',
  visitReason: 'Multi-day job',
  visitCategory: 'contractor',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const AMBER_BOOKING: VisitBooking = {
  id: 'book-amber',
  visitorId: 'vis-amber',
  host: 'Someone',
  startDate: YESTERDAY,
  endDate: TOMORROW,
  passToken: 'pass-amber',
  passCode: 'AMBR01',
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function buildFireContainer() {
  const container = buildTestContainer({
    calendarEntries: [
      {
        personId: 'emp-amber-staff',
        displayName: 'Amber Staff Member',
        personType: 'employee',
        source: 'm365-calendar',
        date: TODAY,
      },
    ],
  });

  container.employees.seed(ADMIN);
  container.employees.seed(MARSHAL);
  container.employees.seed(EMPLOYEE);
  container.employees.seed(ONSITE_EMPLOYEE);
  container.employees.seed(AMBER_STAFF);

  container.visitors.seed(AMBER_VISITOR);
  container.visitBookings.seed(AMBER_BOOKING);

  container.locations.seed({ id: 'loc-reception', name: 'Main Reception', type: 'reception' });

  return container;
}

// ─── POST /api/fire/trigger ────────────────────────────────────────────────────

describe('POST /api/fire/trigger', () => {
  it('public kiosk can trigger without auth → 201 with roll-call', async () => {
    const container = buildFireContainer();
    const app = createServer(container);

    await container.checkInEvents.append({
      personId: 'emp-onsite',
      personType: 'employee',
      direction: 'in',
      method: 'email',
      locationId: 'loc-reception',
      displayName: 'Onsite Worker',
    });

    const res = await request(app).post('/api/fire/trigger').send();

    expect(res.status).toBe(201);
    expect(res.body.triggeredBy).toBe('kiosk');
    expect(res.body.fireEventId).toBeDefined();
    expect(res.body.triggeredAt).toBeDefined();
    expect(Array.isArray(res.body.rollCall)).toBe(true);
  });

  it('admin with token can trigger → 201 with their sub as triggeredBy', async () => {
    const container = buildFireContainer();
    const app = createServer(container);
    const token = await getToken(app, ADMIN.id);

    const res = await request(app)
      .post('/api/fire/trigger')
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(res.status).toBe(201);
    expect(res.body.triggeredBy).toBe(ADMIN.id);
  });

  it('employee (non-admin) with token is rejected → 403', async () => {
    const container = buildFireContainer();
    const app = createServer(container);
    const token = await getToken(app, EMPLOYEE.id);

    const res = await request(app)
      .post('/api/fire/trigger')
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(res.status).toBe(403);
  });

  it('roll-call includes onsite people as unaccounted and amber set as expected-absent', async () => {
    const container = buildFireContainer();
    const app = createServer(container);

    await container.checkInEvents.append({
      personId: 'emp-onsite',
      personType: 'employee',
      direction: 'in',
      method: 'email',
      locationId: 'loc-reception',
      displayName: 'Onsite Worker',
    });

    const res = await request(app).post('/api/fire/trigger').send();
    expect(res.status).toBe(201);

    type Entry = { personId: string; state: string; personType: string };
    const entries = res.body.rollCall as Entry[];

    const onsiteEntry = entries.find((e) => e.personId === 'emp-onsite');
    const amberStaff = entries.find((e) => e.personId === 'emp-amber-staff');
    const amberVisitor = entries.find((e) => e.personId === 'vis-amber');

    expect(onsiteEntry?.state).toBe('unaccounted');
    expect(amberStaff?.state).toBe('expected-absent');
    expect(amberVisitor?.state).toBe('expected-absent');
  });

  it('amber set includes both a staff member (M365) and a multi-day visitor (booking)', async () => {
    const container = buildFireContainer();
    const app = createServer(container);

    const res = await request(app).post('/api/fire/trigger').send();
    expect(res.status).toBe(201);

    type Entry = { personId: string; personType: string; state: string };
    const entries = res.body.rollCall as Entry[];

    const staffAmber = entries.find((e) => e.personId === 'emp-amber-staff');
    expect(staffAmber?.personType).toBe('employee');
    expect(staffAmber?.state).toBe('expected-absent');

    const visitorAmber = entries.find((e) => e.personId === 'vis-amber');
    expect(visitorAmber?.personType).toBe('visitor');
    expect(visitorAmber?.state).toBe('expected-absent');
  });

  it('triggering twice → 409 Conflict', async () => {
    const container = buildFireContainer();
    const app = createServer(container);

    await request(app).post('/api/fire/trigger').send();
    const res = await request(app).post('/api/fire/trigger').send();

    expect(res.status).toBe(409);
  });
});

// ─── GET /api/onsite/rollcall ─────────────────────────────────────────────────

describe('GET /api/onsite/rollcall', () => {
  it('returns 409 when no active fire event', async () => {
    const container = buildFireContainer();
    const app = createServer(container);
    const token = await getToken(app, ADMIN.id);

    const res = await request(app)
      .get('/api/onsite/rollcall')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
  });

  it('returns roll-call entries with fireEventId after fire trigger', async () => {
    const container = buildFireContainer();
    const app = createServer(container);
    const token = await getToken(app, ADMIN.id);

    await container.checkInEvents.append({
      personId: 'emp-onsite',
      personType: 'employee',
      direction: 'in',
      method: 'email',
      locationId: 'loc-reception',
      displayName: 'Onsite Worker',
    });

    const trigger = await request(app).post('/api/fire/trigger').send();

    const res = await request(app)
      .get('/api/onsite/rollcall')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.fireEventId).toBe(trigger.body.fireEventId);
    expect(res.body.triggeredAt).toBeDefined();
    expect(Array.isArray(res.body.entries)).toBe(true);
    expect(res.body.entries.length).toBeGreaterThan(0);
  });

  it('requires auth → 401 without token', async () => {
    const container = buildFireContainer();
    const app = createServer(container);

    expect((await request(app).get('/api/onsite/rollcall')).status).toBe(401);
  });

  it('requires admin or marshal role → 403 for employee', async () => {
    const container = buildFireContainer();
    const app = createServer(container);
    const token = await getToken(app, EMPLOYEE.id);

    const res = await request(app)
      .get('/api/onsite/rollcall')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});

// ─── PATCH /api/onsite/rollcall/:personId ────────────────────────────────────

describe('PATCH /api/onsite/rollcall/:personId', () => {
  it('marks a person accounted for → state becomes accounted', async () => {
    const container = buildFireContainer();
    const app = createServer(container);
    const token = await getToken(app, MARSHAL.id);

    await container.checkInEvents.append({
      personId: 'emp-onsite',
      personType: 'employee',
      direction: 'in',
      method: 'email',
      locationId: 'loc-reception',
      displayName: 'Onsite Worker',
    });

    await request(app).post('/api/fire/trigger').send();

    const res = await request(app)
      .patch('/api/onsite/rollcall/emp-onsite')
      .set('Authorization', `Bearer ${token}`)
      .send({ accountedFor: true });

    expect(res.status).toBe(200);
    expect(res.body.state).toBe('accounted');
    expect(res.body.accountedFor).toBe(true);
    expect(res.body.accountedAt).toBeDefined();
  });

  it('requires auth → 401', async () => {
    const container = buildFireContainer();
    const app = createServer(container);

    const res = await request(app)
      .patch('/api/onsite/rollcall/emp-onsite')
      .send({ accountedFor: true });

    expect(res.status).toBe(401);
  });

  it('requires admin or marshal → 403 for employee', async () => {
    const container = buildFireContainer();
    const app = createServer(container);
    const token = await getToken(app, EMPLOYEE.id);

    const res = await request(app)
      .patch('/api/onsite/rollcall/emp-onsite')
      .set('Authorization', `Bearer ${token}`)
      .send({ accountedFor: true });

    expect(res.status).toBe(403);
  });
});

// ─── POST /api/fire/:id/resolve ───────────────────────────────────────────────

describe('POST /api/fire/:id/resolve', () => {
  it('admin can resolve an active fire event', async () => {
    const container = buildFireContainer();
    const app = createServer(container);
    const token = await getToken(app, ADMIN.id);

    const trigger = await request(app).post('/api/fire/trigger').send();
    const fireEventId: string = trigger.body.fireEventId;

    const res = await request(app)
      .post(`/api/fire/${fireEventId}/resolve`)
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.resolvedAt).toBeDefined();
    expect(res.body.id).toBe(fireEventId);
  });

  it('returns 404 for unknown fire event id', async () => {
    const container = buildFireContainer();
    const app = createServer(container);
    const token = await getToken(app, ADMIN.id);

    const res = await request(app)
      .post('/api/fire/no-such-id/resolve')
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(res.status).toBe(404);
  });

  it('requires admin role → 403 for marshal', async () => {
    const container = buildFireContainer();
    const app = createServer(container);
    const token = await getToken(app, MARSHAL.id);

    const res = await request(app)
      .post('/api/fire/some-id/resolve')
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(res.status).toBe(403);
  });

  it('requires auth → 401 without token', async () => {
    const container = buildFireContainer();
    const app = createServer(container);

    expect((await request(app).post('/api/fire/some-id/resolve').send()).status).toBe(401);
  });
});

// ─── GET /api/fire/events ─────────────────────────────────────────────────────

describe('GET /api/fire/events', () => {
  it('returns list of fire events including resolved ones', async () => {
    const container = buildFireContainer();
    const app = createServer(container);
    const token = await getToken(app, ADMIN.id);

    const trigger = await request(app).post('/api/fire/trigger').send();
    const fireEventId: string = trigger.body.fireEventId;
    await request(app)
      .post(`/api/fire/${fireEventId}/resolve`)
      .set('Authorization', `Bearer ${token}`)
      .send();

    const res = await request(app)
      .get('/api/fire/events')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.events)).toBe(true);
    expect(res.body.events.length).toBe(1);
    expect(res.body.events[0].resolvedAt).toBeDefined();
  });

  it('marshal can list fire events', async () => {
    const container = buildFireContainer();
    const app = createServer(container);
    const token = await getToken(app, MARSHAL.id);

    const res = await request(app)
      .get('/api/fire/events')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('requires auth → 401 without token', async () => {
    const container = buildFireContainer();
    const app = createServer(container);

    expect((await request(app).get('/api/fire/events')).status).toBe(401);
  });
});

// ─── GET /api/expected ────────────────────────────────────────────────────────

describe('GET /api/expected', () => {
  it('returns expected presence for today by default', async () => {
    const container = buildFireContainer();
    const app = createServer(container);
    const token = await getToken(app, ADMIN.id);

    const res = await request(app)
      .get('/api/expected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.date).toBe(TODAY);
    expect(Array.isArray(res.body.expected)).toBe(true);

    type Entry = { personId: string; source: string; checkedInToday: boolean };
    const expected = res.body.expected as Entry[];

    const staffEntry = expected.find((e) => e.personId === 'emp-amber-staff');
    expect(staffEntry?.source).toBe('m365-calendar');
    expect(staffEntry?.checkedInToday).toBe(false);

    const visitorEntry = expected.find((e) => e.personId === 'vis-amber');
    expect(visitorEntry?.source).toBe('visit-booking');
    expect(visitorEntry?.checkedInToday).toBe(false);
  });

  it('accepts a ?date= parameter and returns empty for a future date with no entries', async () => {
    const container = buildFireContainer();
    const app = createServer(container);
    const token = await getToken(app, ADMIN.id);

    const res = await request(app)
      .get('/api/expected?date=2030-01-01')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.date).toBe('2030-01-01');
    expect(res.body.expected).toEqual([]);
  });

  it('rejects invalid date format → 400', async () => {
    const container = buildFireContainer();
    const app = createServer(container);
    const token = await getToken(app, ADMIN.id);

    const res = await request(app)
      .get('/api/expected?date=not-a-date')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it('marshal can access /api/expected → 200', async () => {
    const container = buildFireContainer();
    const app = createServer(container);
    const token = await getToken(app, MARSHAL.id);

    expect((await request(app).get('/api/expected').set('Authorization', `Bearer ${token}`)).status).toBe(200);
  });

  it('requires auth → 401', async () => {
    const container = buildFireContainer();
    const app = createServer(container);

    expect((await request(app).get('/api/expected')).status).toBe(401);
  });

  it('employee cannot access /api/expected → 403', async () => {
    const container = buildFireContainer();
    const app = createServer(container);
    const token = await getToken(app, EMPLOYEE.id);

    const res = await request(app)
      .get('/api/expected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('checkedInToday reflects actual on-site state', async () => {
    const container = buildFireContainer();
    const app = createServer(container);
    const token = await getToken(app, ADMIN.id);

    await container.checkInEvents.append({
      personId: 'emp-amber-staff',
      personType: 'employee',
      direction: 'in',
      method: 'email',
      locationId: 'loc-reception',
      displayName: 'Amber Staff Member',
    });

    const res = await request(app)
      .get('/api/expected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    type Entry = { personId: string; checkedInToday: boolean };
    const entry = (res.body.expected as Entry[]).find((e) => e.personId === 'emp-amber-staff');
    expect(entry?.checkedInToday).toBe(true);
  });
});

// ─── GET /api/onsite/stream (SSE) ────────────────────────────────────────────

describe('GET /api/onsite/stream', () => {
  it('missing token → 401', async () => {
    const container = buildFireContainer();
    const app = createServer(container);

    expect((await request(app).get('/api/onsite/stream')).status).toBe(401);
  });

  it('invalid token → 401', async () => {
    const container = buildFireContainer();
    const app = createServer(container);

    expect((await request(app).get('/api/onsite/stream?access_token=bad')).status).toBe(401);
  });

  it('employee token → 403', async () => {
    const container = buildFireContainer();
    const app = createServer(container);
    const token = await getToken(app, EMPLOYEE.id);

    expect(
      (await request(app).get(`/api/onsite/stream?access_token=${token}`)).status,
    ).toBe(403);
  });

  it('admin token → 200 with text/event-stream', async () => {
    const container = buildFireContainer();
    const app = createServer(container);
    const token = await getToken(app, ADMIN.id);

    await new Promise<void>((resolve, reject) => {
      const httpServer = http.createServer(app);
      httpServer.listen(0, () => {
        const { port } = httpServer.address() as AddressInfo;
        const req = http.get(
          `http://localhost:${port}/api/onsite/stream?access_token=${token}`,
          (res) => {
            expect(res.statusCode).toBe(200);
            expect(res.headers['content-type']).toContain('text/event-stream');
            req.destroy();
            httpServer.close(() => resolve());
          },
        );
        req.on('error', (err) => {
          const code = (err as NodeJS.ErrnoException).code;
          httpServer.close(() => {
            if (code === 'ECONNRESET') resolve();
            else reject(err);
          });
        });
      });
    });
  });

  it('SSE client receives fire.triggered event', async () => {
    const container = buildFireContainer();
    const app = createServer(container);
    const token = await getToken(app, ADMIN.id);

    await new Promise<void>((resolve, reject) => {
      const httpServer = http.createServer(app);
      httpServer.listen(0, () => {
        const { port } = httpServer.address() as AddressInfo;

        const chunks: string[] = [];
        let done = false;

        const req = http.get(
          `http://localhost:${port}/api/onsite/stream?access_token=${token}`,
          (res) => {
            res.setEncoding('utf8');
            res.on('data', (chunk: string) => {
              chunks.push(chunk);
              if (!done && chunks.join('').includes('fire.triggered')) {
                done = true;
                req.destroy();
                httpServer.close(() => resolve());
              }
            });
          },
        );

        req.on('error', (err) => {
          const code = (err as NodeJS.ErrnoException).code;
          if (code === 'ECONNRESET' && done) return;
          httpServer.close(() => reject(err));
        });

        // Fire the alarm shortly after the SSE connection is established
        setTimeout(() => {
          void container.triggerFireEvent.execute('test-trigger').catch(() => {/* already active */});
        }, 60);

        setTimeout(() => {
          if (!done) {
            httpServer.close();
            reject(new Error('Timed out waiting for fire.triggered SSE event'));
          }
        }, 4000);
      });
    });
  });

  it('SSE client receives rollcall.updated after PATCH', async () => {
    const container = buildFireContainer();
    const app = createServer(container);
    const marshalToken = await getToken(app, MARSHAL.id);
    const adminToken = await getToken(app, ADMIN.id);

    await container.checkInEvents.append({
      personId: 'emp-onsite',
      personType: 'employee',
      direction: 'in',
      method: 'email',
      locationId: 'loc-reception',
      displayName: 'Onsite Worker',
    });

    await new Promise<void>((resolve, reject) => {
      const httpServer = http.createServer(app);
      httpServer.listen(0, () => {
        const { port } = httpServer.address() as AddressInfo;

        const chunks: string[] = [];
        let done = false;

        const req = http.get(
          `http://localhost:${port}/api/onsite/stream?access_token=${marshalToken}`,
          (res) => {
            res.setEncoding('utf8');
            res.on('data', (chunk: string) => {
              chunks.push(chunk);
              if (!done && chunks.join('').includes('rollcall.updated')) {
                done = true;
                req.destroy();
                httpServer.close(() => resolve());
              }
            });
          },
        );

        req.on('error', (err) => {
          const code = (err as NodeJS.ErrnoException).code;
          if (code === 'ECONNRESET' && done) return;
          httpServer.close(() => reject(err));
        });

        setTimeout(async () => {
          try {
            await request(app).post('/api/fire/trigger').send();
            await request(app)
              .patch('/api/onsite/rollcall/emp-onsite')
              .set('Authorization', `Bearer ${adminToken}`)
              .send({ accountedFor: true });
          } catch {
            // ignore
          }
        }, 60);

        setTimeout(() => {
          if (!done) {
            httpServer.close();
            reject(new Error('Timed out waiting for rollcall.updated SSE event'));
          }
        }, 4000);
      });
    });
  });
});
