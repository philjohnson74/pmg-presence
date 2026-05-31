import type { AuthUser, LoginResponse } from '@pmg/contracts';
import type { AuthProvider } from './auth-provider.js';

export class MockAuthProvider implements AuthProvider {
  private token: string | null = null;
  private user: AuthUser | null = null;

  constructor(private readonly apiBaseUrl: string) {}

  async login(userId: string): Promise<LoginResponse> {
    const res = await fetch(`${this.apiBaseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw Object.assign(new Error('Login failed'), { status: res.status, body });
    }

    const data = (await res.json()) as LoginResponse;
    this.token = data.token;
    this.user = data.user;
    return data;
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): AuthUser | null {
    return this.user;
  }

  logout(): void {
    this.token = null;
    this.user = null;
  }
}
