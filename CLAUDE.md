# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current implementation status

**Phase 11 — Observability, OpenAPI, E2E, polish is complete. All phases are done.**

All 11 phases are complete on their respective feature branches and merged to `main`.
The system is demo-ready: `pnpm dev` brings up all four services; `pnpm test` runs 205
unit + integration tests; `pnpm test:e2e` runs the 5 Playwright journeys.

## Commands

```bash
pnpm install          # install all workspace dependencies
pnpm dev              # start API (:4000) + admin (:5173) + kiosk (:5174) + employee (:5175) concurrently
pnpm build            # build all apps and packages
pnpm test             # vitest unit + integration across all packages and apps
pnpm test:e2e         # playwright E2E tests (requires the stack to be running)
pnpm lint             # eslint across the monorepo
pnpm typecheck        # tsc across the monorepo
pnpm --filter @pmg/api seed   # reset in-memory data to demo seed (dev convenience)

# Run a single vitest test file
pnpm --filter @pmg/api test -- src/application/services/onsite-projection-service.test.ts

# Run a single playwright test
playwright test e2e/fire-alarm.spec.ts
```

Stop all dev services: **Ctrl + C** in the terminal (Turborepo runs them as a single process group).

All scripts are orchestrated by **Turborepo** (`turbo.json`); run them from the repo root.

> **pnpm not found?** Run `corepack enable` once in the terminal. Corepack ships with Node.js 22
> and reads the version from `packageManager` in `package.json` — no manual pnpm install needed.

## What Phase 0 delivered

- pnpm workspaces + Turborepo pipeline (dev/build/test/lint/typecheck)
- `packages/config` — shared ESLint flat config, Tailwind preset, tsconfig bases (node + react)
- `packages/contracts` — shared TypeScript types for API, SSE events, enums (spine of the repo)
- `packages/ui` — PMG brand Tailwind preset + shadcn Button/Badge/Card primitives
- `apps/api` — Express server, `/api/health` route, Vitest with coverage, error handler
- `apps/admin`, `apps/kiosk`, `apps/employee` — Vite + React + Tailwind shells on fixed ports
- GitHub Actions CI: Install → Lint → Typecheck → Unit tests + coverage → SonarCloud → Build
- SonarCloud wired up (project: `philjohnson74_pmg-presence`, org: `philjohnson74`)
- Branch protection on `main`; all merges via PR with CI green

## What Phase 1 delivered

- **Domain layer** (`apps/api/src/domain/`) — all entity types (`Employee`, `Visitor`, `VisitBooking`, `CheckInEvent`, `FireEvent`, `RollCallEntry`, `AuditLog`, `Location`, `Patient`, `PatientMatch`) with `New*` input counterparts; 8 repository interfaces; external port interfaces (`CalendarPort`, `ClinicalSystemPort`, `PushPort`, `EmailPort`)
- **Application services** (`apps/api/src/application/services/`) — `OnsiteProjectionService` (derives live snapshot from event log, enriches visitors, builds counts + `visitorsByCategory`); `ExpectedPresenceService` (unions M365 calendar + active `VisitBooking`s, computes `checkedInToday`)
- **Infrastructure** (`apps/api/src/infrastructure/`) — 8 in-memory repository implementations each with a `seed()` bypass; `MockM365Calendar` (configurable per-date entries); `MockClinicalSystem` (diacritic-tolerant name + exact DOB matching)
- **Seed data** (`apps/api/src/infrastructure/seed/`) — 11 employees (2 with no email), 9 patients, 5 visitors, 5 visit bookings (2 multi-day), 10 pre-seeded `in` events; 3 amber entries: Priya Shah + Dev Anand (M365) and Bram de Vries (multi-day booking)
- **Composition root** (`apps/api/src/container.ts`) — `createContainer()` (seeded), `buildTestContainer()` (empty, injectable)
- **Tests** — 48 passing; contract test suites on `EmployeeRepository`, `CheckInEventRepository`, `VisitBookingRepository`; service tests verify the full seeded amber set end-to-end; coverage thresholds enforced (≥80% lines/functions, ≥75% branches)

## What Phase 2 delivered

- **Config module** (`apps/api/src/config/index.ts`) — Zod-validated startup config; single source of truth for `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, `PORT`. Never read `process.env` outside this module.
- **`JwtServicePort`** added to `domain/ports.ts` — `sign()` + `verify()` interface; claims mirror Entra ID (`sub`, `name`, `preferred_username`, `roles`, `oid`, `iss`, `aud`).
- **`JwtService`** (`infrastructure/auth/jwt-service.ts`) — HS256 sign/verify via `jsonwebtoken`; ~8h session lifetime (by design for mock/demo — do not change without being asked).
- **`MockEntraProvider`** (`infrastructure/auth/mock-entra-provider.ts`) — looks up a seeded employee by `userId`, issues an Entra-compatible JWT.
- **`AppError` hierarchy** (`application/errors.ts`) — `AppError` → `ValidationError` (400), `NotFoundError` (404), `UnauthorisedError` (401), `ForbiddenError` (403), `ConflictError` (409).
- **Error handler updated** — now handles `AppError` subclasses with typed `statusCode`/`detail`; falls back to 500 for anything else. RFC 7807 problem JSON throughout.
- **`requireAuth` middleware** (`presentation/middleware/require-auth.ts`) — factory `makeRequireAuth(jwtService)`: extracts Bearer token, verifies it, attaches `req.user`. Returns 401 for missing/invalid/expired tokens.
- **`requireRole` middleware** (`presentation/middleware/require-role.ts`) — factory `requireRole(...roles)`: 401 if no user, 403 if authed but under-privileged.
- **Express type augmentation** (`presentation/types/express.d.ts`) — `req.user: { sub, name, email, roles }` globally available.
- **Auth routes** (`presentation/routes/auth.ts`) — `POST /api/auth/login` (seeded-user picker, no password), `GET /api/auth/me` (protected).
- **`container.ts` updated** — `JwtService` and `MockEntraProvider` wired; `buildTestContainer()` accepts optional `jwtSecret`.
- **`server.ts` updated** — now accepts a `Container` parameter; `index.ts` creates the container and passes it in.
- **`packages/auth-client`** — new package: `AuthProvider` interface (`login`, `getToken`, `getUser`, `logout`) + `MockAuthProvider` (calls `POST /api/auth/login`, holds token in memory).
- **Tests** — 117 passing; 6 `requireAuth` unit tests, 4 `requireRole` unit tests, 8 `auth` integration tests; typecheck and lint clean.

## What Phase 3 delivered

- **`CheckInEventUseCase`** (`application/use-cases/check-in-event.ts`) — single use case handling both check-in and check-out (direction is a parameter). Supports all five identity methods:
  - `qr` — verifies a signed JWT (`typ:'qr'` for employees, `typ:'visit-pass'` for returning visitors); uses `JwtService.verifyRaw`
  - `email` — resolves employee by email (case-insensitive, via repo)
  - `patient-lookup` — resolves patient by `patientId` via `ClinicalSystemPort.findById` (no DOB re-query needed)
  - `visitor-form` — creates a new `Visitor`; if `booking.endDate > startDate`, also creates a `VisitBooking` and issues a visitor-pass JWT + 6-char `passCode`
  - `manual` — employee: resolve by `employeeNumber` or name (audit-flagged); patient: hand-keyed anonymous entry (audit-flagged)
- **5-second server-side debounce** — if an identical `(personId, direction)` event arrives within 5s, returns the existing event with `debounced: true` (HTTP 200 instead of 201). Prevents duplicate rows from rapid double-scans.
- **Visitor pass issuance** — multi-day bookings (`endDate > startDate`) get a `visit-pass` JWT (signed with `JwtService.signRaw`, expiry = end of booking's `endDate`) + a random 6-char alphanumeric `passCode`. The `_updatePassToken` helper on `InMemoryVisitBookingRepository` re-signs the token with the actual booking ID as `sub` after creation.
- **New routes** (`presentation/routes/`):
  - `POST /api/checkin` + `POST /api/checkout` — public (kiosk/employee app); accepts direct `personId + personType` for visitor/patient checkout from a kiosk picker
  - `GET /api/onsite` — admin/marshal; live occupancy snapshot with optional `?type=` filter; returns `counts` + `visitorsByCategory`
  - `GET /api/visits/history` — admin only; filterable by `?from=`, `?to=`, `?q=` (name), `?type=` (personType)
  - `GET /api/employees/me/visits` — any authed user; returns their own events only (filtered by `personId` in `HistoryFilter`)
- **`JwtService` extended** — `verifyRaw(token)` (verify + return raw payload for non-auth JWTs); `signRaw(payload, expiresAt: Date)` (sign with explicit expiry timestamp, supports past dates for testing)
- **`ClinicalSystemPort` extended** — `findById(id)` added so patient check-in doesn't need to re-query by name+DOB
- **`HistoryFilter` extended** — `personId?` added for `/employees/me/visits` filtering
- **`CheckInRequest` extended** — `method` is now optional (allows direct `personId + personType` checkout); `personId?` added
- **Login rate limiter moved inside `createServer`** — was module-level (shared across all test app instances, causing 429s in the test suite); now instantiated per server so each test gets a fresh counter
- **Tests** — 147 passing (30 new integration tests covering all 5 check-in methods, debounce, multi-day booking + pass issuance, RBAC 401/403 on every protected route, history filtering)
- **SonarCloud** — all 14 findings from the Phase 3 scan resolved across subsequent commits (redundant casts, wrong Error subclass, async idioms, duplicate imports, mock setup patterns, negated conditions, `Readonly<>` on React props, heading accessibility)

## What Phase 4 delivered

- **`GET /api/employees/me/qr`** (`presentation/routes/qr.ts`) — any authed employee receives a 60-second signed QR token (`typ:'qr'`, `jti` UUID, employee number embedded). Token rotates on the device every ~30s.
- **QR check-in path in `CheckInEventUseCase`** — validates `typ:'qr'` tokens (signature, expiry, `jti` replay via `InMemoryJtiStore`); `typ:'visit-pass'` tokens follow the same path for returning multi-day visitors, validated against their booking window.
- **`GET /api/visits/returning`** (`presentation/routes/returning-visitor.ts`) — public, rate-limited (5 req / 30s); `?surname=&code=` lookup for multi-day visitors who don't have the pass QR to hand. Verifies booking is within its date window and surname appears in the visitor's name.
- **`InMemoryJtiStore`** — tracks used JTIs to prevent QR replay attacks within a sliding window.
- **Tests** — 13 QR integration tests: token generation (employee not found, inactive employee, success), QR check-in (valid token, expired, tampered, wrong `typ`, replay), returning visitor (match, miss, surname mismatch, outside date window, rate limit).
- **Total tests** — 172 passing (QR tests added as part of phase, alongside 12 patient-lookup tests in Phase 5).

## What Phase 5 delivered

- **`GET /api/patients/lookup`** (`presentation/routes/patients.ts`) — public (kiosk) route accepting `?name=&dob=` query params; rate-limited (5 req / 30s per IP, fresh limiter per server instance); zod-validated (name 1–200 chars, dob YYYY-MM-DD and not in the future).
- **Data minimisation** — response returns only `{ match, patientId, displayName, patientReference }`; DOB and `clinicalSystemId` are never exposed. The `MockClinicalSystem` (already built in Phase 1) performs the diacritic-tolerant, case-insensitive, whitespace-collapsing matching.
- **`makePatientsRouter(clinicalSystem)`** wired in `server.ts` alongside the returning-visitor router (both public, rate-limited).
- **Tests** — 12 new integration tests: match, case-insensitivity, diacritic normalisation, whitespace tolerance, miss (unknown patient), miss (wrong DOB), data-minimisation assertions, 4 validation error cases (missing name, missing dob, invalid format, future date), rate-limit enforcement (429 on request 6).
- **Total tests** — 172 passing.

## What Phase 11 delivered

- **Prometheus metrics** (`apps/api/src/infrastructure/telemetry/metrics.ts`) — custom registry via `prom-client`; `collectDefaultMetrics` for Node.js process stats; custom metrics:
  - `pmg_checkin_total{method,direction,personType}` — counter; incremented in `CheckInEventUseCase`
  - `pmg_patient_lookup_total{outcome}` — counter (match/miss); incremented in the patients route
  - `pmg_fire_events_total` — counter; incremented in `TriggerFireEventUseCase`
  - `pmg_rollcall_accounted_total` — counter; incremented in the `PATCH /api/onsite/rollcall/:personId` handler
  - `pmg_auth_failures_total{reason}` — counter (missing_token/invalid_token); incremented in `requireAuth`
  - `pmg_occupancy_current{personType}` — gauge; updated fire-and-forget after each check-in/out via SSE broadcast path
  - `pmg_sse_connections` — gauge; lazily collected at scrape time from `SseBroker.connectionCount` via `registerSseBroker()`
- **`GET /metrics`** — Prometheus scrape endpoint mounted in `server.ts` before any auth middleware; returns Prometheus text format.
- **OpenAPI spec + Swagger UI** (`presentation/routes/docs.ts`) — hand-written OpenAPI 3.0 spec covering all 20+ routes; per-route security annotations; `swagger-ui-express` serves it at `GET /api/docs`.
- **`playwright.config.ts`** — Playwright configuration with 4 `webServer` entries (API + 3 frontends) using `reuseExistingServer: true`; `workers: 1` (journeys share in-memory state, must run sequentially).
- **5 E2E journey specs** (`e2e/`):
  1. `01-employee-qr-checkin.spec.ts` — employee logs in, QR renders on My Pass; test seam fetches token from API and POSTs to `/api/checkin`; verifies on-site list.
  2. `02-patient-checkin.spec.ts` — kiosk patient form: match (Joan Webb) + confirm; also no-match → manual fallback.
  3. `03-visitor-signin.spec.ts` — kiosk visitor form (unique name); verifies via admin API on-site list.
  4. `04-fire-alarm.spec.ts` — kiosk confirms emergency; marshal app receives SSE and shows evacuation overlay; cleanup resolves the event.
  5. `05-marshal-rollcall.spec.ts` — two marshal contexts; fire triggered via API; marshal 1 marks accounted; marshal 2 sees SSE update.
- **`e2e/helpers/api.ts`** — shared test helpers: `apiLogin`, `apiGet`, `apiPost`, `apiPatch`, `resolveFireIfActive`.
- **README.md** updated — all phases marked complete; Swagger/metrics URLs in services table; Observability section with metrics table.
- **Total tests** — 205 passing (no new Vitest tests needed; new routes covered by typecheck + manual verification).

### Known decisions from Phase 11

- **`prom-client` over full OTel SDK** — avoids ESM/auto-instrumentation complexity for a demo; same Prometheus wire format that OTel Prometheus exporter produces. Adding OTLP trace export is a one-file change: install `@opentelemetry/sdk-node` + `@opentelemetry/exporter-otlp-grpc`, call `sdk.start()` in `index.ts` before any imports.
- **`registerSseBroker()` sets a module-level reference** — safe because the production container is a singleton; test containers don't call it so the gauge safely reads 0.
- **Metrics module is a singleton** — `prom-client` metrics are registered once per process (module-level). Vitest runs all tests in one process with shared module cache, so registration happens once and tests don't conflict.
- **`pmg_occupancy_current` is best-effort** — updated inside the fire-and-forget SSE broadcast callback, so a check-in that skips the broker/projection (e.g., test containers without broker) won't update the gauge. Acceptable for a demo scrape endpoint.
- **E2E tests run `workers: 1`** — the in-memory API state is shared across journeys; parallel workers would cause race conditions on fire events and occupancy counts.

## What Phase 8 delivered

- **`GET /api/onsite/visitors`** (`presentation/routes/onsite.ts`) — new public route (no auth); returns checked-in visitors as `{ visitors: [{personId, displayName}] }` — data-minimised for the kiosk checkout picker.
- **`apps/kiosk`** rebuilt from the Phase 0 skeleton into a full PWA (`react-router-dom` v6, `@zxing/browser`, `qrcode.react`):
  - **`/`** — home/attract screen: PMG navy background, 4 large action tiles (Employee, Visitor, Patient, Sign Out), persistent Fire Alarm button with red border at the bottom.
  - **`/employee`** — 3-tab sign-in/out:
    - *Email* — enter work email → Sign In or Sign Out (`method:'email'`).
    - *Scan QR* — live camera feed via `@zxing/browser`; client-side 3s debounce on top of server debounce; scan-success posts to `/api/checkin` (`method:'qr'`). Graceful camera-unavailable fallback message.
    - *Find Me* — manual fallback for no-email/no-phone staff; accepts employee number (preferred) or name; resolves `PMG-XXXX` prefix automatically; `method:'manual'`, audit-flagged, amber warning shown to user.
  - **`/visitor`** — two tabs:
    - *New visitor* — full form: name (required), email (optional), host (required), reason (required, free text), visit category quick-pick (6 options → `visitCategory`), duration picker (*Just today* / *Multiple days* with end-date picker). Multi-day submissions trigger `VisitBooking` creation and show a **VisitorPassCard** (QR code via `QRCodeSVG` + 6-char code + validity date) before returning to home.
    - *Returning (have a pass)* — surname + pass code → `GET /api/visits/returning` → confirm-card → `POST /api/checkin` with visitor's ID.
  - **`/checkout`** — calls `GET /api/onsite/visitors`; shows a picker of currently checked-in visitors; tapping signs them out via `POST /api/checkout` with `personId + personType`.
  - **`/patient`** — 3-step wizard: (1) name + DOB lookup form → (2) confirm-card (name + reference) or (3) manual fallback with amber "reception to verify" notice; uses `GET /api/patients/lookup` + `POST /api/checkin` (`method:'patient-lookup'` or `method:'manual'`).
  - **`/fire`** — two deliberate steps: warning screen → "Confirm Emergency" → `POST /api/fire/trigger` → full-screen red evacuation lock (`EVACUATION IN PROGRESS`). Discreet "Administrator: stand down" affordance for demo resolution.
- **`KioskProvider`** (`context/kiosk-context.tsx`) — React context managing fire-active state (localStorage-persisted across refreshes) and idle timer (60s; resets on `pointerdown/keydown/touchstart`; calls `onIdle` → navigate to `/`).
- **`SuccessScreen`** (`components/success-screen.tsx`) — shared branded success screen (green ✓, person icon, name); auto-returns to home after 4s; shown after every check-in/out.
- **`apps/kiosk/src/lib/api.ts`** — typed public fetch wrapper (no auth token); functions: `checkIn`, `checkOut`, `patientLookup`, `returningVisitorLookup`, `fetchCheckedInVisitors`, `triggerFire`.
- **Total tests** — 205 passing (no new API tests; the single new API route is covered by typecheck + manual verification).

### Known decisions from Phase 8

- **`GET /api/onsite/visitors` is intentionally public** — returns only `personId + displayName` for currently checked-in visitors; this is the minimal data needed for the kiosk checkout picker. No emails, visit history, or categories are exposed.
- **Fire state persisted in localStorage** — kiosk fire lock survives page refreshes. The kiosk has no access to protected fire-event endpoints (no JWT), so clearing the lock requires the discreet admin stand-down button rather than polling the API.
- **QR scanner requires camera permission** — `@zxing/browser` requests camera access on mount; if denied or unavailable (e.g. laptop without camera), a friendly fallback message directs users to the Email or Find Me tab. This is not an error state.
- **Client-side scan debounce (3s) on top of server debounce (5s)** — prevents the QR scanner from firing multiple API calls for a single scan. The server debounce is the authoritative guard; the client debounce reduces unnecessary requests.
- **Idle timer resets on pointer/keyboard/touch events** — 60s window. Navigates to `/` via the `KioskProvider.onIdle` callback, which is bound in `RouterWrapper` so it has access to `useNavigate`.
- **`VisitorPassCard` shown before success screen for multi-day visits** — the pass QR + code is the key deliverable for returning visitors; showing it before the auto-return gives the visitor time to photograph/note it.
- **`react-router-dom` v6 future flag warnings** — two console warnings about v7 flag changes; harmless, can be silenced with `v7_startTransition` and `v7_relativeSplatPath` future flags on `<BrowserRouter>` if desired.

## What Phase 7 delivered

- **`GET /api/employees`** + **`POST /api/employees`** + **`PATCH /api/employees/:id`** (`presentation/routes/employees.ts`) — admin-only CRUD routes. `POST` creates with optional `email`; `PATCH` patches name/email/role/active. `email` accepted as `null` or omitted at both create and update.
- **`listAll()` on `EmployeeRepository`** — returns active + inactive employees; used by the admin portal table to show and toggle deactivated staff.
- **`GET /api/auth/users`** — public endpoint added to the auth router; returns the seeded active employee list for the mock login picker UI.
- **`apps/admin`** rebuilt from the Phase 0 skeleton into a full SPA (`react-router-dom` v6, `@pmg/auth-client`):
  - **`/login`** — mock SSO picker listing seeded users grouped by role (Admins / Marshals / Employees); no-email employees show "No email".
  - **`/onsite`** — live occupancy view with 3-column counter cards (employee/patient/visitor), `visitorsByCategory` breakdown, SSE `onsite.changed` listener with "Live" indicator, person-type filter tabs, occupant table with `PersonTypeBadge` (including visitor category sub-label).
  - **`/expected`** — today + tomorrow cards driven by `GET /api/expected`; each card shows expected count, signed-in (green) vs not-yet-signed-in (amber) totals, with per-person dots and source labels (M365 Calendar / Visit Booking).
  - **`/employees`** — full table with add/edit modal (`email` field clearly optional, "Leave blank if no email" placeholder), deactivate/reactivate toggle, inactive employees hidden behind a reveal link.
  - **`/history`** — date-range + name + type filter form; results table with direction arrows (↑/↓), method labels, PersonType badges; client-side CSV export.
  - **`/fire`** — active alarm banner (red border, stand-down button), events table (status/triggered/by/resolved/duration), confirm-to-resolve modal.
  - **AppShell** — navy top bar with user name + sign-out; sidebar nav (desktop) + bottom nav strip (mobile); `SessionProvider` holds token in React state.
- **`src/lib/api.ts`** — typed fetch wrapper; adds `Authorization` header; throws `ApiError` on non-OK responses.
- **`src/features/auth/use-session.tsx`** — `SessionProvider` + `useSession` hook; wraps `MockAuthProvider` from `@pmg/auth-client`.
- **Total tests** — 205 passing (no new API tests needed; all new routes covered by typecheck + manual verification).

### Known decisions from Phase 7

- **Session is in-memory React state** — a full page reload loses the session. This is deliberate for the MVP demo (no `localStorage` persistence); the MSAL path in Phase 9+ will use proper token storage.
- **`GET /api/auth/users` is public and unguarded** — only exists to support the mock SSO picker; it should be removed or behind auth before any real deployment.
- **`EmployeeRepository.listAll()`** returns all records (active + inactive); the UI filters and presents them separately. The interface change is backward-compatible — the single implementor (`InMemoryEmployeeRepository`) gained the method and all existing tests still pass.
- **SSE token is the full session JWT** — passed as `?access_token=` per the Phase 6 architecture. No separate short-lived stream token was issued (that is a post-MVP hardening step per doc 03 §3.6).
- **`useOnsiteStream` reloads the full occupant list on every `onsite.changed` event** — a delta-apply approach would be more efficient at scale but adds complexity; polling the full list on each SSE event is fine for the demo occupancy numbers.

## What Phase 6 delivered

- **`SseBroker`** (`infrastructure/sse/sse-broker.ts`) — manages SSE connections; broadcasts events to all connected clients; maintains a ring buffer (100 events) for `Last-Event-ID` replay; sends 15s heartbeats (unref'd so they don't block process exit).
- **`GET /api/onsite/stream`** — SSE endpoint with `?access_token=` query-param auth (EventSource cannot set headers); validates JWT + role (admin/marshal) on connect; invalid token → 401/403 before any SSE headers are sent.
- **`TriggerFireEventUseCase`** (`application/use-cases/trigger-fire-event.ts`) — on trigger: snapshots on-site occupants (`unaccounted`) + expected-but-absent people from `ExpectedPresenceService` (`expected-absent`, amber); writes roll-call via `RollCallRepository`; broadcasts `fire.triggered` SSE; calls `PushPort.notifyMarshals`. Rejects with 409 if a fire event is already active.
- **`LoggingPushService`** (`infrastructure/push/logging-push-service.ts`) — `PushPort` implementation that logs the push intent (real push implementation is a post-MVP concern).
- **`POST /api/fire/trigger`** — public (kiosk, rate-limited at 5 req/min) **or** admin JWT; resolves `triggeredBy` from the token sub or defaults to `'kiosk'`; non-admin authenticated requests → 403.
- **`GET /api/fire/events`** — admin/marshal; lists all fire events (ordered by `triggeredAt`). Added `list()` to `FireEventRepository` and `InMemoryFireEventRepository`.
- **`POST /api/fire/:id/resolve`** — admin only; resolves fire event; broadcasts `fire.resolved` SSE.
- **`GET /api/onsite/rollcall`** — admin/marshal; returns roll-call entries for the active fire event; 409 if none active.
- **`PATCH /api/onsite/rollcall/:personId`** — admin/marshal; marks a person accounted-for; broadcasts `rollcall.updated` SSE with `accountedBy` (caller's JWT name).
- **`GET /api/expected?date=`** (`presentation/routes/expected.ts`) — admin/marshal; defaults to today; uses `ExpectedPresenceService.expectedOn(date)`; returns `{ date, expected: ExpectedPerson[] }`.
- **`onsite.changed` SSE broadcast** — added to `CheckInEventUseCase` (optional `broker` + `onsiteProjection` in deps); fires after every successful check-in/out with updated counts.
- **Tests** — 33 new integration tests: fire trigger (public, admin, non-admin 403, double 409), amber set (staff + visitor), roll-call GET/PATCH, resolve, fire events list, expected route (default date, custom date, invalid date, RBAC, checkedInToday), SSE auth (401/403/200+headers), SSE content (fire.triggered and rollcall.updated received via real HTTP server).
- **Total tests** — 205 passing.

### Known decisions from Phase 6

- **`SseBrokerPort` only exposes `broadcast`** — the `connect()` method (which takes an Express `Response`) is defined as a presentation-layer extension (`SseStreamBroker` interface in `onsite.ts`) to avoid coupling the domain port to Express.
- **`SseBroker.startHeartbeat()` must be called explicitly** — the production container calls it; test containers do not (prevents timer leakage in tests).
- **`TriggerFireEventUseCase` uses today's date** (`new Date().toISOString().slice(0, 10)`) for the amber set — test calendar entries are configured with today's date computed the same way for deterministic results.
- **`onsite.changed` broadcast is fire-and-forget** (`void Promise`) — SSE is best-effort; a failed snapshot doesn't fail the check-in response.
- **Rate limiter on `/fire/trigger` is per-`makeFireRouter` call** — consistent with the pattern from previous phases; prevents state leaking between test server instances.
- **`req.params` values require `as string` assertion** — `noUncheckedIndexedAccess: true` in tsconfig makes `ParamsDictionary` index returns `string | undefined`; the route segment guarantees presence at runtime.

### Known decisions from Phase 5

- **Rate limiter is per-`makePatientsRouter` call** (same pattern as the returning-visitor router) — prevents rate limit state leaking between test app instances.
- **Future DOB rejected at the route layer** — `dob <= today` check in the zod schema; no need for domain logic since this is purely an input sanity guard.
- **No auth required** — patient lookup is public (kiosk surface). The rate limiter is the only abuse guard at this layer; the `MockClinicalSystem` never exposes DOB or clinical IDs downstream.

### Known decisions from Phase 3

- **`CheckInEventUseCase` handles both check-in and check-out** via a `direction` parameter. There is no separate `CheckOutUseCase` — the routes pass `'in'` or `'out'` and the use case resolves the person identically either way.
- **Visitor checkout uses `personId + personType` directly** (no `method` required). The kiosk picker sends the visitor's ID; the use case resolves by direct repo lookup before the method-specific logic.
- **`_updatePassToken` on `InMemoryVisitBookingRepository`** is an infrastructure-only escape hatch for re-signing the pass token with the actual booking ID. It is accessed via a type cast in the use case (`as { _updatePassToken?: … }`) — intentionally not on the `VisitBookingRepository` interface since Postgres would use an UPDATE and this is in-memory only.
- **`signRaw` uses explicit `exp` unix timestamp**, not `expiresIn` seconds, so that passing a past `Date` produces a genuinely expired token (important for the QR expiry tests).
- **`makeCheckInRouter` receives the full dep bag directly** (not the `Container` type) to keep the route layer decoupled from the container shape.
- **Rate limiter is per-`createServer` call** — this is intentional; do not hoist it back to module level.

### Known decisions from Phase 2
- **`makeRequireAuth(jwtService)`** is a factory (not a bare middleware) so the JWT service is injected — no module-level singleton, fully testable in isolation.
- **`requireRole` is stateless** — it reads only from `req.user`, which is set by `requireAuth`. They must always be composed together on protected routes.
- **Mock JWT lifetime is ~8h** by deliberate design for demo convenience (see doc 06). Do not change it unless asked.
- **`buildTestContainer({ jwtSecret })`** accepts a custom secret so integration tests can sign their own tokens without touching the config module.
- **`packages/auth-client`** is a frontend package only — it should never be imported by `apps/api`. The API owns the signing/verification side; the client owns the token storage and fetch side.

### Known decisions from Phase 1
- **`seed()` methods on in-memory repos** bypass ID generation so seed data uses deterministic IDs (`emp-001`, `vis-001`, etc.) that test assertions can reference directly.
- **`SEED_DATE = '2026-05-31'`** exported from `seed-data.ts` — pass this to `expectedOn()` in tests to get deterministic amber results.
- **`buildTestContainer()`** creates empty repos with no seed; pass `calendarEntries` / `patients` arrays to configure the mock adapters for isolated tests.
- **`OnsiteProjectionService`** depends on both `CheckInEventRepository` and `VisitorRepository` to enrich visitor occupants with `host` and `visitCategory` — visitor data is not stored on `CheckInEvent` (denormalised `displayName` only).

### Known tooling decisions from Phase 0
- **tsconfig `extends`** use **relative paths** (e.g. `../../packages/config/tsconfig.react.json`),
  not package export references (`@pmg/config/tsconfig/react`). VS Code's TS language server
  does not reliably resolve tsconfig extends via package.json exports. Do not revert this.
- **`packages/config`** has `"type": "module"` in package.json — required for ESLint flat config.
- **`packages/ui/src/tailwind-preset.js`** is excluded from ESLint in `packages/ui/eslint.config.js`
  (plain JS file, not in the TS project).
- Coverage is generated by running `vitest run --coverage` directly in `apps/api/` (not via Turbo)
  in CI, so the `lcov.info` path is stable for SonarCloud.

## Architecture (read this before touching any code)

### The one rule that governs everything

**Dependencies point inward.** `presentation → application → domain`, with `infrastructure` injected at the edges. No layer imports from an outer layer. All external integrations (database, M365, clinical system, push, email) are interfaces defined in `domain` and implemented in `infrastructure` — swapping a mock for a real implementation touches **only `infrastructure/`** and `container.ts`.

### Backend (`apps/api`) — Clean Architecture

| Layer | Lives in | Knows about |
|-------|----------|-------------|
| `domain/` | entities, value objects, repository **interfaces** | nothing outside itself |
| `application/` | use cases (CheckIn, CheckOut, TriggerFireEvent, etc.), services (OnsiteProjectionService, ExpectedPresenceService), DTOs | `domain` only |
| `infrastructure/` | in-memory repos, JWT, SSE broker, mock integrations, OpenTelemetry | `domain` interfaces |
| `presentation/` | Express routes, `requireAuth`/`requireRole` middleware, OpenAPI, SSE endpoint | `application` use cases |

**`apps/api/src/container.ts`** is the composition root — the only place `new` is called on infrastructure. Injecting a Postgres repository later means replacing constructor calls here and nothing else.

### Shared packages — the contracts spine

**`packages/contracts`** is imported by the API and all three frontends. A route shape change is a compile error across the whole repo, not a runtime surprise. Always update contracts before updating API routes or frontend consumers.

**`packages/ui`** holds the PMG brand once (Tailwind tokens, shadcn/ui components). Never duplicate brand colours or typography in individual apps.

**`packages/auth-client`** exposes an `AuthProvider` interface with two implementations: `MockAuthProvider` (MVP) and a future `MsalAuthProvider`. Apps only call the interface.

### Data model fundamentals — key decisions made this session

- **`PersonType`** = `employee | patient | visitor` — **three values only**. This was deliberately
  simplified from a longer enum. Do not add `contractor`, `supplier`, `auditor` etc. as types —
  these are captured as free-text `visitReason` + optional `visitCategory` on `VisitBooking`.
- **`CheckInMethod`** = `qr | email | patient-lookup | visitor-form | manual` — records *how*
  identity was established (mechanism), not which device. `locationId` records where. `kiosk-form`
  was removed as it conflated mechanism with device.
- **`manual`** applies to both patient no-match fallback AND employee name/number lookup fallback
  (for staff with no email and no phone). Both are audit-flagged.
- **`CheckInEvent`** is append-only. Presence is derived: a person is on site iff their latest
  event is `in`. Never mutate events.
- **`ExpectedPresenceService`** unions the mock M365 staff calendar with active `VisitBooking`s
  for a date. This single service drives the amber roll-call state for both staff and multi-day
  visitors. Amber = expected on site but not checked in.
- **Multi-day visitors** (`VisitBooking` with `endDate`) get a QR pass token valid for the booking
  window, enabling low-friction return check-ins on subsequent days without re-registering.
- **`OnsiteSnapshot`** is always derived from the event log — never stored.

### Auth and RBAC

RBAC is enforced **server-side on every request**. The `requireRole(...roles)` middleware factory
returns 401 (no/invalid token) or 403 (wrong role) before any handler runs. The kiosk
check-in/out endpoints are explicitly public — everything else requires a valid JWT. JWT claims
mirror Entra ID app-role conventions (`roles: string[]` array).

### Real-time and offline

SSE is the only real-time channel (`GET /api/onsite/stream`). The `EventSource` API cannot set
headers, so the JWT is passed as `?access_token=` on the stream URL and validated on connection.

The employee PWA caches the on-site snapshot + roll-call to IndexedDB via Workbox and renders from
cache immediately on open for marshals. The freshness timestamp shown in the UI is driven by SSE heartbeats.

## Key spec documents

Before implementing any feature, read the relevant doc:

- Data model changes → [docs/02-data-model.md](docs/02-data-model.md)
- API / new routes → [docs/03-api-and-sse.md](docs/03-api-and-sse.md) (RBAC matrix on every route)
- QR tokens or patient lookup → [docs/04-qr-and-patient-lookup.md](docs/04-qr-and-patient-lookup.md)
- Frontend components or PWA → [docs/05-frontend-and-pwa.md](docs/05-frontend-and-pwa.md)
- Auth middleware or security → [docs/06-security-and-auth.md](docs/06-security-and-auth.md)
- What to test and CI pipeline → [docs/07-testing-cicd-observability.md](docs/07-testing-cicd-observability.md)
- Build order → [docs/08-implementation-plan.md](docs/08-implementation-plan.md)
- Seed data → [docs/10-seed-data.md](docs/10-seed-data.md)
