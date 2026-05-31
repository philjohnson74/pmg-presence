/**
 * Journey 2 — Patient name/DOB check-in
 *
 * Tests the kiosk patient flow end-to-end:
 * a) Happy path — seeded patient Joan Webb matches, confirms, and is checked in.
 *    (Joan Webb is pre-seeded on-site; the test checks her out first so the
 *    check-in produces a fresh 'in' event.)
 * b) No-match path — an unknown name produces the manual fallback screen.
 */

import { test, expect } from '@playwright/test';
import { apiLogin, apiPost } from './helpers/api.js';

const KIOSK = 'http://localhost:5174';

test.describe('Patient check-in — kiosk flow', () => {
  test('a) Match → confirm → checked in', async ({ page, request }) => {
    // Check Joan Webb out first so she can be checked back in
    const { status: outStatus } = await apiPost(request, '/api/checkout', {
      personId: 'pat-001',
      personType: 'patient',
      locationId: 'loc-reception',
    });
    // 201 = checked out, 200 = debounced (acceptable either way)
    expect([200, 201]).toContain(outStatus);

    // ── Navigate to kiosk patient page ────────────────────────────────────
    await page.goto(`${KIOSK}/patient`);
    await expect(page.getByRole('heading', { name: /patient sign in/i })).toBeVisible();

    // ── Fill in Joan Webb's details ───────────────────────────────────────
    await page.getByPlaceholder(/joan webb/i).fill('Joan Webb');
    await page.locator('input[type="date"]').fill('1951-03-14');
    await page.getByRole('button', { name: /find my appointment/i }).click();

    // ── Confirm screen shows matched record ───────────────────────────────
    await expect(page.getByText(/record found/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText('Joan Webb')).toBeVisible();
    await expect(page.getByText(/PMG-OUT-4471/)).toBeVisible();

    // ── Confirm check-in ──────────────────────────────────────────────────
    await page.getByRole('button', { name: /yes, sign in/i }).click();
    await expect(page.getByText(/signed in/i)).toBeVisible({ timeout: 8_000 });
  });

  test('b) No match → manual fallback screen', async ({ page }) => {
    await page.goto(`${KIOSK}/patient`);

    await page.getByPlaceholder(/joan webb/i).fill('Unknown Patient XYZ');
    await page.locator('input[type="date"]').fill('1990-01-01');
    await page.getByRole('button', { name: /find my appointment/i }).click();

    // Manual fallback shown
    await expect(page.getByText(/no matching record found/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/reception team will verify/i)).toBeVisible();

    // Fill manual name and sign in anyway
    const nameInput = page.locator('input[type="text"]').last();
    await nameInput.fill('Unknown Patient XYZ');
    await page.getByRole('button', { name: /sign in anyway/i }).click();
    await expect(page.getByText(/signed in/i)).toBeVisible({ timeout: 8_000 });
  });

  test.afterAll(async ({ request }) => {
    // Re-seed admin token for cleanup — leave the state clean for subsequent journeys
    const token = await apiLogin(request, 'emp-001');
    void token; // no specific cleanup needed; in-memory state resets on server restart
  });
});
