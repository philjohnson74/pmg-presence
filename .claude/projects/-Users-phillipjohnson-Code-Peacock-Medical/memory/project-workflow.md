---
name: project-workflow
description: PR process, branch conventions, CI gates, and SonarCloud workflow
metadata:
  type: project
---

Branch convention: `phase/N-short-description` (e.g. `phase/4-qr-issuance`). Always branch from `main` after the previous phase's PR is merged.

CI pipeline on every PR: Install → Lint → Typecheck → Unit tests + coverage (≥80% lines/functions, ≥75% branches) → SonarCloud → Build. All must be green before merging.

SonarCloud gate: project `philjohnson74_pmg-presence`, org `philjohnson74`. Findings are reviewed by Phil in batches after each push; he shares screenshots and asks for assessment. See [[feedback-style]] for how to handle these.

After completing a phase:
1. Run `pnpm test`, `pnpm typecheck`, `pnpm lint` — all must pass locally before committing.
2. Commit with a descriptive message including `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`.
3. Push branch; Phil opens the PR and CI runs.
4. Phil shares any SonarCloud findings for review and fixing.
5. Update CLAUDE.md ("Current implementation status" + new "What Phase N delivered" section) and README.md status table.
6. Commit the doc updates to the phase branch before merge.

**Why:** Branch protection on `main` means no direct pushes — everything goes through PR + CI. SonarCloud is non-blocking in the pipeline itself but Phil treats it as a quality gate and addresses all findings before merge.
