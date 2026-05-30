// ─── Core domain enumerations ────────────────────────────────────────────────
// Single source of truth — imported by api + all frontends.
// Changes here are compile errors everywhere; never drift silently.

export type Role = 'admin' | 'marshal' | 'employee';

/** The THREE behavioural person types. Drives sign-in flow, privacy tier, roll-call badge. */
export type PersonType = 'employee' | 'patient' | 'visitor';

/**
 * Optional operational tag on a Visitor. For ops aggregation (driver 3) only.
 * Never an identity or a required field — anything unforeseen → 'other'.
 */
export type VisitCategory =
  | 'commercial'
  | 'contractor'
  | 'maintenance'
  | 'supplier'
  | 'auditor'
  | 'nhs-commissioner'
  | 'other';

export type Direction = 'in' | 'out';

/**
 * HOW identity was established — one axis only (not which device).
 * "Where" is locationId; a device/channel axis is a separate future field if needed.
 *
 * Assurance level: qr > email/patient-lookup > visitor-form > manual
 */
export type CheckInMethod =
  | 'qr'             // signed token scanned (employee pass or visitor return pass)
  | 'email'          // employee matched by email lookup
  | 'patient-lookup' // patient matched by name + DOB
  | 'visitor-form'   // visitor self-entered new details
  | 'manual';        // hand-keyed, no automated match — audit-flagged

export type LocationType = 'reception' | 'exit';

/** Roll-call tile colour state. Red/green/amber in the evacuation view. */
export type RollCallState = 'unaccounted' | 'accounted' | 'expected-absent';

/** Source of an expected-presence record (drives amber roll-call). */
export type ExpectationSource = 'm365-calendar' | 'visit-booking';

export type BookingStatus = 'active' | 'completed' | 'cancelled';
