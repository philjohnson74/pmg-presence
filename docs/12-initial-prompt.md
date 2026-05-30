# 12 — Initial Prompt (verbatim)

This is the **complete, unedited opening prompt** that started the spec-and-plan session,
reproduced in full because it is the single most important piece of steering in the project: it
sets the stack, the architecture, the constraints, the swap-path discipline, and the 15 explicit
deliverables — *before any code or spec existed*. The agent's job was to turn this into the
`docs/` specification; the curated steering arc that followed is in
[11-ai-session-transcript.md](11-ai-session-transcript.md).

> Attachments referenced in the prompt (the Stage 5 task brief, the Lead Agentic Developer job
> spec, and the PMG brand guidelines) were provided to the agent alongside this text.

---

> I need you to create a detailed technical specification and implementation plan for a Visitor and Staff Management System for Peacocks Medical Group (PMG). Do not write any code yet. I want a complete spec and plan with ordered implementation steps before moving to implementation.
>
> ## Context
> This is a paid technical task (attached) for a job application. The solution needs to demonstrate professional engineering practices and tech stack aligned with the attached job specification for a Lead Agentic Developer role. I have also attached the brand guidelines for Peacocks Medical Group which should inform the UI design across all client applications.
>
> ## Repository Structure
> Single GitHub monorepo, all applications and packages runnable from the root with a single command. Structure should follow a monorepo pattern with clearly separated apps and shared packages.
>
> ## Tech Stack
> Align to the following stack as specified in the job profile:
> - **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
> - **Backend**: Node.js, Express, TypeScript
> - **Mobile/PWA**: Capacitor-ready PWA architecture
> - **Database**: In-memory repository implementation for MVP (designed to swap to PostgreSQL. Clear interface boundary documented)
> - **Auth**: M365/Entra ID SSO via MSAL (production model).
>   Mocked for MVP — fake login screen with seeded user accounts, issues a local JWT on selection. Auth interface designed so real MSAL implementation replaces the mock without touching application logic. Auth0 noted as an alternative if PMG ever moves away from M365.
> - **QR Scanning**: html5-qrcode or @zxing/browser (on reception kiosk to read employee QR codes displayed on employee app)
> - **Real-time**: Server-Sent Events (SSE) for live updates to connected clients
> - **Offline**: Service Worker with IndexedDB via Workbox for marshal PWA cache
> - **Testing**: Vitest (unit/integration), Playwright (E2E)
> - **CI/CD**: GitHub Actions with branch protection, all tests and Sonar scans must pass before merge to main
> - **Observability**: OpenTelemetry for metrics and tracing
> - **Code Quality**: SonarCloud integration
> - **API Documentation**: OpenAPI/Swagger
>
> ## Applications
>
> ### 1. Admin Portal (Web App)
> - Add, edit, deactivate employees (name, role, employeeId — note: not all staff have email addresses, so email is optional not required)
> - Assign roles: Admin, Fire Marshal, Employee
> - View live on-site list with filtering by person type (employee, visitor, contractor, patient)
> - Search visit history by date/time range, name, or email
> - Note: M365/Entra ID sync should be mocked using the Repository pattern with a clean interface, documented as a future integration via Microsoft Graph API
>
> ### 2. Reception Kiosk PWA
> Employee check-in/out via two methods:
> - **Email address entry**: for employees who have an email address on their record — looked up against employee store
> - **QR code scan**: kiosk camera scans QR code displayed on the employee's mobile app. QR code encodes a signed token resolving to an employee ID. On successful scan the kiosk calls the check-in/out API directly. Note: employees may enter or leave via different doors so the employee app QR scan should also work at any other exit point, not just the main reception kiosk — the API call is made from the employee app itself when scanned in passing.
>
> No RFID functionality - confirmed the site uses manual keypads only with no existing RFID infrastructure.
>
> Patient check-in:
> - Patient selects "I'm a patient" on the kiosk
> - Enters their name and date of birth
> - System looks up against a mock patient database (seeded with realistic data)
> - On match, retrieves patient record and checks them in, similar to a hospital waiting room arrival flow
> - On no match, offers manual entry fallback with a note for reception staff to follow up
> - Mock patient DB implemented via Repository pattern with a clean interface, documented as a future integration with PMG's clinical system
>
> Visitor self-service check-in:
> - Name, email (optional), host, purpose (appointment, contractor, supplier, auditor, NHS commissioner, other)
> - Visitor check-out: display only visitors currently checked in to reduce data exposure
>
> Fire alarm trigger:
> - Prominent button on kiosk, requires confirmation tap to prevent accidental activation
> - Locks sign-in flow on activation
> - Fires SSE event to all connected marshal apps switching them to evacuation/roll-call mode
> - Push notification to marshal app documented as post-MVP enhancement via Web Push API
>
> ### 3. Employee/Marshal PWA (Offline-Capable)
> Employee check-in/out:
> - Displays employee's unique QR code (signed token, not raw employee ID)
> - Employee opens app, presents QR code on screen at reception kiosk or any exit point
> - The kiosk/scanner reads the QR code and triggers the check-in/out API call
> - Alternatively: employee can use the app to initiate their own check-in/out directly via a button which calls the API, useful at unmanned exit points where there is no kiosk to scan from
>
> Fire marshal roll-call view (marshal role only):
> - Live on-site list with real-time SSE updates while connected
> - On evacuation mode trigger:
>   - Red background: checked in, not yet accounted for
>   - Green background: marshal has marked as accounted for
>   - Amber background: expected on site per mock Outlook calendar data but not checked in (M365 mock — future Microsoft Graph API integration)
> - Person type clearly indicated in list (employee, visitor, contractor, patient)
> - Offline capability: Service Worker caches on-site snapshot to IndexedDB via Workbox
>   - Cache updated continuously while app is open and connected via SSE or polling
>   - On app open: render from IndexedDB cache immediately, then attempt live fetch if connected
>   - Cache freshness timestamp shown prominently so marshal can assess reliability
>   - Periodic Background Sync registered where supported (Android Chrome)
>   - iOS limitation documented — Capacitor wrapper identified as production solution for reliable background sync on iOS
>
> ## Architecture & Engineering Standards
>
> ### Architecture
> - Clean Architecture with clear separation: domain, application, infrastructure, presentation layers
> - Repository Pattern for all data access and external integrations
> - All in-memory stores implement the same interfaces a PostgreSQL repository would satisfy, swap path is clear and documented
> - All mocked integrations (patient DB, M365, push notifications) inject through interfaces so real implementations replace them without touching business logic
> - Dependency injection throughout
> - SOLID principles applied consistently
> - Low coupling, high cohesion
>
> ### Data Model
> Design the full production-representative data model including:
> - **Employees**: id, name, email (optional), role, employeeNumber, qrCodeToken, active
> - **Patients**: id, name, dateOfBirth, patientReference, clinicalSystemId (mock external ref)
> - **Visitors**: id, name, email (optional), company
> - **CheckInEvents**: id, personId, personType (employee/patient/visitor/contractor), direction (in/out), timestamp, method (qr/email/manual/kiosk-form), locationId
> - **Locations**: id, name, type (reception, exit) — supports multiple entry/exit points
> - **OnsiteSnapshot**: derived view of current occupants
> - **FireEvents**: id, triggeredBy, triggeredAt, resolvedAt
> - **RollCallEntries**: fireEventId, personId, accountedFor, accountedAt, accountedBy
> - **AuditLog**: entity, entityId, action, changedBy, timestamp, before, after
> - **GDPR considerations**: visitor and patient PII retention policy, right to erasure approach, pseudonymisation — document the strategy even if not fully implemented in MVP
>
> ### Security
> - OWASP Top 10 considerations documented and addressed
> - Auth for admin portal and marshal app (kiosk is public-facing, no auth)
> - QR codes encode signed tokens (e.g. short-lived JWT) not raw employee IDs — prevents spoofing
> - Input validation and sanitisation on all endpoints
> - Rate limiting on API — especially patient lookup and check-in endpoints
> - CORS configured correctly
> - Audit logging for all sensitive operations
> - Patient data handled with particular care — name/DOB lookup returns minimum necessary data
>
> ### Testing Strategy (Testing Pyramid)
> - **Unit tests** (majority): all business logic, domain rules, repository interfaces, QR token generation/validation, patient lookup logic — Vitest, high coverage targets
> - **Integration tests**: API route handlers with in-memory repositories, SSE event flow, auth middleware, patient lookup with mock repository
> - **E2E tests** (small number, critical journeys only): employee QR check-in flow, patient name/DOB check-in, visitor sign-in, fire alarm trigger, marshal roll-call — Playwright
> - All suites must pass in CI before merge to main
>
> ### CI/CD (GitHub Actions)
> - Branch protection on main
> - PR workflow: lint → type check → unit tests → integration tests → SonarCloud scan → E2E tests → build
> - Ephemeral/preview environment pattern documented — not implemented in MVP but architecture designed to support it
> - Describe the full workflow YAML structure in the plan
>
> ### Observability
> - OpenTelemetry setup for API
> - Trace: check-in/out events, fire alarm triggers, patient lookups, auth events
> - Metrics: current occupancy by person type, check-in rate, patient lookup match/miss rate, API response times, SSE connection count
> - Document Prometheus/Grafana or cloud-native exporter integration point
>
> ### Performance & Scalability
> - SSE connection management documented — note connection limits at scale and WebSocket migration path
> - In-memory store interfaces designed to be satisfied by Redis cache or PostgreSQL
> - QR scan debouncing to prevent duplicate check-in events on rapid successive scans
> - Patient DOB/name lookup should be case-insensitive and whitespace-tolerant
>
> ### Authorisation
> All backend API endpoints (except the kiosk check-in/out endpoints which are
> public-facing) must validate the JWT from the request and enforce role-based
> access control (RBAC) before returning data. Authorisation must be enforced
> server-side on every request — never trust the client to self-police access.
>
> Role hierarchy:
> - **Admin**: full access to all endpoints including user management,
>   visit history, live on-site list, fire event management
> - **Marshal**: read access to live on-site list and roll-call endpoints,
>   can mark people as accounted for during evacuation, cannot manage users
>   or view full visit history
> - **Employee**: can check in/out their own record only, can view their
>   own visit history, no access to other people's data
> - **Unauthenticated (kiosk)**: check-in/out endpoints only, patient
>   lookup endpoint, no read access to on-site data
>
> Implementation:
> - Express middleware function that validates the JWT signature and expiry
>   on every protected route
> - Role claims extracted from the JWT payload (aligned to what a real
>   Entra ID token would contain — e.g. roles array)
> - A requireRole(...roles) middleware factory that wraps any route
>   handler and returns 401 if no valid token, 403 if valid token but
>   insufficient role
> - Applied consistently across all routes — document each route's
>   required role in the OpenAPI spec
> - Unit tested in isolation — the middleware should be independently
>   testable with mock JWTs covering valid/invalid/expired/wrong-role cases
> - Integration tested on each protected route — verify 401/403 responses
>   for unauthenticated and under-privileged requests, not just happy path
>
> Example role enforcement by endpoint:
> - GET /api/onsite — Admin, Marshal
> - GET /api/onsite/rollcall — Admin, Marshal
> - PATCH /api/onsite/rollcall/:id — Marshal, Admin
> - GET /api/visits/history — Admin only
> - GET /api/employees — Admin only
> - POST /api/employees — Admin only
> - POST /api/checkin — Unauthenticated (kiosk public endpoint)
> - POST /api/checkout — Unauthenticated (kiosk public endpoint)
> - GET /api/patients/lookup — Unauthenticated (kiosk public endpoint)
> - GET /api/fire/events — Admin, Marshal
> - POST /api/fire/trigger — Unauthenticated (kiosk), Admin
> - SSE /api/onsite/stream — Marshal, Admin (token passed as query
>   param or in initial handshake since SSE cannot set headers)
>
> Note on SSE auth: browser EventSource API does not support custom
> headers, so the JWT must be passed as a query parameter on the SSE
> connection URL and validated on initial connection. Document this
> explicitly as a known SSE limitation.
>
> ## Mocked Integrations (all via Repository pattern)
> - **Patient clinical system**: mock patient DB seeded with realistic data. Name + DOB lookup. Interface documented for future integration with PMG's clinical system.
> - **M365/Outlook Calendar**: mock returns seeded expected-on-site data for amber marshal view. Interface documented for future Microsoft Graph API implementation.
> - **Push notifications**: fire alarm trigger logs intent, does not send. Interface documented for future Web Push implementation.
> - **Email notifications**: visitor/patient check-in confirmation stubbed. Interface documented.
> - **Entra ID / M365 SSO**: mocked with a fake login screen.
>   Seeded users cover all roles (admin, marshal, employee).
>   On selection issues a signed local JWT with role claims
>   matching what a real Entra ID token would contain.
>   Interface documented for future MSAL implementation
>   using @azure/msal-browser. Role claims structure aligned
>   to Entra ID app registration conventions.
>
> ## Seed Data
> Include realistic seed data representing:
> - 10-12 employees with varied roles (2 admins, 3 fire marshals, remainder standard employees). Mix of employees with and without email addresses to reflect the real constraint.
> - 8-10 patients in the mock patient DB with name, DOB, and patient reference
> - 3-4 pre-registered expected visitors for today
> - A handful of already checked-in occupants (mix of employee, visitor, patient) so the marshal view is populated from the start of the demo
> - 2 employees in mock M365 data shown as expected on site but not checked in (amber state in marshal view)
> - At least one employee seeded without an email address to demonstrate the email-optional constraint in the admin portal
>
> ## Brand Guidelines
> Apply Peacocks Medical Group brand guidelines (attached) across all three client applications — colours, typography, logo usage. Document any decisions made where the guidelines are silent on a specific UI pattern.
>
> ## Deliverables the spec and plan should cover
> 1. Monorepo folder structure in full
> 2. Full data model with field types and relationships
> 3. API design — all routes, methods, request/response shapes, auth requirements
> 4. SSE event schema
> 5. QR token signing strategy — generation, validation, expiry
> 6. Patient lookup flow — name/DOB matching, no-match handling, data minimisation
> 7. Service Worker and IndexedDB cache strategy for marshal PWA
> 8. Auth flow for admin portal and marshal app
> 9. Component structure for each of the three frontend applications
> 10. Testing strategy and coverage targets per layer
> 11. GitHub Actions workflow structure
> 12. OpenTelemetry instrumentation plan
> 13. Implementation phases — ordered steps to work through sequentially, each independently runnable and testable before moving to the next
> 14. Known gaps and assumptions — things the brief didn't specify that I've made a reasonable call on
> 15. Post-MVP roadmap items (Capacitor wrapper for iOS background sync, push notifications, M365 Graph integration, PostgreSQL swap, ephemeral environments, potential future patient app with pre-registration)
>
> ## Constraints
> - Must be completable as a working demo in 4-6 hours of implementation time after the spec is agreed
> - All three apps must run concurrently from a single root-level dev command
> - The demo must be recordable as a 5-10 minute screen recording showing all three clients working together
> - No real external services — everything either mocked or in-memory
> - Email is optional for employees — the system must not require it for check-in

---

### Note for the reviewer

The prompt above intentionally encodes several senior-engineering decisions *as constraints on the
agent* rather than leaving them to the model: the Repository/port boundary on every external
dependency (so mocks never touch business logic), server-side RBAC on every request, the SSE
header limitation and its query-token workaround, QR-as-signed-token (not raw IDs), data
minimisation on patient lookup, and a hard 4–6 hour implementation box. The subsequent session
(doc 11) shows where that initial framing was then *challenged and revised* — most significantly
the `PersonType`/`VisitPurpose` collapse and the multi-day visitor model.
