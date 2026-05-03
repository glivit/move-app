import { test } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const BASE = process.env.BASE_URL || 'http://localhost:3002'
const OUT_DIR = path.join('audits', '2026-05-03', 'screens')

const EXTRA = [
  { path: '/client/progress?tab=strength', slug: 'progress-strength' },
  { path: '/client/progress?tab=body', slug: 'progress-body' },
  { path: '/client/progress?tab=checkins', slug: 'progress-checkins' },
  { path: '/client/workout/history', slug: 'workout-history' },
  { path: '/client/exercises', slug: 'exercises' },
  { path: '/client/booking', slug: 'booking' },
  { path: '/client/community', slug: 'community' },
  { path: '/client/journey', slug: 'journey' },
  { path: '/client/program', slug: 'program' },
  { path: '/client/stats', slug: 'stats' },
  { path: '/client/resources', slug: 'resources' },
  { path: '/client/supplements', slug: 'supplements' },
  { path: '/client/meal-plan', slug: 'meal-plan' },
  { path: '/client/progress-report', slug: 'progress-report' },
  { path: '/client/accountability', slug: 'accountability' },
  { path: '/client/settings', slug: 'settings' },
  { path: '/onboarding', slug: 'onboarding' },
  { path: '/', slug: 'login' },
]

test.use({
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
})

const MAX_CAPTURE_HEIGHT = 1800

async function ensureAuth(page: import('@playwright/test').Page) {
  const email = process.env.TEST_USER_EMAIL!
  const password = process.env.TEST_USER_PASSWORD!
  await page.goto(`${BASE}/`)
  await page.waitForLoadState('domcontentloaded')
  try {
    await page.fill('input[type="email"]', email, { timeout: 5000 })
    await page.fill('input[type="password"]', password, { timeout: 5000 })
    await page.click('button[type="submit"]', { timeout: 5000 })
    await page.waitForURL(/(\/client|\/onboarding)/, { timeout: 15000 })
  } catch {}
  const url = new URL(BASE)
  await page.context().addCookies([
    { name: 'move_intake', value: '1', domain: url.hostname, path: '/', httpOnly: false, secure: false, sameSite: 'Lax' },
  ])
}

test.describe('extra-walkthrough', () => {
  for (const route of EXTRA) {
    test(route.slug, async ({ page, context }) => {
      await context.route('**/serwist/**', (r) => r.abort())
      await context.route('**/sw.js', (r) => r.abort())
      // Login is on root — only call ensureAuth for non-login slugs
      if (route.slug !== 'login') {
        try { await ensureAuth(page) } catch {}
      }
      try {
        await page.goto(`${BASE}${route.path}`, { timeout: 30000, waitUntil: 'domcontentloaded' })
      } catch (err) {
        console.warn(`[goto] ${route.slug}:`, err)
      }
      await page.waitForTimeout(1500)
      try {
        await page.screenshot({
          path: path.join(OUT_DIR, `${route.slug}.png`),
          fullPage: false,
          animations: 'disabled',
          timeout: 10000,
        })
      } catch (err) {
        console.warn(`[screenshot] ${route.slug}:`, (err as Error).message)
      }
      try {
        const docHeight = await page.evaluate(() => document.documentElement.scrollHeight)
        const captureHeight = Math.min(docHeight, MAX_CAPTURE_HEIGHT)
        await page.screenshot({
          path: path.join(OUT_DIR, `${route.slug}.full.png`),
          clip: { x: 0, y: 0, width: 393, height: captureHeight },
          animations: 'disabled',
          timeout: 12000,
        })
      } catch {}
      // DOM snapshot
      try {
        const interactives = await page.evaluate(() => {
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
              x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
              color: styles.color, background: styles.backgroundColor, zIndex: styles.zIndex,
            }
          })
        })
        const DOM_DIR = path.join('audits', '2026-05-03', 'dom')
        fs.mkdirSync(DOM_DIR, { recursive: true })
        fs.writeFileSync(
          path.join(DOM_DIR, `${route.slug}.json`),
          JSON.stringify({ route: route.path, interactives, timestamp: new Date().toISOString() }, null, 2)
        )
      } catch {}
    })
  }
})
