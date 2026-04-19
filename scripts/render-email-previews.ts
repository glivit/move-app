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
import { renderWeeklyRecap } from '../src/lib/emails/weekly-recap'

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

// 4. Weekly recap (parametric render — identical to what sendWeeklyRecapEmail would dispatch)
writeFileSync(
  join(out, 'email-weekly-recap-rendered.html'),
  renderWeeklyRecap({
    firstName: 'Jan',
    weekNumber: 16,
    dateRange: '13 – 19 apr',
    complianceScore: 82,
    complianceTrendPct: 7,
    heroIntro:
      'Je zat dicht tegen je doelen aan op elk vlak. Eén beensdag geskipt — geen drama. Eén cijfer om trots op te zijn vind je hieronder.',
    workouts: {
      done: 3,
      planned: 4,
      sessions: [
        { name: 'Push', day: 'ma', date: '13/04', done: true, meta: '6 oef · 52 min' },
        { name: 'Pull', day: 'di', date: '14/04', done: true, meta: '6 oef · 58 min' },
        { name: 'Legs', day: 'do', date: '16/04', done: false },
        { name: 'Upper', day: 'vr', date: '17/04', done: true, meta: '6 oef · 47 min' },
      ],
    },
    meals: { logged: 17, planned: 21 },
    nutrition: {
      kcal: { actual: 2340, goal: 2500 },
      protein: { actual: 168, goal: 180 },
      carbs: { actual: 264, goal: 280 },
      fat: { actual: 75, goal: 80 },
    },
    weight: { start: 82.4, end: 82.1, delta: -0.3, unit: 'kg', onTrack: true },
    highlight: {
      title: '52 kg op de Chest Press — 3 reps meer dan vorige week.',
      body:
        'Dat is de derde week op rij progressie op deze oefening. Je bovenlichaam krijgt er stilaan vorm van.',
    },
    coachNote: {
      message:
        "Beensdag doorzetten, ook als 'm korter moet. Liever 30 min dan helemaal skippen — momentum is belangrijker dan perfectie.",
      coachName: 'Glenn',
      initial: 'G',
    },
    dashboardUrl: 'https://app.movestudio.be/dashboard',
    settingsUrl: 'https://app.movestudio.be/settings/notifications',
  }),
  'utf-8',
)
console.log('✓ email-weekly-recap-rendered.html')

console.log('\nPreviews written to mockups/')
