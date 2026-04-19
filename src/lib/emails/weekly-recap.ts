/**
 * Weekly recap e-mail template — MŌVE v3 Orion
 *
 * Rendered every Sunday at 20:00. Parametric — shares design tokens with
 * the core transactional templates in src/lib/email.ts so a token tweak
 * propagates to all mails.
 */
import { T, ctaButton, baseLayout } from '@/lib/email'

// ── Macro colours (lime for carbs is the app's canonical mapping) ──
const MACRO = {
  calories: '#E8A93C',
  protein: '#A4C7F2',
  carbs: '#C0FC01',
  fat: '#CBB0D6',
}

export type WeeklyRecapSession = {
  name: string       // "Push"
  day: string        // "ma"
  date: string       // "13/04"
  done: boolean
  meta?: string      // "6 oef · 52 min" or undefined if missed
}

export type WeeklyRecapParams = {
  firstName: string
  weekNumber: number
  dateRange: string                    // "13 – 19 apr"
  complianceScore: number              // 0-100
  complianceTrendPct: number           // +7 or -3
  heroIntro?: string                   // optional 1-sentence human intro
  workouts: {
    done: number
    planned: number
    sessions: WeeklyRecapSession[]
  }
  meals: { logged: number; planned: number }
  nutrition: {
    kcal: { actual: number; goal: number }
    protein: { actual: number; goal: number }
    carbs: { actual: number; goal: number }
    fat: { actual: number; goal: number }
  }
  weight?: {
    start: number
    end: number
    delta: number
    unit?: string
    onTrack?: boolean
  }
  highlight?: { title: string; body?: string }
  coachNote?: { message: string; coachName: string; initial: string }
  dashboardUrl: string
  unsubscribeUrl?: string
  settingsUrl?: string
}

const font = "'Inter',-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif"

function nf(n: number) {
  return new Intl.NumberFormat('nl-BE').format(n)
}

// Inline macro tile (used 4x in macro row)
function macroTile(opts: { color: string; name: string; value: string; goal: string }) {
  return `
    <td width="25%" valign="top" style="padding:4px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${T.cardSoft};border-radius:12px;">
        <tr>
          <td style="padding:12px 10px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding-right:6px;vertical-align:middle;">
                  <div style="width:8px;height:8px;border-radius:50%;background-color:${opts.color};"></div>
                </td>
                <td style="font-family:${font};font-size:10px;letter-spacing:0.06em;text-transform:uppercase;color:${T.inkMute};font-weight:600;">${opts.name}</td>
              </tr>
            </table>
            <div style="margin-top:6px;font-family:${font};font-size:18px;font-weight:700;color:${T.ink};letter-spacing:-0.01em;">${opts.value}</div>
            <div style="margin-top:2px;font-family:${font};font-size:11px;color:${T.inkMute};">doel ${opts.goal}</div>
          </td>
        </tr>
      </table>
    </td>`
}

function sessionRow(s: WeeklyRecapSession, isFirst: boolean) {
  const borderTop = isFirst ? 'none' : `1px solid ${T.hair}`
  const dotStyle = s.done
    ? `background-color:${T.lime};box-shadow:0 0 0 4px rgba(192,252,1,0.12);`
    : `background-color:#6B6E6C;`
  const meta = s.done
    ? `<span style="font-family:${font};font-size:12px;color:${T.inkMute};">${s.meta ?? ''}</span>`
    : `<span style="font-family:${font};font-size:12px;color:${T.inkDim};font-style:italic;">overgeslagen</span>`
  return `
    <tr>
      <td style="border-top:${borderTop};padding:12px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="22" valign="middle" style="padding-right:12px;">
              <div style="width:8px;height:8px;border-radius:50%;${dotStyle}"></div>
            </td>
            <td valign="middle" style="font-family:${font};font-size:14px;font-weight:600;color:${T.ink};">
              ${s.name} <span style="color:${T.inkMute};font-weight:500;font-size:12px;">· ${s.day} ${s.date}</span>
            </td>
            <td valign="middle" align="right">${meta}</td>
          </tr>
        </table>
      </td>
    </tr>`
}

export function renderWeeklyRecap(p: WeeklyRecapParams): string {
  const trendPrefix = p.complianceTrendPct >= 0 ? '+' : ''
  const workoutsPct = Math.round((p.workouts.done / p.workouts.planned) * 100)
  const mealsPct = Math.round((p.meals.logged / p.meals.planned) * 100)
  const heroIntro =
    p.heroIntro ??
    'Hier is hoe je week eruit zag. Eén cijfer om trots op te zijn vind je hieronder.'

  const content = `
    <div class="mv-body" style="padding:36px 28px 32px;">

      <!-- Top row: week pill -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="right" style="padding-bottom:20px;">
            <span style="display:inline-block;padding:6px 10px;border-radius:999px;background-color:${T.cardSoft};border:1px solid ${T.hair};font-family:${font};font-size:11px;font-weight:600;color:${T.inkMute};">
              Week ${p.weekNumber} · ${p.dateRange}
            </span>
          </td>
        </tr>
      </table>

      <!-- Hero -->
      <p style="margin:0 0 10px;font-family:${font};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${T.inkMute};font-weight:600;">
        Jouw week in beeld
      </p>
      <h1 class="mv-h1" style="margin:0 0 14px;font-family:${font};font-size:28px;font-weight:700;color:${T.ink};letter-spacing:-0.02em;line-height:1.15;">
        Week ${p.weekNumber} van ${p.firstName}.
      </h1>
      <p style="margin:0 0 24px;font-family:${font};font-size:15px;color:${T.ink};opacity:0.72;line-height:1.55;">
        ${heroIntro}
      </p>

      <!-- Compliance card -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${T.cardSoft};border-radius:18px;margin-bottom:14px;">
        <tr>
          <td style="padding:22px 22px 20px;">
            <p style="margin:0 0 6px;font-family:${font};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${T.inkMute};font-weight:600;">
              Consistentie deze week
            </p>
            <div style="font-family:${font};line-height:1;margin:4px 0 4px;">
              <span style="font-size:52px;font-weight:700;color:${T.lime};letter-spacing:-0.03em;">${p.complianceScore}</span>
              <span style="font-size:22px;font-weight:600;color:${T.ink};">%</span>
            </div>
            <p style="margin:0 0 18px;font-family:${font};font-size:13px;color:${T.inkMute};">
              <span style="color:${T.lime};font-weight:600;">${trendPrefix}${p.complianceTrendPct}%</span> vs vorige week
            </p>

            <!-- breakdown row -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="50%" valign="top" style="padding-right:5px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${T.card};border-radius:12px;">
                    <tr><td style="padding:14px;">
                      <div style="font-family:${font};font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:${T.inkMute};font-weight:600;">Trainingen</div>
                      <div style="font-family:${font};font-size:20px;font-weight:700;color:${T.ink};margin-top:4px;">${p.workouts.done} / ${p.workouts.planned}</div>
                      <div style="font-family:${font};font-size:12px;color:${T.inkMute};margin-top:2px;">${workoutsPct}% afgerond</div>
                      <!-- bar -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;">
                        <tr>
                          <td width="${workoutsPct}%" style="background-color:${T.lime};height:4px;line-height:4px;font-size:0;border-radius:999px;">&nbsp;</td>
                          <td style="background-color:#5a5d5b;height:4px;line-height:4px;font-size:0;">&nbsp;</td>
                        </tr>
                      </table>
                    </td></tr>
                  </table>
                </td>
                <td width="50%" valign="top" style="padding-left:5px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${T.card};border-radius:12px;">
                    <tr><td style="padding:14px;">
                      <div style="font-family:${font};font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:${T.inkMute};font-weight:600;">Maaltijden</div>
                      <div style="font-family:${font};font-size:20px;font-weight:700;color:${T.ink};margin-top:4px;">${p.meals.logged} / ${p.meals.planned}</div>
                      <div style="font-family:${font};font-size:12px;color:${T.inkMute};margin-top:2px;">${mealsPct}% gelogd</div>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;">
                        <tr>
                          <td width="${mealsPct}%" style="background-color:${MACRO.calories};height:4px;line-height:4px;font-size:0;border-radius:999px;">&nbsp;</td>
                          <td style="background-color:#5a5d5b;height:4px;line-height:4px;font-size:0;">&nbsp;</td>
                        </tr>
                      </table>
                    </td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Trainingen card -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${T.cardSoft};border-radius:18px;margin-bottom:14px;">
        <tr>
          <td style="padding:20px 22px;">
            <h3 style="margin:0 0 10px;font-family:${font};font-size:15px;font-weight:600;color:${T.ink};">
              Trainingen <span style="color:${T.inkMute};font-weight:500;">· ${p.workouts.done} van ${p.workouts.planned}</span>
            </h3>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              ${p.workouts.sessions.map((s, i) => sessionRow(s, i === 0)).join('')}
            </table>
          </td>
        </tr>
      </table>

      <!-- Voeding / macros card -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${T.cardSoft};border-radius:18px;margin-bottom:14px;">
        <tr>
          <td style="padding:20px 18px;">
            <h3 style="margin:0 0 14px;padding:0 4px;font-family:${font};font-size:15px;font-weight:600;color:${T.ink};">
              Voeding — gemiddeld per dag
            </h3>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                ${macroTile({ color: MACRO.calories, name: 'kcal', value: nf(p.nutrition.kcal.actual), goal: nf(p.nutrition.kcal.goal) })}
                ${macroTile({ color: MACRO.protein, name: 'eiwit', value: `${p.nutrition.protein.actual} g`, goal: `${p.nutrition.protein.goal} g` })}
                ${macroTile({ color: MACRO.carbs, name: 'kh', value: `${p.nutrition.carbs.actual} g`, goal: `${p.nutrition.carbs.goal} g` })}
                ${macroTile({ color: MACRO.fat, name: 'vet', value: `${p.nutrition.fat.actual} g`, goal: `${p.nutrition.fat.goal} g` })}
              </tr>
            </table>
          </td>
        </tr>
      </table>

      ${p.weight ? `
      <!-- Gewicht card -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${T.cardSoft};border-radius:18px;margin-bottom:14px;">
        <tr>
          <td style="padding:20px 22px;">
            <h3 style="margin:0 0 14px;font-family:${font};font-size:15px;font-weight:600;color:${T.ink};">Gewicht</h3>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td valign="top">
                  <div style="font-family:${font};font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:${T.inkMute};font-weight:600;margin-bottom:4px;">Start week</div>
                  <div style="font-family:${font};font-size:20px;font-weight:700;color:${T.ink};">${p.weight.start.toString().replace('.', ',')}<span style="color:${T.inkMute};font-weight:500;font-size:13px;margin-left:2px;"> ${p.weight.unit ?? 'kg'}</span></div>
                </td>
                <td align="right" valign="top">
                  <div style="font-family:${font};font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:${T.inkMute};font-weight:600;margin-bottom:4px;">Eind week</div>
                  <div style="font-family:${font};font-size:20px;font-weight:700;color:${T.ink};">${p.weight.end.toString().replace('.', ',')}<span style="color:${T.inkMute};font-weight:500;font-size:13px;margin-left:2px;"> ${p.weight.unit ?? 'kg'}</span></div>
                </td>
              </tr>
            </table>
            <div style="margin-top:14px;">
              <span style="display:inline-block;padding:6px 12px;border-radius:999px;background-color:rgba(192,252,1,0.14);color:${T.lime};font-family:${font};font-size:12px;font-weight:600;">
                ${p.weight.delta >= 0 ? '+' : '−'} ${Math.abs(p.weight.delta).toString().replace('.', ',')} ${p.weight.unit ?? 'kg'}${p.weight.onTrack ? '  ·  op koers' : ''}
              </span>
            </div>
          </td>
        </tr>
      </table>` : ''}

      ${p.highlight ? `
      <!-- Highlight -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${T.lime};border-radius:18px;margin-bottom:14px;">
        <tr>
          <td style="padding:22px;">
            <div style="font-family:${font};font-size:11px;letter-spacing:0.1em;text-transform:uppercase;font-weight:700;color:${T.inkDark};opacity:0.72;">
              Win van de week
            </div>
            <div style="margin:8px 0 6px;font-family:${font};font-size:17px;font-weight:700;color:${T.inkDark};line-height:1.35;letter-spacing:-0.01em;">
              ${p.highlight.title}
            </div>
            ${p.highlight.body ? `<div style="font-family:${font};font-size:13px;color:rgba(10,14,11,0.72);line-height:1.5;">${p.highlight.body}</div>` : ''}
          </td>
        </tr>
      </table>` : ''}

      ${p.coachNote ? `
      <!-- Coach note -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${T.cardSoft};border-radius:18px;margin-bottom:24px;">
        <tr>
          <td style="padding:20px 22px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="44" valign="top" style="padding-right:14px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr><td width="38" height="38" align="center" valign="middle" style="background-color:${T.lime};border-radius:19px;font-family:${font};font-size:14px;font-weight:700;color:${T.inkDark};">${p.coachNote.initial}</td></tr>
                  </table>
                </td>
                <td valign="top">
                  <div style="font-family:${font};font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:${T.inkMute};font-weight:600;margin-bottom:4px;">Focus volgende week</div>
                  <div style="font-family:${font};font-size:14px;color:${T.ink};line-height:1.55;">"${p.coachNote.message}"</div>
                  <div style="font-family:${font};font-size:12px;color:${T.inkMute};margin-top:8px;">— ${p.coachNote.coachName}, je coach</div>
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
            ${ctaButton(p.dashboardUrl, 'Open je dashboard →')}
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top:10px;font-family:${font};font-size:12px;color:${T.inkMute};">
            Volledig overzicht, grafieken en sessies per dag.
          </td>
        </tr>
      </table>
    </div>

    <!-- Sub-footer strip -->
    <div style="background-color:${T.card};padding:20px 28px;border-top:1px solid ${T.hair};">
      <p style="margin:0;font-family:${font};font-size:11px;color:${T.inkMute};line-height:1.6;text-align:center;">
        Deze mail krijg je elke zondag om 20:00.<br>
        ${p.settingsUrl ? `<a href="${p.settingsUrl}" style="color:${T.inkMute};text-decoration:underline;">Instellingen</a> · ` : ''}${p.unsubscribeUrl ? `<a href="${p.unsubscribeUrl}" style="color:${T.inkMute};text-decoration:underline;">Uitschrijven</a>` : ''}
      </p>
    </div>`

  return baseLayout(content, `${p.firstName}, je week: ${p.complianceScore}% consistentie`)
}
