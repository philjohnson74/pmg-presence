import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config — runs the 5 critical journeys against the full dev stack.
 *
 * Local:  `pnpm test:e2e` (starts all servers automatically via webServer)
 * CI:     Start the stack in a prior job step, then `pnpm test:e2e` with CI=true
 *         (reuseExistingServer: true skips the start-up commands when ports are already bound)
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // journeys share in-memory state — run sequentially
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: 1,
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: 'http://localhost:5174', // kiosk is the primary surface
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    actionTimeout: 10_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      name: 'API',
      command: 'pnpm --filter @pmg/api dev',
      url: 'http://localhost:4000/api/health',
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      name: 'Admin',
      command: 'pnpm --filter @pmg/admin dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      name: 'Kiosk',
      command: 'pnpm --filter @pmg/kiosk dev',
      url: 'http://localhost:5174',
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      name: 'Employee',
      command: 'pnpm --filter @pmg/employee dev',
      url: 'http://localhost:5175',
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
