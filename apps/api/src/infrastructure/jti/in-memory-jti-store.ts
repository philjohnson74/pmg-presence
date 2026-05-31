import type { JtiRecord, JtiStore } from '../../domain/jti-store.js';

interface Entry {
  record: JtiRecord;
  expiresAt: number; // unix ms
}

export class InMemoryJtiStore implements JtiStore {
  private readonly store = new Map<string, Entry>();

  check(jti: string): JtiRecord | null {
    this.evict();
    return this.store.get(jti)?.record ?? null;
  }

  mark(jti: string, record: JtiRecord, tokenExpiresAt: Date): void {
    this.store.set(jti, { record, expiresAt: tokenExpiresAt.getTime() });
  }

  private evict(): void {
    const now = Date.now();
    for (const [jti, entry] of this.store.entries()) {
      if (entry.expiresAt < now) this.store.delete(jti);
    }
  }
}
