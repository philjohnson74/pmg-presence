# 09 — Assumptions, Known Gaps & Roadmap

The brief is deliberately fuzzy — "part of what we want to see is how you decide." This is the
honest scope statement: the calls made, the questions worth asking, and what's deferred.

## 9.1 Scope decisions (where the box went, and why)

- **Roll-call reliability is the product.** Driver #1 (the fire-drill failure) is the reason the
  system exists, so the offline-capable marshal roll-call is the centre of gravity. Visitor
  self-service (driver #2, cost) is fully built because it's the cheapest big win. Operational
  visibility (driver #3) is served by a thin **Expected today** read off the same data.
- **Append-only event log, derived presence.** "Currently on site" means *latest event is `in`* —
  not a roster, not a schedule. This directly fixes the "left earlier but marked present" bug.
- **Three person types; reason and duration are separate axes.** `PersonType` is
  `employee | patient | visitor` (behaviour/privacy/flow). A visitor's *reason* is free text +
  optional category tag; their *duration* is a single- or multi-day `VisitBooking`. Duration —
  not type — drives the contractor "don't re-register daily" behaviour and the amber state.
- **One unified "expected presence" concept.** Amber (expected but not checked in) is the union of
  mock M365 staff calendar + active visit bookings, behind one `ExpectedPresenceService`. The
  roll-call doesn't care *why* someone's expected — staff and multi-day visitors flow identically.
- **Everything external is mocked behind an interface.** Clinical system, M365/Outlook, push,
  email, and Entra SSO are all ports with in-memory/mock adapters. This is a *judgement* call the
  brief invites: "not a test of heroic integrations in four hours."
- **No hardware.** Confirmed no RFID — manual keypads only. The kiosk tablet + employee-phone QR
  is the realistic, low-cost capture mechanism. Fire alarm **panel** integration is mocked; the
  kiosk button stands in for the real panel signal.

## 9.2 Assumptions (logged because the brief didn't say)

1. **Staff capture via personal phone QR.** Assumed staff have a phone for the rotating-QR app.
   Fallback: email check-in at the kiosk for those who don't / won't. *(Would confirm with stakeholder.)*
2. **Email is genuinely optional for staff** (stated in the task) — no field, flow, or check-in
   requires it. Visitors' email also optional.
3. **One active fire event at a time**, resolved by an admin. Concurrent drills not modelled.
4. **Amber = "expected on site per Outlook but not checked in".** Assumed a daily mock calendar
   feed is an acceptable proxy for "should be here". Real Graph integration would refine this.
5. **Contractors are visitors, not a person type.** They use the visitor flow with
   `personType:'visitor'` and `visitCategory:'contractor'` (doc 02), and their multi-day presence
   is modelled as a `VisitBooking` — so they appear amber on days they're expected but haven't
   scanned in, and get a low-friction return pass (doc 04). Per-day check-in/out still applies
   (presence ≠ expectation). Full booking management (edit/cancel/recurring) is roadmap.
6. **Patient arrival is clinic-style and minimal** — name+DOB, no account, no full sign-in form;
   DOB is never persisted by PMG presence.
7. **Single site, single timezone (Europe/London).** Multi-site is a data-model-ready future
   (Location already exists) but not exercised.
8. **The kiosk is online-first for writes.** It does not queue check-ins while offline in the MVP
   (the *marshal* app is the offline-critical one). *(Would confirm acceptable.)*
9. **Trusted internal network for the public kiosk endpoints** — they're public to the kiosk but
   the deployment is assumed behind PMG's network/origin controls, not the open internet.
10. **SSE is sufficient at ~200 concurrent** for one site; WebSockets deferred (see §9.4).

## 9.3 Questions I'd ask a real stakeholder (Thomas, corridor-grab)

These would **meaningfully change scope**, so they're worth an email rather than an assumption:
1. **Fire panel signal** — is there any electrical/API contact closure we could read from the real
   alarm panel, or is a manual "marshal/reception confirms evacuation" trigger acceptable
   long-term? (Changes whether the kiosk button is a stopgap or the product.)
2. **Who owns "accounted for" during a drill** — only marshals, or can reception/any admin help?
   (Changes RBAC on the roll-call PATCH.)
3. **Staff without phones** — how many, and is kiosk email/number check-in an acceptable path for
   them, or do we need printed badges with static QR? (Changes the capture model.)
4. **Patient privacy bar** — is showing a patient's *name* on a marshal's phone during evacuation
   acceptable to the clinical/IG team, or should patients appear as "Patient (clinic) — N"?
   (Changes the roll-call data-minimisation rules.)
5. **Retention periods** — what are PMG's actual retention obligations for visitor logs and
   presence data? (Changes the GDPR purge schedule in doc 02 §2.5.)
6. **Auth decision** — Auth0/Clerk vs Entra/MSAL (job spec says pending). I've built to an Entra
   model; confirm so the real adapter targets the right IdP.

## 9.4 Assumptions I *should* flag that are easy to miss (self-audit)

The brief scores "assumptions you should have flagged but didn't" — so, explicitly:
- **Duplicate/forgotten check-outs.** People forget to check out. Without a mitigation the on-site
  list over-counts by end of day. *Flagged, partial mitigation:* an **auto-checkout at end of day**
  job is designed (a `CheckInEventRepository`-driven sweep) but **not** implemented in the MVP — it
  needs a stakeholder rule (what time? does it falsify "present at 17:00"?). Documented, not silently assumed away.
- **Tailgating / un-scanned entry.** QR/kiosk capture only works if people actually check in. The
  system is honest about this — it shows *recorded* presence, and the amber "expected but not
  seen" state is precisely the hedge against silent absence. Not a software-solvable gap alone;
  flagged as a process dependency.
- **Accessibility of the kiosk** for patients/visitors with impairments (the brand's own
  accessibility section, doc 29–30) — large type, contrast, no reversed text honoured; full
  WCAG AA audit deferred.
- **Time source trust** — all timestamps are server-side UTC to avoid a tablet with a wrong clock
  skewing presence/roll-call.

## 9.5 Three things I'd change with another day
1. **Offline write-queue on the kiosk** and a proper conflict/replay story across all clients (the
   marshal outbox generalised).
2. **Real M365 Graph calendar integration** for the amber set, replacing the daily mock, plus
   Teams/Outlook host notification on visitor arrival.
3. **Ephemeral per-PR environments** wired up (Docker images are already built in CI) + a Grafana
   dashboard from the OTel metrics, to make the production story tangible.

## 9.6 Post-MVP roadmap

| Item | Why | Where the seam already is |
|------|-----|---------------------------|
| **Capacitor wrapper (iOS)** | Reliable background sync/storage for the marshal app on iPhones (PWA can't) | PWA built; Capacitor wraps the same web app — planned stack |
| **Web Push notifications** | Push the alarm to marshals not actively in the app | `PushPort` interface built (Phase 1) → swap `LoggingPushService` to a Web Push adapter |
| **M365 Graph integration** | Real "expected on site" (amber) + host notifications + real SSO | `CalendarPort` + `MockM365Calendar` built (Phase 1); `AuthProvider`/`MockAuthProvider` interface shipped (Phase 2) — swap `MockAuthProvider` for `MsalAuthProvider` + point `JwtService.verify` at Entra JWKS |
| **PostgreSQL persistence** | Durable storage, multi-instance, reporting | All 8 repo interfaces built + contract test suites + `container.ts` composition root (Phase 1); swap implementations there |
| **WebSocket real-time** | Bi-directional, header auth, scale beyond one site's SSE limits | SSE behind a client abstraction; broker swappable |
| **Ephemeral (Phoenix) per-PR envs** | Job-spec CI/CD requirement; safe review | Containerised apps + IaC; `build` job emits images |
| **Auto-checkout & anomaly detection** | Fix forgotten check-outs; flag tailgating-shaped gaps | Event-log sweep job designed in §9.4 |
| **Patient pre-registration app** | Smoother clinic arrivals; SMS/email confirmations | `ClinicalSystemPort` + `EmailPort`; patient entity exists |
| **Visitor booking management + planning calendar** | Edit/cancel/recurring bookings; full forward planning view (driver 3); wallet passes | `VisitBooking` + `ExpectedPresenceService` + pass tokens shipped; MVP has create + thin "Expected today" read |
| **Offline write-queue everywhere** | Full resilience, not just marshal reads | Marshal outbox pattern generalises |
| **RFID/badge option** | If PMG ever adds hardware | `CheckInMethod` enum + `locationId` model already accommodate a new method |

## 9.7 Stack-choice justification (one paragraph, for the scope statement)
React + TypeScript + Vite with Tailwind/shadcn and a Node/Express TypeScript API is exactly the
job-spec stack, and it's the right reach for this problem: one language across the whole stack,
a single shared `contracts` package keeping the three clients and the API in lockstep, and a PWA
that Capacitor can later wrap to a device with no rewrite. SSE (not WebSockets) is the minimal
real-time primitive that fits a single-site, mostly-broadcast workload and ships faster; the
client abstraction leaves the WebSocket door open. In-memory repositories behind interfaces let
the MVP ship in hours while the PostgreSQL swap is a single composition-root change proven by
shared contract tests — senior judgement applied where generative tooling would otherwise
hard-wire a database in and make the safe, swappable path expensive later.
