import type {
  Employee,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  OnsiteResponse,
  ExpectedResponse,
  VisitHistoryResponse,
  FireEvent,
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

// ─── Employees ────────────────────────────────────────────────────────────────

export interface EmployeeListResponse {
  employees: Employee[];
}

export function fetchEmployees(token: string): Promise<EmployeeListResponse> {
  return req<EmployeeListResponse>('/employees', token);
}

export function createEmployee(token: string, body: CreateEmployeeRequest): Promise<Employee> {
  return req<Employee>('/employees', token, { method: 'POST', body: JSON.stringify(body) });
}

export function updateEmployee(
  token: string,
  id: string,
  body: UpdateEmployeeRequest,
): Promise<Employee> {
  return req<Employee>(`/employees/${id}`, token, { method: 'PATCH', body: JSON.stringify(body) });
}

// ─── On-site ─────────────────────────────────────────────────────────────────

export function fetchOnsite(token: string, type?: string): Promise<OnsiteResponse> {
  const q = type ? `?type=${type}` : '';
  return req<OnsiteResponse>(`/onsite${q}`, token);
}

// ─── Expected ─────────────────────────────────────────────────────────────────

export function fetchExpected(token: string, date: string): Promise<ExpectedResponse> {
  return req<ExpectedResponse>(`/expected?date=${date}`, token);
}

// ─── History ─────────────────────────────────────────────────────────────────

export function fetchHistory(
  token: string,
  params: { from?: string; to?: string; q?: string; type?: string },
): Promise<VisitHistoryResponse> {
  const qs = new URLSearchParams();
  const { from, to, q, type } = params;
  if (from) qs.set('from', from);
  if (to) qs.set('to', to);
  if (q) qs.set('q', q);
  if (type) qs.set('type', type);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return req<VisitHistoryResponse>(`/visits/history${query}`, token);
}

// ─── Fire events ──────────────────────────────────────────────────────────────

export interface FireEventsResponse {
  events: FireEvent[];
}

export function fetchFireEvents(token: string): Promise<FireEventsResponse> {
  return req<FireEventsResponse>('/fire/events', token);
}

export function resolveFireEvent(token: string, id: string): Promise<FireEvent> {
  return req<FireEvent>(`/fire/${id}/resolve`, token, { method: 'POST', body: '{}' });
}
