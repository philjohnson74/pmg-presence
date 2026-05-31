import type {
  CheckInResponse,
  OnsiteResponse,
  QrTokenResponse,
  RollCallResponse,
  VisitHistoryResponse,
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

async function req<T>(path: string, token: string | null, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ title: res.statusText }));
    throw new ApiError(res.status, (body as { title?: string }).title ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface PickerUser {
  id: string;
  name: string;
  email: string | null;
  role: string;
}

export async function fetchPickerUsers(): Promise<PickerUser[]> {
  const data = await req<{ users: PickerUser[] }>('/auth/users', null);
  return data.users;
}

// ─── QR ───────────────────────────────────────────────────────────────────────

export function fetchQrToken(token: string): Promise<QrTokenResponse> {
  return req<QrTokenResponse>('/employees/me/qr', token);
}

// ─── Self check-in / out ──────────────────────────────────────────────────────

export function selfCheckIn(
  token: string,
  qrToken: string,
  locationId: string,
): Promise<CheckInResponse> {
  return req<CheckInResponse>('/checkin', token, {
    method: 'POST',
    body: JSON.stringify({ method: 'qr', qrToken, locationId }),
  });
}

export function selfCheckOut(
  token: string,
  qrToken: string,
  locationId: string,
): Promise<CheckInResponse> {
  return req<CheckInResponse>('/checkout', token, {
    method: 'POST',
    body: JSON.stringify({ method: 'qr', qrToken, locationId }),
  });
}

// ─── On-site ─────────────────────────────────────────────────────────────────

export function fetchOnsite(token: string): Promise<OnsiteResponse> {
  return req<OnsiteResponse>('/onsite', token);
}

// ─── Roll-call ────────────────────────────────────────────────────────────────

export function fetchRollCall(token: string): Promise<RollCallResponse> {
  return req<RollCallResponse>('/onsite/rollcall', token);
}

export function patchAccountedFor(
  token: string,
  personId: string,
  accountedFor: boolean,
): Promise<unknown> {
  return req(`/onsite/rollcall/${personId}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ accountedFor }),
  });
}

// ─── My visits ────────────────────────────────────────────────────────────────

export function fetchMyVisits(token: string): Promise<VisitHistoryResponse> {
  return req<VisitHistoryResponse>('/employees/me/visits', token);
}
