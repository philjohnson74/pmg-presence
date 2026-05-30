# 02 — Data Model

Production-representative model. In the MVP every entity lives in an in-memory store behind
a repository interface; the field shapes, types and relationships are exactly what a
PostgreSQL schema would hold, so the swap is mechanical.

## 2.1 Enumerations (value objects)

```ts
type Role          = 'admin' | 'marshal' | 'employee';
type Direction     = 'in' | 'out';
type LocationType  = 'reception' | 'exit';

// HOW the person was identified for this event (one axis — assurance/mechanism).
// "Where" is answered separately by locationId; "which device/channel" is a future
// field if ever needed — never overloaded onto method. (Replaces the old 'kiosk-form',
// which conflated device with mechanism — see note below.)
type CheckInMethod =
  | 'qr'             // scanned a signed QR token (employee pass or visitor return pass)
  | 'email'          // employee matched by email lookup at a kiosk
  | 'patient-lookup' // patient matched by name + DOB against the clinical system
  | 'visitor-form'   // visitor self-entered new details (walk-up sign-in / new booking)
  | 'manual';        // reception/kiosk hand-keyed, NO automated match — lower assurance, audit-flagged
type RollCallState = 'unaccounted' | 'accounted' | 'expected-absent'; // red / green / amber

// The ONE behavioural type — drives sign-in flow, privacy tier and roll-call badge.
// Three values, because these are the three kinds of people the system treats differently.
type PersonType = 'employee' | 'patient' | 'visitor';

// Optional, non-identity TAG on a visitor — for operational aggregation only (driver 3).
// Always optional; anything unusual is captured in the free-text `visitReason` / 'other'.
type VisitCategory =
  | 'commercial'
  | 'contractor'
  | 'maintenance'
  | 'supplier'
  | 'auditor'
  | 'nhs-commissioner'
  | 'other';

// Source of an "expected on site" record (drives amber roll-call) — see ExpectedPresenceService.
type ExpectationSource = 'm365-calendar' | 'visit-booking';
```

> **Note — three axes, deliberately separated.** Earlier drafts tangled three different things
> into the `PersonType` enum. They are now distinct:
>
> 1. **Person type** (`employee | patient | visitor`) — *how the system treats you*: which sign-in
>    flow, which privacy tier, which roll-call badge. Three values, because there are three
>    genuinely different behaviours.
> 2. **Reason for visit** — *why a visitor is here*: a free-text `visitReason` (flexible,
>    future-proof — a visitor type we never imagined needs no code change) **plus** an *optional*
>    `visitCategory` tag so operations can still count "how many contractors / suppliers today"
>    (driver 3) without forcing a rigid taxonomy.
> 3. **Expected duration** — *which days*: a single-day or multi-day `VisitBooking`. This — not the
>    person type — is what drives the contractor "don't make me re-register daily" behaviour and
>    the amber "expected but not checked in" roll-call state.
>
> So `contractor`/`supplier`/`auditor` are **not** person types any more — they are a visitor's
> optional category. On the marshal tile a contractor reads **"Visitor · contractor"** (category as
> a secondary label), preserving the brief's intent to surface it while keeping the type system to
> three stable values.

## 2.2 Entities

### Employee
| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` (uuid) | PK |
| `name` | `string` | required |
| `email` | `string \| null` | **optional** — not all staff have email; never required for check-in |
| `role` | `Role` | drives RBAC |
| `employeeNumber` | `string` | human-facing payroll/badge number, unique |
| `qrCodeToken` | `string` | current signed token seed/identifier (see doc 04); the displayed QR encodes a short-lived JWT derived from the employee, not this raw value |
| `active` | `boolean` | deactivated employees cannot check in and are hidden from pickers |
| `createdAt` / `updatedAt` | `string` (ISO) | audit |

### Patient
| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` (uuid) | PK (internal) |
| `name` | `string` | matched on lookup |
| `dateOfBirth` | `string` (ISO date `YYYY-MM-DD`) | matched on lookup |
| `patientReference` | `string` | PMG-facing reference shown to reception |
| `clinicalSystemId` | `string` | **mock external ref** — the ID the real clinical system would own |

> Patients are **read** from the mock clinical system for lookup; PMG does not author patient
> records here. Lookup returns the **minimum necessary** (doc 04).

### Visitor
| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` (uuid) | PK |
| `name` | `string` | required |
| `email` | `string \| null` | optional |
| `company` | `string \| null` | optional |
| `host` | `string` | the staff member they're visiting (free text or employee ref) |
| `visitReason` | `string` | **free text** — why they're here (e.g. "Delivering orthotic supplies", "BSI ISO audit") |
| `visitCategory` | `VisitCategory \| null` | **optional** quick-pick tag for ops aggregation only; never required, never an identity |
| `createdAt` | `string` (ISO) | |

> A visitor's `personType` is always `'visitor'`; the reason/category live here as metadata, not
> as a person type. `contractor` etc. are values of `visitCategory`, surfaced on the roll-call tile
> as a secondary label.

### VisitBooking  *(NEW — single- or multi-day expected presence for a visitor)*
| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` (uuid) | PK |
| `visitorId` | `string` | FK → Visitor.id |
| `host` | `string` | staff member expecting them |
| `startDate` | `string` (ISO date) | first expected day |
| `endDate` | `string` (ISO date) | last expected day; **single-day visit ⇒ `endDate === startDate`** |
| `passToken` | `string \| null` | seed for the low-friction return pass (signed QR/short code), valid only within `[startDate, endDate]` — see doc 04 |
| `passCode` | `string \| null` | short human-readable fallback code (surname + code) for return without a phone/badge |
| `status` | `'active' \| 'completed' \| 'cancelled'` | `active` while within window and not cancelled |
| `createdAt` | `string` (ISO) | |

> A booking expresses **expectation**, not presence. Presence stays per-day in the event log: a
> multi-day contractor who checked in Monday is *expected* (amber) Tuesday until they scan in —
> never auto-marked present. This pairs with end-of-day auto-checkout (doc 09) so "currently on
> site" stays honest overnight.

### CheckInEvent  *(append-only event log — the spine of the system)*
| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` (uuid) | PK |
| `personId` | `string` | FK → Employee.id / Visitor.id / Patient.id |
| `personType` | `PersonType` | denormalised for fast projection & roll-call |
| `direction` | `Direction` | `in` / `out` |
| `timestamp` | `string` (ISO) | event time |
| `method` | `CheckInMethod` | **how the person was identified** (single axis) — not the device |
| `locationId` | `string` | FK → Location.id (**where** — which door/kiosk) |
| `displayName` | `string` | denormalised snapshot of name at event time (visitor/patient may not persist) |

> **Append-only.** Presence is *derived*, never mutated: an occupant is on site if their most
> recent event is `in`. This makes history, audit and roll-call all fall out of one log and
> avoids "stale present" bugs — the exact failure the fire drill exposed.

> **Note — `method` is one axis, not a device label.** An earlier draft had a `kiosk-form` value,
> which described *where* an event came from (the kiosk's on-screen form) rather than *how* the
> person was identified — and it overlapped with `email`/patient lookup, which are also typed into
> a kiosk form. `method` now records only the **identification mechanism / assurance level**
> (`qr` cryptographic › `email`/`patient-lookup` directory match › `visitor-form` self-asserted ›
> `manual` hand-keyed fallback). **Where** is `locationId`; a device/channel axis, if ever needed,
> is a separate field. Mapping of flows → method:
>
> | Flow | method |
> |------|--------|
> | Employee/visitor pass QR scan (any door, self-scan, or kiosk) | `qr` |
> | Employee email lookup at kiosk | `email` |
> | Patient matched by name + DOB | `patient-lookup` |
> | Visitor walk-up sign-in / new booking; returning visitor re-confirmed via surname+code | `visitor-form` |
> | **Employee** found by name/number when they have no email and no phone (reception-assisted) | `manual` |
> | Patient **no-match** fallback (hand-keyed, flagged for reception) | `manual` |
>
> `manual` events are the lowest-assurance and are **audit-flagged for follow-up** regardless of
> person type.

### Location
| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | PK |
| `name` | `string` | e.g. "Main Reception", "Workshop Exit" |
| `type` | `LocationType` | `reception` / `exit` — supports multiple entry/exit points |

### OnsiteSnapshot  *(derived view — not stored)*
Computed by `OnsiteProjectionService` from the event log. Each occupant:
```ts
interface Occupant {
  personId: string;
  personType: PersonType;        // 'employee' | 'patient' | 'visitor'
  displayName: string;
  since: string;                 // timestamp of the 'in' event making them present
  lastLocationId: string;
  // visitor extras when relevant:
  host?: string;
  visitCategory?: VisitCategory; // secondary label on the tile, e.g. 'contractor'
}
```

### FireEvent
| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` (uuid) | PK |
| `triggeredBy` | `string` | `'kiosk'` or an admin userId |
| `triggeredAt` | `string` (ISO) | |
| `resolvedAt` | `string \| null` | null while active; only one active fire event at a time |

### RollCallEntry  *(one per occupant per fire event)*
| Field | Type | Notes |
|-------|------|-------|
| `fireEventId` | `string` | FK → FireEvent.id |
| `personId` | `string` | who |
| `personType` | `PersonType` | for display/colour |
| `displayName` | `string` | snapshot |
| `state` | `RollCallState` | `unaccounted` (red) / `accounted` (green) / `expected-absent` (amber) |
| `accountedFor` | `boolean` | convenience flag (derived from state) |
| `accountedAt` | `string \| null` | |
| `accountedBy` | `string \| null` | marshal userId |

> On fire trigger, the roll-call is **snapshotted** from the on-site projection plus the
> **expected-presence** set (amber) — which now unions M365 staff *and* active multi-day visit
> bookings for today (see `ExpectedPresenceService`, §2.4). After snapshot, the marshal list is
> driven by SSE updates layered onto this frozen baseline — so it stays correct even if the
> network drops.

### AuditLog
| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` (uuid) | PK |
| `entity` | `string` | e.g. `employee`, `fireEvent`, `rollCallEntry` |
| `entityId` | `string` | |
| `action` | `string` | `create` / `update` / `deactivate` / `trigger` / `account-for` |
| `changedBy` | `string` | userId or `'kiosk'` / `'system'` |
| `timestamp` | `string` (ISO) | |
| `before` | `json \| null` | prior state (sensitive ops) |
| `after` | `json \| null` | new state |

## 2.3 Relationships

```
Employee 1───* CheckInEvent        (personId, personType='employee')
Visitor  1───* CheckInEvent        (personId, personType='visitor')
Visitor  1───* VisitBooking        (visitorId)            ← single- or multi-day expectation
Patient  1───* CheckInEvent        (personId, personType='patient')
Location 1───* CheckInEvent        (locationId)
FireEvent 1──* RollCallEntry       (fireEventId)
*  AuditLog references any entity by (entity, entityId)
OnsiteSnapshot / Occupant     — derived from CheckInEvent (not persisted)
ExpectedPresence(date)        — derived: union of M365 staff + active VisitBookings covering date
```

Patient records originate in the **mock clinical system** repository, not the PMG store —
PMG only ever holds the `CheckInEvent` referencing a patient, plus the denormalised
`displayName` snapshot. "Expected on site" is no longer single-sourced from M365: it is the
**union** of mock M365 staff calendar entries and active `VisitBooking`s, behind one
`ExpectedPresenceService` (§2.4) so the amber roll-call logic is source-agnostic.

## 2.4 Repository interfaces (ports)

```ts
interface EmployeeRepository {
  findById(id: string): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;     // case-insensitive
  findByEmployeeNumber(n: string): Promise<Employee | null>;
  listActive(): Promise<Employee[]>;
  create(e: NewEmployee): Promise<Employee>;
  update(id: string, patch: Partial<Employee>): Promise<Employee>;
  deactivate(id: string): Promise<void>;
}

interface CheckInEventRepository {
  append(e: NewCheckInEvent): Promise<CheckInEvent>;
  latestForPerson(personId: string): Promise<CheckInEvent | null>;
  currentlyOnsite(): Promise<CheckInEvent[]>;               // latest 'in' per person, no later 'out'
  history(filter: HistoryFilter): Promise<CheckInEvent[]>;  // date range, name, email
}

interface FireEventRepository {
  active(): Promise<FireEvent | null>;
  create(triggeredBy: string): Promise<FireEvent>;
  resolve(id: string): Promise<FireEvent>;
}

interface RollCallRepository {
  snapshot(fireEventId: string, entries: NewRollCallEntry[]): Promise<void>;
  list(fireEventId: string): Promise<RollCallEntry[]>;
  markAccounted(fireEventId: string, personId: string, by: string): Promise<RollCallEntry>;
}

interface VisitBookingRepository {
  create(b: NewVisitBooking): Promise<VisitBooking>;
  findActiveByPassToken(token: string): Promise<VisitBooking | null>; // low-friction return
  findActiveByCode(surname: string, code: string): Promise<VisitBooking | null>; // no-phone fallback
  activeOn(date: string): Promise<VisitBooking[]>;                    // for expected-presence
  complete(id: string): Promise<void>;
}

// "Expected on site" is now source-agnostic: the roll-call asks this one service,
// which unions the mock M365 staff calendar with active multi-day visit bookings.
interface ExpectedPresenceService { expectedOn(date: string): Promise<ExpectedPerson[]>; }
//   composed from two providers (both behind interfaces):
interface CalendarPort       { expectedOnsiteOn(date: string): Promise<ExpectedPerson[]>; } // mock M365 (staff)
//   (VisitBookingRepository.activeOn supplies the visitor half)

// External integration ports (all mocked for MVP)
interface ClinicalSystemPort { lookup(name: string, dob: string): Promise<PatientMatch | null>; }
interface PushPort           { notifyMarshals(payload: FireAlertPayload): Promise<void>; }
interface EmailPort          { sendCheckInConfirmation(to: string, ctx: ConfirmationCtx): Promise<void>; }
interface AuditLogRepository { record(entry: NewAuditEntry): Promise<void>; }
```

Every interface above is satisfied today by an in-memory/mock class and tomorrow by a
PostgreSQL/Graph/Web-Push implementation — **no caller changes**.

## 2.5 GDPR / data protection strategy

The system holds three very different sensitivities of PII; the strategy treats them
differently. (Documented in full; partially implemented in MVP as noted.)

| Data | Sensitivity | Retention | Approach |
|------|-------------|-----------|----------|
| **Visitor** name/email/host/reason + bookings | Moderate | Purge visitor + booking detail after **30 days** of the visit ending; keep aggregate `visitCategory` counts only | Lawful basis: legitimate interest (site safety). Privacy notice shown on kiosk. `visitReason` is free text — minimise; don't capture special-category data in it. |
| **Patient** name/DOB/attendance | High (special category — health) | Attendance event retained per clinical records policy; **DOB never stored by PMG presence DB** — used transiently for lookup only | Data minimisation: lookup returns reference + display name, not full record. Patient sees a clinic-style arrival, not a full sign-in form. |
| **Employee** continuous presence | Moderate but pervasive | Roll over presence events after **90 days**; roll-call entries retained per H&S incident policy | Staff are informed; presence ≠ surveillance — we log door events, not continuous location. |

**Right to erasure:** because presence is an append-only event log keyed by `personId`, a
subject's events can be **pseudonymised in place** — replace `displayName` with a tombstone
(`"[erased]"`) and detach `personId` from the person record — preserving occupancy counts and
audit integrity while removing identifying data. Implemented as an interface method
(`erasePerson(personId)`) on the event repository; MVP ships the method on the in-memory repo
as a demonstrable stub.

**Pseudonymisation in the fire-roll-call view:** the marshal phone shows the **minimum** needed
to physically find a person — name + type + last location. It does **not** show DOB, email,
clinical reference, or host contact details. The amber (expected-absent) list shows name only.

**What we deliberately do *not* store:** patient DOB (transient lookup key only), raw employee
ID inside QR codes (signed token instead — doc 04), and any continuous geolocation.
