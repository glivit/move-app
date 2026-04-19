/**
 * Stuur een test weekly-recap mail.
 *
 * Run: npx tsx scripts/send-test-recap.ts [optioneel: destinationEmail]
 * Default destination: glenndelille@gmail.com
 *
 * Vereist RESEND_API_KEY + EMAIL_FROM in .env.local
 */
import 'dotenv/config'
import { config } from 'dotenv'
config({ path: '.env.local' })

import { sendWeeklyRecapEmail } from '../src/lib/email'

const to = process.argv[2] ?? 'glenndelille@gmail.com'

async function main() {
  console.log(`→ Verzenden naar ${to}…`)

  const data = await sendWeeklyRecapEmail({
    to,
    recap: {
      firstName: 'Jan',
      weekNumber: 16,
      dateRange: '13 – 19 apr',
      complianceScore: 82,
      complianceTrendPct: 7,
      heroIntro:
        'Je zat dicht tegen je doelen aan op elk vlak. Eén leg day geskipt, geen drama. Eén cijfer om trots op te zijn vind je hieronder.',
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
      weight: {
        start: 82.4,
        end: 82.1,
        delta: -0.3,
        unit: 'kg',
        onTrack: true,
      },
      highlight: {
        title: '52 kg op de Chest Press · 3 reps meer dan vorige week.',
        body:
          'Dat is de derde week op rij progressie op deze oefening. Je bovenlichaam krijgt er stilaan vorm van.',
      },
      coachNote: {
        message:
          "Leg day doorzetten, ook als 'm korter moet. Liever 30 min dan helemaal skippen. Momentum is belangrijker dan perfectie.",
        coachName: 'Glenn',
        initial: 'G',
      },
      dashboardUrl: 'https://movestudio.be/dashboard',
      settingsUrl: 'https://movestudio.be/settings/notifications',
    },
  })

  console.log('✅ Verzonden — Resend id:', data?.id)
}

main().catch((e) => {
  console.error('❌ Mislukt:', e.message)
  process.exit(1)
})
