# 08 — Implementation Plan (ordered phases)

Sequenced so **each phase is independently runnable and testable** before the next. Targets a
4–6 hour working demo. Each phase lists: goal, work, and the **"done = demonstrable"** check.
Commit per phase on a feature branch; CI green before merge (doc 07).

> Time estimates are guide rails for a single agentic developer steering AI agents. They sum to
> the upper end of the 4–6h window; phases 9–11 are the trim points if time is short (see doc 09).

---

### Phase 0 — Monorepo skeleton & tooling  *(~30 min)*
**Goal:** the repo runs, lints, type-checks, tests — empty but wired.
- pnpm workspaces + Turborepo; `tsconfig.base`, ESLint, Prettier.
- `packages/contracts` (empty types module), `packages/ui` (Tailwind preset + PMG tokens + 2–3
  themed shadcn primitives), `packages/config`.
- `apps/api` Express "hello" + health route; `apps/admin|kiosk|marshal` Vite React shells.
- Root `pnpm dev` runs all four concurrently on fixed ports (4000/5173/5174/5175).
- Vitest + Playwright configured; a trivial passing test in each.
- `ci.yml` skeleton (lint/typecheck/unit) + `sonar-project.properties`.
- **Done =** `pnpm dev` brings up four apps; `pnpm test`/`lint`/`typecheck` pass locally and in CI.

### Phase 1 — Domain + in-memory repositories + seed  *(~40 min)*
**Goal:** the business core exists and is unit-tested, no HTTP yet.
- Entities, value objects, repository interfaces (doc 02).
- In-memory repositories implementing those interfaces + the shared **repository contract tests**
  (incl. `VisitBookingRepository`).
- `OnsiteProjectionService` (derive occupancy) + `ExpectedPresenceService` (union of mock M365
  staff calendar + active visit bookings for a date) + unit tests for `expectedOn(date)`.
- Seed data module (doc 10: 11 employees incl. 2 with no email, 2 admins, 3 marshals; 8–10
  patients; 4 visitor bookings incl. **1 multi-day**; pre-checked-in mix; **3 amber** — 2 staff +
  1 multi-day visitor).
- **Done =** `pnpm test` green with high coverage on domain; seed loads; projection returns the
  expected on-site list; `expectedOn(today)` returns the staff + booking union.

### Phase 2 — Auth: mock SSO + JWT + RBAC middleware  *(~30 min)*
**Goal:** tokens issued and enforced.
- `JwtService` (sign/verify, HS256) behind an interface; `MockEntraProvider`.
- `POST /api/auth/login` (seeded-user picker) + `GET /api/auth/me`.
- `requireAuth` + `requireRole` middleware (doc 06) with **isolated unit tests**
  (valid/missing/invalid/expired/wrong-role).
- `packages/auth-client` `AuthProvider` interface + `MockAuthProvider`.
- **Done =** can log in as admin/marshal/employee and receive a role-claimed JWT; middleware unit
  tests pass; a protected stub route returns 401/403/200 correctly.

### Phase 3 — Check-in/out API + event log + debounce  *(~40 min)*
**Goal:** the heart of the system over HTTP.
- `POST /api/checkin` / `POST /api/checkout` (all methods: qr / email / patient-lookup /
  visitor-form / manual), zod validation, server-side debounce (doc 04 §4.3), audit logging.
- **Employee manual fallback** (`method:'manual'`, `personType:'employee'`): resolve by
  employeeNumber/name for staff with no email and no phone; audit-flagged.
- Visitor check-in accepts an optional `booking` (single/multi-day) → creates a `VisitBooking`;
  `visitReason` (free text) + optional `visitCategory` captured.
- `GET /api/onsite` (+ type filter, `visitorsByCategory`), `GET /api/visits/history` (admin),
  `/employees/me/visits`.
- Integration tests incl. RBAC 401/403 per route, debounce, validation, booking creation.
- **Done =** curl/Swagger can check a seeded employee in/out and see the on-site list change;
  history queries work; tests green.

### Phase 4 — QR issuance + validation  *(~25 min)*
**Goal:** spoof-resistant QR check-in works end-to-end at the API.
- `GET /api/employees/me/qr` (short-lived rotating token); QR validation path in check-in
  (signature/expiry/typ/jti replay).
- **Visitor pass** reusing the same machinery: multi-day check-in issues a `visit-pass` token +
  `passCode` valid for the booking window; `GET /api/visits/returning` (surname+code, rate-limited).
- Unit tests for generation/validation/replay, plus visit-pass window validity + returning lookup.
- **Done =** fetch a QR token, post it to `/checkin`, get a valid event; expired/tampered rejected;
  replay debounced; a multi-day visitor's pass checks them in on a later day, and is rejected
  outside its window.

### Phase 5 — Patient lookup  *(~25 min)*
**Goal:** clinic-style patient arrival.
- `MockClinicalSystem` (seeded) behind `ClinicalSystemPort`.
- `GET /api/patients/lookup` (name+DOB, normalised matching, data-minimised response,
  rate-limited); patient check-in (matched + manual fallback).
- Unit + integration tests (match, miss, normalisation, rate limit).
- **Done =** lookup a seeded patient by name+DOB → check in; a non-match returns `{match:false}`
  and the manual path creates a flagged event.

### Phase 6 — Fire trigger + roll-call API + SSE  *(~40 min)*
**Goal:** real-time evacuation backbone.
- `SseBroker` + `GET /api/onsite/stream` (query-token auth, heartbeat, event types — doc 03 §3.5).
- `POST /api/fire/trigger` (guarded/public + admin), snapshots roll-call from on-site + the
  **`ExpectedPresenceService`** amber set (M365 staff **and** active visit bookings);
  `GET /api/onsite/rollcall`; `PATCH /api/onsite/rollcall/:personId`; `POST /api/fire/:id/resolve`.
- `GET /api/expected?date=` (admin/marshal) — the ops read + amber source, same service.
- `LoggingPushService` (PushPort) logs intent.
- Integration tests: SSE receives `onsite.changed`, `fire.triggered` (with roll-call),
  `rollcall.updated`; amber set includes **both** a staff member and a multi-day visitor.
- **Done =** trigger fire via API → a connected SSE client receives the roll-call incl. amber from
  both sources; accounting-for broadcasts an update; `/expected` lists today's staff + bookings.

### Phase 7 — Admin Portal UI  *(~40 min)*
**Goal:** first themed client.
- Login (mock picker), Employees table + add/edit/deactivate (**email optional** in the form),
  live On-site list (SSE) with type filter + counts + `visitorsByCategory`, **Expected view**
  (today/tomorrow, expected-vs-present — driver 3), Visit history search, Fire event log/resolve.
- Brand theme applied (doc 05).
- **Done =** an admin logs in, adds an employee with no email, watches the on-site count change
  live, sees who's expected today (staff + bookings), searches history.

### Phase 8 — Reception Kiosk UI  *(~45 min)*
**Goal:** the public sign-in surface.
- Attract screen + action tiles; Employee check-in via **Email / Scan / Find-me-manual** tabs —
  QR scanner (`html5-qrcode`/zxing) with scan debounce + success state, and the manual "Find me"
  lookup for no-email/no-phone staff; **Visitor form** (reason free text + optional category +
  **duration picker**; multi-day shows a **pass card** QR/code) + **returning-visitor** flow +
  minimised check-out picker; Patient lookup + confirm + manual fallback; **Fire trigger** with
  confirm-to-activate + sign-in lock.
- PWA manifest (heart icon), fullscreen, idle reset.
- **Done =** a visitor signs in (incl. a multi-day visit issuing a pass) and appears on the admin
  list; a returning visitor checks in via pass/code; an employee is checked in by QR **and** a
  no-email/no-phone employee by the manual "Find me" path; the fire button (with confirm) locks the
  kiosk and fires the alarm.

### Phase 9 — Employee / Marshal PWA UI  *(~45 min)*
**Goal:** the deliverable that matters most — roll-call.
- Employee mode: rotating **My QR**, self check-in/out buttons, my visits.
- Marshal mode: live on-site list (SSE); **evacuation view** with red/amber/green tiles,
  person-type badges, accounted-for toggle, progress header, **FreshnessClock**.
- **Done =** trigger fire from the kiosk → the marshal app flips to evacuation mode with correct
  tiles; marking accounted-for turns a tile green and updates a second marshal in real time.

### Phase 10 — Offline (Service Worker + IndexedDB)  *(~30 min)*
**Goal:** roll-call survives a dead network.
- Workbox SW (app-shell precache + NetworkFirst for on-site); IndexedDB snapshot updated from SSE;
  render-from-cache-on-open; **FreshnessClock** stamp; offline accounted-for **outbox** with
  replay; Background Sync where supported. iOS limitation + Capacitor note documented in-app.
- **Done =** with the network toggled off in dev tools, re-opening the marshal app renders the
  last roll-call from IndexedDB with a visible "updated Ns ago"; an offline accounted-for tap
  replays on reconnect.

### Phase 11 — Observability, OpenAPI, E2E, polish  *(~40 min)*
**Goal:** production-credible finish + the five E2E journeys.
- OpenTelemetry traces/metrics (doc 07); `/metrics` endpoint; Swagger UI at `/api/docs` with
  per-route roles.
- Playwright: the 5 critical journeys green in CI.
- README/run instructions; final brand pass; record-ready demo seed.
- **Done =** `pnpm test:e2e` green; Swagger shows the documented API; metrics expose occupancy by
  type, check-in rate, lookup match rate, SSE connections; full CI pipeline green on a PR.

---

## Demo script (5–10 min recording)
1. `pnpm dev` — four apps up. Show Swagger at `/api/docs`.
2. **Kiosk:** visitor signs in (one-off) + a **multi-day** contractor sign-in that issues a return
   pass; **returning visitor** checks in via that pass; patient name+DOB arrival; employee QR scan
   (from the marshal app on a second screen/phone); plus a **no-email/no-phone employee** checked
   in via the manual "Find me" path (proves the email-optional constraint end-to-end).
3. **Admin:** live on-site list updating in real time with the `visitorsByCategory` breakdown;
   **Expected today** (staff + bookings) for the ops angle; add an employee with no email; search
   history.
4. **Marshal:** show My QR; switch to a marshal account; **trigger the fire alarm on the kiosk** →
   marshal flips to evacuation mode (red/amber/green) — point out amber coming from **both** a
   staff calendar entry and a multi-day visitor booking; mark people accounted-for; show a second
   marshal updating live.
5. **Offline:** kill the network; re-open marshal → roll-call from cache with freshness stamp.
6. Close on metrics/observability + the "what I'd do with another day" from doc 09.
