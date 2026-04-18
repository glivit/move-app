import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Data for the v3 Workout-editor — editing a single program template day.
 *
 * Returns the template + day header + ordered exercises with full prescription
 * state so the view can render the collapsed/expanded cards from the mockup.
 */

export interface WorkoutEditExercise {
  prescriptionId: string
  exerciseId: string
  name: string
  targetMuscle: string | null
  bodyPart: string | null
  sets: number
  repsMin: number
  repsMax: number | null
  restSeconds: number
  rpeTarget: number | null
  tempo: string | null
  weightKg: number | null
  weightLabel: string | null // raw weight_suggestion, for badge display
  notes: string | null
  sortOrder: number
  supersetGroupId: string | null
}

export interface WorkoutEditSiblingDay {
  id: string
  dayNumber: number
  name: string
  focus: string | null
}

export interface WorkoutEditData {
  template: {
    id: string
    name: string
    daysPerWeek: number | null
    durationWeeks: number | null
    difficulty: string | null
  }
  day: {
    id: string
    dayNumber: number
    name: string
    focus: string | null
    estimatedDurationMin: number | null
    subtitle: string
  }
  siblings: WorkoutEditSiblingDay[]
  exercises: WorkoutEditExercise[]
  totalSets: number
}

interface ExerciseRow {
  id: string
  name: string
  name_nl: string | null
  target_muscle: string | null
  body_part: string | null
}

interface PrescriptionRow {
  id: string
  exercise_id: string
  sets: number
  reps_min: number
  reps_max: number | null
  rest_seconds: number
  rpe_target: number | null
  tempo: string | null
  weight_suggestion: string | null
  notes: string | null
  sort_order: number
  superset_group_id: string | null
  exercises: ExerciseRow | ExerciseRow[] | null
}

interface TemplateDayRow {
  id: string
  template_id: string
  day_number: number
  name: string
  focus: string | null
  estimated_duration_min: number | null
  sort_order: number
}

interface TemplateRow {
  id: string
  name: string
  days_per_week: number | null
  duration_weeks: number | null
  difficulty: string | null
}

// ─── Helpers ────────────────────────────────────────────────────

const DAY_NAMES_NL: Record<number, string> = {
  1: 'Maandag',
  2: 'Dinsdag',
  3: 'Woensdag',
  4: 'Donderdag',
  5: 'Vrijdag',
  6: 'Zaterdag',
  7: 'Zondag',
}

export function dayNameNL(n: number): string {
  return DAY_NAMES_NL[n] || `Dag ${n}`
}

function parseWeightSuggestion(raw: string | null): number | null {
  if (!raw) return null
  const m = raw.match(/(\d+(?:[.,]\d+)?)/)
  if (!m) return null
  const num = parseFloat(m[1].replace(',', '.'))
  return isFinite(num) ? num : null
}

function difficultyLabel(diff: string | null): string | null {
  if (!diff) return null
  const map: Record<string, string> = {
    beginner: 'beginner',
    intermediate: 'gevorderd',
    advanced: 'expert',
    hypertrophy: 'hypertrofie',
    strength: 'kracht',
    cut: 'cut',
  }
  return map[diff.toLowerCase()] || diff.toLowerCase()
}

function buildSubtitle(day: TemplateDayRow, template: TemplateRow): string {
  const parts: string[] = [dayNameNL(day.day_number)]
  const diff = difficultyLabel(template.difficulty)
  if (diff) parts.push(diff)
  if (template.duration_weeks) parts.push(`${template.duration_weeks} wk programma`)
  else if (template.days_per_week) parts.push(`${template.days_per_week} dagen / week`)
  return parts.join(' · ')
}

// ─── Main fetcher ───────────────────────────────────────────────

export async function fetchCoachWorkoutEdit(
  templateId: string,
  dayId: string,
): Promise<WorkoutEditData | null> {
  const admin = createAdminClient()

  const [
    { data: templateData },
    { data: daysData },
    { data: exercisesData },
  ] = await Promise.all([
    admin
      .from('program_templates')
      .select('id, name, days_per_week, duration_weeks, difficulty')
      .eq('id', templateId)
      .single(),
    admin
      .from('program_template_days')
      .select('id, template_id, day_number, name, focus, estimated_duration_min, sort_order')
      .eq('template_id', templateId)
      .order('sort_order', { ascending: true }),
    admin
      .from('program_template_exercises')
      .select(
        `id, exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, tempo,
         weight_suggestion, notes, sort_order, superset_group_id,
         exercises (id, name, name_nl, target_muscle, body_part)`,
      )
      .eq('template_day_id', dayId)
      .order('sort_order', { ascending: true }),
  ])

  const template = templateData as TemplateRow | null
  const daysList = (daysData || []) as TemplateDayRow[]
  if (!template) return null

  const day = daysList.find((d) => d.id === dayId)
  if (!day) return null

  const siblings: WorkoutEditSiblingDay[] = daysList
    .filter((d) => d.id !== dayId)
    .map((d) => ({
      id: d.id,
      dayNumber: d.day_number,
      name: d.name,
      focus: d.focus,
    }))

  const prescriptions = (exercisesData || []) as PrescriptionRow[]
  const exercises: WorkoutEditExercise[] = prescriptions.map((p) => {
    const rawEx = p.exercises
    const ex = Array.isArray(rawEx) ? rawEx[0] : rawEx
    const weightKg = parseWeightSuggestion(p.weight_suggestion)
    return {
      prescriptionId: p.id,
      exerciseId: p.exercise_id,
      name: ex?.name_nl || ex?.name || 'Oefening',
      targetMuscle: ex?.target_muscle || null,
      bodyPart: ex?.body_part || null,
      sets: p.sets || 3,
      repsMin: p.reps_min || 8,
      repsMax: p.reps_max,
      restSeconds: p.rest_seconds || 90,
      rpeTarget: p.rpe_target,
      tempo: p.tempo,
      weightKg,
      weightLabel: p.weight_suggestion,
      notes: p.notes,
      sortOrder: p.sort_order || 0,
      supersetGroupId: p.superset_group_id,
    }
  })

  const totalSets = exercises.reduce((s, e) => s + (e.sets || 0), 0)

  return {
    template: {
      id: template.id,
      name: template.name,
      daysPerWeek: template.days_per_week,
      durationWeeks: template.duration_weeks,
      difficulty: template.difficulty,
    },
    day: {
      id: day.id,
      dayNumber: day.day_number,
      name: day.name,
      focus: day.focus,
      estimatedDurationMin: day.estimated_duration_min,
      subtitle: buildSubtitle(day, template),
    },
    siblings,
    exercises,
    totalSets,
  }
}
