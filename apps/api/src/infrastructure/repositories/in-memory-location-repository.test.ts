import { beforeEach, describe, expect, it } from 'vitest';
import type { LocationRepository } from '../../domain/repositories.js';
import { InMemoryLocationRepository } from './in-memory-location-repository.js';

// ─── Repository contract suite ────────────────────────────────────────────────

function describeLocationRepository(factory: () => LocationRepository) {
  let repo: LocationRepository;

  beforeEach(() => {
    repo = factory();
  });

  describe('findById', () => {
    it('finds a seeded location by id', async () => {
      const impl = repo as InMemoryLocationRepository;
      impl.seed({ id: 'loc-reception', name: 'Main Reception', type: 'reception' });

      const found = await repo.findById('loc-reception');
      expect(found?.name).toBe('Main Reception');
      expect(found?.type).toBe('reception');
    });

    it('returns null for an unknown id', async () => {
      expect(await repo.findById('no-such-loc')).toBeNull();
    });
  });

  describe('listAll', () => {
    it('returns all seeded locations', async () => {
      const impl = repo as InMemoryLocationRepository;
      impl.seed({ id: 'loc-reception', name: 'Main Reception', type: 'reception' });
      impl.seed({ id: 'loc-workshop-exit', name: 'Workshop Exit', type: 'exit' });

      const all = await repo.listAll();
      expect(all).toHaveLength(2);
      expect(all.map((l) => l.id)).toContain('loc-reception');
      expect(all.map((l) => l.id)).toContain('loc-workshop-exit');
    });

    it('returns an empty array when no locations are seeded', async () => {
      expect(await repo.listAll()).toHaveLength(0);
    });
  });
}

// ─── Run contract suite ───────────────────────────────────────────────────────

describe('InMemoryLocationRepository', () => {
  describeLocationRepository(() => new InMemoryLocationRepository());
});
