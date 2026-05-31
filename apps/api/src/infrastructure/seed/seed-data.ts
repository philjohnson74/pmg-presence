import type { Role } from '@pmg/contracts';
import type { CheckInEvent, Employee, Location, Patient, VisitBooking, Visitor } from '../../domain/entities.js';

// ─── Canonical demo date ───────────────────────────────────────────────────────
// All seed timestamps and expected-presence entries are relative to this date.
// Tests that call expectedOn() should pass SEED_DATE to get deterministic results.
export const SEED_DATE = '2026-05-31';

// ─── Locations ────────────────────────────────────────────────────────────────

export const LOCATIONS: Location[] = [
  { id: 'loc-reception', name: 'Main Reception', type: 'reception' },
  { id: 'loc-workshop-exit', name: 'Workshop Exit', type: 'exit' },
];

// ─── Employees (11) ───────────────────────────────────────────────────────────
// 2 admins, 3 marshals, 6 employees; 2 with no email (rows 6 & 8 in doc 10)

const EMP_CREATED_AT = '2026-01-01T00:00:00.000Z';

function makeEmployee(
  id: string, name: string, email: string | null,
  role: Role, employeeNumber: string, qrCodeToken: string,
): Employee {
  return { id, name, email, role, employeeNumber, qrCodeToken, active: true, createdAt: EMP_CREATED_AT, updatedAt: EMP_CREATED_AT };
}

export const EMPLOYEES: Employee[] = [
  makeEmployee('emp-001', 'David Stevens',         'david@peacocksgroup.com',       'admin',    'PMG-0001', 'qr-seed-emp-001'),
  makeEmployee('emp-002', 'Chris Peacock',          'chris@peacocksgroup.com',       'admin',    'PMG-0002', 'qr-seed-emp-002'),
  makeEmployee('emp-003', 'Priya Shah',             'priya@peacocksgroup.com',       'marshal',  'PMG-0014', 'qr-seed-emp-003'),
  makeEmployee('emp-004', 'Gary Cooper',            'gary@peacocksgroup.com',        'marshal',  'PMG-0003', 'qr-seed-emp-004'),
  makeEmployee('emp-005', 'Tom Bryson',             'tom.bryson@peacocksgroup.com',  'marshal',  'PMG-0021', 'qr-seed-emp-005'),
  makeEmployee('emp-006', 'Sam Doyle',              null, /* no email — workshop tech */  'employee', 'PMG-1187', 'qr-seed-emp-006'),
  makeEmployee('emp-007', 'Aisha Khan',             'aisha@peacocksgroup.com',       'employee', 'PMG-1044', 'qr-seed-emp-007'),
  makeEmployee('emp-008', 'Mark Reilly',            null, /* no email — manufacturing */ 'employee', 'PMG-1190', 'qr-seed-emp-008'),
  makeEmployee('emp-009', 'Joanne Petrie',          'joanne@peacocksgroup.com',      'employee', 'PMG-1071', 'qr-seed-emp-009'),
  makeEmployee('emp-010', 'Dev Anand',              'dev@peacocksgroup.com',         'employee', 'PMG-1099', 'qr-seed-emp-010'),
  makeEmployee('emp-011', 'Carla Jones',            'carla@peacocksgroup.com',       'employee', 'PMG-1058', 'qr-seed-emp-011'),
];

// ─── Patients (9) — mock clinical system records ──────────────────────────────
// Note: DOB is stored here for lookup matching only — PMG never persists it.

function makePatient(
  id: string, name: string, dateOfBirth: string,
  patientReference: string, clinicalSystemId: string,
): Patient {
  return { id, name, dateOfBirth, patientReference, clinicalSystemId };
}

export const PATIENTS: Patient[] = [
  makePatient('pat-001', 'Joan Webb',        '1951-03-14', 'PMG-OUT-4471', 'CLIN-88201'),
  makePatient('pat-002', 'Harold Spencer',   '1948-11-02', 'PMG-OUT-4472', 'CLIN-88210'),
  makePatient('pat-003', 'Renée Fontaine',   '1989-06-30', 'PMG-OUT-4473', 'CLIN-88233'), // diacritic — "renee fontaine" must also match
  makePatient('pat-004', 'Owen Pritchard',   '2011-09-21', 'PMG-OUT-4474', 'CLIN-88240'),
  makePatient('pat-005', 'Maria Santos',     '1976-01-08', 'PMG-OUT-4475', 'CLIN-88255'),
  makePatient('pat-006', 'Derek Lowe',       '1963-04-17', 'PMG-OUT-4476', 'CLIN-88261'),
  makePatient('pat-007', 'Amara Okafor',     '1995-12-05', 'PMG-OUT-4477', 'CLIN-88270'),
  makePatient('pat-008', 'Bill Thornton',    '1957-07-25', 'PMG-OUT-4478', 'CLIN-88288'),
  makePatient('pat-009', 'Sophie Allen',     '2003-02-11', 'PMG-OUT-4479', 'CLIN-88299'),
];

// ─── Visitors (5) ─────────────────────────────────────────────────────────────

export const VISITORS: Visitor[] = [
  {
    id: 'vis-001',
    name: 'Dana Okoro',
    email: null,
    company: 'Acme HVAC',
    host: 'Gary Cooper',
    visitReason: 'Installing new compressor in workshop',
    visitCategory: 'contractor',
    createdAt: '2026-05-30T08:00:00.000Z',
  },
  {
    id: 'vis-002',
    name: 'Bram de Vries',
    email: null,
    company: 'Acme HVAC',
    host: 'Gary Cooper',
    visitReason: 'HVAC maintenance across multiple workshop areas',
    visitCategory: 'contractor',
    createdAt: '2026-05-28T08:00:00.000Z',
  },
  {
    id: 'vis-003',
    name: 'Niamh Boyle',
    email: 'n.boyle@nhsneprocurement.nhs.uk',
    company: 'NHS NE Procurement',
    host: 'David Stevens',
    visitReason: 'Quarterly commissioner review',
    visitCategory: 'nhs-commissioner',
    createdAt: '2026-05-31T08:30:00.000Z',
  },
  {
    id: 'vis-004',
    name: 'Greg Hall',
    email: null,
    company: 'Sterident Supplies',
    host: 'Joanne Petrie',
    visitReason: 'Delivery of orthotic materials',
    visitCategory: 'supplier',
    createdAt: '2026-05-31T08:45:00.000Z',
  },
  {
    id: 'vis-005',
    name: 'Laura Finch',
    email: 'l.finch@bsigroup.com',
    company: 'BSI Audit',
    host: 'Carla Jones',
    visitReason: 'ISO 9001 annual surveillance audit',
    visitCategory: 'auditor',
    createdAt: '2026-05-31T08:30:00.000Z',
  },
];

// ─── Visit Bookings (5) ───────────────────────────────────────────────────────
// Dana (multi-day, present) + Bram (multi-day, absent → amber) + 3 today-only

export const VISIT_BOOKINGS: VisitBooking[] = [
  {
    id: 'book-001',
    visitorId: 'vis-001', // Dana Okoro — multi-day, already on site
    host: 'Gary Cooper',
    startDate: '2026-05-30',
    endDate: '2026-06-12',
    passToken: 'pass-token-vis-001',
    passCode: 'DANA4Q',
    status: 'active',
    createdAt: '2026-05-30T08:00:00.000Z',
  },
  {
    id: 'book-002',
    visitorId: 'vis-002', // Bram de Vries — multi-day, NOT checked in today → amber
    host: 'Gary Cooper',
    startDate: '2026-05-28',
    endDate: '2026-06-06',
    passToken: 'pass-token-vis-002',
    passCode: 'BRAM7R',
    status: 'active',
    createdAt: '2026-05-28T08:00:00.000Z',
  },
  {
    id: 'book-003',
    visitorId: 'vis-003', // Niamh Boyle — today only, present
    host: 'David Stevens',
    startDate: SEED_DATE,
    endDate: SEED_DATE,
    passToken: null,
    passCode: null,
    status: 'active',
    createdAt: '2026-05-31T08:30:00.000Z',
  },
  {
    id: 'book-004',
    visitorId: 'vis-004', // Greg Hall — today only, present
    host: 'Joanne Petrie',
    startDate: SEED_DATE,
    endDate: SEED_DATE,
    passToken: null,
    passCode: null,
    status: 'active',
    createdAt: '2026-05-31T08:45:00.000Z',
  },
  {
    id: 'book-005',
    visitorId: 'vis-005', // Laura Finch — today only, present
    host: 'Carla Jones',
    startDate: SEED_DATE,
    endDate: SEED_DATE,
    passToken: null,
    passCode: null,
    status: 'active',
    createdAt: '2026-05-31T08:30:00.000Z',
  },
];

// ─── Pre-seeded check-in events ───────────────────────────────────────────────
// 10 people already on site at demo start so the on-site list is populated from t=0.
// All events are 'in'; nobody has checked out. IDs are deterministic for test assertions.

export const CHECK_IN_EVENTS: CheckInEvent[] = [
  // Employees
  {
    id: 'evt-001',
    personId: 'emp-004', // Gary Cooper
    personType: 'employee',
    direction: 'in',
    method: 'qr',
    locationId: 'loc-reception',
    displayName: 'Gary Cooper',
    timestamp: `${SEED_DATE}T07:55:00.000Z`,
  },
  {
    id: 'evt-002',
    personId: 'emp-007', // Aisha Khan
    personType: 'employee',
    direction: 'in',
    method: 'email',
    locationId: 'loc-reception',
    displayName: 'Aisha Khan',
    timestamp: `${SEED_DATE}T08:10:00.000Z`,
  },
  {
    id: 'evt-003',
    personId: 'emp-009', // Joanne Petrie
    personType: 'employee',
    direction: 'in',
    method: 'email',
    locationId: 'loc-reception',
    displayName: 'Joanne Petrie',
    timestamp: `${SEED_DATE}T08:02:00.000Z`,
  },
  {
    id: 'evt-004',
    personId: 'emp-011', // Carla Jones
    personType: 'employee',
    direction: 'in',
    method: 'qr',
    locationId: 'loc-workshop-exit',
    displayName: 'Carla Jones',
    timestamp: `${SEED_DATE}T08:20:00.000Z`,
  },
  {
    id: 'evt-005',
    personId: 'emp-006', // Sam Doyle — no email, checked in via manual fallback
    personType: 'employee',
    direction: 'in',
    method: 'manual',
    locationId: 'loc-workshop-exit',
    displayName: 'Sam Doyle',
    timestamp: `${SEED_DATE}T07:48:00.000Z`,
  },
  // Visitors
  {
    id: 'evt-006',
    personId: 'vis-001', // Dana Okoro (contractor, multi-day)
    personType: 'visitor',
    direction: 'in',
    method: 'qr',
    locationId: 'loc-reception',
    displayName: 'Dana Okoro',
    timestamp: `${SEED_DATE}T08:30:00.000Z`,
  },
  {
    id: 'evt-007',
    personId: 'vis-005', // Laura Finch (auditor)
    personType: 'visitor',
    direction: 'in',
    method: 'visitor-form',
    locationId: 'loc-reception',
    displayName: 'Laura Finch',
    timestamp: `${SEED_DATE}T08:50:00.000Z`,
  },
  {
    id: 'evt-008',
    personId: 'vis-003', // Niamh Boyle (nhs-commissioner)
    personType: 'visitor',
    direction: 'in',
    method: 'visitor-form',
    locationId: 'loc-reception',
    displayName: 'Niamh Boyle',
    timestamp: `${SEED_DATE}T08:55:00.000Z`,
  },
  {
    id: 'evt-009',
    personId: 'vis-004', // Greg Hall (supplier)
    personType: 'visitor',
    direction: 'in',
    method: 'visitor-form',
    locationId: 'loc-reception',
    displayName: 'Greg Hall',
    timestamp: `${SEED_DATE}T09:10:00.000Z`,
  },
  // Patient
  {
    id: 'evt-010',
    personId: 'pat-001', // Joan Webb
    personType: 'patient',
    direction: 'in',
    method: 'patient-lookup',
    locationId: 'loc-reception',
    displayName: 'Joan Webb',
    timestamp: `${SEED_DATE}T09:00:00.000Z`,
  },
];

// ─── M365 calendar entries (amber staff) ─────────────────────────────────────
// Priya Shah and Dev Anand are expected on SEED_DATE but have not checked in.

export const M365_CALENDAR_ENTRIES = [
  {
    personId: 'emp-003', // Priya Shah
    displayName: 'Priya Shah',
    personType: 'employee' as const,
    source: 'm365-calendar' as const,
    date: SEED_DATE,
  },
  {
    personId: 'emp-010', // Dev Anand
    displayName: 'Dev Anand',
    personType: 'employee' as const,
    source: 'm365-calendar' as const,
    date: SEED_DATE,
  },
];
