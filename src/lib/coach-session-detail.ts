import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Sessie-detail fetcher (coach view).
 *
 * Voor /coach/clients/[id]/sessions/[sessionId] — laadt één workout-sessie
 * met alle sets per oefening, cliënt-identity en een vergelijking met de
 * vorige sessie van hetzelfde template_day.
 */

// ─── Types ──────────────────────────────────────────────────────

export interface SessionSet {
  id: string
  setNumber: number
  weightKg: number | null
  actualReps: number | null
  prescribedReps: number | null
  isWarmup: boolean
  isPr: boolean
  painFlag: boolean
  completed: boolean
}

export interface SessionExerciseBlock {
  exerciseId: string | null
  name: string
  sets: SessionSet[]
  topSetKg: number | null
  topSetReps: number | null
  volumeKg: number
  isPr: boolean
}

export interface SessionDetailClient {
  id: string
  fullName: string
  firstName: string
  avatarUrl: string | null
  initials: string
}

export interface SessionDetailCompare {
  priorSessionId: string | null
  priorDateLabel: string | null
  deltaVolumePct: number | null
  deltaVolumeLabel: 'up' | 'down' | 'flat' | null
  deltaTopWeightKg: number | null
  deltaTopWeightLabel: 'up' | 'down' | 'flat' | null
}

export interface SessionDetail {
  id: string
  clientId: string
  client: SessionDetailClient

  templateDayId: string | null
  templateDayName: string | null

  startedAt: string
  completedAt: string | null
  dateLabelLong: string      // "vrijdag 17 april"
  startTimeLabel: string     // "18:12"
  durationMin: number | null

  totalVolumeKg: number
  completedSets: number
  totalSets: number
  prCount: number
  hasPain: boolean

  moodRating: number | null
  difficultyRating: number | null
  feedbackText: string | null
  coachSeen: boolean

  exercises: SessionExerciseBlock[]

  compare: SessionDetailCompare | null
}

// ─── Helpers ────────────────────────────────────────────────────

const DAY_LABELS_LONG = [
  'maandag',
  'dinsdag',
  'woensdag',
  'donderdag',
  'vrijdag',
  'zaterdag',
  'zondag',
]

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return fullName.substring(0, 2).toUpperCase()
}

function formatLongDate(iso: string): string {
  const d = new Date(iso)
  const dayIdx = (d.getDay() + 6) % 7
  const dayName = DAY_LABELS_LONG[dayIdx]
  return `${dayName} ${d.getDate()} ${d.toLocaleDateString('nl-BE', {
    month: 'long',
  })}`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('nl-BE', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ────────────────────────────────────────────────────────────────

export async function fetchSessionDetail(
  sessionId: string,
  clientId: string
): Promise<SessionDetail | null> {
  const supabase = createAdminClient()

  // Phase 1 — session, sets, client profile in parallel
  const [{ data: sessionData }, { data: setsData }, { data: profileData }] =
    await Promise.all([
      supabase
        .from('workout_sessions')
        .select(
          'id, client_id, template_day_id, started_at, completed_at, duration_seconds, duration_minutes, mood_rating, difficulty_rating, feedback_text, coach_seen'
        )
        .eq('id', sessionId)
        .eq('client_id', clientId)
        .maybeSingle(),
      supabase
        .from('workout_sets')
        .select(
          'id, exercise_id, set_number, weight_kg, actual_reps, prescribed_reps, is_warmup, is_pr, pain_flag, completed'
        )
        .eq('workout_session_id', sessionId)
        .order('set_number', { ascending: true }),
      supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', clientId)
        .single(),
    ])

  if (!sessionData || !profileData) return null

  type SessionRow = {
    id: string
    client_id: string
    template_day_id: string | null
    started_at: string
    completed_at: string | null
    duration_seconds: number | null
    duration_minutes: number | null
    mood_rating: number | null
    difficulty_rating: number | null
    feedback_text: string | null
    coach_seen: boolean | null
  }
  type SetRow = {
    id: string
    exercise_id: string | null
    set_number: number
    weight_kg: number | null
    actual_reps: number | null
    prescribed_reps: number | null
    is_warmup: boolean | null
    is_pr: boolean | null
    pain_flag: boolean | null
    completed: boolean | null
  }
  type ProfileRow = {
    id: string
    full_name: string | null
    avatar_url: string | null
  }

  const session = sessionData as SessionRow
  const sets = (setsData || []) as SetRow[]
  const profile = profileData as ProfileRow

  // Phase 2 — template day name + exercise names + prior session (parallel)
  const exerciseIds = Array.from(
    new Set(sets.map((s) => s.exercise_id).filter((x): x is string => !!x))
  )

  const [
    { data: templateDayData },
    { data: exercisesData },
    { data: priorSessionData },
  ] = await Promise.all([
    session.template_day_id
      ? supabase
          .from('program_template_days')
          .select('id, name')
          .eq('id', session.template_day_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    exerciseIds.length > 0
      ? supabase.from('exercises').select('id, name, name_nl').in('id', exerciseIds)
      : Promise.resolve({ data: [] }),
    session.template_day_id
      ? supabase
          .from('workout_sessions')
          .select(
            'id, started_at, completed_at, duration_seconds, duration_minutes'
          )
          .eq('client_id', clientId)
          .eq('template_day_id', session.template_day_id)
          .not('completed_at', 'is', null)
          .lt('started_at', session.started_at)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  type ExerciseRow = { id: string; name: string | null; name_nl: string | null }
  type TemplateDayRow = { id: string; name: string | null }
  type PriorSessionRow = {
    id: string
    started_at: string
    completed_at: string | null
    duration_seconds: number | null
    duration_minutes: number | null
  }

  const exerciseNameById: Record<string, string> = {}
  for (const ex of ((exercisesData || []) as ExerciseRow[])) {
    exerciseNameById[ex.id] = ex.name_nl || ex.name || 'Oefening'
  }
  const templateDayName = (templateDayData as TemplateDayRow | null)?.name || null

  // ─── Group sets by exercise ──────────────────────────────────
  const blocksByExercise = new Map<string, SessionExerciseBlock>()
  for (const s of sets) {
    const key = s.exercise_id || '__unknown__'
    if (!blocksByExercise.has(key)) {
      blocksByExercise.set(key, {
        exerciseId: s.exercise_id,
        name: s.exercise_id
          ? exerciseNameById[s.exercise_id] || 'Oefening'
          : 'Oefening',
        sets: [],
        topSetKg: null,
        topSetReps: null,
        volumeKg: 0,
        isPr: false,
      })
    }
    const block = blocksByExercise.get(key)!
    const setObj: SessionSet = {
      id: s.id,
      setNumber: s.set_number,
      weightKg: s.weight_kg != null ? Number(s.weight_kg) : null,
      actualReps: s.actual_reps,
      prescribedReps: s.prescribed_reps,
      isWarmup: !!s.is_warmup,
      isPr: !!s.is_pr,
      painFlag: !!s.pain_flag,
      completed: s.completed !== false,
    }
    block.sets.push(setObj)
  }

  // Compute per-block aggregates
  for (const block of blocksByExercise.values()) {
    block.sets.sort((a, b) => a.setNumber - b.setNumber)
    for (const s of block.sets) {
      if (s.isWarmup || !s.completed) continue
      const w = s.weightKg || 0
      const r = s.actualReps || 0
      block.volumeKg += w * r
      if (s.isPr) block.isPr = true
      if (block.topSetKg == null || w > block.topSetKg) {
        block.topSetKg = w
        block.topSetReps = r
      }
    }
    block.volumeKg = Math.round(block.volumeKg)
  }

  const exercises = Array.from(blocksByExercise.values())

  // ─── Session totals ──────────────────────────────────────────
  const workingSets = sets.filter((s) => !s.is_warmup)
  const completedWorkingSets = workingSets.filter((s) => s.completed !== false)
  const totalVolumeKg = Math.round(
    completedWorkingSets.reduce(
      (sum, s) => sum + (Number(s.weight_kg) || 0) * (s.actual_reps || 0),
      0
    )
  )
  const prCount = sets.filter((s) => s.is_pr).length
  const hasPain = sets.some((s) => s.pain_flag === true)

  const durationMin =
    session.duration_minutes ??
    (session.duration_seconds ? Math.round(session.duration_seconds / 60) : null)

  // ─── Compare with prior session of same template day ────────
  let compare: SessionDetailCompare | null = null
  const priorRow = priorSessionData as PriorSessionRow | null
  if (priorRow) {
    const { data: priorSetsData } = await supabase
      .from('workout_sets')
      .select('weight_kg, actual_reps, is_warmup, completed')
      .eq('workout_session_id', priorRow.id)

    type PriorSetRow = {
      weight_kg: number | null
      actual_reps: number | null
      is_warmup: boolean | null
      completed: boolean | null
    }
    const priorSets = (priorSetsData || []) as PriorSetRow[]
    const priorCompleted = priorSets.filter(
      (s) => !s.is_warmup && s.completed !== false
    )
    const priorVolume = Math.round(
      priorCompleted.reduce(
        (sum, s) => sum + (Number(s.weight_kg) || 0) * (s.actual_reps || 0),
        0
      )
    )
    const priorTop = priorCompleted.reduce(
      (mx, s) => Math.max(mx, Number(s.weight_kg) || 0),
      0
    )
    const currentTop = completedWorkingSets.reduce(
      (mx, s) => Math.max(mx, Number(s.weight_kg) || 0),
      0
    )

    const deltaVolumePct =
      priorVolume > 0
        ? Math.round(((totalVolumeKg - priorVolume) / priorVolume) * 100)
        : null
    const deltaVolumeLabel: 'up' | 'down' | 'flat' | null =
      deltaVolumePct === null
        ? null
        : Math.abs(deltaVolumePct) < 2
        ? 'flat'
        : deltaVolumePct > 0
        ? 'up'
        : 'down'
    const deltaTopWeightKg = priorTop > 0 ? +(currentTop - priorTop).toFixed(1) : null
    const deltaTopWeightLabel: 'up' | 'down' | 'flat' | null =
      deltaTopWeightKg === null
        ? null
        : Math.abs(deltaTopWeightKg) < 0.5
        ? 'flat'
        : deltaTopWeightKg > 0
        ? 'up'
        : 'down'

    // Short "wo 10/4" label
    const d = new Date(priorRow.completed_at || priorRow.started_at)
    const dayShort = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'][(d.getDay() + 6) % 7]
    const priorDateLabel = `${dayShort} ${d.getDate()}/${d.getMonth() + 1}`

    compare = {
      priorSessionId: priorRow.id,
      priorDateLabel,
      deltaVolumePct,
      deltaVolumeLabel,
      deltaTopWeightKg,
      deltaTopWeightLabel,
    }
  }

  // ─── Client identity ─────────────────────────────────────────
  const fullName = profile.full_name || 'Onbekend'
  const client: SessionDetailClient = {
    id: profile.id,
    fullName,
    firstName: fullName.split(' ')[0],
    avatarUrl: profile.avatar_url || null,
    initials: getInitials(fullName),
  }

  return {
    id: session.id,
    clientId,
    client,
    templateDayId: session.template_day_id,
    templateDayName,
    startedAt: session.started_at,
    completedAt: session.completed_at,
    dateLabelLong: formatLongDate(session.completed_at || session.started_at),
    startTimeLabel: formatTime(session.started_at),
    durationMin,
    totalVolumeKg,
    completedSets: completedWorkingSets.length,
    totalSets: workingSets.length,
    prCount,
    hasPain,
    moodRating: session.mood_rating,
    difficultyRating: session.difficulty_rating,
    feedbackText: session.feedback_text,
    coachSeen: !!session.coach_seen,
    exercises,
    compare,
  }
}
