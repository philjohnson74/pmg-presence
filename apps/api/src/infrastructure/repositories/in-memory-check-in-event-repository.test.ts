import { beforeEach, describe, expect, it } from 'vitest';
import type { CheckInEventRepository } from '../../domain/repositories.js';
import { InMemoryCheckInEventRepository } from './in-memory-check-in-event-repository.js';

// ─── Repository contract suite ────────────────────────────────────────────────

function describeCheckInEventRepository(factory: () => CheckInEventRepository) {
  let repo: CheckInEventRepository;

  beforeEach(() => {
    repo = factory();
  });

  describe('append', () => {
    it('persists an event and returns it with an id', async () => {
      const event = await repo.append({
        personId: 'emp-01',
        personType: 'employee',
        direction: 'in',
        method: 'qr',
        locationId: 'loc-reception',
        displayName: 'Alice',
      });

      expect(event.id).toBeTruthy();
      expect(event.direction).toBe('in');
      expect(event.timestamp).toBeTruthy();
    });

    it('respects a caller-supplied timestamp', async () => {
      const ts = '2026-05-31T08:00:00.000Z';
      const event = await repo.append({
        personId: 'emp-01',
        personType: 'employee',
        direction: 'in',
        method: 'qr',
        locationId: 'loc-reception',
        displayName: 'Alice',
        timestamp: ts,
      });
      expect(event.timestamp).toBe(ts);
    });
  });

  describe('latestForPerson', () => {
    it('returns the most recent event for a person', async () => {
      await repo.append({ personId: 'emp-01', personType: 'employee', direction: 'in', method: 'qr', locationId: 'loc-a', displayName: 'Alice', timestamp: '2026-05-31T08:00:00.000Z' });
      await repo.append({ personId: 'emp-01', personType: 'employee', direction: 'out', method: 'qr', locationId: 'loc-a', displayName: 'Alice', timestamp: '2026-05-31T09:00:00.000Z' });

      const latest = await repo.latestForPerson('emp-01');
      expect(latest?.direction).toBe('out');
    });

    it('returns null for an unknown person', async () => {
      expect(await repo.latestForPerson('nobody')).toBeNull();
    });
  });

  describe('currentlyOnsite', () => {
    it('returns people whose latest event is "in"', async () => {
      await repo.append({ personId: 'emp-01', personType: 'employee', direction: 'in', method: 'qr', locationId: 'loc-a', displayName: 'Alice', timestamp: '2026-05-31T08:00:00.000Z' });
      await repo.append({ personId: 'emp-02', personType: 'employee', direction: 'in', method: 'email', locationId: 'loc-a', displayName: 'Bob', timestamp: '2026-05-31T08:05:00.000Z' });
      // Bob checks out
      await repo.append({ personId: 'emp-02', personType: 'employee', direction: 'out', method: 'qr', locationId: 'loc-a', displayName: 'Bob', timestamp: '2026-05-31T09:00:00.000Z' });

      const onsite = await repo.currentlyOnsite();
      const ids = onsite.map((e) => e.personId);
      expect(ids).toContain('emp-01');
      expect(ids).not.toContain('emp-02');
    });

    it('returns one entry per person even with multiple in events', async () => {
      await repo.append({ personId: 'emp-01', personType: 'employee', direction: 'in', method: 'qr', locationId: 'loc-a', displayName: 'Alice', timestamp: '2026-05-30T08:00:00.000Z' });
      await repo.append({ personId: 'emp-01', personType: 'employee', direction: 'out', method: 'qr', locationId: 'loc-a', displayName: 'Alice', timestamp: '2026-05-30T17:00:00.000Z' });
      await repo.append({ personId: 'emp-01', personType: 'employee', direction: 'in', method: 'qr', locationId: 'loc-a', displayName: 'Alice', timestamp: '2026-05-31T08:00:00.000Z' });

      const onsite = await repo.currentlyOnsite();
      expect(onsite.filter((e) => e.personId === 'emp-01')).toHaveLength(1);
    });

    it('returns an empty array when nobody is on site', async () => {
      expect(await repo.currentlyOnsite()).toHaveLength(0);
    });
  });

  describe('history', () => {
    beforeEach(async () => {
      await repo.append({ personId: 'emp-01', personType: 'employee', direction: 'in', method: 'email', locationId: 'loc-a', displayName: 'Alice Smith', timestamp: '2026-05-29T08:00:00.000Z' });
      await repo.append({ personId: 'emp-02', personType: 'employee', direction: 'in', method: 'qr', locationId: 'loc-a', displayName: 'Bob Jones', timestamp: '2026-05-30T08:00:00.000Z' });
      await repo.append({ personId: 'vis-01', personType: 'visitor', direction: 'in', method: 'visitor-form', locationId: 'loc-a', displayName: 'Carol Visitor', timestamp: '2026-05-31T08:00:00.000Z' });
    });

    it('filters by from date', async () => {
      const results = await repo.history({ from: '2026-05-30' });
      expect(results.map((e) => e.personId)).not.toContain('emp-01');
      expect(results.map((e) => e.personId)).toContain('emp-02');
    });

    it('filters by to date', async () => {
      const results = await repo.history({ to: '2026-05-30' });
      expect(results.map((e) => e.personId)).not.toContain('vis-01');
      expect(results.map((e) => e.personId)).toContain('emp-02');
    });

    it('filters by name (case-insensitive, partial)', async () => {
      const results = await repo.history({ name: 'alice' });
      expect(results).toHaveLength(1);
      expect(results[0]?.displayName).toBe('Alice Smith');
    });

    it('filters by personType', async () => {
      const results = await repo.history({ personType: 'visitor' });
      expect(results).toHaveLength(1);
      expect(results[0]?.personId).toBe('vis-01');
    });

    it('returns all events with no filter', async () => {
      const results = await repo.history({});
      expect(results).toHaveLength(3);
    });
  });
}

// ─── Run contract suite ───────────────────────────────────────────────────────

describe('InMemoryCheckInEventRepository', () => {
  describeCheckInEventRepository(() => new InMemoryCheckInEventRepository());
});
