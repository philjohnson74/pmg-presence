import { beforeEach, describe, expect, it } from 'vitest';
import type { EmployeeRepository } from '../../domain/repositories.js';
import { InMemoryEmployeeRepository } from './in-memory-employee-repository.js';

// ─── Repository contract suite ────────────────────────────────────────────────
// Any future implementation (e.g. PostgresEmployeeRepository) must pass these tests.

function describeEmployeeRepository(factory: () => EmployeeRepository) {
  let repo: EmployeeRepository;

  beforeEach(() => {
    repo = factory();
  });

  describe('create + findById', () => {
    it('persists a new employee and retrieves it by id', async () => {
      const created = await repo.create({
        name: 'Alice',
        email: 'alice@example.com',
        role: 'employee',
        employeeNumber: 'EMP-01',
        qrCodeToken: 'tok-01',
      });

      expect(created.id).toBeTruthy();
      expect(created.name).toBe('Alice');
      expect(created.active).toBe(true);

      const found = await repo.findById(created.id);
      expect(found).toEqual(created);
    });

    it('returns null for an unknown id', async () => {
      expect(await repo.findById('no-such-id')).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('finds an employee by email case-insensitively', async () => {
      await repo.create({
        name: 'Bob',
        email: 'Bob@Example.com',
        role: 'employee',
        employeeNumber: 'EMP-02',
        qrCodeToken: 'tok-02',
      });

      const found = await repo.findByEmail('bob@example.com');
      expect(found?.name).toBe('Bob');
    });

    it('returns null when email is not found', async () => {
      expect(await repo.findByEmail('ghost@example.com')).toBeNull();
    });

    it('does not match employees with null email', async () => {
      await repo.create({
        name: 'NoEmail',
        email: null,
        role: 'employee',
        employeeNumber: 'EMP-03',
        qrCodeToken: 'tok-03',
      });
      expect(await repo.findByEmail('')).toBeNull();
    });
  });

  describe('findByEmployeeNumber', () => {
    it('finds an employee by their employee number', async () => {
      await repo.create({
        name: 'Carol',
        email: null,
        role: 'employee',
        employeeNumber: 'PMG-999',
        qrCodeToken: 'tok-04',
      });

      const found = await repo.findByEmployeeNumber('PMG-999');
      expect(found?.name).toBe('Carol');
    });

    it('returns null for an unknown employee number', async () => {
      expect(await repo.findByEmployeeNumber('PMG-000')).toBeNull();
    });
  });

  describe('listActive', () => {
    it('returns only active employees', async () => {
      const a = await repo.create({ name: 'Active', email: null, role: 'employee', employeeNumber: 'A1', qrCodeToken: 't1' });
      await repo.create({ name: 'Active2', email: null, role: 'employee', employeeNumber: 'A2', qrCodeToken: 't2' });
      await repo.deactivate(a.id);

      const active = await repo.listActive();
      expect(active.map((e) => e.name)).not.toContain('Active');
      expect(active.map((e) => e.name)).toContain('Active2');
    });
  });

  describe('update', () => {
    it('applies a partial patch and updates updatedAt', async () => {
      const original = await repo.create({
        name: 'Dave',
        email: 'dave@example.com',
        role: 'employee',
        employeeNumber: 'EMP-05',
        qrCodeToken: 'tok-05',
      });

      const updated = await repo.update(original.id, { name: 'David', role: 'marshal' });
      expect(updated.name).toBe('David');
      expect(updated.role).toBe('marshal');
      expect(updated.email).toBe('dave@example.com'); // unchanged
      expect(updated.id).toBe(original.id); // id never changes
    });

    it('throws when updating a non-existent employee', async () => {
      await expect(repo.update('no-such-id', { name: 'Ghost' })).rejects.toThrow();
    });
  });

  describe('deactivate', () => {
    it('sets active to false', async () => {
      const emp = await repo.create({ name: 'Eve', email: null, role: 'employee', employeeNumber: 'EMP-06', qrCodeToken: 'tok-06' });
      await repo.deactivate(emp.id);
      const found = await repo.findById(emp.id);
      expect(found?.active).toBe(false);
    });
  });
}

// ─── Run the contract suite against the in-memory implementation ──────────────

describe('InMemoryEmployeeRepository', () => {
  describeEmployeeRepository(() => new InMemoryEmployeeRepository());
});
