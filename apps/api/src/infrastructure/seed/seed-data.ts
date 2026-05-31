import type { CheckInEvent, Employee, Patient, VisitBooking, Visitor } from '../../domain/entities.js';
import type { Location } from '../../domain/entities.js';

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

export const EMPLOYEES: Employee[] = [
  {
    id: 'emp-001',
    name: 'David Stevens',
    email: 'david@peacocksgroup.com',
    role: 'admin',
    employeeNumber: 'PMG-0001',
    qrCodeToken: 'qr-seed-emp-001',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'emp-002',
    name: 'Chris Peacock',
    email: 'chris@peacocksgroup.com',
    role: 'admin',
    employeeNumber: 'PMG-0002',
    qrCodeToken: 'qr-seed-emp-002',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'emp-003',
    name: 'Priya Shah',
    email: 'priya@peacocksgroup.com',
    role: 'marshal',
    employeeNumber: 'PMG-0014',
    qrCodeToken: 'qr-seed-emp-003',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'emp-004',
    name: 'Gary Cooper',
    email: 'gary@peacocksgroup.com',
    role: 'marshal',
    employeeNumber: 'PMG-0003',
    qrCodeToken: 'qr-seed-emp-004',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'emp-005',
    name: 'Tom Bryson',
    email: 'tom.bryson@peacocksgroup.com',
    role: 'marshal',
    employeeNumber: 'PMG-0021',
    qrCodeToken: 'qr-seed-emp-005',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'emp-006',
    name: 'Sam Doyle',
    email: null, // no email — workshop tech (email-optional demo)
    role: 'employee',
    employeeNumber: 'PMG-1187',
    qrCodeToken: 'qr-seed-emp-006',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'emp-007',
    name: 'Aisha Khan',
    email: 'aisha@peacocksgroup.com',
    role: 'employee',
    employeeNumber: 'PMG-1044',
    qrCodeToken: 'qr-seed-emp-007',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'emp-008',
    name: 'Mark Reilly',
    email: null, // no email — manufacturing (email-optional demo)
    role: 'employee',
    employeeNumber: 'PMG-1190',
    qrCodeToken: 'qr-seed-emp-008',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'emp-009',
    name: 'Joanne Petrie',
    email: 'joanne@peacocksgroup.com',
    role: 'employee',
    employeeNumber: 'PMG-1071',
    qrCodeToken: 'qr-seed-emp-009',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'emp-010',
    name: 'Dev Anand',
    email: 'dev@peacocksgroup.com',
    role: 'employee',
    employeeNumber: 'PMG-1099',
    qrCodeToken: 'qr-seed-emp-010',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'emp-011',
    name: 'Carla Jones',
    email: 'carla@peacocksgroup.com',
    role: 'employee',
    employeeNumber: 'PMG-1058',
    qrCodeToken: 'qr-seed-emp-011',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

// ─── Patients (9) — mock clinical system records ──────────────────────────────
// Note: DOB is stored here for lookup matching only — PMG never persists it.

export const PATIENTS: Patient[] = [
  {
    id: 'pat-001',
    name: 'Joan Webb',
    dateOfBirth: '1951-03-14',
    patientReference: 'PMG-OUT-4471',
    clinicalSystemId: 'CLIN-88201',
  },
  {
    id: 'pat-002',
    name: 'Harold Spencer',
    dateOfBirth: '1948-11-02',
    patientReference: 'PMG-OUT-4472',
    clinicalSystemId: 'CLIN-88210',
  },
  {
    id: 'pat-003',
    name: 'Renée Fontaine', // diacritic — "renee fontaine" must also match
    dateOfBirth: '1989-06-30',
    patientReference: 'PMG-OUT-4473',
    clinicalSystemId: 'CLIN-88233',
  },
  {
    id: 'pat-004',
    name: 'Owen Pritchard',
    dateOfBirth: '2011-09-21',
    patientReference: 'PMG-OUT-4474',
    clinicalSystemId: 'CLIN-88240',
  },
  {
    id: 'pat-005',
    name: 'Maria Santos',
    dateOfBirth: '1976-01-08',
    patientReference: 'PMG-OUT-4475',
    clinicalSystemId: 'CLIN-88255',
  },
  {
    id: 'pat-006',
    name: 'Derek Lowe',
    dateOfBirth: '1963-04-17',
    patientReference: 'PMG-OUT-4476',
    clinicalSystemId: 'CLIN-88261',
  },
  {
    id: 'pat-007',
    name: 'Amara Okafor',
    dateOfBirth: '1995-12-05',
    patientReference: 'PMG-OUT-4477',
    clinicalSystemId: 'CLIN-88270',
  },
  {
    id: 'pat-008',
    name: 'Bill Thornton',
    dateOfBirth: '1957-07-25',
    patientReference: 'PMG-OUT-4478',
    clinicalSystemId: 'CLIN-88288',
  },
  {
    id: 'pat-009',
    name: 'Sophie Allen',
    dateOfBirth: '2003-02-11',
    patientReference: 'PMG-OUT-4479',
    clinicalSystemId: 'CLIN-88299',
  },
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
