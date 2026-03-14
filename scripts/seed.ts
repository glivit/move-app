/**
 * Seed script for MŌVE development data
 * Run: npx tsx scripts/seed.ts
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function seed() {
  console.log('🌱 Seeding MŌVE development data...\n')

  // 1. Create coach user
  console.log('Creating coach user...')
  const { data: coach, error: coachError } = await supabase.auth.admin.createUser({
    email: 'glenn@moveknokke.be',
    password: 'coach123456',
    email_confirm: true,
    user_metadata: { full_name: 'Glenn De Lille', role: 'coach' },
  })
  if (coachError && !coachError.message.includes('already been registered')) {
    console.error('Coach creation error:', coachError.message)
  }
  const coachId = coach?.user?.id
  if (coachId) {
    await supabase.from('profiles').update({ role: 'coach', full_name: 'Glenn De Lille', email: 'glenn@moveknokke.be' }).eq('id', coachId)
  }

  // 2. Create demo clients
  const clients = [
    { email: 'sophie@demo.be', full_name: 'Sophie Van Damme', phone: '+32 470 12 34 56', package: 'elite' as const, start_date: '2025-11-01' },
    { email: 'thomas@demo.be', full_name: 'Thomas Peeters', phone: '+32 470 23 45 67', package: 'performance' as const, start_date: '2025-12-15' },
    { email: 'laura@demo.be', full_name: 'Laura Janssens', phone: '+32 470 34 56 78', package: 'essential' as const, start_date: '2026-01-10' },
    { email: 'marc@demo.be', full_name: 'Marc Dubois', phone: '+32 470 45 67 89', package: 'performance' as const, start_date: '2026-02-01' },
    { email: 'ann@demo.be', full_name: 'Ann Willems', phone: '+32 470 56 78 90', package: 'elite' as const, start_date: '2025-10-01' },
  ]

  const clientIds: string[] = []

  for (const client of clients) {
    console.log(`Creating client: ${client.full_name}...`)
    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email: client.email,
      password: 'client123456',
      email_confirm: true,
      user_metadata: { full_name: client.full_name, role: 'client' },
    })
    if (error && !error.message.includes('already been registered')) {
      console.error(`  Error: ${error.message}`)
      continue
    }
    const userId = newUser?.user?.id
    if (userId) {
      clientIds.push(userId)
      await supabase.from('profiles').update({
        role: 'client',
        full_name: client.full_name,
        email: client.email,
        phone: client.phone,
        package: client.package,
        start_date: client.start_date,
      }).eq('id', userId)
    }
  }

  // 3. Create intake forms for first 3 clients
  for (let i = 0; i < Math.min(3, clientIds.length); i++) {
    console.log(`Creating intake form for client ${i + 1}...`)
    await supabase.from('intake_forms').insert({
      client_id: clientIds[i],
      primary_goal: ['Afvallen en tonen', 'Spiermassa opbouwen', 'Fitter worden'][i],
      secondary_goals: ['Meer energie', 'Beter slapen'],
      training_experience: ['Gevorderd', 'Beginner', 'Gemiddeld'][i],
      injuries_limitations: i === 0 ? 'Oude knieblessure links' : null,
      current_activity_level: ['3-4x per week', '1-2x per week', '2-3x per week'][i],
      preferred_training_days: ['Maandag', 'Woensdag', 'Vrijdag'],
      dietary_preferences: ['Geen specifieke voorkeur', 'Vegetarisch', 'Keto'][i],
      dietary_restrictions: i === 1 ? 'Lactose-intolerant' : null,
      sleep_hours_avg: [7, 6.5, 8][i],
      stress_level: [3, 5, 2][i],
      motivation_statement: [
        'Ik wil me weer goed voelen in mijn eigen lichaam.',
        'Ik wil sterker worden voor het wielrennen.',
        'Gezonder leven voor mijn gezin.',
      ][i],
      completed: true,
    })
  }

  // 4. Create check-in data (3 months of data for first 2 clients)
  const months = [
    { offset: -3, label: '3 months ago' },
    { offset: -2, label: '2 months ago' },
    { offset: -1, label: '1 month ago' },
    { offset: 0, label: 'this month' },
  ]

  for (let c = 0; c < Math.min(2, clientIds.length); c++) {
    const baseWeight = c === 0 ? 72 : 85
    const baseFat = c === 0 ? 28 : 22
    const baseMuscle = c === 0 ? 26 : 35

    for (let m = 0; m < months.length; m++) {
      const date = new Date()
      date.setMonth(date.getMonth() + months[m].offset)
      date.setDate(15) // mid-month

      console.log(`Creating check-in for client ${c + 1} (${months[m].label})...`)
      await supabase.from('checkins').insert({
        client_id: clientIds[c],
        date: date.toISOString().split('T')[0],
        weight_kg: +(baseWeight - m * 1.2 + (c * 0.5)).toFixed(1),
        body_fat_pct: +(baseFat - m * 0.8).toFixed(1),
        muscle_mass_kg: +(baseMuscle + m * 0.3).toFixed(1),
        visceral_fat_level: Math.max(1, 8 - m),
        body_water_pct: +(52 + m * 0.5).toFixed(1),
        bmi: +(24.5 - m * 0.3).toFixed(1),
        chest_cm: +(95 - m * 0.5).toFixed(1),
        waist_cm: +(82 - m * 1.5).toFixed(1),
        hips_cm: +(98 - m * 0.8).toFixed(1),
        left_arm_cm: +(31 + m * 0.2).toFixed(1),
        right_arm_cm: +(31.5 + m * 0.2).toFixed(1),
        left_thigh_cm: +(55 - m * 0.3).toFixed(1),
        right_thigh_cm: +(55.5 - m * 0.3).toFixed(1),
        left_calf_cm: +(37).toFixed(1),
        right_calf_cm: +(37.2).toFixed(1),
        coach_notes: m < months.length - 1 ? 'Mooi resultaat, blijf zo doorgaan!' : null,
        coach_reviewed: m < months.length - 1,
      })
    }
  }

  // 5. Create some prompts
  console.log('Creating weekly prompts...')
  await supabase.from('prompts').insert([
    {
      title: 'Wekelijkse check-in',
      question: 'Hoe was je week? Vertel me over je training, voeding en hoe je je voelt.',
      prompt_type: 'weekly_1',
      is_active: true,
      send_day: 5, // Friday
      send_time: '18:00',
    },
    {
      title: 'Weekendreflectie',
      question: 'Hoe was je weekend qua voeding en beweging? Iets waar je trots op bent?',
      prompt_type: 'weekly_2',
      is_active: true,
      send_day: 0, // Sunday
      send_time: '20:00',
    },
  ])

  // 6. Create some messages between coach and first client
  if (coachId && clientIds.length > 0) {
    console.log('Creating sample messages...')
    const now = new Date()
    const messages = [
      { sender_id: coachId, receiver_id: clientIds[0], content: 'Welkom bij MŌVE, Sophie! Ik kijk ernaar uit om samen te werken.', message_type: 'text' as const, created_at: new Date(now.getTime() - 86400000 * 7).toISOString() },
      { sender_id: clientIds[0], receiver_id: coachId, content: 'Bedankt Glenn! Ik heb er heel veel zin in.', message_type: 'text' as const, created_at: new Date(now.getTime() - 86400000 * 7 + 3600000).toISOString() },
      { sender_id: coachId, receiver_id: clientIds[0], content: 'Je eerste check-in ziet er geweldig uit. Je bent goed op weg!', message_type: 'text' as const, created_at: new Date(now.getTime() - 86400000 * 2).toISOString() },
      { sender_id: clientIds[0], receiver_id: coachId, content: 'Super, bedankt voor de feedback! Ik merk al verschil.', message_type: 'text' as const, created_at: new Date(now.getTime() - 86400000).toISOString() },
    ]
    await supabase.from('messages').insert(messages)
  }

  console.log('\n✅ Seed complete!')
  console.log(`\nLogin credentials:`)
  console.log(`  Coach:  glenn@moveknokke.be / coach123456`)
  console.log(`  Client: sophie@demo.be / client123456`)
  console.log(`  Client: thomas@demo.be / client123456`)
}

seed().catch(console.error)
