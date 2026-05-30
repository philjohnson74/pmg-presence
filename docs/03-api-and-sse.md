# 03 — API Design & SSE

Single HTTP API on `:4000`. JSON over REST. All shapes live in `packages/contracts` and are
imported by both the API and the frontends. Full OpenAPI 3.1 spec served at `/api/docs`
(Swagger UI) and `/api/openapi.json`.

## 3.1 Conventions

- Base path: `/api`
- Auth: `Authorization: Bearer <jwt>` on protected routes (SSE is the exception — see §3.6).
- Errors: RFC 7807-style problem JSON:
  ```json
  { "type": "about:blank", "title": "Forbidden", "status": 403, "detail": "Requires role: admin", "instance": "/api/employees" }
  ```
- Validation: every request body/query validated with **zod** schemas (shared in `contracts`);
  failures return `400` with field-level detail.
- Timestamps: ISO 8601 UTC strings.
- IDs: server-generated UUIDs.

## 3.2 RBAC matrix (authoritative)

Enforced **server-side** on every request via `requireAuth` + `requireRole(...)` (doc 06).
Kiosk endpoints are intentionally public.

| Method & Route | Roles | Purpose |
|----------------|-------|---------|
| `POST /api/auth/login` | public | Mock SSO: pick a seeded user, receive JWT |
| `GET  /api/auth/me` | any authed | Current user + role |
| `POST /api/checkin` | **public (kiosk/app)** | Check a person in |
| `POST /api/checkout` | **public (kiosk/app)** | Check a person out |
| `GET  /api/patients/lookup` | **public (kiosk)** | Name+DOB patient lookup (rate-limited) |
| `GET  /api/visits/returning` | **public (kiosk)** | Find an active multi-day booking by surname+code (no-phone return) |
| `GET  /api/onsite` | admin, marshal | Live on-site list |
| `GET  /api/expected` | admin, marshal | Expected on site for a date (staff + visit bookings) — ops view + amber source |
| `GET  /api/onsite/stream` | marshal, admin | **SSE** live updates (token via query — §3.6) |
| `GET  /api/onsite/rollcall` | admin, marshal | Current roll-call entries for active fire event |
| `PATCH /api/onsite/rollcall/:personId` | marshal, admin | Mark a person accounted for |
| `GET  /api/visits/history` | **admin only** | Search visit history |
| `GET  /api/employees` | **admin only** | List employees |
| `POST /api/employees` | **admin only** | Create employee |
| `PATCH /api/employees/:id` | **admin only** | Edit / deactivate employee |
| `GET  /api/employees/me/qr` | employee, marshal, admin | Get own short-lived QR token |
| `GET  /api/employees/me/visits` | employee, marshal, admin | Own visit history only |
| `GET  /api/fire/events` | admin, marshal | List fire events |
| `POST /api/fire/trigger` | **public (kiosk)**, admin | Raise the alarm / start roll-call |
| `POST /api/fire/:id/resolve` | admin | Stand down |

> **Defence in depth:** `POST /api/fire/trigger` is reachable by the public kiosk *and* by an
> authed admin. The handler checks: if no valid token, it must originate from a kiosk-flagged
> request (origin allow-list) and is rate-limited hard; if a token is present it must carry the
> `admin` role. Either path is audit-logged with `triggeredBy`.

## 3.3 Key request/response shapes

### Check-in
`POST /api/checkin`
```ts
// Employee via QR (call made by the scanning device — kiosk OR the employee app itself)
{ "method": "qr",            "qrToken": "<short-lived-jwt>", "locationId": "loc-reception" }
// Employee via email lookup at the kiosk
{ "method": "email",         "email": "gary@peacocksgroup.com", "locationId": "loc-reception" }
// Employee self-action from their app at an unmanned door
{ "method": "qr",            "qrToken": "<own-token>", "locationId": "loc-workshop-exit" }
// Employee MANUAL fallback — no email AND no phone to hand; reception keys in name/number.
// Resolves against the employee store by employeeNumber (preferred) or name; audit-flagged.
{ "method": "manual", "personType": "employee",
  "manual": { "employeeNumber": "PMG-1187" },   // or { "name": "Sam Doyle" } if number unknown
  "locationId": "loc-reception" }
// Visitor self-service form — personType is always 'visitor'; reason is free text + optional tag.
// `booking` is optional: omit (or single day) for a one-off visit; set an endDate for multi-day.
{ "method": "visitor-form", "personType": "visitor",
  "visitor": { "name": "Dana Okoro", "email": null, "company": "Acme HVAC",
               "host": "Gary Cooper",
               "visitReason": "Installing new compressor in workshop",
               "visitCategory": "contractor" },
  "booking": { "startDate": "2026-05-30", "endDate": "2026-06-12" },  // multi-day → issues a return pass
  "locationId": "loc-reception" }
// Returning multi-day visitor — scans their pass QR (same shape as employee QR)
{ "method": "qr", "qrToken": "<visitor-pass-jwt>", "locationId": "loc-reception" }
// Patient (after a successful name+DOB lookup returns a patientId)
{ "method": "patient-lookup", "personType": "patient", "patientId": "pat-007", "locationId": "loc-reception" }
// Patient manual fallback (no match) — hand-keyed, flagged for reception
{ "method": "manual", "personType": "patient",
  "manual": { "name": "Joan Webb", "note": "No DOB match — reception to verify" },
  "locationId": "loc-reception" }
```
> **Employee manual path (new).** Closes the email-optional gap: an employee with no email *and*
> no phone (e.g. workshop staff seeded without email) can still be checked in. The kiosk's Employee
> flow offers a **"Find me"** option → enter employee number or name → confirm → `method:'manual'`.
> It resolves against the employee store, so it's a *known* person, but because it's hand-keyed
> (no QR/email assurance) the event is audit-flagged like any manual entry.
When `booking` carries `endDate > startDate`, the response also returns a `pass`
(`{ passToken, passCode, validUntil }`) the kiosk shows/prints for low-friction return (doc 04).
Response `201`:
```json
{ "eventId": "evt-...", "personType": "employee", "displayName": "Gary Cooper",
  "direction": "in", "timestamp": "2026-05-30T08:41:12Z", "alreadyOnsite": false }
```
- **Idempotency / debounce:** if an identical (personId, direction) event arrives within the
  debounce window (default **5s**), the API returns `200` with the existing event and
  `"debounced": true` rather than creating a duplicate (doc 04 §QR debouncing).

### Check-out
`POST /api/checkout` — same envelope, `direction` resolved server-side to `out`. Visitor
check-out is driven by the kiosk showing **only currently checked-in visitors** (data
minimisation) and posting the chosen `personId`.

### Patient lookup
`GET /api/patients/lookup?name=Joan%20Webb&dob=1951-03-14`
- Case-insensitive, whitespace-tolerant matching (doc 04).
- Match `200`:
  ```json
  { "match": true, "patientId": "pat-007", "displayName": "Joan Webb", "patientReference": "PMG-OUT-4471" }
  ```
  (No DOB, no clinical ID returned — data minimisation.)
- No match `200`:
  ```json
  { "match": false }
  ```
  The kiosk then offers manual-entry fallback.
- Rate-limited aggressively (doc 06) to prevent enumeration of patient identities.

### Returning visitor (multi-day, no phone/badge)
`GET /api/visits/returning?surname=Okoro&code=4Q8KZP` (public kiosk, rate-limited)
- Looks up an **active** `VisitBooking` by surname + the short code issued on day 1.
- Match `200`: `{ "match": true, "visitorId": "vis-201", "displayName": "Dana Okoro", "host": "Gary Cooper", "validUntil": "2026-06-12" }` → kiosk shows a one-tap confirm → `POST /api/checkin`.
- No match `200`: `{ "match": false }` → kiosk offers a fresh visitor sign-in.
- The primary return path is simply scanning the pass QR (`POST /api/checkin` with `method:'qr'`); this endpoint is the no-phone fallback.

### Expected on site (ops view + amber source)
`GET /api/expected?date=2026-05-30` (admin, marshal) → who is *expected* on a date, unioned from
the mock M365 staff calendar and active visit bookings:
```json
{ "date": "2026-05-30",
  "expected": [
    { "personId": "emp-009", "displayName": "Priya Shah", "personType": "employee", "source": "m365-calendar" },
    { "personId": "vis-201", "displayName": "Dana Okoro", "personType": "visitor",
      "source": "visit-booking", "visitCategory": "contractor", "host": "Gary Cooper" }
  ] }
```
- Drives the admin "expected today / tomorrow" operational read **and** the roll-call amber set
  (an expected person with no check-in for `date` is `expected-absent`). Single source, two uses.

### On-site list
`GET /api/onsite` → `200`
```json
{ "asOf": "2026-05-30T09:02:00Z",
  "counts": { "employee": 142, "patient": 2, "visitor": 9 },
  "visitorsByCategory": { "contractor": 3, "supplier": 2, "auditor": 1, "uncategorised": 3 },
  "occupants": [
    { "personId": "emp-003", "personType": "employee", "displayName": "Gary Cooper",
      "since": "2026-05-30T07:55:00Z", "lastLocationId": "loc-reception" },
    { "personId": "vis-201", "personType": "visitor", "displayName": "Dana Okoro",
      "since": "2026-05-30T08:30:00Z", "lastLocationId": "loc-reception",
      "host": "Gary Cooper", "visitCategory": "contractor" }
  ] }
```
- `counts` are keyed by the three `PersonType` values. `visitorsByCategory` is an **optional**
  breakdown for the operational view (driver 3), derived from the `visitCategory` tag —
  untagged visitors fall under `uncategorised`.
- Supports a `?type=employee|patient|visitor` filter.

### Roll-call
`GET /api/onsite/rollcall` → entries for the **active** fire event (or `409` if none active):
```json
{ "fireEventId": "fire-...", "triggeredAt": "2026-05-30T09:05:00Z",
  "entries": [
    { "personId": "emp-003", "personType": "employee", "displayName": "Gary Cooper", "state": "unaccounted" },
    { "personId": "emp-009", "personType": "employee", "displayName": "Priya Shah",  "state": "expected-absent" }
  ] }
```
`PATCH /api/onsite/rollcall/emp-003` `{ "accountedFor": true }` → updated entry; broadcasts SSE.

### Visit history (admin)
`GET /api/visits/history?from=2026-05-01&to=2026-05-30&q=okoro` → paginated event list with
person type, direction, method, location, timestamp.

### Employees (admin)
`POST /api/employees`
```ts
{ "name": "Sam Doyle", "email": null,        // email optional — accepted as null/omitted
  "role": "employee", "employeeNumber": "PMG-1187" }
```
- `email` omitted/`null` is valid. The zod schema makes it `.email().nullable().optional()`.
- Creating/editing/deactivating writes an `AuditLog` entry.

## 3.4 OpenAPI

- `apps/api/src/presentation/openapi/openapi.yaml` is the source; every route documents its
  required role in a `x-required-roles` extension and a human note in the description.
- Swagger UI at `/api/docs` for the demo; the JSON is also consumed to generate/verify the
  `contracts` types stay in sync (a CI check diff-tests generated types vs committed).

## 3.5 SSE event schema

One SSE channel: `GET /api/onsite/stream` (auth via query token, §3.6). The server pushes
named events; clients (marshal app, admin live view) subscribe.

```ts
// packages/contracts/sse.ts
type SseEvent =
  | { event: 'onsite.changed';   data: { personId: string; personType: PersonType;
                                          direction: Direction; displayName: string;
                                          counts: OccupancyCounts; at: string } }
  | { event: 'fire.triggered';   data: { fireEventId: string; triggeredAt: string;
                                          rollCall: RollCallEntry[] } }
  | { event: 'fire.resolved';    data: { fireEventId: string; resolvedAt: string } }
  | { event: 'rollcall.updated'; data: { fireEventId: string; personId: string;
                                          state: RollCallState; accountedBy: string; at: string } }
  | { event: 'heartbeat';        data: { at: string } };   // ~15s keep-alive + freshness clock
```

Wire format (standard SSE):
```
event: fire.triggered
id: 1717059900-3
data: {"fireEventId":"fire-...","triggeredAt":"2026-05-30T09:05:00Z","rollCall":[...]}

```

Client behaviour:
- **Marshal app** in normal mode renders `onsite.changed` into the live list and refreshes the
  IndexedDB cache (doc 05). On `fire.triggered` it switches to **evacuation mode**, seeds the
  roll-call from the event payload, and thereafter applies `rollcall.updated` deltas.
- **`heartbeat`** doubles as the cache-freshness clock — the marshal UI shows "updated Ns ago".
- `id:` enables `Last-Event-ID` resumption; on reconnect the client sends it and the broker
  replays missed events from a small ring buffer (best-effort; full state is re-fetched on
  reconnect regardless).

### SSE broker (server)
`SseBroker` keeps a registry of connected responses keyed by connectionId with the
authenticated `userId`/`role`. Use cases call `broker.broadcast(event)`. On fire trigger the
broker also pushes the full roll-call so a marshal joining mid-evacuation gets a complete list
immediately. Scaling note and WebSocket migration path in doc 07 §performance.

## 3.6 SSE authentication (known limitation, documented)

The browser `EventSource` API **cannot set custom headers**, so a `Bearer` header is impossible
on the SSE connection. Therefore:

- The marshal/admin client opens `GET /api/onsite/stream?access_token=<jwt>`.
- The server validates the token **on connection** (signature, expiry, role ∈ {marshal, admin})
  exactly as `requireRole` would; invalid → `401` and the stream is refused.
- To limit token leakage via URLs/logs: the SSE token is a **short-lived** (e.g. 5 min) token
  minted from the session specifically for streaming, and the API access-log redacts the
  `access_token` query param.
- **Documented migration:** moving to WebSockets (or `fetch`-based streaming, which *can* set
  headers) removes the query-param token entirely. Called out as a post-MVP option.

This limitation and its mitigation are stated explicitly in the OpenAPI description for the
stream route and in the threat model (doc 06).
