# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current implementation status

**Phase 2 — Auth: mock SSO + JWT + RBAC middleware is complete on branch `phase/2-auth-jwt-rbac`.**

Next: **Phase 3 — Check-in/out API + event log + debounce** (see [docs/08-implementation-plan.md](docs/08-implementation-plan.md)).

Create a branch before starting: `git checkout -b phase/3-checkin-api`

## Commands

```bash
pnpm install          # install all workspace dependencies
pnpm dev              # start API (:4000) + admin (:5173) + kiosk (:5174) + marshal (:5175) concurrently
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
- `apps/admin`, `apps/kiosk`, `apps/marshal` — Vite + React + Tailwind shells on fixed ports
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

The marshal PWA caches the on-site snapshot + roll-call to IndexedDB via Workbox and renders from
cache immediately on open. The freshness timestamp shown in the UI is driven by SSE heartbeats.

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
