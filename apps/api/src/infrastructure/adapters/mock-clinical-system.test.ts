import { describe, expect, it } from 'vitest';
import type { Patient } from '../../domain/entities.js';
import { MockClinicalSystem } from './mock-clinical-system.js';

const PATIENTS: Patient[] = [
  { id: 'pat-001', name: 'Joan Webb',      dateOfBirth: '1951-03-14', patientReference: 'PMG-OUT-4471', clinicalSystemId: 'CLIN-88201' },
  { id: 'pat-003', name: 'Renée Fontaine', dateOfBirth: '1989-06-30', patientReference: 'PMG-OUT-4473', clinicalSystemId: 'CLIN-88233' },
  { id: 'pat-004', name: 'Owen Pritchard', dateOfBirth: '2011-09-21', patientReference: 'PMG-OUT-4474', clinicalSystemId: 'CLIN-88240' },
];

describe('MockClinicalSystem', () => {
  const system = new MockClinicalSystem(PATIENTS);

  describe('lookup — successful match', () => {
    it('returns a match for exact name and DOB', async () => {
      const result = await system.lookup('Joan Webb', '1951-03-14');
      expect(result).not.toBeNull();
      expect(result?.patientId).toBe('pat-001');
      expect(result?.displayName).toBe('Joan Webb');
      expect(result?.patientReference).toBe('PMG-OUT-4471');
    });

    it('is case-insensitive on name', async () => {
      const result = await system.lookup('joan webb', '1951-03-14');
      expect(result?.patientId).toBe('pat-001');
    });

    it('is case-insensitive with mixed case', async () => {
      const result = await system.lookup('JOAN WEBB', '1951-03-14');
      expect(result?.patientId).toBe('pat-001');
    });

    it('strips diacritics (Renée → renee)', async () => {
      const result = await system.lookup('Renee Fontaine', '1989-06-30');
      expect(result?.patientId).toBe('pat-003');
    });

    it('tolerates extra whitespace in the name', async () => {
      const result = await system.lookup('  Joan  Webb  ', '1951-03-14');
      expect(result?.patientId).toBe('pat-001');
    });
  });

  describe('lookup — no match', () => {
    it('returns null for an unknown name', async () => {
      expect(await system.lookup('Nobody Here', '1951-03-14')).toBeNull();
    });

    it('returns null when DOB is wrong even if name matches', async () => {
      // Name matches Joan Webb but DOB is wrong
      expect(await system.lookup('Joan Webb', '1960-01-01')).toBeNull();
    });

    it('returns null for an empty patient list', async () => {
      const empty = new MockClinicalSystem([]);
      expect(await empty.lookup('Joan Webb', '1951-03-14')).toBeNull();
    });
  });

  describe('lookup — data minimisation', () => {
    it('does not return DOB or clinicalSystemId in the response', async () => {
      const result = await system.lookup('Joan Webb', '1951-03-14');
      expect(result).not.toHaveProperty('dateOfBirth');
      expect(result).not.toHaveProperty('clinicalSystemId');
    });
  });
});
