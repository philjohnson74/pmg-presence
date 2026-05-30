# PMG Presence — Visitor & Staff Management System

A site presence platform for **Peacocks Medical Group (PMG)** that can answer one
question with confidence at any moment:

> **"Who is on site right now, and where are they?"**

Built for the Stage 5 Lead Agentic Software Developer technical task. This repository
currently contains the **specification and implementation plan only** — no application
code has been written yet. Implementation begins once the spec is agreed.

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

## Tech stack (summary)

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

## Run (target, once implemented)

```bash
pnpm install
pnpm dev        # runs API + all three frontends concurrently from the repo root
```

## Status

📋 **Spec phase.** This README and the `docs/` folder define the system. No app code yet.
