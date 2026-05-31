import type { AuthUser, LoginResponse } from '@pmg/contracts';
import type { EmployeeRepository } from '../../domain/repositories.js';
import type { JwtServicePort } from '../../domain/ports.js';

export class MockEntraProvider {
  constructor(
    private readonly employees: EmployeeRepository,
    private readonly jwtService: JwtServicePort,
    private readonly issuer: string,
    private readonly audience: string,
  ) {}

  async login(userId: string): Promise<LoginResponse> {
    const employee = await this.employees.findById(userId);
    if (!employee || !employee.active) {
      return Promise.reject(Object.assign(new Error('Employee not found'), { code: 'NOT_FOUND' }));
    }

    const user: AuthUser = {
      sub: employee.id,
      name: employee.name,
      email: employee.email,
      roles: [employee.role],
    };

    const token = this.jwtService.sign({
      sub: employee.id,
      name: employee.name,
      preferred_username: employee.email,
      roles: [employee.role],
      oid: employee.id,
      iss: this.issuer,
      aud: this.audience,
    });

    return { token, user };
  }
}
