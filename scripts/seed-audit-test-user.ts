/**
 * Seed test data voor de audit test-user.
 * - Maakt program template "Audit · Push Pull (test data)" aan met 2 days
 * - Wijst toe als active program voor TEST_USER_EMAIL
 * - Schedule: Ma + Do (zodat altijd 1 day "vandaag of inhalen" is)
 *
 * Usage: npx tsx scripts/seed-audit-test-user.ts
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env.test') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'audit-test@move.app'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function findExerciseId(name: string): Promise<string> {
  const { data } = await admin
    .from('exercises')
    .select('id')
    .ilike('name', name)
    .limit(1)
    .maybeSingle()
  if (!data?.id) throw new Error(`Exercise not found: "${name}"`)
  return data.id
}

async function getUserIdByEmail(email: string): Promise<string> {
  const { data, error } = await admin.auth.admin.listUsers()
  if (error) throw error
  const u = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (!u) throw new Error(`User ${email} not found in auth — create via signup or Supabase dashboard first`)
  return u.id
}

async function ensureProfile(userId: string, email: string) {
  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()
  if (existing) return
  const { error } = await admin.from('profiles').insert({
    id: userId,
    email,
    full_name: 'Audit Test User',
    role: 'client',
    package: 'essential',
  })
  if (error) throw error
}

async function main() {
  console.log('→ Resolving test user…')
  const userId = await getUserIdByEmail(TEST_EMAIL)
  console.log('  user:', userId)

  await ensureProfile(userId, TEST_EMAIL)

  console.log('→ Resolving exercises…')
  // Use very common exercises that exist in any seed
  const candidates = [
    'Barbell Bench Press', 'Bench Press', 'Push-Up',
    'Pull-Up', 'Lat Pulldown', 'Barbell Row',
    'Squat', 'Barbell Squat', 'Deadlift',
  ]
  const found: string[] = []
  for (const name of candidates) {
    try {
      const id = await findExerciseId(name)
      found.push(id)
      console.log(`  ✓ ${name}`)
    } catch {
      console.log(`  ✗ ${name} (skipped)`)
    }
  }
  if (found.length < 4) {
    console.error(`Need at least 4 exercises, only found ${found.length}. Check exercises table.`)
    process.exit(1)
  }

  console.log('→ Building template…')
  const TEMPLATE_NAME = 'Audit · Push Pull (test data)'
  // Idempotent — drop existing (CASCADE drops days + exercises)
  const { data: existing } = await admin
    .from('program_templates')
    .select('id')
    .eq('name', TEMPLATE_NAME)
    .maybeSingle()
  if (existing) {
    await admin.from('program_templates').delete().eq('id', existing.id)
  }

  const { data: template, error: tplErr } = await admin
    .from('program_templates')
    .insert({
      name: TEMPLATE_NAME,
      description: 'Test template voor audit-doeleinden. Push + Pull dagen.',
      duration_weeks: 12,
      days_per_week: 4,
      difficulty: 'intermediate',
    })
    .select('id')
    .single()
  if (tplErr || !template) throw new Error(`Template insert failed: ${tplErr?.message}`)
  console.log('  template id:', template.id)

  // Day 1: Push
  const { data: day1, error: d1Err } = await admin
    .from('program_template_days')
    .insert({
      template_id: template.id,
      day_number: 1,
      name: 'Push',
      focus: 'chest, shoulders, triceps',
      estimated_duration_min: 55,
      sort_order: 1,
    })
    .select('id')
    .single()
  if (d1Err || !day1) throw new Error(`Day 1 insert failed: ${d1Err?.message}`)

  // Day 2: Pull
  const { data: day2, error: d2Err } = await admin
    .from('program_template_days')
    .insert({
      template_id: template.id,
      day_number: 2,
      name: 'Pull',
      focus: 'back, biceps',
      estimated_duration_min: 55,
      sort_order: 2,
    })
    .select('id')
    .single()
  if (d2Err || !day2) throw new Error(`Day 2 insert failed: ${d2Err?.message}`)

  console.log('→ Adding exercises to days…')
  // Push: first 2 exercises
  await admin.from('program_template_exercises').insert([
    {
      template_day_id: day1.id, exercise_id: found[0], sort_order: 1,
      sets: 4, reps_min: 6, reps_max: 10, rest_seconds: 120,
    },
    {
      template_day_id: day1.id, exercise_id: found[1], sort_order: 2,
      sets: 3, reps_min: 8, reps_max: 12, rest_seconds: 90,
    },
  ])
  // Pull: next 2 exercises
  await admin.from('program_template_exercises').insert([
    {
      template_day_id: day2.id, exercise_id: found[2] || found[0], sort_order: 1,
      sets: 4, reps_min: 6, reps_max: 10, rest_seconds: 120,
    },
    {
      template_day_id: day2.id, exercise_id: found[3] || found[1], sort_order: 2,
      sets: 3, reps_min: 8, reps_max: 12, rest_seconds: 90,
    },
  ])

  console.log('→ Deactivating existing programs for user…')
  await admin
    .from('client_programs')
    .update({ is_active: false })
    .eq('client_id', userId)
    .eq('is_active', true)

  console.log('→ Assigning template as active program…')
  const today = new Date()
  const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7) // 1 week ago
  const startDateStr = startDate.toISOString().slice(0, 10) // YYYY-MM-DD
  const { error: cpErr } = await admin.from('client_programs').insert({
    client_id: userId,
    template_id: template.id,
    name: TEMPLATE_NAME,
    start_date: startDateStr,
    is_active: true,
    current_week: 1,
  })
  if (cpErr) throw new Error(`client_programs insert failed: ${cpErr.message}`)

  console.log('✅ Done. Test user has active "Audit · Push Pull" program.')
  console.log(`   Template id: ${template.id}`)
  console.log(`   Day 1 (Push): ${day1.id}`)
  console.log(`   Day 2 (Pull): ${day2.id}`)
  console.log('')
  console.log(`To test active workout: navigate to /client/workout/active?dayId=${day1.id}&programId=${template.id}`)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
