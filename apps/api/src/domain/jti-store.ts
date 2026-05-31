import type { Direction, PersonType } from '@pmg/contracts';

/** Minimal record stored per used JTI — enough to reconstruct a debounce response. */
export interface JtiRecord {
  readonly eventId: string;
  readonly direction: Direction;
  readonly personType: PersonType;
  readonly displayName: string;
  readonly timestamp: string;
}

/**
 * Tracks recently-used QR token JTIs to prevent replay within the token's
 * lifetime. If the same jti arrives twice, the second call is treated as a
 * debounce (returns the same event, HTTP 200) rather than creating a duplicate.
 */
export interface JtiStore {
  /** Returns the stored record if this jti was already used; null otherwise. */
  check(jti: string): JtiRecord | null;
  /** Mark a jti as used. tokenExpiresAt drives lazy eviction of stale entries. */
  mark(jti: string, record: JtiRecord, tokenExpiresAt: Date): void;
}
