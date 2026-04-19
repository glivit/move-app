/**
 * One-off seed: Jan's PPL + Upper template (Matrix machines only).
 *
 * Usage:
 *   npx tsx scripts/seed-jan-matrix-template.ts
 *
 * Wat dit script doet:
 *   1. (Re)bouwt het program_template "Jan — PPL + Upper (Matrix machines)"
 *      met 4 dagen: Push, Pull, Legs, Upper
 *   2. Gebruikt Matrix Versa machines waar beschikbaar; valt terug op cable
 *      lateral raise (geen Matrix variant) waar niks past
 *   3. Respecteert user-edits: leg press weg bij Upper, glute focus weg bij
 *      Legs, kuiten weg bij Legs
 *   4. Deactiveert Jan's huidige actieve programma en wijst dit toe als
 *      nieuw actief programma met een standaard Ma/Di/Do/Vr schema
 *
 * Idempotent: template-ID blijft stabiel bij heruitvoeren; days + exercises
 * worden gewist en opnieuw opgebouwd. Bij heruitvoer wordt óók de bestaande
 * client_programs-toewijzing van dit template geüpdatet (in plaats van
 * gedupliceerd).
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

const JAN_ID = '92101c7c-b01b-4f62-a38c-d48d1f0cb3ad'
const TEMPLATE_NAME = 'Jan — PPL + Upper (Matrix machines)'
const TEMPLATE_DESCRIPTION =
  'Easy PPL + Upper split voor Jan, volledig op Matrix Versa-toestellen in zijn sportschool. 4 dagen per week: Push, Pull, Legs, Upper. Matrix-machines waar beschikbaar; cable lateral raise als enige niet-matrix exercise. Leg press, glute focus en kuiten zijn weggelaten op verzoek.'

/** Case-insensitive exact name lookup; throws if missing. */
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
  console.log('→ Resolving Matrix exercises…')

  // Primary Matrix Versa machines
  const EX_CHEST_PRESS = await findExerciseId(
    'Matrix Converging Chest Press (Versa VS-S13)'
  )
  const EX_PEC_FLY = await findExerciseId(
    'Matrix Rear Delt / Pec Fly (Versa VS-S22)'
  )
  const EX_REAR_DELT = await findExerciseId(
    'Matrix Rear Delt (Versa VS-S22 Reverse)'
  )
  const EX_SHOULDER_PRESS = await findExerciseId(
    'Matrix Converging Shoulder Press (Versa VS-S23)'
  )
  const EX_LAT_PULLDOWN = await findExerciseId(
    'Matrix Diverging Lat Pulldown (Versa VS-S33)'
  )
  const EX_SEATED_ROW = await findExerciseId(
    'Matrix Diverging Seated Row (Versa VS-S34)'
  )
  const EX_BICEPS_CURL = await findExerciseId(
    'Matrix Biceps Curl (Versa VS-S40)'
  )
  const EX_TRICEPS_PRESS = await findExerciseId(
    'Matrix Triceps Press (Versa VS-S42)'
  )
  const EX_LEG_PRESS = await findExerciseId(
    'Matrix Leg Press / Calf Press (Versa VS-S70)'
  )
  const EX_LEG_EXTENSION = await findExerciseId(
    'Matrix Leg Extension (Versa VS-S71)'
  )
  const EX_LEG_CURL = await findExerciseId(
    'Matrix Seated Leg Curl (Versa VS-S72)'
  )
  const EX_ABDOMINAL = await findExerciseId('Matrix Abdominal (Versa VS-S53)')

  // Non-Matrix fallback (geen Matrix lateral raise beschikbaar)
  const EX_CABLE_LATERAL_RAISE = await findExerciseId('Cable Lateral Raise')

  console.log('✓ Exercises resolved\n')

  // ─── Days ────────────────────────────────────────────────
  const days: DayDef[] = [
    {
      day_number: 1,
      name: 'Push',
      focus: 'Chest · Shoulders · Triceps',
      estimated_duration_min: 60,
      exercises: [
        {
          exerciseId: EX_CHEST_PRESS,
          sets: 4,
          repsMin: 6,
          repsMax: 10,
          restSeconds: 120,
          notes: 'Primary chest — zwaar',
        },
        {
          exerciseId: EX_CHEST_PRESS,
          sets: 3,
          repsMin: 8,
          repsMax: 12,
          restSeconds: 90,
          notes:
            '2e chest exposure — verstel zitting/hendelhoogte voor incline-effect',
        },
        {
          exerciseId: EX_SHOULDER_PRESS,
          sets: 3,
          repsMin: 8,
          repsMax: 12,
          restSeconds: 90,
          notes: null,
        },
        {
          exerciseId: EX_CABLE_LATERAL_RAISE,
          sets: 3,
          repsMin: 12,
          repsMax: 20,
          restSeconds: 60,
          notes: 'Geen Matrix lateral raise — cable station',
        },
        {
          exerciseId: EX_TRICEPS_PRESS,
          sets: 3,
          repsMin: 10,
          repsMax: 15,
          restSeconds: 60,
          notes: null,
        },
        {
          exerciseId: EX_PEC_FLY,
          sets: 2,
          repsMin: 12,
          repsMax: 15,
          restSeconds: 60,
          notes: 'Optioneel finisher — pec fly stand',
        },
      ],
    },
    {
      day_number: 2,
      name: 'Pull',
      focus: 'Back · Biceps · Rear delts',
      estimated_duration_min: 60,
      exercises: [
        {
          exerciseId: EX_LAT_PULLDOWN,
          sets: 4,
          repsMin: 6,
          repsMax: 10,
          restSeconds: 120,
          notes: null,
        },
        {
          exerciseId: EX_SEATED_ROW,
          sets: 4,
          repsMin: 8,
          repsMax: 12,
          restSeconds: 90,
          notes: null,
        },
        {
          exerciseId: EX_SEATED_ROW,
          sets: 3,
          repsMin: 8,
          repsMax: 12,
          restSeconds: 90,
          notes:
            '2e row exposure — borst tegen pad indien toestel dat toelaat (chest-supported stand)',
        },
        {
          exerciseId: EX_REAR_DELT,
          sets: 3,
          repsMin: 12,
          repsMax: 20,
          restSeconds: 60,
          notes: 'Reverse pec deck stand',
        },
        {
          exerciseId: EX_BICEPS_CURL,
          sets: 3,
          repsMin: 10,
          repsMax: 15,
          restSeconds: 60,
          notes: null,
        },
        {
          exerciseId: EX_BICEPS_CURL,
          sets: 2,
          repsMin: 10,
          repsMax: 15,
          restSeconds: 45,
          notes: 'Extra biceps — tempo controle (3 sec excentrisch)',
        },
      ],
    },
    {
      day_number: 3,
      name: 'Legs',
      focus: 'Quads · Hamstrings · Core',
      estimated_duration_min: 55,
      exercises: [
        {
          exerciseId: EX_LEG_PRESS,
          sets: 4,
          repsMin: 8,
          repsMax: 12,
          restSeconds: 150,
          notes: 'Horizontale beenpers — zwaar, volle ROM',
        },
        {
          exerciseId: EX_LEG_EXTENSION,
          sets: 3,
          repsMin: 10,
          repsMax: 15,
          restSeconds: 75,
          notes: null,
        },
        {
          exerciseId: EX_LEG_CURL,
          sets: 4,
          repsMin: 10,
          repsMax: 15,
          restSeconds: 90,
          notes: 'Matrix heeft seated leg curl (geen prone variant)',
        },
        {
          exerciseId: EX_ABDOMINAL,
          sets: 3,
          repsMin: 12,
          repsMax: 20,
          restSeconds: 60,
          notes: null,
        },
      ],
    },
    {
      day_number: 4,
      name: 'Upper',
      focus: 'Full upper body',
      estimated_duration_min: 50,
      exercises: [
        {
          exerciseId: EX_CHEST_PRESS,
          sets: 3,
          repsMin: 6,
          repsMax: 10,
          restSeconds: 120,
          notes: null,
        },
        {
          exerciseId: EX_LAT_PULLDOWN,
          sets: 3,
          repsMin: 6,
          repsMax: 10,
          restSeconds: 120,
          notes: null,
        },
        {
          exerciseId: EX_SEATED_ROW,
          sets: 3,
          repsMin: 8,
          repsMax: 12,
          restSeconds: 90,
          notes: null,
        },
        {
          exerciseId: EX_SHOULDER_PRESS,
          sets: 3,
          repsMin: 8,
          repsMax: 12,
          restSeconds: 90,
          notes: null,
        },
        {
          exerciseId: EX_BICEPS_CURL,
          sets: 2,
          repsMin: 10,
          repsMax: 15,
          restSeconds: 60,
          notes: null,
        },
        {
          exerciseId: EX_TRICEPS_PRESS,
          sets: 2,
          repsMin: 10,
          repsMax: 15,
          restSeconds: 60,
          notes: null,
        },
      ],
    },
  ]

  console.log('→ Upserting program_template…')

  const { data: existingTpl } = await admin
    .from('program_templates')
    .select('id')
    .eq('name', TEMPLATE_NAME)
    .limit(1)
    .maybeSingle()

  let templateId: string

  if (existingTpl?.id) {
    templateId = existingTpl.id
    await admin
      .from('program_template_days')
      .delete()
      .eq('template_id', templateId)
    await admin
      .from('program_templates')
      .update({
        description: TEMPLATE_DESCRIPTION,
        duration_weeks: 8,
        days_per_week: 4,
        difficulty: 'intermediate',
        tags: ['jan', 'matrix', 'ppl', 'upper', 'machines'],
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
        days_per_week: 4,
        difficulty: 'intermediate',
        tags: ['jan', 'matrix', 'ppl', 'upper', 'machines'],
        is_archived: false,
      })
      .select('id')
      .single()
    if (tplErr || !created)
      throw new Error(`Template insert failed: ${tplErr?.message}`)
    templateId = created.id
    console.log(`✓ Template created (${templateId})`)
  }

  console.log('→ Inserting days + exercises…\n')

  const dayIdByNumber: Record<number, string> = {}

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
    if (dayErr || !dayRow)
      throw new Error(`Day insert failed (${day.name}): ${dayErr?.message}`)

    dayIdByNumber[day.day_number] = dayRow.id

    for (let i = 0; i < day.exercises.length; i++) {
      const ex = day.exercises[i]
      const { error: exErr } = await admin
        .from('program_template_exercises')
        .insert({
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
        throw new Error(
          `Exercise insert failed (${day.name}, idx ${i}): ${exErr.message}`
        )
      }
    }

    console.log(
      `  ✓ ${day.name} — ${day.exercises.length} oefeningen (${day.estimated_duration_min} min)`
    )
  }

  console.log('\n→ Toewijzen aan Jan…')

  // Schedule: Ma=Push (1), Di=Pull (2), Do=Legs (4), Vr=Upper (5)
  const schedule = {
    '1': dayIdByNumber[1],
    '2': dayIdByNumber[2],
    '4': dayIdByNumber[3],
    '5': dayIdByNumber[4],
  }

  // Deactiveer bestaande actieve programma's voor Jan
  const { error: deactErr } = await admin
    .from('client_programs')
    .update({ is_active: false })
    .eq('client_id', JAN_ID)
    .eq('is_active', true)
  if (deactErr)
    throw new Error(`Deactivate existing failed: ${deactErr.message}`)

  // Start vandaag, einde na 8 weken
  const start = new Date()
  const end = new Date()
  end.setDate(end.getDate() + 8 * 7)
  const startDate = start.toISOString().split('T')[0]
  const endDate = end.toISOString().split('T')[0]

  // Zoek bestaande toewijzing van ditzelfde template (om duplicatie te vermijden)
  const { data: existingCp } = await admin
    .from('client_programs')
    .select('id')
    .eq('client_id', JAN_ID)
    .eq('template_id', templateId)
    .limit(1)
    .maybeSingle()

  if (existingCp?.id) {
    const { error: updErr } = await admin
      .from('client_programs')
      .update({
        name: TEMPLATE_NAME,
        start_date: startDate,
        end_date: endDate,
        current_week: 1,
        is_active: true,
        schedule,
      })
      .eq('id', existingCp.id)
    if (updErr)
      throw new Error(`Client program update failed: ${updErr.message}`)
    console.log(`✓ Bestaande toewijzing geüpdatet (${existingCp.id})`)
  } else {
    const { data: newCp, error: insErr } = await admin
      .from('client_programs')
      .insert({
        client_id: JAN_ID,
        template_id: templateId,
        name: TEMPLATE_NAME,
        start_date: startDate,
        end_date: endDate,
        current_week: 1,
        is_active: true,
        coach_notes: null,
        schedule,
      })
      .select('id')
      .single()
    if (insErr || !newCp)
      throw new Error(`Client program insert failed: ${insErr?.message}`)
    console.log(`✓ Nieuwe toewijzing aangemaakt (${newCp.id})`)
  }

  console.log(`\n✅ "${TEMPLATE_NAME}" klaar en actief voor Jan`)
  console.log(`   Template ID: ${templateId}`)
  console.log(`   Schedule: Ma=Push · Di=Pull · Do=Legs · Vr=Upper`)
  console.log(`   Coach-view: /coach/clients/${JAN_ID}/program`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Seed failed:', err)
    process.exit(1)
  })
