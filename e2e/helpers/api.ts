import type { APIRequestContext } from '@playwright/test';

const API = 'http://localhost:4000';

export async function apiLogin(
  request: APIRequestContext,
  userId: string,
): Promise<string> {
  const res = await request.post(`${API}/api/auth/login`, {
    data: { userId },
  });
  if (!res.ok()) throw new Error(`Login failed: ${res.status()} — ${await res.text()}`);
  const body = await res.json() as { token: string };
  return body.token;
}

export async function apiGet<T>(
  request: APIRequestContext,
  path: string,
  token?: string,
): Promise<T> {
  const res = await request.get(`${API}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok()) throw new Error(`GET ${path} failed: ${res.status()} — ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(
  request: APIRequestContext,
  path: string,
  data: unknown,
  token?: string,
): Promise<{ status: number; body: T }> {
  const res = await request.post(`${API}${path}`, {
    data,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return { status: res.status(), body: await res.json() as T };
}

export async function apiPatch<T>(
  request: APIRequestContext,
  path: string,
  data: unknown,
  token: string,
): Promise<T> {
  const res = await request.patch(`${API}${path}`, {
    data,
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok()) throw new Error(`PATCH ${path} failed: ${res.status()} — ${await res.text()}`);
  return res.json() as Promise<T>;
}

/** Seed reset — calls the API seed endpoint available in non-production mode */
export async function resolveFireIfActive(
  request: APIRequestContext,
  token: string,
): Promise<void> {
  const eventsRes = await request.get(`${API}/api/fire/events`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!eventsRes.ok()) return;
  const data = await eventsRes.json() as { events: Array<{ id: string; resolvedAt: string | null }> };
  const active = data.events.find((e) => !e.resolvedAt);
  if (active) {
    await request.post(`${API}/api/fire/${active.id}/resolve`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
