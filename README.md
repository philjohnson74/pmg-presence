# PMG Presence — Visitor & Staff Management System

A site presence platform for **Peacocks Medical Group (PMG)** that can answer one
question with confidence at any moment:

> **"Who is on site right now, and where are they?"**

Built for the Stage 5 Lead Agentic Software Developer technical task.

## The problem (from the brief)

PMG operates a single Newcastle site with ~200 staff and a varied daily flow of
visitors, contractors, patients, suppliers and auditors. A recent fire drill exposed
that the roll-call process produced an unreliable list — people who had left were
marked present, visitors weren't accounted for at all. The business needs an
authoritative, live view of building occupancy that holds up during an evacuation.

## The MVP box we've drawn

A working, end-to-end **presence + fire roll-call** system across three clients:

| App | Audience | Purpose |
|-----|----------|---------|
| **Admin Portal** | Operations / facilities | Manage employees, view live on-site list, search visit history |
| **Reception Kiosk** | Public (unauthenticated tablet) | Self-service check-in/out for employees, visitors and patients; fire alarm trigger |
| **Employee / Marshal PWA** | Staff + fire marshals | Personal QR check-in/out; offline-capable live roll-call during evacuation |

The single most important deliverable is **trustworthy roll-call** — the fire marshal's
phone must show who is physically present, even offline, the moment the alarm sounds.

## Status

| Phase | Description | Status |
|-------|-------------|--------|
| **Phase 0** | Monorepo skeleton & tooling | ✅ Complete |
| **Phase 1** | Domain + in-memory repositories + seed | ✅ Complete |
| **Phase 2** | Auth: mock SSO + JWT + RBAC middleware | ✅ Complete |
| **Phase 3** | Check-in/out API + event log + debounce | ✅ Complete |
| **Phase 4** | QR issuance + validation | 🔲 Next |
| **Phase 5** | Patient lookup | 🔲 Pending |
| **Phase 6** | Fire trigger + roll-call API + SSE | 🔲 Pending |
| **Phase 7** | Admin Portal UI | 🔲 Pending |
| **Phase 8** | Reception Kiosk UI | 🔲 Pending |
| **Phase 9** | Employee / Marshal PWA UI | 🔲 Pending |
| **Phase 10** | Offline (Service Worker + IndexedDB) | 🔲 Pending |
| **Phase 11** | Observability, OpenAPI, E2E, polish | 🔲 Pending |

See [docs/08-implementation-plan.md](docs/08-implementation-plan.md) for full phase detail.

## Running the project

> **Prerequisite:** pnpm is managed via Corepack. Run `corepack enable` once if `pnpm` is not
> found, then all commands below work from the repo root.

```bash
pnpm install          # install all workspace dependencies
pnpm dev              # start all four services concurrently
```

Services on fixed ports:

| Service | URL |
|---------|-----|
| API + Swagger | http://localhost:4000 |
| Admin Portal | http://localhost:5173 |
| Reception Kiosk | http://localhost:5174 |
| Marshal / Employee PWA | http://localhost:5175 |

Stop all services: **Ctrl + C** in the terminal.

## Running tests

```bash
pnpm test                          # run all unit + integration tests (Vitest, all packages)
pnpm lint                          # ESLint across the monorepo
pnpm typecheck                     # tsc across the monorepo

# Single package
pnpm --filter @pmg/api test

# Single test file
pnpm --filter @pmg/api test -- src/presentation/routes/health.test.ts

# E2E (requires stack running)
pnpm test:e2e
```

## Tech stack

- **Frontend:** React + TypeScript + Vite, Tailwind CSS, shadcn/ui, PWA (Capacitor-ready)
- **Backend:** Node.js + Express + TypeScript, single HTTP API
- **Data:** In-memory repositories behind interfaces (PostgreSQL swap path documented)
- **Auth:** Mock M365/Entra ID SSO issuing local JWTs; real MSAL drops in behind the same interface
- **Real-time:** Server-Sent Events (SSE)
- **Offline:** Workbox Service Worker + IndexedDB
- **Testing:** Vitest (unit/integration), Playwright (E2E)
- **CI/CD:** GitHub Actions + SonarCloud, branch protection on `main`
- **Observability:** OpenTelemetry (traces + metrics)
- **API docs:** OpenAPI / Swagger

## Document index

| Doc | Covers |
|-----|--------|
| [docs/01-overview-and-architecture.md](docs/01-overview-and-architecture.md) | Scope, monorepo structure, Clean Architecture, DI, tooling |
| [docs/02-data-model.md](docs/02-data-model.md) | Entities, field types, relationships, GDPR strategy |
| [docs/03-api-and-sse.md](docs/03-api-and-sse.md) | REST routes, request/response shapes, RBAC matrix, SSE event schema |
| [docs/04-qr-and-patient-lookup.md](docs/04-qr-and-patient-lookup.md) | QR token signing/validation, patient name+DOB lookup, data minimisation |
| [docs/05-frontend-and-pwa.md](docs/05-frontend-and-pwa.md) | Component structure per app, Service Worker + IndexedDB cache, brand application |
| [docs/06-security-and-auth.md](docs/06-security-and-auth.md) | Auth flow, mock MSAL, RBAC middleware, OWASP Top 10 |
| [docs/07-testing-cicd-observability.md](docs/07-testing-cicd-observability.md) | Testing pyramid + targets, GitHub Actions, OpenTelemetry |
| [docs/08-implementation-plan.md](docs/08-implementation-plan.md) | Ordered, independently-runnable build phases |
| [docs/09-assumptions-and-roadmap.md](docs/09-assumptions-and-roadmap.md) | Known gaps, assumptions, questions for stakeholders, post-MVP roadmap |
| [docs/10-seed-data.md](docs/10-seed-data.md) | Demo-ready seed: employees, patients, visitors, amber/on-site sets |
| [docs/11-ai-session-transcript.md](docs/11-ai-session-transcript.md) | Curated agent-steering sample (Stage 5 transcript deliverable) |
| [docs/12-initial-prompt.md](docs/12-initial-prompt.md) | The full verbatim opening prompt that started the spec |
