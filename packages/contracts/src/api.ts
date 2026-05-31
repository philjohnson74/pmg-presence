import type {
  BookingStatus,
  CheckInMethod,
  Direction,
  ExpectationSource,
  PersonType,
  Role,
  RollCallState,
  VisitCategory,
} from './enums.js';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  userId: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface AuthUser {
  sub: string;
  name: string;
  email: string | null;
  roles: Role[];
}

// ─── Employees ────────────────────────────────────────────────────────────────

export interface Employee {
  id: string;
  name: string;
  email: string | null;
  role: Role;
  employeeNumber: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeRequest {
  name: string;
  email?: string | null;
  role: Role;
  employeeNumber: string;
}

export interface UpdateEmployeeRequest {
  name?: string;
  email?: string | null;
  role?: Role;
  active?: boolean;
}

export interface QrTokenResponse {
  qrToken: string;
  expiresAt: string;
}

// ─── Check-in ────────────────────────────────────────────────────────────────

export interface VisitorInput {
  name: string;
  email?: string | null;
  company?: string | null;
  host: string;
  visitReason: string;
  visitCategory?: VisitCategory | null;
}

export interface BookingInput {
  startDate: string; // ISO date YYYY-MM-DD
  endDate: string;   // ISO date; single-day ⇒ endDate === startDate
}

export interface ManualInput {
  name?: string;
  employeeNumber?: string;
  note?: string;
}

export interface CheckInRequest {
  method?: CheckInMethod;
  locationId: string;
  // method-specific payloads (only the relevant one is set)
  qrToken?: string;
  email?: string;
  patientId?: string;
  personId?: string;   // direct lookup for visitor/patient checkout
  personType?: PersonType;
  visitor?: VisitorInput;
  booking?: BookingInput;
  manual?: ManualInput;
}

export interface CheckInResponse {
  eventId: string;
  personType: PersonType;
  displayName: string;
  direction: Direction;
  timestamp: string;
  alreadyOnsite: boolean;
  debounced?: boolean;
  // only present when a multi-day booking was created
  pass?: VisitorPassResponse;
}

export interface VisitorPassResponse {
  passToken: string;
  passCode: string;
  validUntil: string;
}

// ─── On-site ─────────────────────────────────────────────────────────────────

export interface OccupancyCounts {
  employee: number;
  patient: number;
  visitor: number;
}

export interface OccupantRecord {
  personId: string;
  personType: PersonType;
  displayName: string;
  since: string;
  lastLocationId: string;
  host?: string;
  visitCategory?: VisitCategory;
}

export interface OnsiteResponse {
  asOf: string;
  counts: OccupancyCounts;
  visitorsByCategory: Record<string, number>;
  occupants: OccupantRecord[];
}

// ─── Expected presence ────────────────────────────────────────────────────────

export interface ExpectedPerson {
  personId: string;
  displayName: string;
  personType: PersonType;
  source: ExpectationSource;
  visitCategory?: VisitCategory;
  host?: string;
  checkedInToday: boolean;
}

export interface ExpectedResponse {
  date: string;
  expected: ExpectedPerson[];
}

// ─── Roll-call ────────────────────────────────────────────────────────────────

export interface RollCallEntry {
  fireEventId: string;
  personId: string;
  personType: PersonType;
  displayName: string;
  state: RollCallState;
  accountedFor: boolean;
  accountedAt: string | null;
  accountedBy: string | null;
}

export interface RollCallResponse {
  fireEventId: string;
  triggeredAt: string;
  entries: RollCallEntry[];
}

export interface MarkAccountedRequest {
  accountedFor: boolean;
}

// ─── Fire events ──────────────────────────────────────────────────────────────

export interface FireEvent {
  id: string;
  triggeredBy: string;
  triggeredAt: string;
  resolvedAt: string | null;
}

// ─── Visit history ────────────────────────────────────────────────────────────

export interface VisitHistoryRecord {
  eventId: string;
  personId: string;
  personType: PersonType;
  displayName: string;
  direction: Direction;
  method: CheckInMethod;
  locationId: string;
  timestamp: string;
}

export interface VisitHistoryResponse {
  records: VisitHistoryRecord[];
  total: number;
}

// ─── Patient lookup ───────────────────────────────────────────────────────────

export type PatientLookupResponse =
  | { match: true; patientId: string; displayName: string; patientReference: string }
  | { match: false };

// ─── Returning visitor ────────────────────────────────────────────────────────

export type ReturningVisitorResponse =
  | { match: true; visitorId: string; displayName: string; host: string; validUntil: string }
  | { match: false };

// ─── Visit bookings ──────────────────────────────────────────────────────────

export interface VisitBooking {
  id: string;
  visitorId: string;
  host: string;
  startDate: string;
  endDate: string;
  passCode: string | null;
  status: BookingStatus;
  createdAt: string;
}

// ─── Locations ───────────────────────────────────────────────────────────────

export interface Location {
  id: string;
  name: string;
  type: 'reception' | 'exit';
}

// ─── Problem JSON (RFC 7807 error shape) ─────────────────────────────────────

export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
}
