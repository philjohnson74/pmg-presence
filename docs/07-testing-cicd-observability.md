# 07 — Testing, CI/CD & Observability

## 7.1 Testing strategy (the pyramid)

```
        ╱╲        E2E (Playwright) — few, critical journeys
       ╱──╲
      ╱────╲      Integration (Vitest + supertest) — routes, auth, SSE, mock repos
     ╱──────╲
    ╱────────╲    Unit (Vitest) — majority: domain rules, use cases, QR, lookup, middleware
   ╱──────────╲
```

### Unit tests (majority) — Vitest
Target the pure logic that must be correct:
- **Domain rules:** "occupant is on site iff latest event is `in`"; direction toggling;
  visit-booking expectation (single- vs multi-day, `expectedOn(date)` union); roll-call state
  derivation (red/green/amber, incl. amber from staff calendar + active bookings).
- **Use cases:** CheckIn (each `method`: qr / email / patient-lookup / visitor-form / manual —
  incl. the **employee manual** fallback resolving by employeeNumber/name and audit-flagging),
  CheckOut, TriggerFire (snapshots on-site + amber set), MarkAccountedFor, LookupPatient.
- **QR:** token generation (claims, expiry), validation (good/expired/wrong-typ/tampered),
  `jti` replay/debounce logic.
- **Patient lookup matching:** case-insensitivity, whitespace/diacritic normalisation,
  name+DOB both-required, no-match path.
- **`requireRole` middleware** in isolation (valid/missing/invalid/expired/wrong-role) — §6.2.
- **In-memory repositories** against their interface contracts (a shared "repository contract
  test" suite that any future Postgres impl must also pass).

**Coverage target:** ≥ **85%** lines / branches on `apps/api/src/domain` and
`application` (the business core); ≥ 80% overall API. Enforced via Vitest `coverage.thresholds`
and surfaced in SonarCloud.

### Integration tests — Vitest + supertest
- Each route through the real Express stack with **in-memory repos** wired by the container.
- **Auth/RBAC per route:** assert `401` (no token) and `403` (under-privileged) **and** the happy
  path — not just happy path. Patient lookup with the mock clinical repo (match + miss).
- **SSE flow:** open a stream, perform a check-in via the API, assert the `onsite.changed` event
  is received; trigger fire, assert `fire.triggered` carries the roll-call; PATCH accounted-for,
  assert `rollcall.updated` broadcast.
- Validation failures (`400`) and debounce (`200 debounced`) behaviours.

**Coverage target:** every route has at least one happy-path + one authz-failure test; SSE
event types each exercised once.

### E2E tests (small, critical only) — Playwright
Run against the full stack (API + the relevant frontend) started in CI. Five journeys:
1. **Employee QR check-in** — marshal app shows QR → kiosk scan flow → on-site count increments.
   (QR scan in CI is driven by injecting the token to the check-in endpoint / a test hook, since
   real camera capture isn't available headless — documented test seam.)
2. **Patient name/DOB check-in** — kiosk patient flow → match → checked in; plus a no-match →
   manual fallback.
3. **Visitor sign-in** — kiosk visitor form → appears on admin on-site list.
4. **Fire alarm trigger** — kiosk confirm-trigger → marshal app flips to evacuation mode with
   correct red/amber/green tiles.
5. **Marshal roll-call** — mark a person accounted-for → tile turns green → reflected for a
   second connected marshal (SSE).

**Coverage target:** these 5 journeys green in CI; not chasing E2E coverage % (kept deliberately
small and fast).

### Test data & seams
- A `buildTestContainer()` lets integration tests inject deterministic seed data and fake clocks.
- The QR camera and SSE are abstracted so tests drive them without hardware/timing flakiness.

## 7.2 CI/CD — GitHub Actions

**Branch protection on `main`:** PRs only; required status checks must pass; ≥1 review;
no force-push; SonarCloud quality gate required.

### `ci.yml` structure
```yaml
name: CI
on:
  pull_request: { branches: [main] }
  push:        { branches: [main] }

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  setup:
    # checkout, pnpm install (cached), turbo cache restore
  lint:
    needs: setup
    # turbo run lint
  typecheck:
    needs: setup
    # turbo run typecheck
  unit:
    needs: setup
    # turbo run test -- --coverage  (Vitest)  → upload coverage artifact
  integration:
    needs: setup
    # vitest integration project (in-memory repos, supertest, SSE)
  sonar:
    needs: [unit, integration]
    # SonarCloud scan: quality gate, coverage import, code smells, security hotspots
    # QUALITY GATE MUST PASS  (required check)
  e2e:
    needs: [lint, typecheck, unit, integration]
    # start API + frontends (turbo dev or built preview), run Playwright, upload trace/report
  build:
    needs: [e2e, sonar]
    # turbo run build — verify all apps build; upload artifacts
```

**Order (logical gate):** `lint → typecheck → unit → integration → Sonar → E2E → build`.
All must be green before merge. (Jobs that can parallelise do; `sonar` and `e2e` both gate
`build`.) `pnpm audit` runs as a non-blocking advisory step; Dependabot raises dependency PRs.

### Ephemeral / preview environments (documented, not built)
The job spec calls for **Phoenix per-PR environments**. The architecture supports it:
containerised apps (Docker), stateless API (in-memory now → managed DB later), single cloud +
IaC. The documented pattern: on PR open, a workflow builds images, provisions an ephemeral stack
(e.g. AWS via Terraform/CDK or container apps), comments the preview URL, and tears down on close.
Not implemented in the MVP — the `build` job produces the images that such a workflow would
deploy, so the seam is ready.

### SonarCloud
- `sonar-project.properties` defines project key, sources, coverage report paths (LCOV from
  Vitest), and exclusions (generated/openapi).
- Quality gate: coverage on new code, zero new blocker/critical issues, no new security hotspots
  unreviewed. **Required** check on `main`.

## 7.3 Observability — OpenTelemetry

OTel set up in `apps/api/src/infrastructure/telemetry`, initialised before the app in
`index.ts` (auto-instrumentation for HTTP/Express + custom spans/metrics).

### Traces (spans)
- `checkin.process` / `checkout.process` — attributes: method, personType, locationId, debounced.
- `patient.lookup` — attributes: outcome (`match`/`miss`), duration (no PII).
- `fire.trigger` — attributes: triggeredBy, onsiteCount, expectedAbsentCount.
- `auth.login` / `auth.verify` — outcome, role (no token contents).
- `rollcall.account` — fireEventId, marshal.
- SSE: span around connection lifecycle; event-broadcast spans linked to the causing request.

### Metrics
- `pmg_occupancy_current{personType}` — gauge, current occupants by type.
- `pmg_checkin_total{method,direction,personType}` — counter.
- `pmg_patient_lookup_total{outcome}` — counter (match/miss rate).
- `pmg_api_request_duration_seconds{route,method,status}` — histogram (response times).
- `pmg_sse_connections{role}` — gauge (connection count).
- `pmg_fire_events_total` / `pmg_rollcall_accounted_ratio` — gauges/counters for evacuations.
- `pmg_auth_failures_total{reason}` — counter (401/403 by reason).

### Export
- MVP: OTLP exporter to console + an optional local **Prometheus** scrape endpoint
  (`/metrics` via the Prometheus exporter) and Jaeger/Tempo for traces if running the optional
  `docker-compose` (Grafana dashboard sketch included as a stretch).
- **Documented integration point:** in production, OTLP → a managed collector (AWS
  Distro for OpenTelemetry / Azure Monitor) or self-hosted Prometheus + Grafana + Tempo. Only the
  exporter config changes; instrumentation stays put.

This gives the demo a credible "here's occupancy by type, check-in rate, lookup match rate, and
SSE connection count" story, and a clear path to a real dashboard.
