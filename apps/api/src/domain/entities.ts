import type {
  BookingStatus,
  CheckInMethod,
  Direction,
  LocationType,
  PersonType,
  Role,
  RollCallState,
  VisitCategory,
} from '@pmg/contracts';

// ─── Employee ─────────────────────────────────────────────────────────────────

export interface Employee {
  readonly id: string;
  readonly name: string;
  readonly email: string | null;
  readonly role: Role;
  readonly employeeNumber: string;
  readonly qrCodeToken: string; // seed for short-lived QR JWT; never exposed via API
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface NewEmployee {
  readonly name: string;
  readonly email: string | null;
  readonly role: Role;
  readonly employeeNumber: string;
  readonly qrCodeToken: string;
}

// ─── Visitor ──────────────────────────────────────────────────────────────────

export interface Visitor {
  readonly id: string;
  readonly name: string;
  readonly email: string | null;
  readonly company: string | null;
  readonly host: string;
  readonly visitReason: string;
  readonly visitCategory: VisitCategory | null;
  readonly createdAt: string;
}

export interface NewVisitor {
  readonly name: string;
  readonly email: string | null;
  readonly company: string | null;
  readonly host: string;
  readonly visitReason: string;
  readonly visitCategory: VisitCategory | null;
}

// ─── Visit Booking ────────────────────────────────────────────────────────────

export interface VisitBooking {
  readonly id: string;
  readonly visitorId: string;
  readonly host: string;
  readonly startDate: string; // ISO date YYYY-MM-DD
  readonly endDate: string;   // single-day ⇒ endDate === startDate
  readonly passToken: string | null; // seed for return-pass QR; not in API response
  readonly passCode: string | null;  // short human-readable return code
  readonly status: BookingStatus;
  readonly createdAt: string;
}

export interface NewVisitBooking {
  readonly visitorId: string;
  readonly host: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly passToken: string | null;
  readonly passCode: string | null;
}

// ─── Check-in Event (append-only event log) ───────────────────────────────────

export interface CheckInEvent {
  readonly id: string;
  readonly personId: string;
  readonly personType: PersonType;
  readonly direction: Direction;
  readonly timestamp: string; // ISO 8601
  readonly method: CheckInMethod;
  readonly locationId: string;
  readonly displayName: string; // denormalised snapshot — never update
}

export interface NewCheckInEvent {
  readonly personId: string;
  readonly personType: PersonType;
  readonly direction: Direction;
  readonly method: CheckInMethod;
  readonly locationId: string;
  readonly displayName: string;
  readonly timestamp?: string; // defaults to now if omitted
}

// ─── Fire Event ───────────────────────────────────────────────────────────────

export interface FireEvent {
  readonly id: string;
  readonly triggeredBy: string;
  readonly triggeredAt: string;
  readonly resolvedAt: string | null;
}

// ─── Roll-call Entry ──────────────────────────────────────────────────────────

export interface RollCallEntry {
  readonly fireEventId: string;
  readonly personId: string;
  readonly personType: PersonType;
  readonly displayName: string;
  state: RollCallState;
  accountedFor: boolean;
  accountedAt: string | null;
  accountedBy: string | null;
}

export interface NewRollCallEntry {
  readonly fireEventId: string;
  readonly personId: string;
  readonly personType: PersonType;
  readonly displayName: string;
  readonly state: RollCallState;
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditLog {
  readonly id: string;
  readonly entity: string;
  readonly entityId: string;
  readonly action: string;
  readonly changedBy: string;
  readonly timestamp: string;
  readonly before: unknown;
  readonly after: unknown;
}

export interface NewAuditEntry {
  readonly entity: string;
  readonly entityId: string;
  readonly action: string;
  readonly changedBy: string;
  readonly before?: unknown;
  readonly after?: unknown;
}

// ─── Location ─────────────────────────────────────────────────────────────────

export interface Location {
  readonly id: string;
  readonly name: string;
  readonly type: LocationType;
}

// ─── History filter ───────────────────────────────────────────────────────────

export interface HistoryFilter {
  readonly from?: string;       // ISO date inclusive
  readonly to?: string;         // ISO date inclusive
  readonly name?: string;       // partial case-insensitive match on displayName
  readonly personType?: PersonType;
  readonly personId?: string;   // exact match — used for /employees/me/visits
}

// ─── Patient (mock clinical system record — never stored in PMG DB) ───────────

export interface Patient {
  readonly id: string;           // PMG-facing reference used as personId in CheckInEvent
  readonly name: string;
  readonly dateOfBirth: string;  // YYYY-MM-DD — used transiently for lookup only
  readonly patientReference: string;
  readonly clinicalSystemId: string;
}

// ─── Patient match (output of ClinicalSystemPort.lookup) ──────────────────────

export interface PatientMatch {
  readonly patientId: string;
  readonly displayName: string;
  readonly patientReference: string;
  // DOB and clinicalSystemId are deliberately excluded — data minimisation
}
