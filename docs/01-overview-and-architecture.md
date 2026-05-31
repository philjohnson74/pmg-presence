# 01 — Overview & Architecture

## 1.1 Scope statement (the box we drew)

**Built:** An end-to-end presence system — employee/visitor/patient check-in and
check-out through a public reception kiosk and a personal employee app, an authoritative
live on-site list, single- and multi-day visitor bookings with low-friction return passes, a
unified "expected presence" (amber) view, and an offline-capable fire marshal roll-call that
switches into evacuation mode the instant a kiosk alarm fires. Admin portal for employee
management, an operational "expected today" read, and visit history. All data in-memory behind
repository interfaces; all external systems (clinical DB, M365/Outlook, push, email, Entra ID)
mocked behind clean interfaces.

**Deliberately *not* built (documented, not implemented):**
- Real Microsoft Graph / Outlook calendar sync (mocked)
- Real MSAL/Entra ID SSO (mock login screen issuing local JWTs)
- Real fire alarm panel integration (kiosk button simulates the trigger)
- Web Push notifications (intent logged only)
- PostgreSQL persistence (in-memory repos satisfying the same interfaces)
- Patient self-registration / patient-facing app
- Full visitor-booking management (edit/cancel/recurring) and a forward planning calendar — MVP
  ships booking *create* + low-friction return + a thin "expected today" read
- Hardware RFID / badge readers — **confirmed out of scope**, site uses manual keypads only

**Why this box:** roll-call reliability is the business's actual pain. Everything in the
MVP exists to make the marshal's evacuation view trustworthy and live. Anything that
doesn't serve that, or visitor management as the cost-saving second driver, is mocked
or deferred. See [09-assumptions-and-roadmap.md](09-assumptions-and-roadmap.md).

## 1.2 Design principles

- **Clean Architecture** — dependencies point inward: `presentation → application → domain`,
  with `infrastructure` plugged in at the edges via interfaces defined by the inner layers.
- **Repository Pattern everywhere** — all data access and every external integration sits
  behind an interface. In-memory implementations for the MVP; the swap to PostgreSQL,
  Microsoft Graph, etc. touches only `infrastructure`, never `domain`/`application`.
- **Dependency Injection** — a lightweight composition root wires concrete implementations
  into the application layer. No `new`-ing infrastructure inside business logic.
- **SOLID** — single-responsibility use cases, interfaces segregated per concern,
  dependency inversion via the repository interfaces.
- **Low coupling / high cohesion** — the three frontends share only typed contracts and a
  small UI kit; they do not import each other's feature code.

### Layer responsibilities (backend)

| Layer | Contains | Knows about |
|-------|----------|-------------|
| `domain` | Entities, value objects, domain rules (e.g. "an occupant is on site if their last event is `in`"), repository **interfaces** | Nothing outside itself |
| `application` | Use cases / services (CheckIn, CheckOut, TriggerFireEvent, MarkAccountedFor, LookupPatient), DTOs | `domain` only |
| `infrastructure` | In-memory repos, JWT signing, SSE broker, mock integrations (clinical, M365, push, email), OpenTelemetry | `domain` interfaces, `application` |
| `presentation` | Express routers, controllers, middleware (auth, validation, rate-limit), OpenAPI, SSE endpoint | `application` use cases |

## 1.3 Monorepo structure (full)

Package manager **pnpm** with workspaces; **Turborepo** for task orchestration so the whole
repo builds/tests/runs from the root.

```
pmg-presence/
├── package.json                       # root scripts: dev, build, test, lint, typecheck
├── pnpm-workspace.yaml
├── turbo.json                         # pipeline: dev / build / test / lint / typecheck
├── tsconfig.base.json                 # shared TS config, path aliases
├── .eslintrc.cjs / eslint.config.js
├── .prettierrc
├── sonar-project.properties           # SonarCloud config
├── .github/
│   └── workflows/
│       ├── ci.yml                     # PR pipeline (see doc 07)
│       └── codeql.yml                 # optional SAST
├── docker-compose.yml                 # future: postgres + grafana (documented, not required for MVP)
├── README.md
├── docs/                              # this specification
│
├── apps/
│   ├── api/                           # Node.js + Express + TS backend
│   │   ├── src/
│   │   │   ├── domain/
│   │   │   │   ├── entities/          # Employee, Visitor, VisitBooking, Patient, CheckInEvent, FireEvent, ...
│   │   │   │   ├── value-objects/     # PersonType, VisitCategory, Direction, CheckInMethod, Role
│   │   │   │   └── repositories/      # *Repository interfaces (ports)
│   │   │   ├── application/
│   │   │   │   ├── use-cases/         # check-in.ts, check-out.ts, create-booking.ts, trigger-fire.ts, ...
│   │   │   │   ├── services/          # OnsiteProjectionService, ExpectedPresenceService, RollCallService
│   │   │   │   └── dto/
│   │   │   ├── infrastructure/
│   │   │   │   ├── persistence/in-memory/   # In-memory repos implementing domain ports
│   │   │   │   ├── auth/              # JWT signer/verifier, mock-entra provider
│   │   │   │   ├── integrations/      # mock-clinical, mock-m365, mock-push, mock-email
│   │   │   │   ├── realtime/          # SSE broker
│   │   │   │   ├── telemetry/         # OpenTelemetry setup
│   │   │   │   └── seed/              # seed-data.ts
│   │   │   ├── presentation/
│   │   │   │   ├── routes/            # employees, onsite, expected, visits, checkin, patients, fire, auth, stream
│   │   │   │   ├── middleware/        # requireAuth, requireRole, validate, rateLimit, errorHandler
│   │   │   │   ├── openapi/           # openapi.yaml + swagger-ui mount
│   │   │   │   └── server.ts
│   │   │   ├── container.ts           # composition root (DI wiring)
│   │   │   └── index.ts               # bootstrap
│   │   ├── test/                      # vitest unit + integration
│   │   └── package.json
│   │
│   ├── admin/                         # Admin Portal — React SPA (authenticated)
│   ├── kiosk/                         # Reception Kiosk — React PWA (public)
│   └── employee/                      # Employee / Mashal PWA — React PWA (authenticated, offline-capable)
│       └── (each app: src/, public/manifest.webmanifest, vite.config.ts, package.json)
│
├── packages/
│   ├── contracts/                     # Shared TS types: API request/response, SSE events, domain enums
│   │                                  #   single source of truth imported by api + all frontends
│   ├── ui/                            # shadcn/ui components + PMG brand theme (Tailwind preset, tokens)
│   ├── auth-client/                   # Browser auth: mock provider now, MSAL-ready interface
│   ├── api-client/                    # Typed fetch wrapper + SSE client (EventSource helper)
│   ├── offline/                       # Workbox SW registration + IndexedDB cache helpers (marshal)
│   └── config/                        # Shared eslint/tsconfig/tailwind presets
│
└── e2e/                               # Playwright tests spanning the running stack
```

### Why this layout
- **`packages/contracts`** is the spine: the API and every frontend import the same types,
  so a route shape change is a compile error across the repo, not a runtime surprise.
- **`packages/ui`** holds the brand once (doc 05) — three apps, one visual language.
- **`apps/api`** is the only place Clean Architecture layering matters; the frontends are
  feature-foldered React apps consuming `contracts` + `api-client`.

## 1.4 Root commands (single-command dev)

```jsonc
// root package.json (scripts)
{
  "dev":        "turbo run dev --parallel",   // api + admin + kiosk + marshal together
  "build":      "turbo run build",
  "test":       "turbo run test",             // vitest across packages/apps
  "test:e2e":   "playwright test",
  "lint":       "turbo run lint",
  "typecheck":  "turbo run typecheck",
  "seed":       "pnpm --filter @pmg/api seed" // reset in-memory seed (dev convenience)
}
```

Ports (fixed for a predictable demo recording):

| Service | Port |
|---------|------|
| API + SSE + Swagger | `4000` |
| Admin Portal | `5173` |
| Reception Kiosk | `5174` |
| Marshal / Employee PWA | `5175` |

Vite dev servers proxy `/api` and `/stream` to `:4000` to keep cookies/CORS simple in dev.

## 1.5 Dependency injection / composition root

`apps/api/src/container.ts` is the single place infrastructure is instantiated and injected:

```ts
// illustrative — not final code
export function buildContainer() {
  const employees   = new InMemoryEmployeeRepository(seed.employees);
  const events      = new InMemoryCheckInEventRepository(seed.events);
  const bookings    = new InMemoryVisitBookingRepository(seed.bookings);
  const fireEvents  = new InMemoryFireEventRepository();
  const clinical    = new MockClinicalSystem(seed.patients);     // ClinicalSystemPort
  const calendar    = new MockM365Calendar(seed.expectedOnsite); // CalendarPort (staff half)
  const push        = new LoggingPushService();                  // PushPort
  const sse         = new SseBroker();
  const jwt         = new JwtService(env.JWT_SECRET);

  const onsite      = new OnsiteProjectionService(events, employees);
  const expected    = new ExpectedPresenceService(calendar, bookings); // unions staff + bookings
  const checkIn     = new CheckInUseCase(events, employees, bookings, clinical, sse, onsite);
  const triggerFire = new TriggerFireUseCase(fireEvents, onsite, expected, sse, push);
  // ...wire the rest

  return { employees, events, bookings, onsite, expected, checkIn, triggerFire, jwt, sse, /* ... */ };
}
```

Swapping to Postgres later = replace the `InMemory*Repository` constructions here; nothing
in `application`/`domain` changes. Same pattern for promoting any mock integration to real.
