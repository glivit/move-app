/**
 * Render the 3 transactional email templates to static HTML preview files
 * using the SAME template functions that Resend sends.
 *
 * Output:
 *   mockups/email-invite.html
 *   mockups/email-reset.html
 *   mockups/email-notification.html
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Stub env so email.ts module loads cleanly (it reads APP_URL at import time)
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.movestudio.be'
process.env.EMAIL_FROM = process.env.EMAIL_FROM || 'MŌVE <noreply@movestudio.be>'

import { inviteTemplate, resetTemplate, notificationTemplate } from '../src/lib/email'

const out = join(process.cwd(), 'mockups')

// 1. Invite
writeFileSync(
  join(out, 'email-invite.html'),
  inviteTemplate({
    firstName: 'Jan',
    clientName: 'Jan Tricot',
    inviteLink:
      'https://app.movestudio.be/auth/accept?token=kgj34k5jh3g4kj5h3g4kj5h3g4kj5h3g4',
    packageName: 'Premium Coaching (12 weken)',
  }),
  'utf-8',
)
console.log('✓ email-invite.html')

// 2. Password reset
writeFileSync(
  join(out, 'email-reset.html'),
  resetTemplate({
    firstName: 'Jan',
    resetLink:
      'https://app.movestudio.be/auth/reset?token=abc123def456ghi789jkl012mno345pq',
  }),
  'utf-8',
)
console.log('✓ email-reset.html')

// 3. Notification (video call reminder — realistic use case)
writeFileSync(
  join(out, 'email-notification.html'),
  notificationTemplate({
    preheader: 'Maandag 20 apr · 18:00 — we staan klaar voor je',
    heading: 'Tot straks, Jan',
    body:
      'Je maandelijkse video call met Glenn staat gepland voor <strong>maandag 20 april om 18:00</strong>. We bespreken je vooruitgang, eventuele drempels en het plan voor de komende 4 weken.',
    ctaText: 'Naar videocall',
    ctaUrl: 'https://app.movestudio.be/client/video/abc-123',
  }),
  'utf-8',
)
console.log('✓ email-notification.html')

console.log('\nPreviews written to mockups/')
