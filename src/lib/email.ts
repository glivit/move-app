/**
 * Email utilities for MŌVE — powered by Resend
 * Sends branded transactional emails from the MŌVE domain
 */
import { Resend } from 'resend'

let _resend: Resend | null = null

function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error('RESEND_API_KEY ontbreekt in environment variables')
    _resend = new Resend(key)
  }
  return _resend
}

const FROM_EMAIL = process.env.EMAIL_FROM || 'MŌVE <noreply@movestudio.be>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://movestudio.be'

/**
 * Send a branded invite email to a new client
 */
export async function sendInviteEmail(params: {
  to: string
  clientName: string
  inviteLink: string
  packageName: string
}) {
  const { to, clientName, inviteLink, packageName } = params
  const firstName = clientName.split(' ')[0]

  const { data, error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Welkom bij MŌVE, ${firstName}`,
    html: inviteTemplate({ firstName, clientName, inviteLink, packageName }),
  })

  if (error) {
    console.error('Resend invite error:', error)
    throw new Error(`Email verzenden mislukt: ${error.message}`)
  }

  return data
}

/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail(params: {
  to: string
  resetLink: string
  clientName?: string
}) {
  const { to, resetLink, clientName } = params
  const firstName = clientName?.split(' ')[0] || ''

  const { data, error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Wachtwoord resetten — MŌVE',
    html: resetTemplate({ firstName, resetLink }),
  })

  if (error) {
    console.error('Resend reset error:', error)
    throw new Error(`Email verzenden mislukt: ${error.message}`)
  }

  return data
}

/**
 * Send a generic notification email
 */
export async function sendNotificationEmail(params: {
  to: string
  subject: string
  preheader?: string
  heading: string
  body: string
  ctaText?: string
  ctaUrl?: string
}) {
  const { to, subject, preheader, heading, body, ctaText, ctaUrl } = params

  const { data, error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html: notificationTemplate({ preheader, heading, body, ctaText, ctaUrl }),
  })

  if (error) {
    console.error('Resend notification error:', error)
    throw new Error(`Email verzenden mislukt: ${error.message}`)
  }

  return data
}


// ══════════════════════════════════════════════════════════
// EMAIL TEMPLATES — MŌVE · v3 Orion
// Canvas #8E9890 · dark card #474B48 · ivory ink · lime accent
// ══════════════════════════════════════════════════════════

// Design tokens (solid hex for email-client safety)
const T = {
  canvas: '#8E9890',
  card: '#474B48',
  cardSoft: '#3E4240',
  ink: '#FDFDFE',
  inkMute: '#B5B8B6',
  inkDim: '#8A8C8B',
  hair: '#5A5D5B',
  lime: '#C0FC01',
  inkDark: '#0A0E0B',
}

// Primary CTA button — table-based for max client compatibility
function ctaButton(href: string, label: string) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
      <tr>
        <td align="center" style="background-color:${T.lime};border-radius:999px;">
          <a href="${href}" target="_blank" style="display:inline-block;padding:15px 32px;color:${T.inkDark};font-family:'Inter',-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:-0.005em;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`
}

// Fallback-link strip (shown at bottom when main button might not render)
function linkFallback(href: string, label = 'Werkt de knop niet? Kopieer deze link:') {
  return `
    <div style="background-color:${T.cardSoft};padding:18px 24px;border-top:1px solid ${T.hair};">
      <p style="margin:0;font-size:12px;color:${T.inkMute};line-height:1.55;font-family:'Inter',-apple-system,Helvetica,Arial,sans-serif;">
        ${label}<br>
        <a href="${href}" style="color:${T.lime};text-decoration:none;word-break:break-all;font-size:11px;">${href}</a>
      </p>
    </div>`
}

function baseLayout(content: string, preheader?: string) {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>MŌVE</title>
  ${preheader ? `<span style="display:none;font-size:1px;color:${T.canvas};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</span>` : ''}
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    @media (max-width: 480px) {
      .mv-body { padding: 28px 20px 32px !important; }
      .mv-wrap { border-radius: 18px !important; }
      .mv-h1 { font-size: 24px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${T.canvas};font-family:'Inter',-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${T.canvas};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

          <!-- Wordmark -->
          <tr>
            <td align="left" style="padding:0 8px 24px;">
              <span style="font-family:'Inter',-apple-system,Helvetica,Arial,sans-serif;font-size:18px;font-weight:700;color:${T.ink};letter-spacing:0.14em;">MŌVE</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td class="mv-wrap" style="background-color:${T.card};border-radius:22px;overflow:hidden;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px 8px 0;">
              <p style="margin:0;font-size:11px;color:${T.ink};opacity:0.55;line-height:1.6;font-family:'Inter',-apple-system,Helvetica,Arial,sans-serif;">
                MŌVE · Personal Training Studio<br>
                <a href="${APP_URL}" style="color:${T.ink};opacity:0.75;text-decoration:underline;text-underline-offset:2px;">movestudio.be</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function inviteTemplate(params: {
  firstName: string
  clientName: string
  inviteLink: string
  packageName: string
}) {
  const { firstName, inviteLink, packageName } = params

  const bullet = (text: string) => `
    <tr>
      <td width="22" valign="top" style="padding-top:8px;">
        <div style="width:8px;height:8px;border-radius:50%;background-color:${T.lime};"></div>
      </td>
      <td style="font-size:14px;color:${T.ink};opacity:0.88;line-height:1.55;padding:3px 0 12px;font-family:'Inter',-apple-system,Helvetica,Arial,sans-serif;">
        ${text}
      </td>
    </tr>`

  const content = `
    <div class="mv-body" style="padding:36px 28px 32px;">
      <!-- Kicker -->
      <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${T.inkMute};font-weight:600;font-family:'Inter',-apple-system,Helvetica,Arial,sans-serif;">
        Welkom bij MŌVE
      </p>

      <!-- Heading -->
      <h1 class="mv-h1" style="margin:0 0 14px;font-size:28px;font-weight:700;color:${T.ink};letter-spacing:-0.02em;line-height:1.15;font-family:'Inter',-apple-system,Helvetica,Arial,sans-serif;">
        Klaar wanneer jij bent, ${firstName}.
      </h1>
      <p style="margin:0 0 28px;font-size:15px;color:${T.ink};opacity:0.72;line-height:1.55;font-family:'Inter',-apple-system,Helvetica,Arial,sans-serif;">
        Je coaching-omgeving voor <strong style="color:${T.ink};opacity:1;">${packageName}</strong> staat klaar. Stel een wachtwoord in en we beginnen.
      </p>

      <!-- CTA -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding:4px 0 32px;">
            ${ctaButton(inviteLink, 'Account activeren →')}
          </td>
        </tr>
      </table>

      <!-- Divider -->
      <div style="height:1px;background-color:${T.hair};margin:0 0 24px;"></div>

      <!-- What to expect -->
      <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:${T.inkMute};text-transform:uppercase;letter-spacing:0.1em;font-family:'Inter',-apple-system,Helvetica,Arial,sans-serif;">
        Wat je kan verwachten
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${bullet('Persoonlijk trainingsschema op maat')}
        ${bullet('Voedingsplan met macro-tracking')}
        ${bullet('Direct contact met je coach via chat')}
        ${bullet("Voortgang bijhouden met check-ins en foto's")}
      </table>
    </div>

    ${linkFallback(inviteLink)}`

  return baseLayout(content, `${firstName}, je MŌVE account staat klaar`)
}

export function resetTemplate(params: {
  firstName: string
  resetLink: string
}) {
  const { firstName, resetLink } = params

  const content = `
    <div class="mv-body" style="padding:36px 28px 32px;">
      <!-- Kicker -->
      <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${T.inkMute};font-weight:600;font-family:'Inter',-apple-system,Helvetica,Arial,sans-serif;">
        Account
      </p>

      <h1 class="mv-h1" style="margin:0 0 14px;font-size:28px;font-weight:700;color:${T.ink};letter-spacing:-0.02em;line-height:1.15;font-family:'Inter',-apple-system,Helvetica,Arial,sans-serif;">
        Wachtwoord resetten
      </h1>
      <p style="margin:0 0 28px;font-size:15px;color:${T.ink};opacity:0.72;line-height:1.55;font-family:'Inter',-apple-system,Helvetica,Arial,sans-serif;">
        ${firstName ? `Hé ${firstName}, je` : 'Je'} hebt een wachtwoord reset aangevraagd. Klik hieronder om een nieuw wachtwoord in te stellen.
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding:4px 0 28px;">
            ${ctaButton(resetLink, 'Nieuw wachtwoord instellen →')}
          </td>
        </tr>
      </table>

      <div style="height:1px;background-color:${T.hair};margin:0 0 20px;"></div>

      <p style="margin:0;font-size:13px;color:${T.inkMute};line-height:1.55;font-family:'Inter',-apple-system,Helvetica,Arial,sans-serif;">
        Heb je dit niet aangevraagd? Dan kun je deze mail negeren — je wachtwoord blijft ongewijzigd.
      </p>
    </div>

    ${linkFallback(resetLink)}`

  return baseLayout(content, 'Stel een nieuw wachtwoord in voor MŌVE')
}

export function notificationTemplate(params: {
  preheader?: string
  heading: string
  body: string
  ctaText?: string
  ctaUrl?: string
}) {
  const { preheader, heading, body, ctaText, ctaUrl } = params

  const ctaBlock = ctaText && ctaUrl ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding:24px 0 4px;">
          ${ctaButton(ctaUrl, ctaText)}
        </td>
      </tr>
    </table>` : ''

  const content = `
    <div class="mv-body" style="padding:36px 28px 32px;">
      <h1 class="mv-h1" style="margin:0 0 14px;font-size:24px;font-weight:700;color:${T.ink};letter-spacing:-0.02em;line-height:1.2;font-family:'Inter',-apple-system,Helvetica,Arial,sans-serif;">
        ${heading}
      </h1>
      <p style="margin:0;font-size:15px;color:${T.ink};opacity:0.82;line-height:1.6;font-family:'Inter',-apple-system,Helvetica,Arial,sans-serif;">
        ${body}
      </p>
      ${ctaBlock}
    </div>`

  return baseLayout(content, preheader)
}
