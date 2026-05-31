import request from 'supertest';
import type { Employee, Patient } from '../../domain/entities.js';
import type { createServer } from '../server.js';

export const ADMIN: Employee = {
  id: 'emp-admin',
  name: 'David Admin',
  email: 'admin@test.com',
  role: 'admin',
  employeeNumber: 'PMG-0001',
  qrCodeToken: 'qr-admin',
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const MARSHAL: Employee = {
  id: 'emp-marshal',
  name: 'Mary Marshal',
  email: 'marshal@test.com',
  role: 'marshal',
  employeeNumber: 'PMG-0002',
  qrCodeToken: 'qr-marshal',
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const EMPLOYEE: Employee = {
  id: 'emp-regular',
  name: 'Gary Cooper',
  email: 'gary@test.com',
  role: 'employee',
  employeeNumber: 'PMG-1001',
  qrCodeToken: 'qr-gary',
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const NO_EMAIL_EMPLOYEE: Employee = {
  id: 'emp-noemail',
  name: 'Sam Workshop',
  email: null,
  role: 'employee',
  employeeNumber: 'PMG-1187',
  qrCodeToken: 'qr-sam',
  active: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const TEST_PATIENT: Patient = {
  id: 'pat-001',
  name: 'Joan Webb',
  dateOfBirth: '1951-03-14',
  patientReference: 'PMG-OUT-4471',
  clinicalSystemId: 'cs-001',
};

export async function getToken(
  app: ReturnType<typeof createServer>,
  userId: string,
): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ userId });
  return (res.body as { token: string }).token;
}
