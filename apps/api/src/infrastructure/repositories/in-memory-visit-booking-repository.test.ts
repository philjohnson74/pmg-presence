import { beforeEach, describe, expect, it } from 'vitest';
import type { VisitBookingRepository } from '../../domain/repositories.js';
import { InMemoryVisitBookingRepository } from './in-memory-visit-booking-repository.js';

// ─── Repository contract suite ────────────────────────────────────────────────

function describeVisitBookingRepository(factory: () => VisitBookingRepository) {
  let repo: VisitBookingRepository;

  beforeEach(() => {
    repo = factory();
  });

  const base = {
    visitorId: 'vis-01',
    host: 'Gary Cooper',
    passToken: null,
    passCode: null,
  };

  describe('create + findById', () => {
    it('persists a booking and retrieves it by id', async () => {
      const booking = await repo.create({ ...base, startDate: '2026-05-31', endDate: '2026-05-31' });
      expect(booking.id).toBeTruthy();
      expect(booking.status).toBe('active');

      const found = await repo.findById(booking.id);
      expect(found).toEqual(booking);
    });

    it('returns null for an unknown id', async () => {
      expect(await repo.findById('no-such-id')).toBeNull();
    });
  });

  describe('activeOn', () => {
    it('returns bookings whose window covers the given date', async () => {
      await repo.create({ ...base, visitorId: 'vis-01', startDate: '2026-05-28', endDate: '2026-06-06' });
      await repo.create({ ...base, visitorId: 'vis-02', startDate: '2026-05-31', endDate: '2026-05-31' });
      await repo.create({ ...base, visitorId: 'vis-03', startDate: '2026-06-01', endDate: '2026-06-05' }); // future

      const active = await repo.activeOn('2026-05-31');
      const ids = active.map((b) => b.visitorId);
      expect(ids).toContain('vis-01');
      expect(ids).toContain('vis-02');
      expect(ids).not.toContain('vis-03');
    });

    it('excludes completed and cancelled bookings', async () => {
      const b = await repo.create({ ...base, visitorId: 'vis-04', startDate: '2026-05-31', endDate: '2026-05-31' });
      await repo.complete(b.id);

      const active = await repo.activeOn('2026-05-31');
      expect(active.map((x) => x.id)).not.toContain(b.id);
    });

    it('returns empty array when no bookings match', async () => {
      expect(await repo.activeOn('2099-01-01')).toHaveLength(0);
    });
  });

  describe('findActiveByPassToken', () => {
    it('finds a booking by its pass token', async () => {
      await repo.create({ ...base, startDate: '2026-05-31', endDate: '2026-06-10', passToken: 'tok-abc', passCode: 'CODE1' });
      const found = await repo.findActiveByPassToken('tok-abc');
      expect(found).not.toBeNull();
      expect(found?.passToken).toBe('tok-abc');
    });

    it('returns null for an unrecognised token', async () => {
      expect(await repo.findActiveByPassToken('unknown')).toBeNull();
    });
  });

  describe('complete', () => {
    it('sets status to completed', async () => {
      const b = await repo.create({ ...base, startDate: '2026-05-31', endDate: '2026-05-31' });
      await repo.complete(b.id);
      const found = await repo.findById(b.id);
      expect(found?.status).toBe('completed');
    });

    it('throws when completing a non-existent booking', async () => {
      await expect(repo.complete('no-such-id')).rejects.toThrow();
    });
  });
}

// ─── Run contract suite ───────────────────────────────────────────────────────

describe('InMemoryVisitBookingRepository', () => {
  describeVisitBookingRepository(() => new InMemoryVisitBookingRepository());
});
