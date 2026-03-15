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

const FROM_EMAIL = process.env.EMAIL_FROM || 'MŌVE <noreply@move-knokke.be>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://move-knokke.be'

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
// EMAIL TEMPLATES — MŌVE branded
// ══════════════════════════════════════════════════════════

function baseLayout(content: string, preheader?: string) {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>MŌVE</title>
  ${preheader ? `<span style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</span>` : ''}
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F5F2ED;font-family:'Inter',Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F2ED;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <span style="font-family:'Inter',Arial,sans-serif;font-size:28px;font-weight:700;color:#1A1917;letter-spacing:0.02em;">MŌVE</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#FFFFFF;border-radius:20px;box-shadow:0 1px 3px rgba(0,0,0,0.04);overflow:hidden;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:32px;">
              <p style="margin:0;font-size:12px;color:#BAB8B3;line-height:1.5;">
                MŌVE — Personal Training Studio Knokke<br>
                <a href="${APP_URL}" style="color:#9B7B2E;text-decoration:none;">move-knokke.be</a>
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

function inviteTemplate(params: {
  firstName: string
  clientName: string
  inviteLink: string
  packageName: string
}) {
  const { firstName, inviteLink, packageName } = params

  const content = `
    <!-- Gold accent bar -->
    <div style="height:4px;background:linear-gradient(90deg,#C8A96E,#9B7B2E);"></div>

    <div style="padding:40px 36px;">
      <!-- Greeting -->
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:600;color:#1A1917;letter-spacing:-0.02em;">
        Welkom, ${firstName}
      </h1>
      <p style="margin:0 0 28px;font-size:15px;color:#9C9A95;line-height:1.5;">
        Je bent uitgenodigd voor MŌVE ${packageName}.
      </p>

      <!-- Info -->
      <p style="margin:0 0 28px;font-size:15px;color:#3A3835;line-height:1.7;">
        Je persoonlijke coaching-omgeving staat klaar. Activeer je account door een wachtwoord in te stellen — daarna kun je meteen aan de slag.
      </p>

      <!-- CTA Button -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding:4px 0 32px;">
            <a href="${inviteLink}" target="_blank" style="display:inline-block;background-color:#1A1917;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:14px;letter-spacing:-0.01em;">
              Account activeren
            </a>
          </td>
        </tr>
      </table>

      <!-- Divider -->
      <div style="height:1px;background-color:#F0F0ED;margin-bottom:24px;"></div>

      <!-- What to expect -->
      <p style="margin:0 0 16px;font-size:13px;font-weight:600;color:#1A1917;text-transform:uppercase;letter-spacing:0.08em;">
        Wat je kunt verwachten
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
        <tr>
          <td width="28" valign="top" style="padding-top:2px;">
            <span style="color:#C8A96E;font-size:14px;">●</span>
          </td>
          <td style="font-size:14px;color:#5C5A55;line-height:1.5;padding-bottom:12px;">
            Persoonlijk trainingsschema op maat
          </td>
        </tr>
        <tr>
          <td width="28" valign="top" style="padding-top:2px;">
            <span style="color:#C8A96E;font-size:14px;">●</span>
          </td>
          <td style="font-size:14px;color:#5C5A55;line-height:1.5;padding-bottom:12px;">
            Voedingsplan en macro-tracking
          </td>
        </tr>
        <tr>
          <td width="28" valign="top" style="padding-top:2px;">
            <span style="color:#C8A96E;font-size:14px;">●</span>
          </td>
          <td style="font-size:14px;color:#5C5A55;line-height:1.5;padding-bottom:12px;">
            Direct contact met je coach via chat
          </td>
        </tr>
        <tr>
          <td width="28" valign="top" style="padding-top:2px;">
            <span style="color:#C8A96E;font-size:14px;">●</span>
          </td>
          <td style="font-size:14px;color:#5C5A55;line-height:1.5;">
            Voortgang bijhouden met check-ins en foto's
          </td>
        </tr>
      </table>
    </div>

    <!-- Bottom strip -->
    <div style="background-color:#FAFAF8;padding:20px 36px;border-top:1px solid #F0F0ED;">
      <p style="margin:0;font-size:12px;color:#BAB8B3;line-height:1.5;">
        Werkt de knop niet? Kopieer deze link in je browser:<br>
        <a href="${inviteLink}" style="color:#9B7B2E;text-decoration:none;word-break:break-all;font-size:11px;">${inviteLink}</a>
      </p>
    </div>`

  return baseLayout(content, `${firstName}, je MŌVE account staat klaar`)
}

function resetTemplate(params: {
  firstName: string
  resetLink: string
}) {
  const { firstName, resetLink } = params

  const content = `
    <div style="padding:40px 36px;">
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:600;color:#1A1917;letter-spacing:-0.02em;">
        Wachtwoord resetten
      </h1>
      <p style="margin:0 0 28px;font-size:15px;color:#3A3835;line-height:1.7;">
        ${firstName ? `Hé ${firstName}, je` : 'Je'} hebt een wachtwoord reset aangevraagd. Klik hieronder om een nieuw wachtwoord in te stellen.
      </p>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding:4px 0 32px;">
            <a href="${resetLink}" target="_blank" style="display:inline-block;background-color:#1A1917;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:14px;">
              Nieuw wachtwoord instellen
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:0;font-size:13px;color:#9C9A95;line-height:1.5;">
        Heb je dit niet aangevraagd? Dan kun je deze email negeren. Je wachtwoord blijft ongewijzigd.
      </p>
    </div>

    <div style="background-color:#FAFAF8;padding:20px 36px;border-top:1px solid #F0F0ED;">
      <p style="margin:0;font-size:12px;color:#BAB8B3;line-height:1.5;">
        Werkt de knop niet? Kopieer deze link:<br>
        <a href="${resetLink}" style="color:#9B7B2E;text-decoration:none;word-break:break-all;font-size:11px;">${resetLink}</a>
      </p>
    </div>`

  return baseLayout(content, 'Stel een nieuw wachtwoord in voor MŌVE')
}

function notificationTemplate(params: {
  preheader?: string
  heading: string
  body: string
  ctaText?: string
  ctaUrl?: string
}) {
  const { preheader, heading, body, ctaText, ctaUrl } = params

  const ctaBlock = ctaText && ctaUrl ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:24px 0 8px;">
          <a href="${ctaUrl}" target="_blank" style="display:inline-block;background-color:#1A1917;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:14px;">
            ${ctaText}
          </a>
        </td>
      </tr>
    </table>` : ''

  const content = `
    <div style="padding:40px 36px;">
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#1A1917;letter-spacing:-0.02em;">
        ${heading}
      </h1>
      <p style="margin:0;font-size:15px;color:#3A3835;line-height:1.7;">
        ${body}
      </p>
      ${ctaBlock}
    </div>`

  return baseLayout(content, preheader)
}
