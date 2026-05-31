import { beforeEach, describe, expect, it } from 'vitest';
import type { FireEventRepository } from '../../domain/repositories.js';
import { InMemoryFireEventRepository } from './in-memory-fire-event-repository.js';

// ─── Repository contract suite ────────────────────────────────────────────────

function describeFireEventRepository(factory: () => FireEventRepository) {
  let repo: FireEventRepository;

  beforeEach(() => {
    repo = factory();
  });

  describe('active', () => {
    it('returns null when no fire events exist', async () => {
      expect(await repo.active()).toBeNull();
    });

    it('returns the active fire event', async () => {
      await repo.create('kiosk');
      const active = await repo.active();
      expect(active).not.toBeNull();
      expect(active?.resolvedAt).toBeNull();
    });

    it('returns null after the event is resolved', async () => {
      const event = await repo.create('admin-001');
      await repo.resolve(event.id);
      expect(await repo.active()).toBeNull();
    });
  });

  describe('create', () => {
    it('creates a fire event with an id, triggeredBy, and null resolvedAt', async () => {
      const event = await repo.create('kiosk');
      expect(event.id).toBeTruthy();
      expect(event.triggeredBy).toBe('kiosk');
      expect(event.triggeredAt).toBeTruthy();
      expect(event.resolvedAt).toBeNull();
    });
  });

  describe('resolve', () => {
    it('sets resolvedAt on the event', async () => {
      const event = await repo.create('kiosk');
      const resolved = await repo.resolve(event.id);
      expect(resolved.resolvedAt).not.toBeNull();
      expect(resolved.id).toBe(event.id);
    });

    it('throws when resolving a non-existent event', async () => {
      await expect(repo.resolve('no-such-id')).rejects.toThrow();
    });
  });
}

// ─── Run contract suite ───────────────────────────────────────────────────────

describe('InMemoryFireEventRepository', () => {
  describeFireEventRepository(() => new InMemoryFireEventRepository());
});
