import lighthouse from 'lighthouse'
import { launch } from 'chrome-launcher'
import fs from 'fs'

const ROUTES = [
  '/client',
  '/client/workout',
  '/client/workout/active',
  '/client/nutrition',
  '/client/messages',
  '/client/progress',
  '/client/calendar',
  '/client/profile',
  '/client/check-in',
]
const BASE = process.env.BASE_URL || 'http://localhost:3000'
const OUT = 'audits/2026-05-03/perf'

const chrome = await launch({ chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'] })
const opts = {
  logLevel: 'error',
  output: 'json',
  port: chrome.port,
  onlyCategories: ['performance'],
  formFactor: 'mobile',
  throttling: { rttMs: 150, throughputKbps: 1638, cpuSlowdownMultiplier: 4 },
  screenEmulation: { mobile: true, width: 393, height: 852, deviceScaleFactor: 2, disabled: false },
  emulatedUserAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
}

const summary = []
for (const route of ROUTES) {
  console.log('Running', route)
  try {
    const result = await lighthouse(`${BASE}${route}`, opts)
    if (!result) {
      console.log('  no result for', route)
      continue
    }
    const slug = route.replace(/\//g, '_') || 'root'
    fs.writeFileSync(`${OUT}/${slug}.json`, result.report)
    const lhr = result.lhr
    const row = {
      route,
      perf: Math.round((lhr.categories.performance?.score ?? 0) * 100),
      LCP: lhr.audits['largest-contentful-paint']?.numericValue,
      INP: lhr.audits['interaction-to-next-paint']?.numericValue,
      CLS: lhr.audits['cumulative-layout-shift']?.numericValue,
      FCP: lhr.audits['first-contentful-paint']?.numericValue,
      TBT: lhr.audits['total-blocking-time']?.numericValue,
      TTI: lhr.audits['interactive']?.numericValue,
      SI: lhr.audits['speed-index']?.numericValue,
      transferKB: Math.round((lhr.audits['total-byte-weight']?.numericValue ?? 0) / 1024),
      mainThreadMs: Math.round(lhr.audits['mainthread-work-breakdown']?.numericValue ?? 0),
      bootupMs: Math.round(lhr.audits['bootup-time']?.numericValue ?? 0),
      unusedJsKB: Math.round(
        (lhr.audits['unused-javascript']?.details?.overallSavingsBytes ?? 0) / 1024,
      ),
      unusedCssKB: Math.round(
        (lhr.audits['unused-css-rules']?.details?.overallSavingsBytes ?? 0) / 1024,
      ),
    }
    summary.push(row)
    console.log(row)
  } catch (e) {
    console.error('  failed', route, e.message)
    summary.push({ route, error: e.message })
  }
}
fs.writeFileSync(`${OUT}/_summary.json`, JSON.stringify(summary, null, 2))
await chrome.kill()
console.log('done')
