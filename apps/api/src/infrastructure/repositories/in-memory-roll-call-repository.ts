import type { NewRollCallEntry, RollCallEntry } from '../../domain/entities.js';
import type { RollCallRepository } from '../../domain/repositories.js';

export class InMemoryRollCallRepository implements RollCallRepository {
  // Keyed by `${fireEventId}:${personId}`
  private readonly store = new Map<string, RollCallEntry>();

  private key(fireEventId: string, personId: string): string {
    return `${fireEventId}:${personId}`;
  }

  async snapshot(entries: NewRollCallEntry[]): Promise<void> {
    for (const input of entries) {
      const entry: RollCallEntry = {
        ...input,
        accountedFor: input.state === 'accounted',
        accountedAt: null,
        accountedBy: null,
      };
      this.store.set(this.key(input.fireEventId, input.personId), entry);
    }
  }

  async list(fireEventId: string): Promise<RollCallEntry[]> {
    return [...this.store.values()].filter((e) => e.fireEventId === fireEventId);
  }

  async markAccounted(
    fireEventId: string,
    personId: string,
    by: string,
  ): Promise<RollCallEntry> {
    const k = this.key(fireEventId, personId);
    const existing = this.store.get(k);
    if (!existing) throw new Error(`RollCallEntry ${fireEventId}:${personId} not found`);
    const updated: RollCallEntry = {
      ...existing,
      state: 'accounted',
      accountedFor: true,
      accountedAt: new Date().toISOString(),
      accountedBy: by,
    };
    this.store.set(k, updated);
    return updated;
  }
}
