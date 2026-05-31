import type { ExpectationSource, PersonType, Role, SseEvent, VisitCategory } from '@pmg/contracts';
import type { PatientMatch } from './entities.js';

// ─── Calendar port (mock M365 / Microsoft Graph in production) ────────────────

export interface CalendarEntry {
  readonly personId: string;
  readonly displayName: string;
  readonly personType: PersonType;
  readonly source: ExpectationSource;
  readonly visitCategory?: VisitCategory;
  readonly host?: string;
}

export interface CalendarPort {
  expectedOnsiteOn(date: string): Promise<CalendarEntry[]>;
}

// ─── Clinical system port (mock; real = HL7/API integration) ─────────────────

export interface ClinicalSystemPort {
  lookup(name: string, dob: string): Promise<PatientMatch | null>;
  findById(id: string): Promise<PatientMatch | null>;
}

// ─── Push notification port ───────────────────────────────────────────────────

export interface PushPort {
  notifyMarshals(payload: { fireEventId: string; triggeredAt: string }): Promise<void>;
}

// ─── Email port ───────────────────────────────────────────────────────────────

export interface EmailPort {
  sendCheckInConfirmation(
    to: string,
    ctx: { displayName: string; timestamp: string },
  ): Promise<void>;
}

// ─── SSE broker port ──────────────────────────────────────────────────────────

export interface SseBrokerPort {
  broadcast(event: SseEvent): void;
}

// ─── JWT service port ─────────────────────────────────────────────────────────

export interface JwtClaims {
  readonly sub: string;
  readonly name: string;
  readonly preferred_username: string | null;
  readonly roles: readonly Role[];
  readonly oid: string;
  readonly iss: string;
  readonly aud: string;
  readonly iat: number;
  readonly exp: number;
}

export interface JwtServicePort {
  sign(payload: Omit<JwtClaims, 'iat' | 'exp'>): string;
  verify(token: string): JwtClaims;
  /** Verify any token signed with the same secret; returns raw decoded payload. */
  verifyRaw(token: string): Record<string, unknown>;
  /** Sign a token with a custom expiry date (for visitor pass tokens). */
  signRaw(payload: Record<string, unknown>, expiresAt: Date): string;
}
