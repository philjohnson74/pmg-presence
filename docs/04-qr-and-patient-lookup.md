# 04 — QR Token Strategy & Patient Lookup

## 4.1 QR token signing strategy

### Goal
An employee's phone displays a QR code that a kiosk (or any exit scanner, or the employee's
own app button) reads to trigger check-in/out. The QR must **not** be spoofable and must **not**
leak a raw, reusable employee identifier.

### What the QR encodes
A **short-lived signed JWT**, not the employee ID. Payload:

```jsonc
{
  "sub": "emp-003",          // employee id
  "typ": "qr",               // token purpose
  "en":  "PMG-1187",         // employee number (for human-readable audit)
  "iat": 1717050000,
  "exp": 1717050060,         // ~60s lifetime — rotates continuously on the device
  "jti": "a1b2c3"            // unique id, used for replay debounce
}
```

- Signed with **HS256** using a server secret in the MVP (mirrors what an Entra-issued token
  would later be — the verification interface is identical, only the key source changes to JWKS).
- **Short expiry (~60s)** and **client-side rotation:** the employee app requests a fresh QR
  token from `GET /api/employees/me/qr` and re-renders the QR every ~30s, so a screenshot of
  someone's QR is useless within a minute.
- The QR image is generated client-side (`qrcode` lib) from the JWT string — the token never
  needs a round-trip to render after fetch.

### Generation
- `GET /api/employees/me/qr` (auth required) → `{ "qrToken": "<jwt>", "expiresAt": "..." }`.
- The use case `IssueQrToken` signs with `typ:'qr'`, `exp = now + 60s`, fresh `jti`.

### Validation (on check-in/out)
`POST /api/checkin { method: 'qr', qrToken }`:
1. Verify signature + `typ === 'qr'` + not expired. Invalid/expired → `401 invalid_qr`.
2. Resolve `sub` → active employee; inactive/unknown → `403`.
3. **Replay/debounce:** reject (or debounce) if this `jti` was used within the debounce window,
   or if an identical (personId, direction) event exists in the last 5s — see §4.3.
4. Determine direction (toggle from latest event, or explicit from endpoint), append event,
   broadcast SSE.

### Why JWT (not opaque token / not raw ID)
- **Spoof-resistant:** can't be forged without the secret.
- **Self-expiring:** no server-side revocation list needed for the short window.
- **Stateless verify:** the kiosk-facing endpoint validates without a DB round-trip for auth.
- **Future-proof:** the same `JwtService.verify` interface validates Entra tokens later (swap
  HS256+secret for RS256+JWKS in infrastructure only).

### Scanner ergonomics (multi-door)
Because the QR encodes everything needed, **any** device with a camera + the check-in endpoint
can scan it — the reception kiosk, a future workshop-exit tablet, or the employee's own app
acting as the scanner at an unmanned door. The scanning device supplies its own `locationId`.
The employee app also offers a **direct button** ("Check in / Check out here") for unmanned
exits with no scanner present — it posts its own current token to the API.

### Visitor pass tokens (multi-day, low-friction return)
The same QR machinery is **reused** for multi-day visitors so day-2+ is a scan, not a re-sign-in:
- On day-1 check-in of a `VisitBooking` with `endDate > startDate`, the API issues a **visitor
  pass**: a signed token (`typ:'visit-pass'`, `sub: bookingId`) plus a short human-readable
  `passCode`. The kiosk shows/prints the QR and code on the success card.
- **Validity is the booking window, not 60s.** Unlike the employee QR (which rotates every ~60s
  because it lives on a controllable screen), the visitor pass is a printed/issued artefact, so the
  token's `exp` is the booking `endDate` (end of day). It resolves to the booking; check-in
  rejects it outside `[startDate, endDate]` or once the booking is `completed`/`cancelled`.
- Return paths: **scan the pass QR** → `POST /api/checkin {method:'qr'}` (identical to staff), or
  the **no-phone fallback** `GET /api/visits/returning?surname=&code=` → one-tap confirm.
- Security: the pass grants only check-in/out for that one booking within its window — no read
  access, no PII beyond the visitor's own arrival. Validated server-side like any other token
  (doc 06). The `passCode` lookup is rate-limited to prevent guessing.

## 4.2 Patient lookup flow

### Flow
```
Kiosk: "I'm a patient"
  → enter Name + Date of Birth
  → GET /api/patients/lookup?name=...&dob=...
      ├─ match  → show confirm card (name + PMG reference only) → POST /api/checkin (patient)
      └─ no match → "We can't find you — please complete a few details"
                    → manual fallback form (name + reason) → POST /api/checkin (method:'manual',
                       note flagged for reception follow-up)
```
This mirrors a hospital waiting-room arrival: low friction, no account, just confirm you've
arrived for your appointment.

### Matching rules (case-insensitive, whitespace-tolerant)
Normalisation applied to both query and stored values before comparison:
- trim, collapse internal whitespace, `toLocaleLowerCase()`
- strip diacritics (NFD normalise + remove combining marks) so "Renée" matches "Renee"
- DOB compared as canonical `YYYY-MM-DD` (accept common input formats, normalise server-side)
- Name match: exact on normalised full name **first**; if no exact full-name+DOB match, the
  lookup returns `match:false` (we deliberately avoid fuzzy/partial matching that could expose
  the wrong patient — a near-miss falls through to the manual fallback, which is safer).

> Both name **and** DOB must match. DOB alone or name alone never returns a record.

### No-match handling
- Returns `{ "match": false }` only — never a hint about *why* (no "DOB wrong" leak).
- Kiosk shows the manual fallback: capture name + free-text reason, create a `manual` patient
  check-in event with `displayName` and a `note`, and surface a "reception to verify" flag on
  the admin live list. The person is still counted as on site (safety first).

### Data minimisation
- Lookup **request** carries name + DOB; the API uses DOB only to disambiguate, then discards
  it — **PMG's presence store never persists patient DOB**.
- Lookup **response** returns only `patientId`, `displayName`, `patientReference` — no DOB, no
  `clinicalSystemId`, no address/contact.
- The check-in event stores `personId` + a `displayName` snapshot + `personType:'patient'`.
- The roll-call/marshal view shows patient **name + "patient" + last location** only.

### Mock clinical system
`MockClinicalSystem implements ClinicalSystemPort`, seeded with 8–10 realistic patients
(doc on seed data). Documented future integration: PMG's clinical system via its API/HL7/FHIR
gateway — only `ClinicalSystemPort.lookup` is reimplemented; nothing else changes.

### Security around lookup
- **Rate-limited** per source IP/kiosk (e.g. 5 lookups / 30s, hard cap) to prevent identity
  enumeration via brute-forced name+DOB combinations (doc 06, OWASP A01/A04).
- Input validated (name length, DOB is a real past date) and sanitised.
- Lookup attempts are audit-logged (count + outcome match/miss, **not** the queried values) for
  the lookup match/miss metric (doc 07) and abuse detection.

## 4.3 QR scan debouncing (duplicate-event prevention)

Rapid successive scans (the camera firing multiple frames, or a double-tap) must not create
duplicate check-ins. Two layers:

1. **Client (scanner):** after a successful decode, lock scanning for ~3s and show a clear
   success state before re-arming the camera.
2. **Server (authoritative):** the check-in use case rejects/coalesces a new event when:
   - the same `jti` (QR token) was already consumed, **or**
   - an identical `(personId, direction)` event exists within the **5s** debounce window.
   In that case it returns the existing event with `"debounced": true` (HTTP `200`), so the UX
   still shows success but no duplicate row is written.

This keeps the event log — and therefore the on-site count and roll-call — clean and correct,
which is the whole point of the system.
