import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createServer } from '../server.js';
import { buildTestContainer } from '../../container.js';
import { TEST_PATIENT } from './test-fixtures.js';

function makeApp(overrides: Parameters<typeof buildTestContainer>[0] = {}) {
  return createServer(buildTestContainer(overrides));
}

function lookup(app: Express, params: Record<string, string>) {
  return request(app).get('/api/patients/lookup').query(params);
}

describe('GET /api/patients/lookup', () => {
  let app: Express;

  beforeEach(() => {
    app = makeApp({ patients: [TEST_PATIENT] });
  });

  // ── Successful match ────────────────────────────────────────────────────────

  it('returns a match for exact name and DOB', async () => {
    const res = await lookup(app, { name: 'Joan Webb', dob: '1951-03-14' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      match: true,
      patientId: 'pat-001',
      displayName: 'Joan Webb',
      patientReference: 'PMG-OUT-4471',
    });
  });

  it('is case-insensitive on name', async () => {
    const res = await lookup(app, { name: 'joan webb', dob: '1951-03-14' });

    expect(res.status).toBe(200);
    expect(res.body.match).toBe(true);
  });

  it('strips diacritics so "Renee Fontaine" matches "Renée Fontaine"', async () => {
    const diacriticApp = makeApp({
      patients: [
        {
          id: 'pat-003',
          name: 'Renée Fontaine',
          dateOfBirth: '1989-06-30',
          patientReference: 'PMG-OUT-4473',
          clinicalSystemId: 'CLIN-88233',
        },
      ],
    });
    const res = await lookup(diacriticApp, { name: 'Renee Fontaine', dob: '1989-06-30' });

    expect(res.status).toBe(200);
    expect(res.body.match).toBe(true);
    expect(res.body.patientId).toBe('pat-003');
  });

  it('tolerates extra whitespace in the name', async () => {
    const res = await lookup(app, { name: '  Joan   Webb  ', dob: '1951-03-14' });

    expect(res.status).toBe(200);
    expect(res.body.match).toBe(true);
  });

  // ── No-match cases ──────────────────────────────────────────────────────────

  it('returns match:false for an unknown patient', async () => {
    const res = await lookup(app, { name: 'Nobody Here', dob: '1990-01-01' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ match: false });
  });

  it('returns match:false when DOB is wrong even if name matches', async () => {
    const res = await lookup(app, { name: 'Joan Webb', dob: '1960-01-01' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ match: false });
  });

  // ── Data minimisation ───────────────────────────────────────────────────────

  it('does not expose DOB or clinicalSystemId in the response', async () => {
    const res = await lookup(app, { name: 'Joan Webb', dob: '1951-03-14' });

    expect(res.body).not.toHaveProperty('dateOfBirth');
    expect(res.body).not.toHaveProperty('dob');
    expect(res.body).not.toHaveProperty('clinicalSystemId');
  });

  // ── Input validation ────────────────────────────────────────────────────────

  it('returns 400 when name is missing', async () => {
    expect((await lookup(app, { dob: '1951-03-14' })).status).toBe(400);
  });

  it('returns 400 when dob is missing', async () => {
    expect((await lookup(app, { name: 'Joan Webb' })).status).toBe(400);
  });

  it('returns 400 for an invalid DOB format', async () => {
    expect((await lookup(app, { name: 'Joan Webb', dob: '14/03/1951' })).status).toBe(400);
  });

  it('returns 400 for a future DOB', async () => {
    expect((await lookup(app, { name: 'Joan Webb', dob: '2099-01-01' })).status).toBe(400);
  });

  // ── Rate limiting ───────────────────────────────────────────────────────────

  it('returns 429 after 5 requests within the window', async () => {
    for (let i = 0; i < 5; i++) {
      await lookup(app, { name: 'Unknown', dob: '1990-01-01' });
    }
    const res = await lookup(app, { name: 'Unknown', dob: '1990-01-01' });

    expect(res.status).toBe(429);
  });
});
