# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

**Spec phase — no application code exists yet.** The `docs/` folder contains the full technical specification and implementation plan. Implementation starts at Phase 0 (see [docs/08-implementation-plan.md](docs/08-implementation-plan.md)).

## Commands (target — once implementation begins)

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
pnpm --filter @pmg/api test -- src/domain/use-cases/check-in.test.ts

# Run a single playwright test
playwright test e2e/fire-alarm.spec.ts
```

All scripts are orchestrated by **Turborepo** (`turbo.json`); run them from the repo root.

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

### Data model fundamentals

- **`PersonType`** = `employee | patient | visitor` — three values only. This drives sign-in flow, privacy tier and roll-call badge.
- **`CheckInMethod`** = `qr | email | patient-lookup | visitor-form | manual` — records *how* identity was established, not which device. `locationId` records where.
- **`CheckInEvent`** is append-only. Presence is derived: a person is on site iff their latest event is `in`. Never mutate events.
- **`ExpectedPresenceService`** unions the mock M365 staff calendar with active `VisitBooking`s for a date. This single service drives the amber roll-call state for both staff and multi-day visitors.
- **`OnsiteSnapshot`** is always derived from the event log — never stored.

### Auth and RBAC

RBAC is enforced **server-side on every request**. The `requireRole(...roles)` middleware factory in `presentation/middleware/` returns 401 (no/invalid token) or 403 (wrong role) before any handler runs. The kiosk check-in/out endpoints are explicitly public — everything else requires a valid JWT. JWT claims mirror Entra ID app-role conventions (`roles: string[]` array) so the mock and the real MSAL implementation are drop-in compatible.

### Real-time and offline

SSE is the only real-time channel (`GET /api/onsite/stream`). The `EventSource` API cannot set headers, so the JWT is passed as `?access_token=` on the stream URL and validated on connection — document this explicitly if adding new SSE endpoints.

The marshal PWA caches the on-site snapshot + roll-call to IndexedDB via Workbox and renders from cache immediately on open. The freshness timestamp shown in the UI is driven by SSE heartbeats. The offline outbox queues `PATCH /rollcall` actions made while disconnected and replays on reconnect.

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
