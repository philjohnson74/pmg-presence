/**
 * Journey 4 — Fire alarm trigger
 *
 * Kiosk confirms the fire trigger → the marshal (employee) app flips to
 * evacuation mode showing the roll-call overlay.
 *
 * Steps:
 * 1. Ensure no fire event is active before the test.
 * 2. Kiosk: /fire → confirm emergency → POST fires.
 * 3. Employee app (marshal): connects SSE stream → sees evacuation overlay.
 * 4. Admin resolves the event (cleanup so later journeys start clean).
 */

import { test, expect } from '@playwright/test';
import { apiLogin, resolveFireIfActive } from './helpers/api.js';

const KIOSK = 'http://localhost:5174';
const EMPLOYEE_APP = 'http://localhost:5175';

test('Fire alarm trigger — kiosk fires, marshal sees evacuation overlay', async ({
  browser,
  request,
}) => {
  // ── 0. Clean up any leftover active fire event ────────────────────────────
  const adminToken = await apiLogin(request, 'emp-001');
  await resolveFireIfActive(request, adminToken);

  // ── 1. Marshal logs in to the employee app and navigates to My Pass ───────
  const marshalCtx = await browser.newContext();
  const marshalPage = await marshalCtx.newPage();
  await marshalPage.goto(`${EMPLOYEE_APP}/login`);
  await marshalPage.getByRole('button', { name: /Gary Cooper/i }).click();
  await marshalPage.waitForURL(/\/my-pass/);

  // ── 2. Kiosk: navigate to /fire and confirm the alarm (two-step flow) ────
  const kioskCtx = await browser.newContext();
  const kioskPage = await kioskCtx.newPage();
  await kioskPage.goto(`${KIOSK}/fire`);

  // Step 1 — warning screen: "🚨 Raise Alarm"
  await kioskPage.getByRole('button', { name: /raise alarm/i }).click();

  // Step 2 — confirm screen: "Yes, trigger alarm 🚨"
  await kioskPage.getByRole('button', { name: /yes, trigger alarm/i }).click();

  // After confirmation the kiosk shows the evacuation lock screen
  await expect(kioskPage.getByText(/evacuation in progress/i)).toBeVisible({ timeout: 10_000 });

  // ── 3. Marshal app should show the evacuation overlay via SSE ─────────────
  // Give SSE a moment to deliver the fire.triggered event
  await marshalPage.waitForSelector('[data-testid="evacuation-overlay"], text=Evacuation', {
    timeout: 12_000,
  }).catch(() => {
    // Fallback: check for any text indicating evacuation mode
  });
  await expect(
    marshalPage.getByText(/evacuation/i).or(marshalPage.getByText(/roll.?call/i)),
  ).toBeVisible({ timeout: 12_000 });

  // ── 4. Cleanup: resolve the fire event ───────────────────────────────────
  await resolveFireIfActive(request, adminToken);

  await marshalCtx.close();
  await kioskCtx.close();
});
