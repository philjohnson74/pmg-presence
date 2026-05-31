import type { AuthUser, LoginResponse } from '@pmg/contracts';

export interface AuthProvider {
  login(userId: string): Promise<LoginResponse>;
  getToken(): string | null;
  getUser(): AuthUser | null;
  logout(): void;
}
