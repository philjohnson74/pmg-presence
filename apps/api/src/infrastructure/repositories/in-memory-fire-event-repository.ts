import { randomUUID } from 'node:crypto';
import type { FireEvent } from '../../domain/entities.js';
import type { FireEventRepository } from '../../domain/repositories.js';

export class InMemoryFireEventRepository implements FireEventRepository {
  private readonly store = new Map<string, FireEvent>();

  async active(): Promise<FireEvent | null> {
    for (const event of this.store.values()) {
      if (event.resolvedAt === null) return event;
    }
    return null;
  }

  async list(): Promise<FireEvent[]> {
    return [...this.store.values()].sort((a, b) => a.triggeredAt.localeCompare(b.triggeredAt));
  }

  async create(triggeredBy: string): Promise<FireEvent> {
    const event: FireEvent = {
      id: randomUUID(),
      triggeredBy,
      triggeredAt: new Date().toISOString(),
      resolvedAt: null,
    };
    this.store.set(event.id, event);
    return event;
  }

  async resolve(id: string): Promise<FireEvent> {
    const event = this.store.get(id);
    if (!event) throw new Error(`FireEvent ${id} not found`);
    const resolved: FireEvent = { ...event, resolvedAt: new Date().toISOString() };
    this.store.set(id, resolved);
    return resolved;
  }
}
