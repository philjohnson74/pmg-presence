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
