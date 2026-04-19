/**
 * Weekly plan e-mail template · MŌVE v3 Orion
 *
 * Rendered every Monday at 07:00. Parametric · shares design tokens with the
 * core transactional templates in src/lib/email.ts.
 */
import { T, ctaButton, baseLayout } from '@/lib/email'

const MACRO = {
  calories: '#E8A93C',
  protein: '#A4C7F2',
  carbs: '#C0FC01',
  fat: '#CBB0D6',
}

export type WeeklyPlanDay = {
  weekday: number            // 1=Mon .. 7=Sun (ISO)
  dow: string                // "Ma"
  date: number               // 20
  dateLabel: string          // "20/04"  (used in session card)
  isToday: boolean
  session?: {
    name: string             // "Push"
    focus?: string           // "Chest · Shoulders · Triceps"
    exerciseCount?: number
    durationMin?: number
  }
}

export type WeeklyPlanParams = {
  firstName: string
  weekNumber: number
  dateRange: string                    // "20 · 26 apr"
  heroHeadline?: string                // fallback is built from session count
  heroIntro?: string
  days: WeeklyPlanDay[]                // exactly 7 entries, Mon → Sun
  nutrition?: {
    kcal: number
    protein: number
    carbs: number
    fat: number
  }
  focus?: {
    title: string                      // "Drie dingen en je wint de week."
    items: string[]                    // plain-text bullets, ~3 max
  }
  coachNote?: {
    message: string
    coachName: string                  // "Glenn"
    initial: string                    // "G"
  }
  dashboardUrl: string
  settingsUrl?: string
  unsubscribeUrl?: string
}

const font = "'Inter',-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif"

function nf(n: number) {
  return new Intl.NumberFormat('nl-BE').format(n)
}

// ── week-strip day cell ──────────────────────────────────────
function dayCell(d: WeeklyPlanDay) {
  const bg = d.isToday ? T.lime : T.cardSoft
  const dowColor = d.isToday ? 'rgba(10,14,11,0.62)' : T.inkMute
  const dateColor = d.isToday ? T.inkDark : T.ink

  let tag = ''
  if (d.session) {
    const tagBg = d.isToday ? T.inkDark : 'rgba(192,252,1,0.16)'
    const tagColor = T.lime
    tag = `
      <div style="margin:8px 2px 0;padding:4px 0;border-radius:6px;background-color:${tagBg};font-family:${font};font-size:10px;font-weight:700;color:${tagColor};letter-spacing:0.04em;text-align:center;">
        ${escapeHtml(d.session.name)}
      </div>`
  } else {
    tag = `
      <div style="margin:8px 2px 0;padding:4px 0;border-radius:6px;background-color:rgba(253,253,254,0.05);font-family:${font};font-size:10px;font-weight:600;color:${T.inkDim};text-align:center;">
        rust
      </div>`
  }

  return `
    <td width="14.285%" valign="top" style="padding:3px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${bg};border-radius:12px;">
        <tr>
          <td align="center" style="padding:10px 2px 10px;">
            <div style="font-family:${font};font-size:10px;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;color:${dowColor};">
              ${escapeHtml(d.dow)}
            </div>
            <div style="margin-top:2px;font-family:${font};font-size:14px;font-weight:700;color:${dateColor};">
              ${d.date}
            </div>
            ${tag}
          </td>
        </tr>
      </table>
    </td>`
}

// ── session row (listed below the grid) ───────────────────────
function sessionRow(d: WeeklyPlanDay) {
  if (!d.session) return ''
  const accent = d.isToday
    ? `background-color:${T.card};border-left:3px solid ${T.lime};`
    : `background-color:${T.card};`
  const dowColor = d.isToday ? T.lime : T.inkMute
  const dateColor = d.isToday ? T.lime : T.ink
  const metaBits: string[] = []
  if (d.session.exerciseCount) metaBits.push(`${d.session.exerciseCount} oefeningen`)
  if (d.session.durationMin) metaBits.push(`~ ${d.session.durationMin} min`)
  if (d.isToday) metaBits.push('vandaag')
  const meta = metaBits.join(' · ')

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${accent}border-radius:18px;margin-bottom:8px;">
      <tr>
        <td style="padding:16px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="52" valign="middle" style="padding-right:14px;">
                <div style="font-family:${font};font-size:10px;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;color:${dowColor};">${escapeHtml(d.dow)}</div>
                <div style="font-family:${font};font-size:20px;font-weight:700;color:${dateColor};line-height:1;margin-top:2px;">${d.date}</div>
              </td>
              <td valign="middle">
                <div style="font-family:${font};font-size:15px;font-weight:700;color:${T.ink};letter-spacing:-0.005em;">${escapeHtml(d.session.name)}</div>
                ${d.session.focus ? `<div style="font-family:${font};font-size:12px;color:${T.inkMute};margin-top:2px;">${escapeHtml(d.session.focus)}</div>` : ''}
                ${meta ? `<div style="font-family:${font};font-size:11px;color:${T.inkDim};margin-top:6px;">${meta}</div>` : ''}
              </td>
              <td width="16" valign="middle" align="right" style="font-family:${font};font-size:18px;color:${T.inkMute};">›</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`
}

// ── macro tile (4 per row) ────────────────────────────────────
function macroTile(color: string, name: string, value: string) {
  return `
    <td width="25%" valign="top" style="padding:4px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${T.cardSoft};border-radius:14px;">
        <tr>
          <td style="padding:12px 10px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding-right:6px;vertical-align:middle;">
                  <div style="width:8px;height:8px;border-radius:50%;background-color:${color};"></div>
                </td>
                <td style="font-family:${font};font-size:10px;letter-spacing:0.06em;text-transform:uppercase;color:${T.inkMute};font-weight:600;">${name}</td>
              </tr>
            </table>
            <div style="margin-top:8px;font-family:${font};font-size:18px;font-weight:700;color:${T.ink};letter-spacing:-0.01em;">${value}</div>
            <div style="margin-top:2px;font-family:${font};font-size:11px;color:${T.inkMute};">per dag</div>
          </td>
        </tr>
      </table>
    </td>`
}

// ── focus / commitment list row (on lime card) ────────────────
function focusItem(text: string, isFirst: boolean) {
  const border = isFirst ? 'none' : '1px solid rgba(10,14,11,0.14)'
  return `
    <tr>
      <td style="border-top:${border};padding:10px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="28" valign="top" style="padding-top:2px;">
              <div style="width:16px;height:16px;border:1.5px solid ${T.inkDark};border-radius:4px;"></div>
            </td>
            <td valign="top" style="font-family:${font};font-size:14px;line-height:1.45;color:${T.inkDark};font-weight:500;">
              ${text}
            </td>
          </tr>
        </table>
      </td>
    </tr>`
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── main render ───────────────────────────────────────────────
export function renderWeeklyPlan(p: WeeklyPlanParams): string {
  const sessionCount = p.days.filter((d) => d.session).length
  const heroHeadline =
    p.heroHeadline ??
    (sessionCount > 0
      ? `Nieuwe week. <span style="color:${T.lime};">${sessionCount} ${sessionCount === 1 ? 'sessie' : 'sessies'}.</span> Go.`
      : 'Nieuwe week. Rustweek. Go.')
  const heroIntro =
    p.heroIntro ??
    (sessionCount > 0
      ? 'Hier is wat er op je staat te wachten deze week. Open het plan en we lossen de rest samen op onderweg.'
      : 'Deze week staat er niks op je kalender. Gebruik de tijd voor rust of een actieve wandeling.')

  const content = `
    <div class="mv-body" style="padding:36px 28px 36px;">

      <!-- Top row: week pill -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="right" style="padding-bottom:18px;">
            <span style="display:inline-block;padding:6px 10px;border-radius:999px;background-color:${T.cardSoft};border:1px solid ${T.hair};font-family:${font};font-size:11px;font-weight:600;color:${T.inkMute};">
              Week ${p.weekNumber} · ${escapeHtml(p.dateRange)}
            </span>
          </td>
        </tr>
      </table>

      <!-- Hero -->
      <p style="margin:0 0 10px;font-family:${font};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${T.inkMute};font-weight:600;">
        Jouw plan voor deze week
      </p>
      <h1 class="mv-h1" style="margin:0 0 14px;font-family:${font};font-size:28px;font-weight:700;color:${T.ink};letter-spacing:-0.02em;line-height:1.15;">
        ${heroHeadline}
      </h1>
      <p style="margin:0 0 24px;font-family:${font};font-size:15px;color:${T.ink};opacity:0.72;line-height:1.55;">
        ${heroIntro}
      </p>

      <!-- Week strip -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${T.cardSoft};border-radius:20px;margin-bottom:16px;">
        <tr>
          <td style="padding:18px 14px 18px;">
            <div style="font-family:${font};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;color:${T.inkMute};padding:0 4px 12px;">
              Week in één blik
            </div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                ${p.days.map(dayCell).join('')}
              </tr>
            </table>
          </td>
        </tr>
      </table>

      ${sessionCount > 0 ? `
      <!-- Section label -->
      <div style="font-family:${font};font-size:12px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;color:${T.inkMute};padding:10px 4px 10px;">
        Je trainingsdagen
      </div>

      ${p.days.map(sessionRow).join('')}
      ` : ''}

      ${p.nutrition ? `
      <!-- Nutrition -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${T.card};border-radius:20px;margin-top:16px;margin-bottom:16px;">
        <tr>
          <td style="padding:20px 18px 18px;">
            <h3 style="margin:0 0 4px;padding:0 4px;font-family:${font};font-size:15px;font-weight:600;color:${T.ink};">
              Voedingsdoelen per dag
            </h3>
            <div style="padding:0 4px 14px;font-family:${font};font-size:12px;color:${T.inkMute};">
              Richtlijn · streef ernaar, forceer niet.
            </div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                ${macroTile(MACRO.calories, 'kcal', nf(p.nutrition.kcal))}
                ${macroTile(MACRO.protein, 'eiwit', `${p.nutrition.protein} g`)}
                ${macroTile(MACRO.carbs, 'kh', `${p.nutrition.carbs} g`)}
                ${macroTile(MACRO.fat, 'vet', `${p.nutrition.fat} g`)}
              </tr>
            </table>
          </td>
        </tr>
      </table>` : ''}

      ${p.focus && p.focus.items.length > 0 ? `
      <!-- Focus / commitment -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${T.lime};border-radius:20px;margin-bottom:16px;">
        <tr>
          <td style="padding:22px;">
            <div style="font-family:${font};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;color:${T.inkDark};opacity:0.65;">
              Focus deze week
            </div>
            <div style="margin:8px 0 14px;font-family:${font};font-size:20px;font-weight:700;color:${T.inkDark};line-height:1.25;letter-spacing:-0.01em;">
              ${escapeHtml(p.focus.title)}
            </div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              ${p.focus.items.map((item, i) => focusItem(item, i === 0)).join('')}
            </table>
          </td>
        </tr>
      </table>` : ''}

      ${p.coachNote ? `
      <!-- Coach note -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${T.card};border-radius:20px;margin-bottom:24px;">
        <tr>
          <td style="padding:20px 22px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="48" valign="top" style="padding-right:14px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr><td width="38" height="38" align="center" valign="middle" style="background-color:${T.lime};border-radius:19px;font-family:${font};font-size:14px;font-weight:700;color:${T.inkDark};">${escapeHtml(p.coachNote.initial)}</td></tr>
                  </table>
                </td>
                <td valign="top">
                  <div style="font-family:${font};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${T.inkMute};font-weight:600;margin-bottom:4px;">Mijn boodschap</div>
                  <div style="font-family:${font};font-size:14px;color:${T.ink};line-height:1.55;">"${escapeHtml(p.coachNote.message)}"</div>
                  <div style="font-family:${font};font-size:12px;color:${T.inkMute};margin-top:8px;">${escapeHtml(p.coachNote.coachName)}, je coach</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>` : ''}

      <!-- CTA -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding:8px 0 4px;">
            ${ctaButton(p.dashboardUrl, sessionCount > 0 ? 'Start met vandaag →' : 'Open dashboard →')}
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top:10px;font-family:${font};font-size:12px;color:${T.inkMute};">
            ${sessionCount > 0 ? 'Open je eerste sessie in de app, alles staat klaar.' : 'Bekijk je vooruitgang en planning in de app.'}
          </td>
        </tr>
      </table>
    </div>

    <!-- Sub-footer strip -->
    <div style="background-color:${T.card};padding:20px 28px;border-top:1px solid ${T.hair};">
      <p style="margin:0;font-family:${font};font-size:11px;color:${T.inkMute};line-height:1.6;text-align:center;">
        Deze mail krijg je elke maandag om 07:00.<br>
        ${p.settingsUrl ? `<a href="${p.settingsUrl}" style="color:${T.inkMute};text-decoration:underline;">Instellingen</a> · ` : ''}${p.unsubscribeUrl ? `<a href="${p.unsubscribeUrl}" style="color:${T.inkMute};text-decoration:underline;">Uitschrijven</a>` : ''}
      </p>
    </div>`

  return baseLayout(content, `${p.firstName}, je plan voor week ${p.weekNumber}`)
}
