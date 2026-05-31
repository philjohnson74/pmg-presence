# 11 — AI Agent Session Transcript (steering examples)

**Purpose.** Curated samples from the agent session that produced the specification in this repo,
included to satisfy the Stage 5 requirement:

> *"AI agent session transcripts — a sample … that shows how you steered the agents. We want to
> see where you set context and where you overrode the output."*

**How to read it.** Each **Example** is a self-contained steering vignette: a one-line summary, the
prompts (**verbatim**), the agent's replies (**condensed excerpts** — full output is the `docs/`
spec itself), and an outcome. Two inline markers do the work the reviewer asked for:

- 🎯 **CONTEXT SET** — where I front-loaded constraints/judgement, or probed, to steer the agent.
- 🔁 **OUTPUT OVERRIDDEN / REDIRECTED** — where I rejected, blocked, or redirected what it produced.

> This is a **growing selection**, not the whole session. Other steering exists (e.g. challenging
> the offline story, which forced the agent to correct an overstated claim that Capacitor "enables
> background sync" on iOS — it doesn't). The full opening prompt is in
> [12-initial-prompt.md](12-initial-prompt.md). New examples are appended in the same shape — see
> [_Adding future examples_](#adding-future-examples) at the end.

---

## Session opener — setting the box

The session began with a deliberately heavy context load (the brief, job spec, brand guidelines,
and a long set of explicit engineering constraints — full text in
[12-initial-prompt.md](12-initial-prompt.md)). The point was to make the agent build *my* system,
not a generic one, and to bake in swap-path discipline up front.

🎯 **CONTEXT SET.** Three steers from that prompt shaped everything downstream: **"do not write
code yet"** (spec-first, reviewable before any build cost); **"designed to swap … clear interface
boundary documented"** (Repository/port pattern non-negotiable, so mocks never leak into business
logic); and **"4–6 hours" + "email optional"** (a hard time box and a real-world constraint).

> **RESPONSE (condensed).** Produced the full `docs/` set: monorepo layout, Clean-Architecture
> backend, data model, REST + SSE API, QR strategy, patient lookup, PWA/offline, security/RBAC,
> testing, CI/CD, OpenTelemetry, an ordered build plan, assumptions/roadmap, and seed data.

---

## Example 1 — Decomposing the data model (`PersonType` / `VisitPurpose` → three clean axes)

> **In one line:** I challenged a duplicated enum, accepted the agent's reasoning but *not* its
> first fix, then redirected it to a cleaner three-axis model (person type / free-text reason /
> multi-day duration) grounded in quotes from the brief — which in turn produced the low-friction
> returning-contractor flow.

### 1a — Challenging the duplication

> **PROMPT (verbatim):**
>
> "For the enumeration and data model… is there duplication in the `PersonType` and `VisitPurpose`
> enumerations? A contractor PersonType would always be a contractor VisitPurpose. If we take the
> VisitPurpose enumeration as that feels the most complete, replace appointment with patient and
> add employee… the VisitPurpose could then become PersonType and we would have a single
> enumeration rather than two. This would simplify things. **Can you make that change or is there
> any reason in the rest of the system to separate the two things?**"

🎯 **CONTEXT SET.** Framed as a question, not an order — explicitly inviting the agent to push back
("*or is there any reason to separate them?*") rather than just comply.

> **RESPONSE (condensed).** Agreed the `contractor`-in-both duplication was a real sync hazard, but
> argued against a naive flat enum (it would lose the brief's coarse four-way roll-call grouping).
> Proposed a compromise: **one stored enum + a derived `categoryOf()` helper.** Applied it.

🔁 **OUTPUT OVERRIDDEN — later.** I accepted the dedup but not this resolution; it still treated
`supplier`/`auditor`/`contractor` as *types*. That set up 1b.

### 1b — The redirect: three person types + free-text reason + multi-day visits

> **PROMPT (abridged; full verbatim was a longer message quoting the brief):**
>
> "Thinking about this further and re-reading the brief… *'Different kinds of people behave
> differently. A visitor turning up for one meeting needs a fast, low-friction sign-in. A
> contractor on site for two weeks doesn't want to do that twice a day…'* … What about if we have a
> PersonType of **employee, patient or visitor**… visitors can then input anything they want as the
> reason for visit… Also, a bit like creating meetings in Outlook, **give visitors the option to
> set their visit to be full day/multiple days**… they appear **amber** if they haven't checked in.
> **How can we make it easy for people expected in multiple days to check in on subsequent days?**"

🔁 **OUTPUT OVERRIDDEN.** The decisive override: I rejected the agent's enum-centric model (both the
original two-enum version *and* its "stored + derived" compromise) for a three-axis decomposition —
type (3 values) / free-text reason / multi-day duration. The contractor behaviour the agent kept
encoding as a *type* is really a *duration* problem.

🎯 **CONTEXT SET.** I quoted the brief back to anchor the redesign in the source, and raised
driver-3 (ops planning), which earlier drafts under-served.

> **RESPONSE (condensed).** Agreed the three-axis split was cleaner and superseded its own prior
> answer. Pushed back on **one** point — pure free-text reason would block ops aggregation — and
> recommended **free text + an optional category tag.** Introduced a unified
> `ExpectedPresenceService` (amber = M365 staff ∪ active multi-day bookings − checked-in) and
> answered the low-friction question by **reusing the QR machinery** as a visitor pass. Put the two
> real forks to me as an explicit decision.

🎯 **DECISION.** I chose **free text + optional tag** and the **thin multi-day slice**.

> **OUTCOME.** Rewrote the model across docs 01–10: three `PersonType` values, `VisitBooking`,
> `visitReason` + optional `visitCategory`, the expected-presence union, visitor pass tokens, a
> returning-visitor endpoint, an admin "Expected today" view, and a reworked deterministic seed.
> → [docs/02 §2.1](02-data-model.md), [docs/04 visitor pass](04-qr-and-patient-lookup.md).

---

## Example 2 — Catching a missing use case (employees without emails) + cleaning up `CheckInMethod`

> **In one line:** A *"where is this actually used?"* probe made the agent trace the spec and
> surface a gap the brief implied but never stated — staff with **no email *and* no phone** had no
> check-in path — and my *"explain it before you change it"* follow-up turned a quick bolt-on into a
> clean enum refactor.

### 2a — The verification probe (surfaces a missing use case)

> **PROMPT (verbatim):**
>
> "From the data-model.md file can you tell me where/how the email and manual CheckInMethod types
> are used?
> `type CheckInMethod = 'qr' | 'email' | 'manual' | 'kiosk-form';`"

🎯 **CONTEXT SET.** Framed as *"show me where these are actually used"* — a verification probe, not
a feature request. This forced the agent to trace real usage instead of assuming, which is what
exposed the gap.

> **RESPONSE (condensed).** Traced it: `email` = the employee email-lookup at the kiosk; `manual` =
> *only* the patient no-match fallback. Then flagged, **unprompted**, that `manual` was under-used
> and there was an implied gap: an **employee with no email who also doesn't have their phone has no
> kiosk path** — and those are exactly the staff seeded without email (Sam Doyle, Mark Reilly).
> Offered to add an employee manual fallback.

### 2b — Withholding acceptance (catches a second modelling smell)

> **PROMPT (verbatim):**
>
> "Yes please, add an employee manual check-in path. **Before you do though, please explain the
> difference between kiosk-form checkin and manual/email checkin… would manual and email checkin not
> be done using the kiosk form?**"

🔁 **OUTPUT REDIRECTED.** I approved the addition but **blocked implementation until the agent
explained the model** — and the question spotted a second smell: `kiosk-form` overlaps with
`email`/`manual`, because those are *also* entered via a form on the kiosk.

> **RESPONSE (condensed).** Conceded the conflation: `method` was mixing **two axes** — *how* a
> person was identified (mechanism) vs *which device/UI* produced the event. `kiosk-form` was a
> device label masquerading as a mechanism. Recommended collapsing to **one axis** —
> `qr | email | patient-lookup | visitor-form | manual` — with the existing `locationId` carrying
> *where*. Put the scope decision (clean refactor vs minimal bolt-on) to me rather than guessing.

🎯 **DECISION.** I chose the **clean refactor**.

> **OUTCOME.** Dropped `kiosk-form`; added `patient-lookup` and `visitor-form`; added the **employee
> manual "Find me"** path (resolve by employee number/name for no-email/no-phone staff, audit-
> flagged); routed all `manual` entries through audit logging. Updated docs 02/03/05/06/07/08.
> → [docs/02 §2.1 + mapping table](02-data-model.md), [docs/03 check-in shapes](03-api-and-sse.md).

> **Why this one matters.** It's a different steering pattern from Example 1. There I *overrode* an
> abstraction; here I *withheld acceptance and demanded an explanation*, which converted a bolt-on
> into a proper refactor — and the agent **earned its keep by flagging the gap I hadn't spotted**
> once I made it trace the code.

---

## Example 3 — Enforcing coverage as a quality gate, not a metric to game

> **In one line:** CI rejected the Phase 1 merge because function coverage was 75% against an 80%
> threshold; I showed the agent the failure and added a hard constraint — *"tests that add value"*
> — which prevented it from padding coverage and instead forced it to find and fill genuine gaps in
> the test suite.

### 3a — Presenting the CI failure and setting the constraint

> **PROMPT (verbatim, accompanied by a screenshot of the failing CI job):**
>
> "Unit tests are only at 75% coverage and need to be at 80% coverage to merge to main. Can you add
> additional tests to increase coverage to at least 80%? **They need to be tests that add value.**"

🎯 **CONTEXT SET.** Two constraints landed simultaneously. First, the objective bar: 80% is
enforced by the CI threshold and branch protection on `main` — not negotiable. Second, and more
important, "*they need to be tests that add value*" — a direct block on the obvious shortcut of
writing empty assertions or trivially repeating what the existing tests already verify just to
move the counter. That second constraint determined what the agent was allowed to produce.

> **RESPONSE (condensed).** Before writing anything, ran `vitest run --coverage` locally to get
> the per-file breakdown. Identified the actual gaps: five in-memory repositories (fire-event,
> roll-call, visitor, location, audit-log) with no test files at all; `MockClinicalSystem.lookup()`
> never called directly; `errorHandler` middleware at 0% functions; `buildTestContainer()` in
> `container.ts` uncovered; and `findActiveByCode` in the visit-booking repo untouched. Then wrote
> nine test files and one extension to an existing file, each adding real invariant coverage —
> not line-count coverage.

🔁 **OUTPUT SELF-CONSTRAINED BY PROMPT.** The "add value" clause ruled out the obvious shortcut.
Each file had to earn its place:
- `in-memory-fire-event-repository.test.ts` — verified the "only one active fire event" invariant:
  `active()` returns null after resolve, not a stale reference.
- `in-memory-roll-call-repository.test.ts` — verified fire-event scoping (entries for `fire-002`
  don't bleed into a `fire-001` query) and the amber → accounted state transition.
- `mock-clinical-system.test.ts` — verified diacritic-tolerant name matching (`renee` matches
  `Renée`), case-insensitivity, wrong-DOB rejection even when name matches, and a data-minimisation
  assertion: the response must not include `dateOfBirth` or `clinicalSystemId`.
- `error-handler.test.ts` — verified the RFC 7807 problem-JSON shape (`type`, `title`, `status`,
  `instance`) for both plain errors and errors carrying an explicit status code.
- `container.test.ts` — verified that `buildTestContainer()` returns fully isolated instances
  (adding an employee in container A does not appear in container B), and that the injectable
  `calendarEntries` and `patients` overrides work correctly.

> **OUTCOME.** Nine files, 47 new tests, 95 total. Function coverage: 70.31% → **95.83%**. Line
> coverage: 74.12% → **86.04%**. Branch coverage: 97.72% → **98.3%**. All three thresholds
> (80% lines, 80% functions, 75% branches) cleared by a margin that provides real headroom —
> not a squeaker pass. CI green; branch unblocked for PR.

> **Why this one matters.** The steering pattern is different from Examples 1–2. Those were about
> *design* — overriding or redirecting abstractions. This one is about *quality enforcement* through
> tooling: the CI threshold was already set, branch protection was already on, and all I had to do
> was hold the constraint ("add value") rather than accept the quick fix. The agent knew the
> shortcut (trivial assertions on already-covered code paths) and didn't take it because the prompt
> made it explicitly off-limits. The resulting tests found a real data-minimisation assertion that
> no previous test had made — the clinical system lookup must not return `dateOfBirth`.

---

## Example 4 — Using SonarCloud findings as an objective code-quality gate

> **In one line:** Rather than asking me to "clean up the code", I let SonarCloud scan the Phase 3
> branch and presented its specific, numbered findings in batches — which kept me accountable to an
> external standard and let me assess each finding rather than blindly comply.

### 4a — First batch: four findings, one already-fixed

> **PROMPT (verbatim, accompanied by a SonarCloud screenshot showing four findings):**
>
> "Can you fix these 4 sonarqube flagged issues please? or let me know why you think they are OK or
> shouldn't be fixed."

🎯 **CONTEXT SET.** Two things in this prompt shaped the session. First, the source of truth was
the SonarCloud scan — a concrete, numbered list from an automated third-party tool, not a vague
"improve quality" request. That precision meant every fix had a traceable justification (file +
line number + rule). Second, the clause *"or let me know why you think they are OK or shouldn't
be fixed"* explicitly invited pushback rather than blind compliance — making assessment, not
execution, the primary job.

> **RESPONSE (condensed).** Assessed all four: three were genuine (redundant `as object` cast in
> `JwtService.sign`; `new Error` where `new TypeError` was semantically correct for a type-mismatch
> guard; double-cast `as unknown as JwtClaims` where a direct `as JwtClaims` sufficed; and a
> `!employee || !employee.active` condition replaceable with `!employee?.active`). Applied all three.

### 4b — Second batch: three findings, one already resolved

> **PROMPT (verbatim, accompanied by a screenshot of the next three findings):**
>
> "What about the last 3 in this list?"

> **RESPONSE (condensed).** Assessed all three. The `mock-entra-provider.ts` optional-chain finding
> (L15) had **already been fixed** in the previous commit — flagged it as "will auto-close on the
> next scan, no action needed." The remaining two were valid: `return Promise.reject(error)` inside
> an `async` function should simply `throw` (idiomatic and less confusing); and two separate
> `import type … from '../../domain/entities.js'` statements in `seed-data.ts` should be one.

🔁 **OUTPUT SELF-CONSTRAINED BY ASSESSMENT.** The already-fixed issue was identified and left alone
rather than making a redundant second change. This is the diagnostic pattern the "or let me know"
clause was designed to unlock — agent as assessor, not just executor.

### 4c — Remaining batches: six more findings across three screenshots

> **PROMPTS (verbatim):**
>
> "Can you fix these 3?" *(error-handler findings)*
>
> "And these 3 please" *(require-role test + badge component)*
>
> "and this final one please" *(card.tsx heading accessibility)*

🎯 **CONTEXT SET.** Presenting findings in batches rather than all at once let each group be
assessed in context. The final finding — *"Headings must have content and the content must be
accessible by a screen reader"* on `CardTitle` — was the most instructive: the code was technically
correct at runtime (`children` flows through `{...props}`) but the self-closing `<h3 … />` syntax
hid it from static analysis and screen reader validators. The fix (destructure `children` explicitly)
improved both tooling visibility and code readability, not just the SonarCloud score.

> **OUTCOME.** All 14 SonarCloud findings from the Phase 3 scan resolved across four commits, each
> with a clear rationale in the commit message. Fixes spanned: redundant type casts, wrong Error
> subclass, async idiom (`throw` vs `return Promise.reject`), duplicate imports, mock setup patterns
> in tests (`vi.mocked()` over manual casts), negated conditions, redundant `undefined` argument,
> `Readonly<>` on React props, and an accessibility/static-analysis gap in a heading component.

> **Why this example matters.** The steering pattern differs from Examples 1–3. Those sessions were
> about design decisions or test quality — areas requiring judgement calls. This one shows a different
> layer of quality enforcement: using a **third-party automated scanner** (SonarCloud, wired into the
> GitHub CI pipeline) as the source of truth, so neither I nor the agent decides subjectively what
> "clean" means. The branch protection + SonarCloud gate means issues compound slowly rather than
> silently: each PR is scanned, findings are visible and tracked, and the conversation about each one
> is on record. The "or tell me why it's OK" clause prevented rubber-stamping and produced at least
> one correct non-fix (the already-resolved L15) — demonstrating that the tool is a trigger for
> assessment, not an instruction list.

---

## Example 5 — Correcting a naming mistake before it was baked in (marshal → employee)

> **In one line:** I cancelled an implementation mid-start to fix a naming error I'd spotted —
> the app was called "marshal" but serves *all* employees, with marshals being a privileged subset;
> naming it after the subset rather than the primary audience was wrong, and fixing it before
> writing code was cheaper than refactoring it later.

### 5a — Cancelling the in-progress task

The agent had already created the branch `phase/9-marshal-pwa-ui` and was about to begin writing
code for Phase 9 when I interrupted:

> **PROMPT (verbatim):**
>
> "Can you cancel the current processing?"

🔁 **OUTPUT OVERRIDDEN — pre-emptively.** The agent stopped without writing any source files. The
only change that existed at that point was the empty branch creation — no code to undo.

### 5b — Setting the naming constraint and its reasoning

> **PROMPT (verbatim):**
>
> "I'd like to change the name of this pwa to be 'employee' rather than 'marshal' before we
> implement it, so the marshal folder under apps needs to be renamed to employee and where we talk
> about the marshal app in the docs, md files etc we should change that to be the employee app.
>
> For clarity we still need the marshal functionality discussed but that will only be available to
> a subset of users in that role when using this app. All app users will be employees, but only
> some will be flagged as marshals, hence it makes sense calling the app the employee pwa/app
> rather than marshal pwa/app."

🎯 **CONTEXT SET.** The redirect came with an explicit architectural argument, not just a naming
preference: the *primary audience* of the app is every employee; the marshal *role* is a privilege
level within that audience. Naming the app after a sub-role obscures who it's for and misleads
anyone reading the repo structure — `apps/marshal/` implies only marshals use it. The reasoning
also pre-empted the natural follow-up question ("do we also rename the marshal role in auth?") by
clarifying that the RBAC role string `'marshal'` should stay untouched; only the *app-level* name
changes.

> **RESPONSE (condensed).** Before touching any file, the agent searched the repo to distinguish
> (a) app/package references safe to rename (`apps/marshal`, `@pmg/marshal`, the PWA manifest name,
> CORS comment, UI headings) from (b) the `marshal` role string in auth middleware, seed data,
> tests, and domain ports — which must not change. Identified ~4 app-level references vs ~127 role
> references. Renamed the folder, updated the package name, updated all documentation (README,
> CLAUDE.md, docs/01/03/05/06/07/08/09/10) for app-level occurrences, and renamed the git branch
> from `phase/9-marshal-pwa-ui` to `phase/9-employee-pwa-ui`. Left every `role: 'marshal'` and
> `requireAdminOrMarshal` untouched.

🎯 **DECISION.** The clean, unambiguous rule — *app name reflects the audience; role name reflects
the permission level* — was already in the prompt. The agent applied it consistently without being
asked to adjudicate individual cases.

> **OUTCOME.** `apps/employee/` (`@pmg/employee`) in place of `apps/marshal/` (`@pmg/marshal`).
> All 205 API tests still passing; full monorepo typecheck clean. The RBAC surface (`requireRole`,
> seed data, domain ports) was unchanged — a grep for `@pmg/marshal` or `apps/marshal` returns
> zero hits in the codebase.

> **Why this example matters.** The steering pattern is different from all prior examples. Those
> were about *design decisions made during specification* — reshaping a data model, adding a missing
> use case, enforcing quality gates. This one is about **stopping a build and making a naming
> correction before the name is embedded in dozens of source files**. The cost of the interrupt was
> one cancelled shell command; the cost of fixing it after implementation would have been a
> find-and-replace across generated code, test fixtures, and running processes. The pre-emption was
> the right call, and its timing — after branch creation but before any file writes — was the
> cheapest possible moment to make it.

---

## Example 6 — Bug discovery through scenario testing: kiosk fire alarm stuck in a loop

> **In one line:** I tested the fire alarm flow on the kiosk and found the page was permanently
> stuck — which turned out to be a state initialisation bug where the component always reset to
> the warning step, causing an infinite redirect loop.

> **PROMPT (verbatim):**
>
> "Why is the kiosk app stuck in the raise fire alarm screen? It won't go back"

🎯 **CONTEXT SET.** The question was diagnostic, not prescriptive — "why" rather than "fix it."
That framing forced the agent to trace the actual control flow (`KioskProvider`, `FireLockRedirect`,
`FirePage`) rather than reaching for an obvious quick fix.

> **RESPONSE (condensed).** Traced the loop: `FirePage` initialised `step` as `'warning'`
> unconditionally. When fire was active, `FireLockRedirect` redirected every `/` navigation back
> to `/fire-lock`, which remounted `FirePage` — which reset to `'warning'` again. Identified the
> fix: initialise `step` from `isFireActive` so a remount on an already-active alarm goes straight
> to the `'done'` state, breaking the loop.

> **OUTCOME.** One-line fix in `fire-page.tsx`:
> `useState<Step>(isFireActive ? 'done' : 'warning')`.
> The symptom ("won't go back") was actually an infinite loop in the component lifecycle, not a
> navigation bug. Testing the scenario end-to-end was what surfaced it — static review of the
> component in isolation would not have.

---

## Example 7 — Gap finding through cross-view observation: patients missing from kiosk sign-out

> **In one line:** I noticed patients appeared correctly on the admin portal's on-site list but
> were absent from the kiosk sign-out picker, identified the gap precisely, then redirected a
> follow-up that over-disclosed patient type to protect privacy.

### 7a — Identifying the functional gap

> **PROMPT (verbatim):**
>
> "Patients aren't showing on the checkout screen from the kiosk, so they don't have any way to
> checkout currently. Can you make sure they show on the checkout kiosk screen so they can checkout
> when leaving the building. They do show as onsite on the admin portal which is correct."

🎯 **CONTEXT SET.** Two pieces of information in a single sentence did the steering: the *observed
gap* ("patients aren't showing") and the *expected cross-view consistency* ("they do show as onsite
on the admin portal"). That immediately framed the bug as a data-source mismatch rather than a
display problem — the admin view uses `GET /api/onsite` (returns all types) while the kiosk picker
calls `GET /api/onsite/visitors` (filtered to `personType === 'visitor'` only).

> **RESPONSE (condensed).** Extended `/api/onsite/visitors` to filter for `visitor || patient`,
> added `personType` to each response entry so the checkout call could send the correct value, and
> updated the kiosk picker and API client accordingly. Also updated the empty-state copy from
> "No visitors currently signed in" to "No one currently signed in."

### 7b — Redirecting an over-disclosure

> **PROMPT (verbatim):**
>
> "In the list on Checkout, I don't want it to say whether somebody is a visitor or patient, just
> have their name so it doesn't reveal more information than needed to people looking at the list.
> For somebody checking out they just need to find their name in it and checkout."

🔁 **OUTPUT OVERRIDDEN.** The initial fix had added a small type label ("visitor" / "patient")
under each name. I caught this as unnecessary disclosure — someone standing at a kiosk reading the
list should not be able to infer another person's patient status. I redirected to name-only.

> **OUTCOME.** The checkout picker shows only `displayName` — no type label, no icon differentiating
> patients from visitors. `personType` is still sent on the checkout API call (so the server records
> it correctly) but is never rendered. The data-minimisation principle from the patient-lookup
> design (`GET /api/patients/lookup` never exposes DOB or clinical IDs) was consistently applied
> to the UI layer.

---

## Example 8 — Two symptoms, one root cause: employee self check-in always "already checked in"

> **In one line:** I described two distinct UX problems together — the button always said "already
> checked in" and history always showed "QR Scan" — which framed them as a single root cause
> rather than two separate bugs, leading to a cleaner fix.

> **PROMPT (verbatim):**
>
> "Employee app - My Pass screen always says already checked in when clicking Check Me In button.
> Also method is QR Scan in history when user clicks check me in or check me out button."

🎯 **CONTEXT SET.** Reporting both symptoms in the same message connected them. The QR scan method
label in history was the diagnostic clue: the button was calling `method: 'qr'` (intended for
the physical kiosk scanner), which burned the JWT's `jti` on first use. Every subsequent click
hit the JTI replay guard, which returned `alreadyOnsite: true` with `debounced: true` — hence
"already checked in" every time. Treating these as two separate issues would have missed the
shared cause entirely.

> **RESPONSE (condensed).** Identified the root: `selfCheckIn` / `selfCheckOut` in the employee
> API client were posting `method: 'qr'` with the current QR token. The self-service button is
> not a QR scan — the authenticated user is clicking on their own device, so `method: 'email'`
> (using the session email) is both technically correct and semantically honest. Changed both API
> client functions to `method: 'email'`; updated `SelfCheckInButtons` to accept `email` instead
> of `qrToken`; passed `user.email` from the session in `MyPassPage`. Also guarded the buttons
> so they are hidden for employees with no email (who should use the kiosk "Find Me" tab).

> **OUTCOME.** The check-in button works on every click; history records "Email" as the method.
> The QR code on the page is unchanged and still works for physical kiosk scanning — the fix
> only changed how the *software button* identifies the user. Separating the two identity paths
> (QR scan for kiosks, email for in-app) also correctly reflects how each one establishes identity.

---

## Example 9 — Proactive UX standard enforcement: adding consistent ordering across all lists

> **In one line:** I identified that no lists in the system had any ordering, specified exactly
> which views were affected and the relevant grouping constraint (roll call per traffic light),
> and drove a systematic fix across all three apps in a single pass.

> **PROMPT (verbatim):**
>
> "There isn't any ordering on lists currently, can you add some ordering on the following please…
> Admin (onsite, expected, employees) - Kiosk (Signout) - Marshal (OnSite Now, roll call (per
> traffic light))"

🎯 **CONTEXT SET.** Two things in this prompt did the work. First, the explicit enumeration of
affected views meant the fix was systematic — no single view was treated in isolation, and none
was missed. Second, the parenthetical "(per traffic light)" on roll call carried a precise
constraint: sort *within* each status section (red / amber / green), not across them. Sorting
across sections would destroy the visual grouping that makes roll call usable under pressure.

> **RESPONSE (condensed).** Applied alphabetical A-Z sort by display name / name at the point
> of render in six locations: admin on-site table, admin expected-persons list (both Today and
> Tomorrow cards), admin employees table (active and inactive independently), kiosk sign-out
> picker, marshal on-site table, and all three roll-call sections. All sorts are client-side
> using `localeCompare` (handles accented names correctly — relevant for the seeded data).
> No API changes needed.

> **OUTCOME.** All six views sort consistently. The roll-call sections remain in traffic-light
> order (unaccounted → amber → accounted); names within each section are alphabetical. The
> `localeCompare` choice handles the diacritic-containing names in the seed data correctly
> (e.g. "Bram de Vries", "Renée Lambert") without requiring any special-case logic.

> **Why this example matters.** None of the individual lists was obviously broken — they rendered
> correctly, just in insertion order. The UX gap was only visible by stepping back and looking
> across the system. Specifying the views explicitly (rather than "sort all lists") and adding
> the roll-call constraint ("per traffic light") shows the difference between vague quality
> direction and precise, testable requirements.

---

## What these examples demonstrate

| Steering behaviour | Where |
|---|---|
| Front-loading constraints so the agent builds *my* system, swap-paths baked in | Opener (🎯) |
| Inviting dissent rather than compliance ("…or is there a reason to separate?") | 1a (🎯) |
| Accepting a good agent argument but not its full resolution | 1a → 1b (🔁) |
| Overriding the agent's abstraction with a better decomposition, grounded in the brief | 1b (🔁🎯) |
| Letting the agent push back on *me* and adjudicating the trade-off | 1b |
| Probing "where is this used?" to force code-tracing — which surfaced a missing use case | 2a (🎯) |
| Withholding acceptance ("explain before you change it") — which caught a modelling smell | 2b (🔁) |
| Choosing the clean refactor over the quick bolt-on | 2b (🎯) |
| Using CI as an objective quality gate — threshold not met = branch blocked, no exceptions | 3a (🎯) |
| Adding "tests that add value" to block coverage padding and force genuine gap analysis | 3a (🎯) |
| Using a third-party scanner (SonarCloud) as the objective quality standard, not vague "clean up" | 4a (🎯) |
| Inviting assessment over compliance ("or tell me why it's OK") — produced a correct non-fix | 4b (🔁) |
| Presenting findings in batches so each can be assessed in context, not rubber-stamped | 4c (🎯) |
| Cancelling mid-start to fix a naming error before it was written into source files | 5a (🔁) |
| Naming the app after its *audience*, not a privileged subset — with explicit reasoning | 5b (🎯) |
| Asking "why" rather than "fix it" — forcing root-cause tracing over symptom patching | 6 (🎯) |
| Bug discovery through end-to-end scenario testing, not static code review | 6 |
| Cross-view observation ("correct in admin, missing in kiosk") pinpointing a data-source mismatch | 7a (🎯) |
| Redirecting an over-disclosure to enforce data minimisation at the UI layer | 7b (🔁) |
| Reporting two symptoms together to frame a single root cause, not two separate bugs | 8 (🎯) |
| Explicit view enumeration + grouping constraint ("per traffic light") making ordering requirements precise and testable | 9 (🎯) |
| Stepping back across the whole system to spot a UX standard gap invisible at the individual-view level | 9 |

The throughline: the agent did the breadth, drafting, and (when probed) the gap-spotting; I owned
the **judgement** — where the box goes, which abstractions are honest, and when "just do it" should
become "explain it first."

---

## Adding future examples

This doc is designed to grow. Each new steering vignette is appended as **Example N** in the same
shape, so the reviewer can scan a consistent structure:

1. **One-line summary** (`> **In one line:** …`) — the steering move in a sentence.
2. **Verbatim prompt(s)** — my exact words.
3. **Condensed agent response(s)** — excerpted, with links to the resulting spec docs.
4. **Markers** — 🎯 CONTEXT SET / 🔁 OUTPUT OVERRIDDEN-or-REDIRECTED at the moments they happened.
5. **Outcome** — what changed in the spec, and (optionally) *why this example matters* if it shows a
   pattern not already covered.

Then add a row to [_What these examples demonstrate_](#what-these-examples-demonstrate).
