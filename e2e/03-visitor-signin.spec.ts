/**
 * Journey 3 — Visitor sign-in via kiosk
 *
 * A new one-day visitor fills the kiosk visitor form → gets checked in →
 * appears on the admin on-site list.
 *
 * A unique visitor name is used so this test is independent of seed state.
 */

import { test, expect } from '@playwright/test';
import { apiLogin, apiGet } from './helpers/api.js';

const KIOSK = 'http://localhost:5174';
const VISITOR_NAME = `E2E Visitor ${Date.now()}`;

test('Visitor sign-in — kiosk form → appears on admin on-site list', async ({ page, request }) => {
  // ── 1. Navigate to kiosk visitor page ────────────────────────────────────
  await page.goto(`${KIOSK}/visitor`);
  await expect(page.getByRole('heading', { name: /visitor sign in/i })).toBeVisible();

  // Ensure we're on the "New visitor" tab (it's default, but be explicit)
  await page.getByRole('button', { name: /new visitor/i }).click();

  // ── 2. Fill in visitor details ────────────────────────────────────────────
  // The form uses labels without htmlFor, so use placeholder to locate inputs
  await page.getByPlaceholder(/dana okoro/i).fill(VISITOR_NAME);
  await page.getByPlaceholder(/gary cooper/i).fill('Gary Cooper');
  await page.locator('textarea').fill('E2E test visit — system check');

  // Select visit category
  await page.getByRole('button', { name: 'Contractor' }).click();

  // Duration: today only (default) — no extra interaction needed

  // ── 3. Submit the form ───────────────────────────────────────────────────
  await page.getByRole('button', { name: /sign in/i }).click();

  // ── 4. Success screen ────────────────────────────────────────────────────
  await expect(page.getByText(/signed in/i)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(new RegExp(VISITOR_NAME, 'i'))).toBeVisible();

  // ── 5. Verify visitor appears on admin on-site list via API ───────────────
  const token = await apiLogin(request, 'emp-001');
  const snapshot = await apiGet<{ occupants: Array<{ displayName: string; personType: string }> }>(
    request,
    '/api/onsite',
    token,
  );
  expect(
    snapshot.occupants.some(
      (o) => o.displayName === VISITOR_NAME && o.personType === 'visitor',
    ),
  ).toBe(true);
});
