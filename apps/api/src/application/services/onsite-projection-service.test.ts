import { beforeEach, describe, expect, it } from 'vitest';
import { OnsiteProjectionService } from './onsite-projection-service.js';
import { InMemoryCheckInEventRepository } from '../../infrastructure/repositories/in-memory-check-in-event-repository.js';
import { InMemoryVisitorRepository } from '../../infrastructure/repositories/in-memory-visitor-repository.js';
import type { CheckInEvent } from '../../domain/entities.js';

function makeEvent(overrides: Partial<CheckInEvent> & Pick<CheckInEvent, 'personId' | 'personType' | 'displayName'>): CheckInEvent {
  return {
    id: `evt-${Math.random()}`,
    direction: 'in',
    method: 'qr',
    locationId: 'loc-reception',
    timestamp: '2026-05-31T08:00:00.000Z',
    ...overrides,
  };
}

describe('OnsiteProjectionService', () => {
  let events: InMemoryCheckInEventRepository;
  let visitors: InMemoryVisitorRepository;
  let service: OnsiteProjectionService;

  beforeEach(() => {
    events = new InMemoryCheckInEventRepository();
    visitors = new InMemoryVisitorRepository();
    service = new OnsiteProjectionService(events, visitors);
  });

  it('returns an empty snapshot when nobody is on site', async () => {
    const snapshot = await service.getSnapshot();
    expect(snapshot.occupants).toHaveLength(0);
    expect(snapshot.counts).toEqual({ employee: 0, patient: 0, visitor: 0 });
    expect(snapshot.visitorsByCategory).toEqual({});
  });

  it('counts occupants by personType', async () => {
    events.seed(makeEvent({ id: 'e1', personId: 'emp-01', personType: 'employee', displayName: 'Alice' }));
    events.seed(makeEvent({ id: 'e2', personId: 'emp-02', personType: 'employee', displayName: 'Bob' }));
    events.seed(makeEvent({ id: 'e3', personId: 'pat-01', personType: 'patient', displayName: 'Joan' }));
    events.seed(makeEvent({ id: 'e4', personId: 'vis-01', personType: 'visitor', displayName: 'Dana' }));

    const snapshot = await service.getSnapshot();
    expect(snapshot.counts).toEqual({ employee: 2, patient: 1, visitor: 1 });
  });

  it('excludes people who have checked out', async () => {
    events.seed(makeEvent({ id: 'e1', personId: 'emp-01', personType: 'employee', displayName: 'Alice', timestamp: '2026-05-31T08:00:00.000Z' }));
    events.seed(makeEvent({ id: 'e2', personId: 'emp-01', personType: 'employee', displayName: 'Alice', direction: 'out', timestamp: '2026-05-31T09:00:00.000Z' }));

    const snapshot = await service.getSnapshot();
    expect(snapshot.occupants).toHaveLength(0);
    expect(snapshot.counts.employee).toBe(0);
  });

  it('enriches visitor occupants with host and visitCategory', async () => {
    visitors.seed({
      id: 'vis-01',
      name: 'Dana Okoro',
      email: null,
      company: 'Acme HVAC',
      host: 'Gary Cooper',
      visitReason: 'Maintenance',
      visitCategory: 'contractor',
      createdAt: '2026-05-31T00:00:00.000Z',
    });
    events.seed(makeEvent({ id: 'e1', personId: 'vis-01', personType: 'visitor', displayName: 'Dana Okoro' }));

    const snapshot = await service.getSnapshot();
    const occupant = snapshot.occupants.find((o) => o.personId === 'vis-01');
    expect(occupant?.host).toBe('Gary Cooper');
    expect(occupant?.visitCategory).toBe('contractor');
  });

  it('builds visitorsByCategory breakdown', async () => {
    visitors.seed({ id: 'vis-01', name: 'A', email: null, company: null, host: 'H', visitReason: 'r', visitCategory: 'contractor', createdAt: '' });
    visitors.seed({ id: 'vis-02', name: 'B', email: null, company: null, host: 'H', visitReason: 'r', visitCategory: 'contractor', createdAt: '' });
    visitors.seed({ id: 'vis-03', name: 'C', email: null, company: null, host: 'H', visitReason: 'r', visitCategory: 'supplier', createdAt: '' });
    visitors.seed({ id: 'vis-04', name: 'D', email: null, company: null, host: 'H', visitReason: 'r', visitCategory: null, createdAt: '' });
    for (const id of ['vis-01', 'vis-02', 'vis-03', 'vis-04']) {
      events.seed(makeEvent({ id: `e-${id}`, personId: id, personType: 'visitor', displayName: id }));
    }

    const snapshot = await service.getSnapshot();
    expect(snapshot.visitorsByCategory['contractor']).toBe(2);
    expect(snapshot.visitorsByCategory['supplier']).toBe(1);
    expect(snapshot.visitorsByCategory['uncategorised']).toBe(1);
  });

  it('includes asOf timestamp', async () => {
    const snapshot = await service.getSnapshot();
    expect(new Date(snapshot.asOf).getTime()).toBeGreaterThan(0);
  });
});

describe('OnsiteProjectionService — seeded demo data', () => {
  it('returns the correct on-site mix from seed data', async () => {
    // Verify seed loads produce the expected on-site list
    const { createContainer } = await import('../../container.js');
    const container = createContainer();

    const snapshot = await container.onsiteProjection.getSnapshot();
    // 5 employees on site (Gary, Aisha, Joanne, Carla, Sam)
    expect(snapshot.counts.employee).toBe(5);
    // 4 visitors on site (Dana, Laura, Niamh, Greg)
    expect(snapshot.counts.visitor).toBe(4);
    // 1 patient on site (Joan Webb)
    expect(snapshot.counts.patient).toBe(1);

    // visitorsByCategory should have contractor, auditor, nhs-commissioner, supplier
    expect(snapshot.visitorsByCategory['contractor']).toBe(1);
    expect(snapshot.visitorsByCategory['auditor']).toBe(1);
    expect(snapshot.visitorsByCategory['nhs-commissioner']).toBe(1);
    expect(snapshot.visitorsByCategory['supplier']).toBe(1);

    // Dana (contractor visitor) should have host and visitCategory enriched
    const dana = snapshot.occupants.find((o) => o.displayName === 'Dana Okoro');
    expect(dana?.host).toBe('Gary Cooper');
    expect(dana?.visitCategory).toBe('contractor');
  });
});
