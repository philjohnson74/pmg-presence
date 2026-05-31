import { beforeEach, describe, expect, it } from 'vitest';
import type { RollCallRepository } from '../../domain/repositories.js';
import { InMemoryRollCallRepository } from './in-memory-roll-call-repository.js';

// ─── Repository contract suite ────────────────────────────────────────────────

function describeRollCallRepository(factory: () => RollCallRepository) {
  let repo: RollCallRepository;
  const FIRE_ID = 'fire-001';

  beforeEach(() => {
    repo = factory();
  });

  const entry = (personId: string, state: 'unaccounted' | 'expected-absent' = 'unaccounted') => ({
    fireEventId: FIRE_ID,
    personId,
    personType: 'employee' as const,
    displayName: `Person ${personId}`,
    state,
  });

  describe('snapshot + list', () => {
    it('snapshots entries and retrieves them by fireEventId', async () => {
      await repo.snapshot([entry('emp-01'), entry('emp-02')]);
      const entries = await repo.list(FIRE_ID);
      expect(entries).toHaveLength(2);
      expect(entries.map((e) => e.personId)).toContain('emp-01');
      expect(entries.map((e) => e.personId)).toContain('emp-02');
    });

    it('sets accountedFor false for unaccounted entries', async () => {
      await repo.snapshot([entry('emp-01', 'unaccounted')]);
      const [e] = await repo.list(FIRE_ID);
      expect(e?.accountedFor).toBe(false);
      expect(e?.accountedAt).toBeNull();
      expect(e?.accountedBy).toBeNull();
    });

    it('returns only entries for the requested fire event', async () => {
      await repo.snapshot([entry('emp-01')]);
      await repo.snapshot([{ ...entry('emp-02'), fireEventId: 'fire-002' }]);
      const entries = await repo.list(FIRE_ID);
      expect(entries).toHaveLength(1);
      expect(entries[0]?.personId).toBe('emp-01');
    });

    it('returns an empty array when no snapshot exists for a fire event', async () => {
      expect(await repo.list('no-such-fire')).toHaveLength(0);
    });
  });

  describe('markAccounted', () => {
    beforeEach(async () => {
      await repo.snapshot([entry('emp-01'), entry('emp-02', 'expected-absent')]);
    });

    it('marks an entry as accounted for', async () => {
      const updated = await repo.markAccounted(FIRE_ID, 'emp-01', 'marshal-001');
      expect(updated.state).toBe('accounted');
      expect(updated.accountedFor).toBe(true);
      expect(updated.accountedBy).toBe('marshal-001');
      expect(updated.accountedAt).not.toBeNull();
    });

    it('persists the update so list reflects it', async () => {
      await repo.markAccounted(FIRE_ID, 'emp-01', 'marshal-001');
      const entries = await repo.list(FIRE_ID);
      const updated = entries.find((e) => e.personId === 'emp-01');
      expect(updated?.state).toBe('accounted');
    });

    it('can mark an amber (expected-absent) entry as accounted', async () => {
      const updated = await repo.markAccounted(FIRE_ID, 'emp-02', 'marshal-001');
      expect(updated.state).toBe('accounted');
    });

    it('throws when the entry does not exist', async () => {
      await expect(repo.markAccounted(FIRE_ID, 'unknown-person', 'marshal-001')).rejects.toThrow();
    });

    it('throws when the fire event does not exist', async () => {
      await expect(repo.markAccounted('no-such-fire', 'emp-01', 'marshal-001')).rejects.toThrow();
    });
  });
}

// ─── Run contract suite ───────────────────────────────────────────────────────

describe('InMemoryRollCallRepository', () => {
  describeRollCallRepository(() => new InMemoryRollCallRepository());
});
