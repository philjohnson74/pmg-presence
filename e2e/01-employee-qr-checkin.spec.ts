/**
 * Journey 1 — Employee QR check-in
 *
 * The employee app renders a rotating QR code on My Pass. Camera capture is
 * unavailable in CI, so this test uses the documented test seam: fetch the QR
 * token from the API directly and POST it to /api/checkin as if it had been
 * scanned at a kiosk. The browser-side journey (login → My Pass → QR visible)
 * is still exercised to prove the UI renders correctly.
 *
 * Employee used: David Stevens (emp-001, admin) — not pre-seeded on-site.
 */

import { test, expect } from '@playwright/test';
import { apiLogin, apiGet, apiPost } from './helpers/api.js';

const EMPLOYEE_APP = 'http://localhost:5175';
const ADMIN_APP = 'http://localhost:5173';

test('Employee QR check-in', async ({ page, request }) => {
  // ── 1. Open the employee app and log in as David Stevens ──────────────────
  await page.goto(`${EMPLOYEE_APP}/login`);
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

  await page.getByRole('button', { name: /David Stevens/i }).click();
  await page.waitForURL(/\/my-pass/);

  // ── 2. Verify the QR code SVG is rendered on the My Pass page ─────────────
  await expect(page.locator('svg').first()).toBeVisible();
  await expect(page.getByText(/PMG-0001/)).toBeVisible();

  // ── 3. Test seam: fetch QR token via the API (bypasses camera) ────────────
  const token = await apiLogin(request, 'emp-001');
  const qrData = await apiGet<{ qrToken: string; expiresAt: string }>(
    request,
    '/api/employees/me/qr',
    token,
  );
  expect(qrData.qrToken).toBeTruthy();

  // ── 4. POST the QR token to /api/checkin as a kiosk would ─────────────────
  const { status, body } = await apiPost<{ displayName: string; direction: string }>(
    request,
    '/api/checkin',
    { method: 'qr', qrToken: qrData.qrToken, locationId: 'loc-reception' },
  );
  expect(status).toBe(201);
  expect(body.displayName).toBe('David Stevens');
  expect(body.direction).toBe('in');

  // ── 5. Verify David Stevens appears on the admin on-site list ─────────────
  const adminToken = await apiLogin(request, 'emp-001'); // admin role
  const snapshot = await apiGet<{ occupants: Array<{ displayName: string }> }>(
    request,
    '/api/onsite',
    adminToken,
  );
  expect(snapshot.occupants.some((o) => o.displayName === 'David Stevens')).toBe(true);

  // ── 6. Open admin app and verify live count includes David ────────────────
  const adminPage = await page.context().newPage();
  await adminPage.goto(`${ADMIN_APP}/login`);
  await adminPage.getByRole('button', { name: /David Stevens/i }).click();
  await adminPage.waitForURL(/\/onsite/);
  await expect(adminPage.getByText(/David Stevens/)).toBeVisible();
  await adminPage.close();
});
