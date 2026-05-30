# 05 — Frontends, PWA Offline & Brand

Three React + TypeScript + Vite apps, sharing `packages/ui` (brand + shadcn/ui), `packages/contracts`
(types), `packages/api-client`, `packages/auth-client`, and (marshal only) `packages/offline`.

## 5.1 Shared UI kit & brand application (`packages/ui`)

The PMG brand guidelines are encoded **once** as a Tailwind preset + design tokens, consumed by
all three apps so they look like one product.

### Colour tokens (from brand guidelines p.14)
| Token | Hex | Use |
|-------|-----|-----|
| `pmg-navy` (primary) | `#0b2551` | Primary surfaces, headers, text on light |
| `pmg-orange` | `#ec6a05` | Accent / Group identity, primary CTA on light |
| `pmg-cyan` | `#00b5ec` | Medical division accent, links, info |
| `pmg-green` | `#19d296` | Surgical & Medical accent; **also roll-call "accounted" green** |
| `white` | `#ffffff` | Space — "keep the tone inviting and open" |

Brand rule honoured: colours used at **100% solid, never tinted** (p.14). The ~45/45/10
navy/white/accent balance (p.15) guides layout — generous white space, navy structure, accent
sparingly.

> **Roll-call semantic colours vs brand.** The marshal evacuation view needs red/amber/green.
> The brand palette has no red and uses green/cyan/orange as *brand* accents. **Decision
> (guidelines silent):** for the safety-critical roll-call states we use an accessible semantic
> set — a clear safety **red** (`#d7263d`-class, WCAG-AA on white), brand-adjacent **amber**
> (derived from `pmg-orange`), and brand **green** (`#19d296`). These are scoped to evacuation
> mode only and never used as decorative brand colour elsewhere, so the brand stays intact while
> the safety view stays legible. Documented as an intentional deviation.

### Typography (p.16–17)
- Primary typeface **Outfit** (Google Fonts), fallback **Arial**.
- Weights: SemiBold (headings), Regular (body/bold body), Light (body).
- Type scale mirrors the specimen: H1 36/38, H2 24/26, body 10–12 equivalent → mapped to
  responsive rem scale. Base body ≥ 16px on screen for accessibility (the 10pt print default is
  a print rule; on-screen we respect WCAG and the doc-29 guidance, min 14pt where users may have
  visual impairment — kiosk uses large touch type).

### Logo & device
- Use approved full-colour logos on white/navy backgrounds only (p.10); the **heart icon** alone
  for app icons/favicons/PWA install icons (p.12). Kiosk and marshal use the relevant divisional
  lockup; the platform itself is internal so we default to **Peacocks Medical** lockup, with the
  heart icon as the PWA/app icon.
- The **circle graphic device** (p.22–23) is available as a decorative motif for kiosk idle/hero
  screens and login backgrounds, used sparingly.
- Accessibility rules respected: no text reversed out over photos, left-ranged text, adequate
  leading, ~70-char line length (doc 29–30).

### Component primitives
shadcn/ui components themed with the tokens: `Button`, `Card`, `Input`, `Dialog`, `Badge`,
`Table`, `Tabs`, `Toast`, plus PMG-specific: `PersonTypeBadge`, `OccupancyCounter`,
`RollCallTile`, `FreshnessClock`, `BrandHeader`. `PersonTypeBadge` renders the `personType`
(employee / patient / visitor) as its primary label, with a visitor's `visitCategory`
(e.g. "contractor") shown as a secondary label where present.

## 5.2 Admin Portal (`apps/admin`) — authenticated SPA

**Audience:** operations/facilities (admin role). **Auth:** mock SSO → JWT (doc 06).

Routes / screens:
- `/login` — mock SSO picker (seeded users).
- `/employees` — table: add / edit / deactivate. Email column shows "—" where absent;
  the add/edit form's email field is clearly **optional**. Role selector (Admin/Marshal/Employee).
- `/onsite` — live list with `PersonType` filter tabs (employee / patient / visitor) + occupancy
  counters, plus a `visitorsByCategory` breakdown. Subscribes to SSE for live counts. Shows
  "reception to verify" flag for manual patient fallbacks.
- `/expected` — **operational view (driver 3):** who's expected on site today/tomorrow (staff +
  visit bookings), expected-vs-present, and a category breakdown for planning. Thin read in the
  MVP; a full planning calendar is roadmap (doc 09).
- `/history` — visit history search (date range, name, email) with results table + export-to-CSV
  (client-side, nice-to-have).
- `/fire` — fire event log; resolve an active event (admin stand-down).

Component structure (feature-foldered):
```
apps/admin/src/
├── app.tsx, router.tsx
├── features/
│   ├── auth/        (LoginPage, useSession)
│   ├── employees/   (EmployeeTable, EmployeeForm, useEmployees)
│   ├── onsite/      (OnsiteList, OccupancyCounters, useOnsiteStream)
│   ├── expected/    (ExpectedList, ExpectedVsPresent, CategoryBreakdown)
│   ├── history/     (HistorySearch, HistoryTable, useVisitHistory)
│   └── fire/        (FireEventLog, ResolveDialog)
└── lib/ (api-client + auth-client wiring)
```

## 5.3 Reception Kiosk (`apps/kiosk`) — public PWA

**Audience:** anyone at reception. **No auth** (public-facing tablet). Designed for a fixed
tablet: large touch targets, high contrast, idle/attract screen, auto-return to home after
inactivity.

Home → four large tiles: **Employee**, **Visitor**, **Patient**, and a persistent
**checkout** affordance. Plus the **fire alarm** control.

Flows:
- **Employee check-in/out:**
  - *Email* tab: enter email → confirm name → in/out (`method:'email'`).
  - *Scan* tab: kiosk camera scans the employee app's QR (`html5-qrcode` / `@zxing/browser`) →
    calls check-in/out directly (`method:'qr'`); scan debounced (doc 04 §4.3) with a clear success state.
  - *Find me* tab (**manual fallback**): for staff with **no email and no phone** — enter employee
    number or name → pick from matches → confirm → in/out (`method:'manual'`, audit-flagged). This
    is what makes the email-optional constraint actually work end-to-end at the kiosk.
- **Visitor check-in:** form — name, email (optional), host, **reason for visit** (free text) and
  an **optional category** quick-pick (contractor / supplier / auditor / NHS / maintenance /
  other → `visitCategory`, for ops counts only). Then **"How long?"**: *Just today* (default) or
  *Multiple days* → pick an end date. A multi-day choice creates a `VisitBooking` and the success
  card shows a **return pass** (QR + short code) to scan/print for low-friction return.
  **Check-out:** shows **only currently checked-in visitors** to pick from (data minimisation — no
  full visitor history exposed on a public screen).
- **Returning visitor:** scanning the pass QR is just the employee QR flow. A **"Returning
  visitor"** option also offers surname + day-1 code → one-tap confirm (no phone needed).
- **Patient:** "I'm a patient" → name + DOB → lookup → confirm card (name + reference only) or
  manual fallback (doc 04 §4.2).
- **Fire alarm trigger:** a prominent but guarded control — tap → **confirmation dialog**
  ("Hold to confirm" / second deliberate tap) → `POST /api/fire/trigger`. On success the kiosk
  **locks all sign-in flows** and shows an evacuation banner; it stays locked until an admin
  resolves the event. This prevents accidental activation and stops new arrivals mid-evacuation.

Component structure:
```
apps/kiosk/src/
├── features/
│   ├── home/        (AttractScreen, ActionTiles)
│   ├── employee/    (EmailCheckIn, QrScanner, useScanDebounce, FindMeManualLookup)
│   ├── visitor/     (VisitorForm, DurationPicker, VisitorPassCard, ReturningVisitor, VisitorCheckoutPicker)
│   ├── patient/     (PatientLookupForm, PatientConfirm, ManualFallback)
│   └── fire/        (FireTriggerButton, ConfirmHoldDialog, EvacuationLock)
└── pwa/ (manifest, install, kiosk idle timer)
```

PWA: installable, `display: fullscreen`, heart-icon app icon. Service worker caches the app
shell (so a network blip doesn't blank the kiosk) but the kiosk is **online-first** for writes —
it does not queue check-ins offline in the MVP (documented assumption; offline write queue is a
roadmap item).

## 5.4 Employee / Marshal PWA (`apps/marshal`) — authenticated, offline-capable

**Audience:** all staff (employee role) + fire marshals (marshal role). **Auth:** mock SSO → JWT.

### Employee mode (all staff)
- **My QR:** displays the rotating short-lived QR (doc 04). Big, bright, screen-brightness boost.
- **Check in/out here:** direct buttons for unmanned doors (posts own token + a chosen/last
  location). Useful where there is no kiosk to scan from.
- **My visits:** own history only (RBAC-enforced server-side).

### Marshal mode (marshal role only)
- **Live on-site list** with real-time SSE updates and `PersonType` badges + counts.
- **Evacuation mode** (on `fire.triggered` SSE, or if the app opens while a fire event is active):
  full-screen roll-call with tiles coloured by state:
  - 🔴 **Red** — checked in, **not yet accounted for** (`unaccounted`)
  - 🟢 **Green** — marshal marked **accounted for** (`accounted`)
  - 🟠 **Amber** — **expected on site** but **not checked in** (`expected-absent`): unioned from
    the mock M365/Outlook staff calendar **and** active multi-day visit bookings (a contractor
    booked through today who hasn't scanned in) — future Microsoft Graph integration for the staff half
  - Each tile: name, person-type badge (with a visitor's category, e.g. "Visitor · contractor"),
    last location; tap to toggle accounted-for (`PATCH /api/onsite/rollcall/:personId`), which
    broadcasts to other marshals via SSE.
  - Progress header: "X of Y accounted for". Person type clearly shown (employee / patient /
    visitor, with category as a secondary label).

Component structure:
```
apps/marshal/src/
├── features/
│   ├── auth/
│   ├── my-pass/     (RotatingQr, useQrToken, SelfCheckInButtons)
│   ├── my-visits/
│   ├── onsite/      (OnsiteList, useOnsiteStream)
│   └── rollcall/    (EvacuationView, RollCallTile, RollCallProgress, FreshnessClock)
├── offline/         (sw registration, indexeddb cache, sync)
└── pwa/ (manifest, install)
```

## 5.5 Service Worker + IndexedDB cache strategy (marshal offline)

The marshal roll-call **must survive a flaky/dead network** during a real evacuation. Strategy
uses **Workbox** for the service worker and **IndexedDB** for the data snapshot.

### What's cached
1. **App shell** (HTML/JS/CSS/fonts/icons) — Workbox precache, so the app boots offline.
2. **On-site snapshot + active roll-call** — written to IndexedDB (`idb` lib) continuously.

### Cache lifecycle
- **While open + connected:** every `onsite.changed` / `rollcall.updated` SSE event (or a
  fallback poll if SSE drops) updates the IndexedDB snapshot and a `lastUpdatedAt` timestamp.
- **On app open:** render **immediately from IndexedDB** (instant, even offline), then attempt a
  live fetch (`GET /api/onsite` / `/rollcall`) and reconcile.
- **Freshness:** a prominent **`FreshnessClock`** shows "Updated Ns ago" (driven by the SSE
  heartbeat + cache timestamp) so a marshal can judge how much to trust the list. If stale beyond
  a threshold, the banner turns amber: "⚠ may be out of date — last synced HH:MM".
- **Roll-call mutations offline:** "mark accounted for" taps made offline are written to an
  IndexedDB **outbox** and replayed on reconnect (optimistic UI: tile goes green locally,
  reconciles when the PATCH succeeds). Conflict resolution: last-write-wins is acceptable here
  (accounted-for is monotonic in practice).
- **Periodic Background Sync** registered where supported (Android Chrome) to refresh the
  snapshot even when the app isn't focused.

### Documented platform limitation (iOS)
iOS Safari/PWA does **not** support Periodic Background Sync and aggressively reclaims service
workers, so reliable background refresh on iPhones is not guaranteed. **Production solution:** the
**Capacitor** wrapper (already in the planned stack) gives a native shell with real background
capabilities and reliable storage on iOS. The MVP ships the PWA path and documents Capacitor as
the iOS production answer (roadmap, doc 09). In the MVP demo, the marshal app is shown working
offline by toggling the network in dev tools and re-opening — rendering from IndexedDB with a
clear freshness stamp.

### Workbox config sketch
```
- precacheAndRoute(self.__WB_MANIFEST)               // app shell
- registerRoute(/\/api\/onsite.*/, NetworkFirst)     // try live, fall back to last response
- IndexedDB store 'onsite' { key:'current', value: snapshot, updatedAt }
- IndexedDB store 'outbox' { rollcall PATCHes pending replay }
- BackgroundSyncPlugin('rollcall-outbox') on the PATCH route
```
