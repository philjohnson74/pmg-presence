import { beforeEach, describe, expect, it } from 'vitest';
import type { AuditLogRepository } from '../../domain/repositories.js';
import { InMemoryAuditLogRepository } from './in-memory-audit-log-repository.js';

// ─── Repository contract suite ────────────────────────────────────────────────

function describeAuditLogRepository(factory: () => AuditLogRepository) {
  let repo: AuditLogRepository;

  beforeEach(() => {
    repo = factory();
  });

  describe('record', () => {
    it('persists an audit entry and returns it with an id and timestamp', async () => {
      const entry = await repo.record({
        entity: 'employee',
        entityId: 'emp-001',
        action: 'deactivate',
        changedBy: 'admin-001',
        before: { active: true },
        after: { active: false },
      });

      expect(entry.id).toBeTruthy();
      expect(entry.entity).toBe('employee');
      expect(entry.entityId).toBe('emp-001');
      expect(entry.action).toBe('deactivate');
      expect(entry.changedBy).toBe('admin-001');
      expect(entry.timestamp).toBeTruthy();
      expect(entry.before).toEqual({ active: true });
      expect(entry.after).toEqual({ active: false });
    });

    it('stores null for omitted before/after', async () => {
      const entry = await repo.record({
        entity: 'fireEvent',
        entityId: 'fire-001',
        action: 'trigger',
        changedBy: 'kiosk',
      });

      expect(entry.before).toBeNull();
      expect(entry.after).toBeNull();
    });

    it('assigns unique ids to separate entries', async () => {
      const a = await repo.record({ entity: 'e', entityId: 'x', action: 'create', changedBy: 'sys' });
      const b = await repo.record({ entity: 'e', entityId: 'x', action: 'update', changedBy: 'sys' });
      expect(a.id).not.toBe(b.id);
    });
  });
}

// ─── Run contract suite ───────────────────────────────────────────────────────

describe('InMemoryAuditLogRepository', () => {
  describeAuditLogRepository(() => new InMemoryAuditLogRepository());
});
