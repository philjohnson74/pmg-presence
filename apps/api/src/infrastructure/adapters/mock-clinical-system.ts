import type { Patient, PatientMatch } from '../../domain/entities.js';
import type { ClinicalSystemPort } from '../../domain/ports.js';

/**
 * Mock clinical system adapter.
 * Performs case-insensitive, diacritic-tolerant name matching + exact DOB check.
 * In production this would call the real clinical system API (HL7/REST).
 */
export class MockClinicalSystem implements ClinicalSystemPort {
  constructor(private readonly patients: ReadonlyArray<Patient>) {}

  async lookup(name: string, dob: string): Promise<PatientMatch | null> {
    const normalisedName = normalise(name);

    for (const patient of this.patients) {
      if (patient.dateOfBirth !== dob) continue;
      if (normalise(patient.name) !== normalisedName) continue;
      return {
        patientId: patient.id,
        displayName: patient.name,
        patientReference: patient.patientReference,
      };
    }
    return null;
  }

  async findById(id: string): Promise<PatientMatch | null> {
    const patient = this.patients.find((p) => p.id === id);
    if (!patient) return null;
    return {
      patientId: patient.id,
      displayName: patient.name,
      patientReference: patient.patientReference,
    };
  }
}

function normalise(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .replace(/\s+/g, ' ');
}
