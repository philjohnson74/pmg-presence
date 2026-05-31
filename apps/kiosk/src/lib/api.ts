import type {
  CheckInRequest,
  CheckInResponse,
  PatientLookupResponse,
  ReturningVisitorResponse,
  VisitorPassResponse,
} from '@pmg/contracts';

const BASE = '/api';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ title: res.statusText }));
    throw new ApiError(res.status, (body as { title?: string }).title ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

// ─── Check-in / out ───────────────────────────────────────────────────────────

export function checkIn(body: CheckInRequest): Promise<CheckInResponse> {
  return req<CheckInResponse>('/checkin', { method: 'POST', body: JSON.stringify(body) });
}

export function checkOut(body: CheckInRequest): Promise<CheckInResponse> {
  return req<CheckInResponse>('/checkout', { method: 'POST', body: JSON.stringify(body) });
}

// ─── Patient lookup ───────────────────────────────────────────────────────────

export function patientLookup(name: string, dob: string): Promise<PatientLookupResponse> {
  const qs = new URLSearchParams({ name, dob });
  return req<PatientLookupResponse>(`/patients/lookup?${qs.toString()}`);
}

// ─── Returning visitor ────────────────────────────────────────────────────────

export function returningVisitorLookup(
  surname: string,
  code: string,
): Promise<ReturningVisitorResponse> {
  const qs = new URLSearchParams({ surname, code });
  return req<ReturningVisitorResponse>(`/visits/returning?${qs.toString()}`);
}

// ─── Visitor checkout picker ──────────────────────────────────────────────────

export interface CheckedInVisitor {
  personId: string;
  displayName: string;
}

export async function fetchCheckedInVisitors(): Promise<CheckedInVisitor[]> {
  const data = await req<{ visitors: CheckedInVisitor[] }>('/onsite/visitors');
  return data.visitors;
}

// ─── Fire ─────────────────────────────────────────────────────────────────────

export interface FireTriggerResponse {
  id: string;
  triggeredBy: string;
  triggeredAt: string;
  resolvedAt: null;
}

export function triggerFire(): Promise<FireTriggerResponse> {
  return req<FireTriggerResponse>('/fire/trigger', { method: 'POST', body: '{}' });
}

// Re-export pass type for convenience
export type { VisitorPassResponse };
