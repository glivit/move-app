import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config voor MŌVE audit walk-through.
 * Wordt gebruikt door de ux-auditor agent (.claude/agents/ux-auditor.md).
 *
 * Run: npx playwright test
 * Run specific: npx playwright test audits/playwright/walk-through.spec.ts
 */
export default defineConfig({
  testDir: 'audits/playwright',
  fullyParallel: false, // sequential — auth state shared
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'audits/playwright/_html-report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 5000,
    navigationTimeout: 20000,
  },
  projects: [
    {
      name: 'iphone-14-pro',
      use: {
        ...devices['iPhone 14 Pro'],
        defaultBrowserType: 'chromium',
      },
    },
  ],
  webServer: process.env.SKIP_WEBSERVER
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 60000,
      },
})
