# 10 — Seed Data

Realistic, demo-ready seed loaded into the in-memory repositories at boot
(`apps/api/src/infrastructure/seed/seed-data.ts`). Tuned so the marshal roll-call and admin
on-site list are **populated from the first second of the demo**, and so every documented
constraint (email-optional, amber state, manual fallback, all person types) is visible without
setup. Names align loosely with the brand pack (Stevens / Cooper / Peacock) plus invented staff.

## 10.1 Employees (11) — roles & the email-optional constraint

| # | Name | Role | Email | Employee № | Notes |
|---|------|------|-------|-----------|-------|
| 1 | David Stevens | **admin** | david@peacocksgroup.com | PMG-0001 | Managing Director |
| 2 | Chris Peacock | **admin** | chris@peacocksgroup.com | PMG-0002 | CEO |
| 3 | Priya Shah | **marshal** | priya@peacocksgroup.com | PMG-0014 | Fire marshal |
| 4 | Gary Cooper | **marshal** | gary@peacocksgroup.com | PMG-0003 | Ops Director / marshal |
| 5 | Tom Bryson | **marshal** | tom.bryson@peacocksgroup.com | PMG-0021 | Fire marshal |
| 6 | Sam Doyle | employee | *(none)* | PMG-1187 | **No email — workshop tech** (email-optional demo) |
| 7 | Aisha Khan | employee | aisha@peacocksgroup.com | PMG-1044 | Orthotist |
| 8 | Mark Reilly | employee | *(none)* | PMG-1190 | **No email — manufacturing** |
| 9 | Joanne Petrie | employee | joanne@peacocksgroup.com | PMG-1071 | Clinic admin |
| 10 | Dev Anand | employee | dev@peacocksgroup.com | PMG-1099 | Innovation team |
| 11 | Carla Jones | employee | carla@peacocksgroup.com | PMG-1058 | Head of Orthotics |

→ **2 admins, 3 marshals, 6 employees**, of which **2 have no email address** (rows 6 & 8) — the
admin portal renders their email as "—" and the add/edit form accepts blank email.

Each employee gets a `qrCodeToken` seed (the live displayed QR is a short-lived JWT derived at
request time — doc 04).

## 10.2 Patients (9) — mock clinical system (name + DOB lookup)

| Name | DOB | Patient ref | Clinical sys id |
|------|-----|-------------|-----------------|
| Joan Webb | 1951-03-14 | PMG-OUT-4471 | CLIN-88201 |
| Harold Spencer | 1948-11-02 | PMG-OUT-4472 | CLIN-88210 |
| Renée Fontaine | 1989-06-30 | PMG-OUT-4473 | CLIN-88233 |
| Owen Pritchard | 2011-09-21 | PMG-OUT-4474 | CLIN-88240 |
| Maria Santos | 1976-01-08 | PMG-OUT-4475 | CLIN-88255 |
| Derek Lowe | 1963-04-17 | PMG-OUT-4476 | CLIN-88261 |
| Amara Okafor | 1995-12-05 | PMG-OUT-4477 | CLIN-88270 |
| Bill Thornton | 1957-07-25 | PMG-OUT-4478 | CLIN-88288 |
| Sophie Allen | 2003-02-11 | PMG-OUT-4479 | CLIN-88299 |

- "Renée Fontaine" exercises diacritic-tolerant matching ("renee fontaine" matches).
- Lookups return ref + display name only; DOB/clinical id never returned or persisted (doc 04).

## 10.3 Expected visitors (pre-registered visit bookings) — 5

All `personType: 'visitor'`. `visitCategory` is the optional ops tag; `visitReason` is free text.
Two bookings are **multi-day** (Dana, Bram). The **"arrived today?"** column is what makes the
demo's amber set deterministic: a booking covering today with no check-in for today renders amber.

| Name | Company | Host | visitCategory | Booking | Arrived today? |
|------|---------|------|---------------|---------|----------------|
| Dana Okoro | Acme HVAC | Gary Cooper | contractor | 30 May → 12 Jun (**multi-day**, pass issued) | ✅ 08:30 — present |
| Bram de Vries | Acme HVAC | Gary Cooper | contractor | 28 May → 06 Jun (**multi-day**, pass issued) | ❌ not yet → **amber** |
| Niamh Boyle | NHS NE Procurement | David Stevens | nhs-commissioner | today only | ✅ 08:55 — present |
| Greg Hall | Sterident Supplies | Joanne Petrie | supplier | today only | ✅ 09:10 — present |
| Laura Finch | BSI Audit | Carla Jones | auditor | today only | ✅ 08:50 — present |

(Pre-registration pre-fills the form in the MVP. Multi-day bookings seed a `passToken` + `passCode`
so the returning-visitor flow can be demoed without re-entering details. Bram is the deliberate
"booked, expected today, not yet arrived" case that proves amber from a *visitor* source.)

## 10.4 Already on site at demo start — pre-seeded `in` events

So the on-site list and roll-call aren't empty on first load:

| Person | Type | Since | Location |
|--------|------|-------|----------|
| Gary Cooper | employee (marshal) | 07:55 | Main Reception |
| Aisha Khan | employee | 08:10 | Main Reception |
| Joanne Petrie | employee | 08:02 | Main Reception |
| Carla Jones | employee | 08:20 | Workshop Exit |
| Sam Doyle | employee | 07:48 | Workshop Exit |
| Dana Okoro | visitor (contractor) | 08:30 | Main Reception |
| Laura Finch | visitor (auditor) | 08:50 | Main Reception |
| Niamh Boyle | visitor (nhs-commissioner) | 08:55 | Main Reception |
| Greg Hall | visitor (supplier) | 09:10 | Main Reception |
| Joan Webb | patient | 09:00 | Main Reception |

→ a live mix of **employee + visitor (4 categories) + patient** on the marshal view from the start.

## 10.5 Expected on site but not checked in (amber) — 3

The amber set is the **union** of two sources via `ExpectedPresenceService` (doc 02/03) — people
expected today (staff calendar **or** an active booking covering today) with **no** check-in for
today, so they render **amber** in the roll-call:

| Name | Source | Detail | Checked in today? |
|------|--------|--------|-------------------|
| Priya Shah | M365 staff calendar (`MockM365Calendar.expectedOnsiteOn`) | In office today | No → amber |
| Dev Anand | M365 staff calendar | In office today | No → amber |
| Bram de Vries (Acme HVAC) | active multi-day `VisitBooking` | Contractor booked through today, not yet scanned in | No → amber |

This proves the unified amber logic: a **staff** member and a **multi-day visitor** both surface
amber through the same path, with no special-casing in the roll-call.

## 10.6 Locations — 2

| Id | Name | Type |
|----|------|------|
| `loc-reception` | Main Reception | reception |
| `loc-workshop-exit` | Workshop Exit | exit |

(Two locations demonstrate the multi-door model: an employee can be scanned in at reception and
out at the workshop exit — doc 04 multi-door ergonomics.)

## 10.7 What the seed guarantees for the demo
- All three person types visible from t=0, including a **visitor tagged `contractor`** (Dana).
- Red (on-site, unaccounted), green (after a marshal taps), and **amber from both sources** — two
  staff (Priya/Dev) and a multi-day visitor (Bram) — all appear the moment the alarm is triggered.
- A **multi-day booking** (Dana) to demo the return pass / low-friction day-2 check-in.
- At least one employee with **no email** (Sam Doyle, Mark Reilly) for the admin email-optional demo.
- A patient with a diacritic name and a child patient (Owen, Sophie) for realistic lookups.
- A no-match patient path is shown by searching a name/DOB **not** in the table → manual fallback.
