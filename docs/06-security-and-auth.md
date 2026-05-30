# 06 — Security & Auth

## 6.1 Auth model overview

Two authenticated clients (Admin Portal, Marshal/Employee PWA) and one public client
(Reception Kiosk). Production intent is **M365 / Entra ID SSO via MSAL**; the MVP ships a
**mock SSO** that is interface-compatible so the real implementation drops in without touching
application logic.

### Mock SSO (MVP)
- `apps/.../login` shows a **seeded-user picker** (not a password form) — choose "David Stevens
  (Admin)", "Marshal: Priya Shah", "Employee: Sam Doyle", etc.
- `POST /api/auth/login { userId }` returns a **signed local JWT** whose claims mirror an Entra
  ID token:
  ```jsonc
  {
    "sub": "emp-001",
    "name": "David Stevens",
    "preferred_username": "david@peacocksgroup.com",
    "roles": ["admin"],          // Entra "App Role" convention — array of role strings
    "oid": "emp-001",            // Entra object id analogue
    "iss": "pmg-mock-idp",
    "aud": "pmg-presence-api",
    "iat": ..., "exp": ...        // ~8h session
  }
  ```
- Token stored client-side (in memory + refreshable; not in `localStorage` for XSS safety where
  practical — see §6.4). `packages/auth-client` exposes `login()`, `getToken()`, `getUser()`,
  `logout()` behind an `AuthProvider` interface.

### Real MSAL (documented swap)
- `packages/auth-client` has an `AuthProvider` interface with two implementations:
  `MockAuthProvider` (MVP) and `MsalAuthProvider` (`@azure/msal-browser`, future). The app only
  ever calls the interface. Switching is a one-line provider swap + config (tenant/client id,
  redirect URI, app-role mapping).
- API-side, `JwtService.verify` swaps HS256+shared-secret for **RS256 + Entra JWKS** validation
  (`iss`/`aud`/`exp`/signature against the tenant's public keys). The `roles` claim already
  matches Entra **App Role** conventions, so RBAC needs no change.
- **Auth0 noted** as an alternative provider if PMG ever moves off M365 — same `AuthProvider`
  interface, different concrete class. (Job spec lists Auth0/Clerk as a pending decision.)

## 6.2 RBAC enforcement (server-side, every request)

Authorisation is enforced **on the server, on every protected request** — the client is never
trusted to police access. Two middlewares compose:

```ts
// requireAuth: validates signature + expiry, attaches req.user = { sub, roles, ... }
//   → 401 if missing/invalid/expired token
// requireRole(...roles): asserts req.user.roles ∩ roles ≠ ∅
//   → 401 if no user (defence-in-depth), 403 if authed but under-privileged
router.get('/api/employees', requireAuth, requireRole('admin'), listEmployees);
router.get('/api/onsite',    requireAuth, requireRole('admin','marshal'), getOnsite);
router.patch('/api/onsite/rollcall/:personId',
             requireAuth, requireRole('marshal','admin'), markAccounted);
```

Role hierarchy & capability (matches doc 03 matrix):

| Role | Can | Cannot |
|------|-----|--------|
| **admin** | everything: user mgmt, full visit history, live on-site, fire mgmt, roll-call | — |
| **marshal** | read on-site + roll-call, mark accounted-for, view fire events | manage users, view full visit history |
| **employee** | check in/out own record, view **own** visit history & QR | see other people's data, on-site list, history |
| **unauthenticated (kiosk)** | check-in/out, patient lookup, fire trigger | any read of on-site/roll-call/history/employees |

**Own-resource checks:** `/employees/me/*` use the token `sub` to scope to the caller — an
employee requesting another person's visits gets the caller's own data only; there is no route
that accepts an arbitrary personId for employee-role reads.

### `requireRole` factory — testability
The middleware is a pure factory `(..., roles) => (req,res,next)`; it depends only on
`req.user`. It is **unit-tested in isolation** with mock JWTs:
- valid token + correct role → `next()` called
- no token → `401`
- malformed/invalid signature → `401`
- expired token → `401`
- valid token, wrong role → `403`

And **integration-tested per protected route** — each route asserts `401` (no token) and `403`
(under-privileged), not just the happy path (doc 07).

Each route's required role is documented in the OpenAPI spec (`x-required-roles`) so the contract
is explicit and reviewable.

## 6.3 SSE auth (recap, see doc 03 §3.6)
`EventSource` cannot send headers → JWT passed as `?access_token=` on the stream URL, validated
on connection identically to `requireRole('marshal','admin')`. Mitigations: short-lived
streaming token, redacted access logs. WebSocket/`fetch`-stream migration removes the query
token — documented as the production fix.

## 6.4 OWASP Top 10 — considerations & mitigations

| # | Risk | Mitigation in this design |
|---|------|---------------------------|
| **A01 Broken Access Control** | Privilege escalation, IDOR | Server-side RBAC on every route (§6.2); own-resource scoping via token `sub`; no client-trusted authz; kiosk endpoints explicitly whitelisted, nothing else public; per-route 401/403 integration tests. |
| **A02 Cryptographic Failures** | Token forgery, secret leakage | JWTs signed (HS256 MVP → RS256/JWKS prod); secrets via env, never committed; short-lived QR + streaming tokens; HTTPS assumed in deployment; SSE token redacted in logs. |
| **A03 Injection** | XSS, log/JSON injection | zod validation + sanitisation on every input; React auto-escaping; no `dangerouslySetInnerHTML`; parameterised queries when Postgres lands; structured logging. |
| **A04 Insecure Design** | Patient identity enumeration, alarm abuse | Rate limits on patient lookup & check-in (§6.5); name **and** DOB required, no partial match, no "why" on no-match; fire trigger guarded by confirm + origin allow-list + rate limit + audit. |
| **A05 Security Misconfiguration** | Permissive CORS, verbose errors | CORS allow-list of the three known app origins; `helmet` security headers; problem-JSON errors without stack traces in prod; least-privilege defaults. |
| **A06 Vulnerable Components** | Supply chain | `pnpm audit` + Dependabot in CI; SonarCloud; pinned versions; minimal deps. |
| **A07 Auth Failures** | Weak sessions, brute force | Short token lifetimes; login rate-limited; (real MSAL handles credential security in prod — we don't store passwords at all). |
| **A08 Integrity Failures** | Tampered tokens/data | Signed tokens verified server-side; append-only event log; audit trail with before/after. |
| **A09 Logging & Monitoring Failures** | Blind to abuse | Audit log for all sensitive ops (employee CRUD, fire trigger, accounted-for, lookups by count); OpenTelemetry traces/metrics (doc 07); failed-auth and lookup-miss counters. |
| **A10 SSRF** | n/a in MVP | No user-controlled outbound requests; mock integrations are local. Flagged to re-review when real Graph/clinical integrations land. |

## 6.5 Input validation, rate limiting, CORS, audit

- **Validation:** all bodies/queries parsed with shared zod schemas; reject unknown fields;
  length/format bounds; DOB must be a real past date; email (when present) format-checked but
  **never required** for employees/visitors.
- **Rate limiting** (`express-rate-limit`, keyed by IP/kiosk + route):
  - `GET /api/patients/lookup` — tight (e.g. 5 / 30s) to stop identity enumeration.
  - `GET /api/visits/returning` — tight (surname+code is guessable; rate-limit + lockout to stop
    brute-forcing a return pass).
  - `POST /api/checkin|checkout` — moderate, plus server-side debounce (doc 04 §4.3).
  - `POST /api/fire/trigger` (public path) — tight + confirm + origin allow-list.
  - `POST /api/auth/login` — moderate.
- **CORS:** explicit origin allow-list (admin/kiosk/marshal dev + prod origins); credentials as
  needed; no `*`.
- **Security headers:** `helmet` (CSP, HSTS in prod, no-sniff, frame-deny except kiosk self).
- **Audit logging:** every sensitive operation writes an `AuditLog` row (entity, action,
  changedBy, before/after) — employee create/edit/deactivate, fire trigger/resolve, roll-call
  accounted-for, patient-lookup outcomes (counts/outcomes only, never the queried PII), and
  **`manual` check-ins** (employee no-email/no-phone fallback + patient no-match) flagged for
  reception follow-up, since they are the lowest-assurance capture path.
- **Patient data care:** lookup returns minimum-necessary; DOB never persisted by PMG; marshal
  view shows minimal fields; patient PII retention/erasure per doc 02 §2.5.

## 6.6 Threat-model notes specific to this system
- **A malicious actor screenshotting a colleague's QR** → mitigated by ~60s expiry + rotation +
  server replay/debounce on `jti`.
- **Someone triggering a false fire alarm from the public kiosk** → confirm-to-activate, origin
  allow-list, rate limit, full audit (`triggeredBy`), and admin-only resolve. (Accepted residual:
  a determined person at the physical kiosk can trigger it — same as pulling a real fire alarm;
  the audit trail is the control.)
- **Tablet left logged in** → kiosk has no auth/session to steal (public by design); admin/marshal
  sessions expire (~8h) and the apps offer explicit logout.
