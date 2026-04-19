/**
 * One-off seed: voegt Cedric's 7-daagse split toe als coach program_template.
 *
 * Usage:
 *   npx tsx scripts/seed-cedric-workout-template.ts
 *
 * Template verschijnt daarna onder /coach/programs met de naam
 * "Cedric · week split — Template". Coach koppelt hem aan Cedric via
 * de "Toewijzen aan klant" knop op de template-kaart.
 *
 * Idempotent: als de template al bestaat wordt hij opnieuw opgebouwd
 * (days + exercises worden gewist en hersteld, template_id blijft hetzelfde).
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const TEMPLATE_NAME = 'Cedric · week split — Template'
const TEMPLATE_DESCRIPTION =
  'Zevendaagse split voor Cedric: Pull A / Push A / Conditioning + benen / Pull B / Push B, plus rustige loop (5 km) op zaterdag en zone-2 loop (12 km) op zondag. Kracht met rekker of dumbbells, conditioning met sprints en walking lunges, cardio op conversatietempo.'

/** Ensure a custom body-weight/band exercise exists; return its id. */
async function ensureCustomExercise(params: {
  name: string
  name_nl?: string
  body_part: string
  target_muscle: string
  equipment: string
  category: 'strength' | 'cardio' | 'mobility'
  coach_tips?: string
}): Promise<string> {
  const { data: existing } = await admin
    .from('exercises')
    .select('id')
    .ilike('name', params.name)
    .limit(1)
    .maybeSingle()

  if (existing?.id) return existing.id

  const { data: inserted, error } = await admin
    .from('exercises')
    .insert({
      name: params.name,
      name_nl: params.name_nl ?? params.name,
      body_part: params.body_part,
      target_muscle: params.target_muscle,
      equipment: params.equipment,
      category: params.category,
      is_custom: true,
      is_visible: true,
      coach_tips: params.coach_tips ?? null,
    })
    .select('id')
    .single()

  if (error || !inserted) {
    throw new Error(`Failed to create custom exercise "${params.name}": ${error?.message}`)
  }
  return inserted.id
}

/** Find an existing exercise by exact (case-insensitive) name; throws if missing. */
async function findExerciseId(name: string): Promise<string> {
  const { data } = await admin
    .from('exercises')
    .select('id')
    .ilike('name', name)
    .limit(1)
    .maybeSingle()
  if (!data?.id) {
    throw new Error(`Exercise not found in DB: "${name}"`)
  }
  return data.id
}

type ExerciseRow = {
  exerciseId: string
  sets: number
  repsMin: number
  repsMax: number | null
  restSeconds: number
  notes: string | null
}

type DayDef = {
  day_number: number
  name: string
  focus: string
  estimated_duration_min: number
  exercises: ExerciseRow[]
}

async function main() {
  console.log('→ Resolving / creating exercises…')

  // --- bestaande oefeningen (exacte namen uit DB) ---
  const EX_PULL_UP = await findExerciseId('pull-up')
  const EX_CHIN_UP = await findExerciseId('chin-up')
  const EX_PUSH_UP = await findExerciseId('push-up')
  const EX_TRICEP_DIP = await findExerciseId('Tricep Dip') // body weight
  const EX_DB_BICEPS_CURL = await findExerciseId('dumbbell biceps curl')
  const EX_DB_HAMMER_CURL = await findExerciseId('dumbbell hammer curl')
  const EX_DB_SHOULDER_PRESS = await findExerciseId('Dumbbell Shoulder Press')
  const EX_DB_LATERAL_RAISE = await findExerciseId('Dumbbell Lateral Raise')
  const EX_WALKING_LUNGE = await findExerciseId('walking lunge') // body weight variant
  const EX_STRAIGHT_ARM_PULLDOWN = await findExerciseId('Cable Straight Arm Pulldown')
  const EX_WIND_SPRINTS = await findExerciseId('wind sprints')

  // --- custom oefeningen als ze nog niet bestaan ---
  const EX_BAND_PULL_APART = await ensureCustomExercise({
    name: 'band pull-apart',
    name_nl: 'Band pull-apart',
    body_part: 'upper back',
    target_muscle: 'rear delts',
    equipment: 'band',
    category: 'strength',
    coach_tips:
      'Band op schouderhoogte, armen gestrekt. Trek uit elkaar en knijp schouderbladen samen. Vol bereik, geen momentum.',
  })

  const EX_BAND_PULLDOWN = await ensureCustomExercise({
    name: 'band pulldown',
    name_nl: 'Band pulldown',
    body_part: 'back',
    target_muscle: 'lats',
    equipment: 'band',
    category: 'strength',
    coach_tips:
      'Band hoog verankeren. Knielend of staand — ellebogen naar heupen trekken, lats actief, geen armen.',
  })

  const EX_BAND_OH_TRICEPS = await ensureCustomExercise({
    name: 'band overhead triceps extension',
    name_nl: 'Band overhead triceps extension',
    body_part: 'upper arms',
    target_muscle: 'triceps',
    equipment: 'band',
    category: 'strength',
    coach_tips:
      'Band onder één voet, handen boven hoofd. Ellebogen gefixeerd, alleen onderarmen bewegen. Volledige strekking.',
  })

  const EX_BAND_TRICEPS_PUSHDOWN = await ensureCustomExercise({
    name: 'band triceps pushdown',
    name_nl: 'Band triceps pushdown',
    body_part: 'upper arms',
    target_muscle: 'triceps',
    equipment: 'band',
    category: 'strength',
    coach_tips: 'Band op hoog punt. Ellebogen tegen het lichaam, onderarmen duwen naar beneden en knijp in eindpositie.',
  })

  const EX_OUTDOOR_RUN = await ensureCustomExercise({
    name: 'outdoor run',
    name_nl: 'Buiten lopen',
    body_part: 'cardio',
    target_muscle: 'cardiovascular',
    equipment: 'body weight',
    category: 'cardio',
    coach_tips:
      'Buiten of op treadmill. Tempo volgens notities (rustig / zone 2 / conversatietempo).',
  })

  console.log('✓ Exercises resolved\n')

  // --- dagen definiëren ---
  const days: DayDef[] = [
    {
      day_number: 1,
      name: 'Maandag — Pull A',
      focus: 'Pull A',
      estimated_duration_min: 60,
      exercises: [
        { exerciseId: EX_PULL_UP, sets: 5, repsMin: 4, repsMax: 8, restSeconds: 150, notes: null },
        { exerciseId: EX_CHIN_UP, sets: 3, repsMin: 6, repsMax: 10, restSeconds: 120, notes: 'Chin-ups of band-assisted pull-ups' },
        { exerciseId: EX_BAND_PULL_APART, sets: 4, repsMin: 20, repsMax: 30, restSeconds: 60, notes: null },
        { exerciseId: EX_DB_BICEPS_CURL, sets: 4, repsMin: 10, repsMax: 15, restSeconds: 75, notes: 'Met rekker of dumbbells' },
        { exerciseId: EX_DB_HAMMER_CURL, sets: 3, repsMin: 10, repsMax: 15, restSeconds: 75, notes: null },
      ],
    },
    {
      day_number: 2,
      name: 'Dinsdag — Push A',
      focus: 'Push A',
      estimated_duration_min: 60,
      exercises: [
        { exerciseId: EX_TRICEP_DIP, sets: 4, repsMin: 5, repsMax: 10, restSeconds: 120, notes: 'Dips — weighted indien mogelijk' },
        { exerciseId: EX_PUSH_UP, sets: 4, repsMin: 10, repsMax: 20, restSeconds: 90, notes: null },
        { exerciseId: EX_DB_SHOULDER_PRESS, sets: 4, repsMin: 8, repsMax: 15, restSeconds: 90, notes: 'Lichte gewichten of rekker' },
        { exerciseId: EX_DB_LATERAL_RAISE, sets: 4, repsMin: 15, repsMax: 25, restSeconds: 60, notes: null },
        { exerciseId: EX_BAND_OH_TRICEPS, sets: 3, repsMin: 12, repsMax: 20, restSeconds: 60, notes: 'Met rekker' },
      ],
    },
    {
      day_number: 3,
      name: 'Woensdag — Conditioning + benen',
      focus: 'Conditioning + benen',
      estimated_duration_min: 45,
      exercises: [
        { exerciseId: EX_WIND_SPRINTS, sets: 8, repsMin: 30, repsMax: 30, restSeconds: 60, notes: '6–10 sprints van 30 sec, volledige recovery tussen' },
        { exerciseId: EX_WALKING_LUNGE, sets: 5, repsMin: 12, repsMax: 20, restSeconds: 90, notes: '4–6 sets, 12–20 stappen per been' },
      ],
    },
    {
      day_number: 4,
      name: 'Donderdag — Pull B',
      focus: 'Pull B',
      estimated_duration_min: 60,
      exercises: [
        { exerciseId: EX_PULL_UP, sets: 4, repsMin: 4, repsMax: 8, restSeconds: 150, notes: null },
        { exerciseId: EX_CHIN_UP, sets: 3, repsMin: 6, repsMax: 10, restSeconds: 120, notes: null },
        { exerciseId: EX_BAND_PULLDOWN, sets: 3, repsMin: 12, repsMax: 20, restSeconds: 75, notes: 'Band pulldown of straight-arm pulldown' },
        { exerciseId: EX_BAND_PULL_APART, sets: 4, repsMin: 20, repsMax: 30, restSeconds: 60, notes: null },
        { exerciseId: EX_DB_BICEPS_CURL, sets: 3, repsMin: 10, repsMax: 15, restSeconds: 75, notes: null },
        { exerciseId: EX_DB_HAMMER_CURL, sets: 3, repsMin: 10, repsMax: 15, restSeconds: 75, notes: null },
      ],
    },
    {
      day_number: 5,
      name: 'Vrijdag — Push B',
      focus: 'Push B',
      estimated_duration_min: 60,
      exercises: [
        { exerciseId: EX_TRICEP_DIP, sets: 4, repsMin: 5, repsMax: 10, restSeconds: 120, notes: null },
        { exerciseId: EX_PUSH_UP, sets: 4, repsMin: 10, repsMax: 20, restSeconds: 90, notes: '3–4 sets' },
        { exerciseId: EX_DB_SHOULDER_PRESS, sets: 4, repsMin: 8, repsMax: 15, restSeconds: 90, notes: 'Lichte gewichten of rekker' },
        { exerciseId: EX_DB_LATERAL_RAISE, sets: 4, repsMin: 15, repsMax: 25, restSeconds: 60, notes: null },
        { exerciseId: EX_BAND_TRICEPS_PUSHDOWN, sets: 3, repsMin: 12, repsMax: 20, restSeconds: 60, notes: 'Triceps pushdowns of overhead extensions met rekker' },
      ],
    },
    {
      day_number: 6,
      name: 'Zaterdag — Run 5 km',
      focus: 'Run (rustig tot matig)',
      estimated_duration_min: 35,
      exercises: [
        { exerciseId: EX_OUTDOOR_RUN, sets: 1, repsMin: 5, repsMax: 5, restSeconds: 0, notes: '5 km — rustig tot matig tempo' },
      ],
    },
    {
      day_number: 7,
      name: 'Zondag — Run 12 km',
      focus: 'Long run (zone 2)',
      estimated_duration_min: 75,
      exercises: [
        { exerciseId: EX_OUTDOOR_RUN, sets: 1, repsMin: 12, repsMax: 12, restSeconds: 0, notes: '12 km — zone 2 / conversatietempo' },
      ],
    },
  ]

  console.log('→ Upserting program_template…')

  // Zoek bestaande template
  const { data: existingTpl } = await admin
    .from('program_templates')
    .select('id')
    .eq('name', TEMPLATE_NAME)
    .limit(1)
    .maybeSingle()

  let templateId: string

  if (existingTpl?.id) {
    templateId = existingTpl.id
    // Wis oude days (cascade wist exercises)
    await admin.from('program_template_days').delete().eq('template_id', templateId)
    // Update metadata
    await admin
      .from('program_templates')
      .update({
        description: TEMPLATE_DESCRIPTION,
        duration_weeks: 8,
        days_per_week: 7,
        difficulty: 'intermediate',
        tags: ['cedric', 'full week', 'running', 'band', 'bodyweight'],
        is_archived: false,
      })
      .eq('id', templateId)
    console.log(`✓ Existing template rebuilt (${templateId})`)
  } else {
    const { data: created, error: tplErr } = await admin
      .from('program_templates')
      .insert({
        name: TEMPLATE_NAME,
        description: TEMPLATE_DESCRIPTION,
        duration_weeks: 8,
        days_per_week: 7,
        difficulty: 'intermediate',
        tags: ['cedric', 'full week', 'running', 'band', 'bodyweight'],
        is_archived: false,
      })
      .select('id')
      .single()
    if (tplErr || !created) throw new Error(`Template insert failed: ${tplErr?.message}`)
    templateId = created.id
    console.log(`✓ Template created (${templateId})`)
  }

  console.log('→ Inserting days + exercises…\n')

  for (const day of days) {
    const { data: dayRow, error: dayErr } = await admin
      .from('program_template_days')
      .insert({
        template_id: templateId,
        day_number: day.day_number,
        name: day.name,
        focus: day.focus,
        estimated_duration_min: day.estimated_duration_min,
        sort_order: day.day_number - 1,
      })
      .select('id')
      .single()
    if (dayErr || !dayRow) throw new Error(`Day insert failed (${day.name}): ${dayErr?.message}`)

    for (let i = 0; i < day.exercises.length; i++) {
      const ex = day.exercises[i]
      const { error: exErr } = await admin.from('program_template_exercises').insert({
        template_day_id: dayRow.id,
        exercise_id: ex.exerciseId,
        sort_order: i,
        sets: ex.sets,
        reps_min: ex.repsMin,
        reps_max: ex.repsMax,
        rest_seconds: ex.restSeconds,
        notes: ex.notes,
      })
      if (exErr) {
        throw new Error(`Exercise insert failed (${day.name}, idx ${i}): ${exErr.message}`)
      }
    }

    console.log(`  ✓ ${day.name} — ${day.exercises.length} oefeningen`)
  }

  console.log(`\n✅ Template "${TEMPLATE_NAME}" klaar`)
  console.log(`   Template ID: ${templateId}`)
  console.log(`   Open /coach/programs om te zien of hij verschijnt en toe te wijzen aan Cedric.`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Seed failed:', err)
    process.exit(1)
  })
