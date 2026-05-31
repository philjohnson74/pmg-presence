import { randomUUID } from 'node:crypto';
import type { Employee, NewEmployee } from '../../domain/entities.js';
import type { EmployeeRepository } from '../../domain/repositories.js';

export class InMemoryEmployeeRepository implements EmployeeRepository {
  private readonly store = new Map<string, Employee>();

  async findById(id: string): Promise<Employee | null> {
    return this.store.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<Employee | null> {
    const lower = email.toLowerCase();
    for (const employee of this.store.values()) {
      if (employee.email?.toLowerCase() === lower) return employee;
    }
    return null;
  }

  async findByEmployeeNumber(n: string): Promise<Employee | null> {
    for (const employee of this.store.values()) {
      if (employee.employeeNumber === n) return employee;
    }
    return null;
  }

  async listActive(): Promise<Employee[]> {
    return [...this.store.values()].filter((e) => e.active);
  }

  async create(input: NewEmployee): Promise<Employee> {
    const now = new Date().toISOString();
    const employee: Employee = {
      id: randomUUID(),
      ...input,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(employee.id, employee);
    return employee;
  }

  async update(
    id: string,
    patch: Partial<Pick<Employee, 'name' | 'email' | 'role' | 'active' | 'qrCodeToken'>>,
  ): Promise<Employee> {
    const existing = this.store.get(id);
    if (!existing) throw new Error(`Employee ${id} not found`);
    const updated: Employee = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    this.store.set(id, updated);
    return updated;
  }

  async deactivate(id: string): Promise<void> {
    await this.update(id, { active: false });
  }

  /** Bypass ID generation for deterministic seed data. */
  seed(employee: Employee): void {
    this.store.set(employee.id, employee);
  }
}
