---
name: project-status
description: Current build phase, active branch, and what each completed phase delivered
metadata:
  type: project
---

Phase 3 (check-in/out API) is complete on branch `phase/3-checkin-api` — PR open, not yet merged to `main` as of 2026-05-31.

Next phase: **Phase 4 — QR issuance + validation**. Branch to create: `phase/4-qr-issuance`.

**Why:** Phases are built sequentially; each is independently runnable and testable before the next. CI must be green and PR merged before starting the next branch. See [[project-workflow]] for the merge process.

**How to apply:** Always check which branch is active before starting. Branch from `main` (after any pending PR is merged) not from the previous phase branch. Update CLAUDE.md and README.md status table after completing each phase.

Completed phases: 0 (skeleton), 1 (domain + repos + seed), 2 (auth/JWT/RBAC), 3 (check-in/out API).
Remaining: 4 (QR), 5 (patient lookup), 6 (fire/SSE), 7 (admin UI), 8 (kiosk UI), 9 (marshal PWA), 10 (offline), 11 (observability/E2E).
