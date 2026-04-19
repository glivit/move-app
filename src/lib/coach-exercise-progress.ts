import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Per-client per-exercise progress view.
 *
 * Voedt /coach/clients/[id]/exercises/[exId] met alles wat nodig is voor
 * het voortgangsscherm: naam, top-set, e1RM trend (top-set per sessie),
 * PR-historie, en volledige sets-per-sessie.
 *
 * De coach klikt door vanaf de Voortgang-tab om het verhaal achter een PR
 * te lezen — dus elke sessie krijgt een tappable link terug naar de
 * sessie-detail view.
 */

export interface ExerciseSessionPoint {
  sessionId: string
  dateIso: string
  dateLabel: string
  topKg: number | null
  topReps: number | null
  volume: number
  setCount: number
  durationMin: number | null
  sessionName: string | null
  hasPr: boolean
}

export interface ExercisePrPoint {
  id: string
  recordType: string
  value: number
  achievedAt: string
  dateLabel: string
  display: string
  /** relatie met sessie waarin de PR viel, indien match */
  sessionId: string | null
}

export interface ExerciseSetHistoryRow {
  sessionId: string
  sessionDateIso: string
  sessionDateLabel: string
  sessionName: string | null
  sets: Array<{
    setNumber: number
    weightKg: number | null
    actualReps: number | null
    isPr: boolean
    isWarmup: boolean
    completed: boolean
    painFlag: boolean
  }>
}

export interface ExerciseProgress {
  clientId: string
  clientName: string
  clientFirstName: string
  clientInitials: string
  clientAvatarUrl: string | null

  exerciseId: string
  exerciseName: string
  exerciseCategory: string | null
  bodyPart: string | null
  targetMuscle: string | null

  totalSessions: number
  totalSets: number
  bestSetKg: number | null
  bestSetReps: number | null
  bestSetDateIso: string | null
  latestKg: number | null
  latestReps: number | null
  latestDateIso: string | null

  deltaPct: number | null
  deltaLabel: 'up' | 'down' | 'flat' | null

  series: ExerciseSessionPoint[]
  prs: ExercisePrPoint[]
  recentSets: ExerciseSetHistoryRow[]
}

// ─── Helpers ────────────────────────────────────────────────────

function toDateIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const DAY_LABELS_SHORT = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']

function formatRelativeDayLabel(dateIso: string, todayIso: string): string {
  const d = new Date(dateIso + 'T00:00:00')
  const t = new Date(todayIso + 'T00:00:00')
  const diff = Math.round((t.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return 'vandaag'
  if (diff === 1) return 'gisteren'
  const dayIdx = (d.getDay() + 6) % 7
  const short = DAY_LABELS_SHORT[dayIdx].toLowerCase()
  return `${short} ${d.getDate()}/${d.getMonth() + 1}`
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return fullName.substring(0, 2).toUpperCase()
}

// ────────────────────────────────────────────────────────────────

export async function fetchExerciseProgress(
  clientId: string,
  exerciseId: string,
): Promise<ExerciseProgress | null> {
  const admin = createAdminClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayIso = toDateIso(today)
  const fourWeeksAgo = new Date(today)
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)
  const fourWIso = toDateIso(fourWeeksAgo)

  // Parallel Phase 1: profile + exercise + all sets for this client+exercise + PRs
  const [
    { data: profileData },
    { data: exerciseData },
    { data: setsData },
    { data: prsData },
  ] = await Promise.all([
    admin
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', clientId)
      .single(),
    admin
      .from('exercises')
      .select('id, name, name_nl, category, body_part, target_muscle')
      .eq('id', exerciseId)
      .single(),
    admin
      .from('workout_sets')
      .select(
        'id, workout_session_id, set_number, weight_kg, actual_reps, is_pr, is_warmup, completed, pain_flag, created_at',
      )
      .eq('exercise_id', exerciseId)
      .order('created_at', { ascending: true }),
    admin
      .from('personal_records')
      .select('id, record_type, value, achieved_at, workout_set_id')
      .eq('client_id', clientId)
      .eq('exercise_id', exerciseId)
      .order('achieved_at', { ascending: false })
      .limit(40),
  ])

  if (!profileData || !exerciseData) return null

  type ProfileRow = { id: string; full_name: string | null; avatar_url: string | null }
  type ExerciseRow = {
    id: string
    name: string | null
    name_nl: string | null
    category: string | null
    body_part: string | null
    target_muscle: string | null
  }
  type SetRow = {
    id: string
    workout_session_id: string
    set_number: number
    weight_kg: number | null
    actual_reps: number | null
    is_pr: boolean | null
    is_warmup: boolean | null
    completed: boolean | null
    pain_flag: boolean | null
    created_at: string
  }
  type PrRow = {
    id: string
    record_type: string
    value: number
    achieved_at: string
    workout_set_id: string | null
  }

  const profile = profileData as ProfileRow
  const exercise = exerciseData as ExerciseRow
  const allSets = (setsData || []) as SetRow[]
  const prs = (prsData || []) as PrRow[]

  // Only keep sets that belong to sessions of THIS client.
  // Sets don't carry client_id; join through session_id.
  const sessionIds = Array.from(new Set(allSets.map((s) => s.workout_session_id)))
  let sessions: Array<{
    id: string
    started_at: string
    completed_at: string | null
    duration_seconds: number | null
    duration_minutes: number | null
    template_day_id: string | null
    client_id: string
  }> = []
  if (sessionIds.length > 0) {
    const { data: sessionsData } = await admin
      .from('workout_sessions')
      .select('id, started_at, completed_at, duration_seconds, duration_minutes, template_day_id, client_id')
      .in('id', sessionIds)
      .eq('client_id', clientId)
    sessions = (sessionsData || []) as typeof sessions
  }
  const sessionsById = new Map(sessions.map((s) => [s.id, s]))

  // Template-day names (for session labels)
  const tdIds = Array.from(
    new Set(sessions.map((s) => s.template_day_id).filter((v): v is string => !!v)),
  )
  const tdNameById: Record<string, string> = {}
  if (tdIds.length > 0) {
    const { data: tdData } = await admin
      .from('program_template_days')
      .select('id, name')
      .in('id', tdIds)
    type TdRow = { id: string; name: string }
    for (const t of (tdData || []) as TdRow[]) tdNameById[t.id] = t.name
  }

  // Filter sets to just those whose session belongs to this client.
  const sets = allSets.filter((s) => sessionsById.has(s.workout_session_id))

  // Group sets by session
  const bySession = new Map<string, SetRow[]>()
  for (const s of sets) {
    if (!bySession.has(s.workout_session_id)) bySession.set(s.workout_session_id, [])
    bySession.get(s.workout_session_id)!.push(s)
  }

  // ─── Series (top-set per session) ────────────────────────────
  const series: ExerciseSessionPoint[] = []
  const sessionOrder = [...bySession.keys()].sort((a, b) => {
    const sa = sessionsById.get(a)
    const sb = sessionsById.get(b)
    const da = sa ? new Date(sa.started_at).getTime() : 0
    const db = sb ? new Date(sb.started_at).getTime() : 0
    return da - db
  })
  for (const sid of sessionOrder) {
    const session = sessionsById.get(sid)
    if (!session) continue
    const bucket = bySession.get(sid) || []
    const working = bucket.filter((x) => !x.is_warmup && x.completed)
    if (working.length === 0) continue
    const top = working.reduce(
      (best, s) => ((s.weight_kg || 0) > (best.weight_kg || 0) ? s : best),
      working[0],
    )
    const volume = working.reduce(
      (sum, x) => sum + (x.weight_kg || 0) * (x.actual_reps || 0),
      0,
    )
    const durationMin =
      session.duration_minutes ??
      (session.duration_seconds ? Math.round(session.duration_seconds / 60) : null)
    const dateIso = (session.completed_at || session.started_at).split('T')[0]
    series.push({
      sessionId: sid,
      dateIso,
      dateLabel: formatRelativeDayLabel(dateIso, todayIso),
      topKg: top.weight_kg != null ? Number(top.weight_kg) : null,
      topReps: top.actual_reps,
      volume: Math.round(volume),
      setCount: working.length,
      durationMin,
      sessionName: session.template_day_id ? tdNameById[session.template_day_id] || 'Training' : null,
      hasPr: bucket.some((s) => s.is_pr === true),
    })
  }

  // ─── Overall stats ───────────────────────────────────────────
  const totalSessions = series.length
  const totalSets = sets.filter((s) => !s.is_warmup).length
  let bestSetKg: number | null = null
  let bestSetReps: number | null = null
  let bestSetDateIso: string | null = null
  for (const p of series) {
    if (p.topKg != null && (bestSetKg == null || p.topKg > bestSetKg)) {
      bestSetKg = p.topKg
      bestSetReps = p.topReps
      bestSetDateIso = p.dateIso
    }
  }
  const latest = series[series.length - 1] || null
  const latestKg = latest?.topKg ?? null
  const latestReps = latest?.topReps ?? null
  const latestDateIso = latest?.dateIso ?? null

  // Delta vs 4-weeks-ago baseline
  let deltaPct: number | null = null
  let deltaLabel: 'up' | 'down' | 'flat' | null = null
  if (latestKg != null) {
    const baseline =
      [...series].reverse().find((p) => p.dateIso < fourWIso && p.topKg != null) ||
      series.find((p) => p.topKg != null)
    if (baseline && baseline.topKg != null && baseline.topKg > 0) {
      const pct = Math.round(((latestKg - baseline.topKg) / baseline.topKg) * 100)
      deltaPct = pct
      deltaLabel = Math.abs(pct) < 1 ? 'flat' : pct > 0 ? 'up' : 'down'
    }
  }

  // ─── PR points ───────────────────────────────────────────────
  // Map workout_set_id → workout_session_id voor klik-door naar sessie.
  const setIdToSessionId: Record<string, string> = {}
  for (const s of allSets) setIdToSessionId[s.id] = s.workout_session_id

  const prsTyped: ExercisePrPoint[] = prs.map((pr) => {
    const dateIso = pr.achieved_at.split('T')[0]
    let display = ''
    if (pr.record_type === 'weight' || pr.record_type === '1rm') {
      display = `${Math.round(Number(pr.value))} kg`
    } else if (pr.record_type === 'reps') {
      display = `${Math.round(Number(pr.value))} reps`
    } else if (pr.record_type === 'volume') {
      display = `${Math.round(Number(pr.value))} kg vol.`
    } else {
      display = `${Math.round(Number(pr.value))}`
    }
    const sessionId = pr.workout_set_id ? setIdToSessionId[pr.workout_set_id] || null : null
    // Alleen PRs behouden die bij deze client's sessies horen (extra guard).
    return {
      id: pr.id,
      recordType: pr.record_type,
      value: Number(pr.value),
      achievedAt: pr.achieved_at,
      dateLabel: formatRelativeDayLabel(dateIso, todayIso),
      display,
      sessionId,
    }
  })

  // ─── Recent sets (last 6 sessions, rendered grouped) ────────
  const recentSets: ExerciseSetHistoryRow[] = []
  const lastSessions = sessionOrder.slice(-6).reverse()
  for (const sid of lastSessions) {
    const session = sessionsById.get(sid)
    if (!session) continue
    const bucket = [...(bySession.get(sid) || [])].sort((a, b) => a.set_number - b.set_number)
    const dateIso = (session.completed_at || session.started_at).split('T')[0]
    recentSets.push({
      sessionId: sid,
      sessionDateIso: dateIso,
      sessionDateLabel: formatRelativeDayLabel(dateIso, todayIso),
      sessionName: session.template_day_id ? tdNameById[session.template_day_id] || 'Training' : null,
      sets: bucket.map((s) => ({
        setNumber: s.set_number,
        weightKg: s.weight_kg != null ? Number(s.weight_kg) : null,
        actualReps: s.actual_reps,
        isPr: !!s.is_pr,
        isWarmup: !!s.is_warmup,
        completed: !!s.completed,
        painFlag: !!s.pain_flag,
      })),
    })
  }

  const clientName = profile.full_name || 'Onbekend'
  const exerciseName = exercise.name_nl || exercise.name || 'Oefening'

  return {
    clientId,
    clientName,
    clientFirstName: clientName.split(' ')[0],
    clientInitials: getInitials(clientName),
    clientAvatarUrl: profile.avatar_url,

    exerciseId,
    exerciseName,
    exerciseCategory: exercise.category,
    bodyPart: exercise.body_part,
    targetMuscle: exercise.target_muscle,

    totalSessions,
    totalSets,
    bestSetKg,
    bestSetReps,
    bestSetDateIso,
    latestKg,
    latestReps,
    latestDateIso,

    deltaPct,
    deltaLabel,

    series,
    prs: prsTyped,
    recentSets,
  }
}
