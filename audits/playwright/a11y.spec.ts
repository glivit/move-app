import { test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import path from 'path'
import fs from 'fs'

const ROUTES = [
  '/client',
  '/client/workout',
  '/client/nutrition',
  '/client/messages',
  '/client/progress',
  '/client/calendar',
  '/client/profile',
  '/client/check-in',
  '/client/weekly-check-in',
  '/client/measurements',
  '/client/health',
  '/client/notifications',
  '/client/community',
  '/client/booking',
  '/client/exercises',
  '/client/journey',
  '/client/accountability',
  '/client/profile/goals',
  '/client/profile/diet',
  '/client/profile/health',
  '/client/profile/edit',
  '/auth/reset-password',
  '/auth/set-password',
  '/auth/verify',
  '/onboarding',
]
const BASE = process.env.BASE_URL || 'http://localhost:3000'
const OUT = path.join('audits', '2026-05-03', 'a11y')

test.beforeAll(() => fs.mkdirSync(OUT, { recursive: true }))

for (const route of ROUTES) {
  test(`a11y ${route}`, async ({ page }) => {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle').catch(() => {})
    // small settle for client hydration
    await page.waitForTimeout(800)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    fs.writeFileSync(
      path.join(OUT, `${route.replace(/\//g, '_') || 'root'}.json`),
      JSON.stringify(results, null, 2)
    )
  })
}
