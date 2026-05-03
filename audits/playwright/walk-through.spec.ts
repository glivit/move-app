import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

/**
 * MŌVE walk-through — captures every key client route, snapshots clickable
 * elements, and runs a simple "tap-everything" pass on each screen.
 * Used by ux-auditor agent. Update ROUTES when new screens land.
 *
 * Run: npx playwright test audits/playwright/walk-through.spec.ts
 */

const DATE = new Date().toISOString().slice(0, 10)
const OUT_DIR = path.join('audits', DATE, 'screens')
const DOM_DIR = path.join('audits', DATE, 'dom')
const BASE = process.env.BASE_URL || 'http://localhost:3000'

const ROUTES = [
  { path: '/client', slug: 'home' },
  { path: '/client/workout', slug: 'workout-overview' },
  { path: '/client/nutrition', slug: 'nutrition' },
  { path: '/client/messages', slug: 'messages' },
  { path: '/client/progress', slug: 'progress-overview' },
  { path: '/client/calendar', slug: 'calendar' },
  { path: '/client/profile', slug: 'profile' },
  { path: '/client/check-in', slug: 'check-in' },
  { path: '/client/weekly-check-in', slug: 'weekly-check-in' },
  { path: '/client/measurements', slug: 'measurements' },
  { path: '/client/health', slug: 'health' },
  { path: '/client/notifications', slug: 'notifications' },
  { path: '/client/profile/goals', slug: 'profile-goals' },
  { path: '/client/profile/diet', slug: 'profile-diet' },
  { path: '/client/profile/health', slug: 'profile-health' },
  { path: '/client/profile/edit', slug: 'profile-edit' },
  { path: '/client/profile/logs', slug: 'profile-logs' },
  { path: '/client/profile/notifications', slug: 'profile-notifications' },
  { path: '/client/profile/privacy', slug: 'profile-privacy' },
  { path: '/client/profile/help', slug: 'profile-help' },
]

// iPhone 14 Pro device emulation
test.use({
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 ' +
    '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
})

test.beforeAll(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.mkdirSync(DOM_DIR, { recursive: true })
})

// Auth helper — relies on test creds in .env.test
async function ensureAuth(page: import('@playwright/test').Page) {
  const email = process.env.TEST_USER_EMAIL
  const password = process.env.TEST_USER_PASSWORD
  if (!email || !password) {
    test.skip(true, 'TEST_USER_EMAIL / TEST_USER_PASSWORD env vars vereist voor authed routes')
    return
  }
  await page.goto(`${BASE}/`)
  await page.waitForLoadState('domcontentloaded')
  // Login form lives on root `/`
  try {
    await page.fill('input[type="email"]', email, { timeout: 5000 })
    await page.fill('input[type="password"]', password, { timeout: 5000 })
    await page.click('button[type="submit"]', { timeout: 5000 })
    await page.waitForURL(/\/client/, { timeout: 15000 })
  } catch (err) {
    if (!page.url().includes('/client')) {
      console.warn('[auth] login fallback:', err)
    }
  }
}

test.describe('walk-through', () => {
  for (const route of ROUTES) {
    test(`${route.slug}`, async ({ page }) => {
      try {
        await ensureAuth(page)
      } catch (err) {
        console.warn(`[auth] ${route.slug} could not auth:`, err)
      }
      try {
        await page.goto(`${BASE}${route.path}`, { timeout: 30000 })
      } catch (err) {
        console.warn(`[goto] ${route.slug}:`, err)
      }
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
      await page.waitForTimeout(600) // animations settle

      // Full-page screenshot — tolerate crashed page
      try {
        await page.screenshot({
          path: path.join(OUT_DIR, `${route.slug}.png`),
          fullPage: true,
          animations: 'disabled',
          timeout: 15000,
        })
      } catch (err) {
        console.warn(`[screenshot fullpage] ${route.slug}:`, err)
        // try a viewport-only screenshot as fallback
        try {
          await page.screenshot({
            path: path.join(OUT_DIR, `${route.slug}.png`),
            fullPage: false,
            animations: 'disabled',
            timeout: 8000,
          })
        } catch (err2) {
          console.warn(`[screenshot viewport] ${route.slug}:`, err2)
        }
      }

      // DOM snapshot — interactives
      let interactives: any[] = []
      try {
      interactives = await page.evaluate(() => {
        const sel = 'button, a[href], input, textarea, select, [role="button"], [role="link"], [role="tab"]'
        return Array.from(document.querySelectorAll(sel)).map((el) => {
          const r = el.getBoundingClientRect()
          const styles = window.getComputedStyle(el as HTMLElement)
          return {
            tag: el.tagName.toLowerCase(),
            text: (el.textContent || '').trim().slice(0, 80),
            aria: el.getAttribute('aria-label'),
            role: el.getAttribute('role'),
            href: el.getAttribute('href'),
            disabled: (el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true',
            visible: r.width > 0 && r.height > 0 && styles.display !== 'none' && styles.visibility !== 'hidden',
            tooSmall: r.width < 44 || r.height < 44,
            x: Math.round(r.x),
            y: Math.round(r.y),
            w: Math.round(r.width),
            h: Math.round(r.height),
            color: styles.color,
            background: styles.backgroundColor,
            zIndex: styles.zIndex,
          }
        })
      })
      } catch (err) {
        console.warn(`[dom snapshot] ${route.slug}:`, err)
      }

      fs.writeFileSync(
        path.join(DOM_DIR, `${route.slug}.json`),
        JSON.stringify({ route: route.path, interactives, timestamp: new Date().toISOString() }, null, 2),
      )

      // Quick contrast sanity — flag elements with white-on-white
      const contrastIssues = interactives.filter((i) => {
        const isLightBg = /rgb\((2[0-9]{2}|255), (2[0-9]{2}|255), (2[0-9]{2}|255)\)/.test(i.background) ||
                          i.background === 'rgba(0, 0, 0, 0)'
        const isLightFg = /rgb\((2[0-9]{2}|255), (2[0-9]{2}|255), (2[0-9]{2}|255)\)/.test(i.color)
        return i.visible && i.text && isLightBg && isLightFg
      })
      if (contrastIssues.length) {
        fs.writeFileSync(
          path.join(DOM_DIR, `${route.slug}.contrast-issues.json`),
          JSON.stringify(contrastIssues, null, 2),
        )
      }

      // Tap-everything pass — only safe elements (not destructive)
      // Skip if route is destructive-prone (delete buttons etc.)
      const safeButtons = process.env.SKIP_TAP_PASS
        ? []
        : await page.$$('button:not([aria-label*="erwijder" i]):not([aria-label*="elete" i]):not([aria-label*="luit" i])').catch(() => [])
      let tapCount = 0
      for (const btn of safeButtons.slice(0, 4)) {
        try {
          const before = page.url()
          await btn.click({ trial: false, timeout: 1500 })
          await page.waitForTimeout(400)
          if (page.url() !== before) {
            // navigated away — take screenshot of new state and return
            await page.screenshot({
              path: path.join(OUT_DIR, `${route.slug}.tap-${tapCount}.png`),
              fullPage: true,
            })
            await page.goto(`${BASE}${route.path}`)
            await page.waitForLoadState('networkidle').catch(() => {})
          } else {
            await page.screenshot({
              path: path.join(OUT_DIR, `${route.slug}.tap-${tapCount}.png`),
              fullPage: true,
            })
          }
          tapCount++
        } catch {
          // ignore — element may be detached
        }
      }

      expect(true).toBe(true) // marker — actual evals happen in agent reading the artifacts
    })
  }
})
