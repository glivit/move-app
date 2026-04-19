/**
 * Stuur weekly-plan mails naar alle actieve klanten voor de komende week.
 *
 * Run (droog, default):
 *   npx tsx scripts/send-weekly-plans.ts
 *
 * Echt verzenden:
 *   npx tsx scripts/send-weekly-plans.ts --send
 *
 * Eén specifieke klant (test):
 *   npx tsx scripts/send-weekly-plans.ts --only glenndelille@gmail.com
 *   npx tsx scripts/send-weekly-plans.ts --only glenndelille@gmail.com --send
 *
 * Forceer andere week-start (default = komende maandag):
 *   npx tsx scripts/send-weekly-plans.ts --week-start 2026-04-20
 */
import 'dotenv/config'
import { config as dotenvConfig } from 'dotenv'
dotenvConfig({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { sendWeeklyPlanEmail } from '../src/lib/email'
import { renderWeeklyPlan, type WeeklyPlanParams, type WeeklyPlanDay } from '../src/lib/emails/weekly-plan'

// ── args ─────────────────────────────────────────────────────
const args = process.argv.slice(2)
const SEND = args.includes('--send')
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null
const FORCED_WEEK_START = args.includes('--week-start') ? args[args.indexOf('--week-start') + 1] : null

// ── supabase ─────────────────────────────────────────────────
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

// ── date helpers (ISO-week, Monday start) ────────────────────
function nextMondayFrom(d: Date): Date {
  // Always returns the *next* Monday (if today is Monday, returns today).
  const day = d.getDay() // 0=Sun..6=Sat
  const iso = day === 0 ? 7 : day
  const diff = iso === 1 ? 0 : 8 - iso
  const monday = new Date(d)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() + diff)
  return monday
}

function isoWeekNumber(d: Date): number {
  // ISO-8601 week number: Thursday-based
  const target = new Date(d.valueOf())
  const dayNr = (d.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNr + 3)
  const firstThursday = new Date(target.getFullYear(), 0, 4)
  const diff = target.getTime() - firstThursday.getTime()
  return 1 + Math.round(diff / (7 * 24 * 3600 * 1000))
}

const DOW_NL = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
const MONTH_NL = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

// Replace em/en dashes with "·" so emails never render them (user preference).
function scrub(s: string | null | undefined): string | undefined {
  if (!s) return undefined
  return s.replace(/\s*[—–]\s*/g, ' · ')
}

// ── main ─────────────────────────────────────────────────────
async function main() {
  const today = new Date()
  const weekStart = FORCED_WEEK_START
    ? new Date(FORCED_WEEK_START + 'T00:00:00')
    : nextMondayFrom(today)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const weekNumber = isoWeekNumber(weekStart)
  const dateRange = `${weekStart.getDate()} · ${weekEnd.getDate()} ${MONTH_NL[weekEnd.getMonth()]}`
  // Highlight logic: if we're *inside* the plan week, highlight today.
  // If we're sending *ahead of time*, highlight Monday (start of the week).
  const highlightDate =
    today >= weekStart && today <= weekEnd ? today.getDate() : weekStart.getDate()
  const highlightMonth =
    today >= weekStart && today <= weekEnd ? today.getMonth() : weekStart.getMonth()

  console.log(`
┌──────────────────────────────────────────────────────────────
│ Weekly plan · MŌVE
│ Week ${weekNumber}   ${dateRange}
│ Start: ${weekStart.toISOString().slice(0, 10)}  End: ${weekEnd.toISOString().slice(0, 10)}
│ Mode:  ${SEND ? '\x1b[31mSEND (live!)\x1b[0m' : '\x1b[33mDRY-RUN (preview only)\x1b[0m'}${ONLY ? `   |   only=${ONLY}` : ''}
└──────────────────────────────────────────────────────────────\n`)

  // 1. Actieve clients
  let clientQuery = sb
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('role', 'client')
    .order('created_at', { ascending: true })
  if (ONLY) clientQuery = clientQuery.eq('email', ONLY)

  const { data: clients, error } = await clientQuery
  if (error) throw error
  if (!clients || clients.length === 0) {
    console.log('✗ Geen klanten gevonden.')
    return
  }

  let sent = 0
  let skipped = 0
  const failures: string[] = []

  for (const c of clients) {
    const firstName = (c.full_name ?? '').split(' ')[0] || 'Atleet'
    const email = c.email
    if (!email) {
      console.log(`✗ ${firstName}: geen e-mailadres, overgeslagen.`)
      skipped++
      continue
    }

    // 2. Actief programma
    const { data: programs } = await sb
      .from('client_programs')
      .select('id, template_id, schedule, name, current_week, coach_notes')
      .eq('client_id', c.id)
      .eq('is_active', true)
      .limit(1)
    const program = programs?.[0]
    if (!program) {
      console.log(`⚠ ${firstName} (${email}): geen actief programma, overgeslagen.`)
      skipped++
      continue
    }

    // 3. Template days
    const { data: tplDays } = await sb
      .from('program_template_days')
      .select('id, day_number, name, focus, estimated_duration_min')
      .eq('template_id', program.template_id)
    const daysById = new Map<string, typeof tplDays[0]>()
    tplDays?.forEach((d) => daysById.set(d.id, d))

    // 4. Oefeningen per template_day_id (batched)
    const dayIds = (tplDays ?? []).map((d) => d.id)
    const exerciseCountByDay: Record<string, number> = {}
    if (dayIds.length > 0) {
      const { data: rows } = await sb
        .from('program_template_exercises')
        .select('template_day_id')
        .in('template_day_id', dayIds)
      rows?.forEach((r) => {
        exerciseCountByDay[r.template_day_id] = (exerciseCountByDay[r.template_day_id] ?? 0) + 1
      })
    }

    // 5. Schedule → days array (Mon=1..Sun=7)
    const schedule = (program.schedule ?? {}) as Record<string, string>
    const days: WeeklyPlanDay[] = []
    for (let i = 0; i < 7; i++) {
      const weekday = i + 1 // 1..7 (Mon..Sun)
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      const day: WeeklyPlanDay = {
        weekday,
        dow: DOW_NL[i],
        date: d.getDate(),
        dateLabel: `${d.getDate()}/${String(d.getMonth() + 1).padStart(2, '0')}`,
        isToday: d.getDate() === highlightDate && d.getMonth() === highlightMonth,
      }
      const templateDayId = schedule[String(weekday)]
      const td = templateDayId ? daysById.get(templateDayId) : undefined
      if (td) {
        day.session = {
          name: scrub(td.name) ?? td.name,
          focus: scrub(td.focus),
          exerciseCount: exerciseCountByDay[td.id] ?? undefined,
          durationMin: td.estimated_duration_min ?? undefined,
        }
      }
      days.push(day)
    }

    const sessionCount = days.filter((d) => d.session).length

    // 6. Voeding
    const { data: nps } = await sb
      .from('nutrition_plans')
      .select('calories_target, protein_g, carbs_g, fat_g')
      .eq('client_id', c.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
    const np = nps?.[0]
    const nutrition = np && np.calories_target
      ? {
          kcal: np.calories_target,
          protein: np.protein_g ?? 0,
          carbs: np.carbs_g ?? 0,
          fat: np.fat_g ?? 0,
        }
      : undefined

    // 7. Focus + coach note: default copy (per-client tuning kan later)
    const focus = sessionCount > 0
      ? {
          title: 'Drie dingen, en je wint de week.',
          items: [
            '<strong>Alle geplande sessies afronden.</strong> Kort mag, skippen niet.',
            nutrition
              ? '<strong>Elke dag je maaltijden loggen.</strong> Ook een ruwe schatting telt.'
              : '<strong>Hydratatie op orde houden.</strong> Minstens 2 liter water per dag.',
            '<strong>Minstens 7 uur slaap.</strong> Herstel is waar progressie gebeurt.',
          ],
        }
      : undefined

    const coachNote = sessionCount > 0
      ? {
          message: 'Start klein als het moet, maar start. Eerste sessie zetten is 80% van het werk.',
          coachName: 'Glenn',
          initial: 'G',
        }
      : undefined

    // 8. Params
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://movestudio.be'
    const params: WeeklyPlanParams = {
      firstName,
      weekNumber,
      dateRange,
      days,
      nutrition,
      focus,
      coachNote,
      dashboardUrl: `${appUrl}/dashboard`,
      settingsUrl: `${appUrl}/settings/notifications`,
    }

    // 9. Log summary
    const sessLine = days
      .map((d) => (d.session ? `${d.dow}=${d.session.name}` : `${d.dow}=·`))
      .join('  ')
    console.log(
      `  ${SEND ? '→' : '·'} ${firstName.padEnd(10)} ${email.padEnd(34)}  ${sessionCount} trainingen  ${nutrition ? `${nutrition.kcal}kcal` : 'geen voeding'}`,
    )
    console.log(`      ${sessLine}`)

    // 10. Send or dry-run preview
    if (SEND) {
      try {
        const res = await sendWeeklyPlanEmail({ to: email, plan: params })
        console.log(`      ✓ Resend id: ${res?.id}`)
        sent++
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.log(`      ✗ FAIL: ${msg}`)
        failures.push(`${email}: ${msg}`)
      }
    } else {
      // render to mockups/ so Glenn can eyeball one per client
      const html = renderWeeklyPlan(params)
      const safe = email.replace(/[^a-z0-9]+/gi, '_').toLowerCase()
      const outPath = join(process.cwd(), 'mockups', `email-plan-${safe}.html`)
      writeFileSync(outPath, html, 'utf-8')
      console.log(`      preview → mockups/email-plan-${safe}.html`)
    }
  }

  console.log(
    `\n──────────────────────────────────────────────────────────────\n${SEND ? `✅ ${sent} verzonden` : `📝 Dry-run klaar, run opnieuw met --send om daadwerkelijk te versturen.`}  ·  ${skipped} overgeslagen${failures.length ? `  ·  ❌ ${failures.length} gefaald` : ''}`,
  )
  if (failures.length) {
    console.log('\nFouten:')
    failures.forEach((f) => console.log('  ' + f))
  }
}

main().catch((e) => {
  console.error('❌ Script error:', e.message)
  process.exit(1)
})
