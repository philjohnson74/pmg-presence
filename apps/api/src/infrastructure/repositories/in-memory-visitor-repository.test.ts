import { beforeEach, describe, expect, it } from 'vitest';
import type { VisitorRepository } from '../../domain/repositories.js';
import { InMemoryVisitorRepository } from './in-memory-visitor-repository.js';

// ─── Repository contract suite ────────────────────────────────────────────────

function describeVisitorRepository(factory: () => VisitorRepository) {
  let repo: VisitorRepository;

  beforeEach(() => {
    repo = factory();
  });

  const newVisitor = {
    name: 'Dana Okoro',
    email: null,
    company: 'Acme HVAC',
    host: 'Gary Cooper',
    visitReason: 'Installing compressor',
    visitCategory: 'contractor' as const,
  };

  describe('create + findById', () => {
    it('persists a visitor and retrieves it by id', async () => {
      const created = await repo.create(newVisitor);
      expect(created.id).toBeTruthy();
      expect(created.name).toBe('Dana Okoro');
      expect(created.visitCategory).toBe('contractor');

      const found = await repo.findById(created.id);
      expect(found).toEqual(created);
    });

    it('returns null for an unknown id', async () => {
      expect(await repo.findById('no-such-id')).toBeNull();
    });

    it('stores null email and company correctly', async () => {
      const created = await repo.create({ ...newVisitor, email: null, company: null, visitCategory: null });
      expect(created.email).toBeNull();
      expect(created.company).toBeNull();
      expect(created.visitCategory).toBeNull();
    });
  });
}

// ─── Run contract suite ───────────────────────────────────────────────────────

describe('InMemoryVisitorRepository', () => {
  describeVisitorRepository(() => new InMemoryVisitorRepository());
});
