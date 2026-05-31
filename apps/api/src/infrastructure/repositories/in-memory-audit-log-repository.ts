import { randomUUID } from 'node:crypto';
import type { AuditLog, NewAuditEntry } from '../../domain/entities.js';
import type { AuditLogRepository } from '../../domain/repositories.js';

export class InMemoryAuditLogRepository implements AuditLogRepository {
  private readonly entries: AuditLog[] = [];

  async record(input: NewAuditEntry): Promise<AuditLog> {
    const entry: AuditLog = {
      id: randomUUID(),
      entity: input.entity,
      entityId: input.entityId,
      action: input.action,
      changedBy: input.changedBy,
      timestamp: new Date().toISOString(),
      before: input.before ?? null,
      after: input.after ?? null,
    };
    this.entries.push(entry);
    return entry;
  }
}
