---
name: phase3-decisions
description: Key implementation decisions made in Phase 3 that affect Phase 4+ work
metadata:
  type: project
---

Phase 3 completed 2026-05-31. Key decisions that shape future phases:

**JwtService now has `verifyRaw` and `signRaw`** — `verifyRaw(token)` verifies signature and returns raw payload (for QR/pass tokens with different claim shapes than auth JWTs); `signRaw(payload, expiresAt: Date)` signs with an explicit unix timestamp `exp` (not `expiresIn` seconds), so past dates produce genuinely expired tokens. Phase 4 (QR issuance) should extend this rather than add another signing path.

**QR token shape (already handled in check-in, needs Phase 4 issuance):** `{ sub: employeeId, typ: 'qr', en: employeeNumber, jti: uuid, exp: now+60s }`. The check-in use case already validates `typ === 'qr'` and resolves `sub` to an employee. Phase 4 just needs `GET /api/employees/me/qr` to issue these.

**Visitor pass token shape:** `{ sub: bookingId, typ: 'visit-pass', jti: uuid, exp: endOfBookingDay }`. Issued on multi-day visitor check-in; looked up via `VisitBookingRepository.findActiveByPassToken(rawJwt)`. Phase 4 (or later) can verify the replay-prevention works by checking `jti`.

**`_updatePassToken` on `InMemoryVisitBookingRepository`** — an infrastructure-only escape hatch, not on the interface. Postgres phase would use an UPDATE; don't add it to `VisitBookingRepository` interface.

**Rate limiter is per-`createServer` call** — do not hoist back to module level. It was there before Phase 3 and caused test failures (shared state across fresh app instances in the test suite).

**`CheckInEventUseCase` resolves both check-in and check-out** — direction is a parameter. No separate checkout use case. Routes in `checkin.ts` call `useCase.execute(input, 'in', ...)` and `useCase.execute(input, 'out', ...)`.

**`ClinicalSystemPort` now has `findById`** — patient check-in uses this to get `displayName` from `patientId` without re-querying by DOB. Any mock or future real implementation of `ClinicalSystemPort` must implement both `lookup` and `findById`.
