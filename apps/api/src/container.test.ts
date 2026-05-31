import { describe, expect, it } from 'vitest';
import { buildTestContainer, createContainer } from './container.js';
import { SEED_DATE } from './infrastructure/seed/seed-data.js';

describe('createContainer', () => {
  it('returns a fully wired, seeded container', async () => {
    const container = createContainer();

    // Seed should have populated the on-site list
    const snapshot = await container.onsiteProjection.getSnapshot();
    expect(snapshot.occupants.length).toBeGreaterThan(0);
    expect(snapshot.counts.employee).toBeGreaterThan(0);
  });

  it('exposes 3 amber entries on the seed date', async () => {
    const container = createContainer();
    const expected = await container.expectedPresence.expectedOn(SEED_DATE);
    const amber = expected.filter((e) => !e.checkedInToday);
    expect(amber).toHaveLength(3);
  });
});

describe('buildTestContainer', () => {
  it('returns an empty container with no occupants', async () => {
    const container = buildTestContainer();
    const snapshot = await container.onsiteProjection.getSnapshot();
    expect(snapshot.occupants).toHaveLength(0);
    expect(snapshot.counts).toEqual({ employee: 0, patient: 0, visitor: 0 });
  });

  it('accepts custom calendar entries', async () => {
    const container = buildTestContainer({
      calendarEntries: [
        { personId: 'emp-01', displayName: 'Test User', personType: 'employee', source: 'm365-calendar', date: '2026-06-01' },
      ],
    });
    const expected = await container.expectedPresence.expectedOn('2026-06-01');
    expect(expected).toHaveLength(1);
    expect(expected[0]?.personId).toBe('emp-01');
  });

  it('accepts custom patient data for the clinical system', async () => {
    const container = buildTestContainer({
      patients: [
        { id: 'pat-01', name: 'Test Patient', dateOfBirth: '1980-01-01', patientReference: 'REF-01', clinicalSystemId: 'CLIN-01' },
      ],
    });
    const match = await container.clinicalSystem.lookup('Test Patient', '1980-01-01');
    expect(match?.patientId).toBe('pat-01');
  });

  it('returns independent repo instances per call', async () => {
    const a = buildTestContainer();
    const b = buildTestContainer();
    await a.employees.create({ name: 'Alice', email: null, role: 'employee', employeeNumber: 'A1', qrCodeToken: 'tok' });
    const bEmployees = await b.employees.listActive();
    expect(bEmployees).toHaveLength(0); // b is independent of a
  });
});
