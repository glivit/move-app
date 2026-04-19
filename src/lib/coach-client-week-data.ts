import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Per-client week timeline — the Phase 2 view.
 *
 * Returns one client's full 7-day timeline with everything the coach
 * needs at a glance for the v3 client-detail screen (Overzicht / Programma /
 * Voeding / Voortgang tabs). Pulls from workouts, nutrition, checkins, and PRs.
 */

// ─── Types ──────────────────────────────────────────────────────

export interface DaySession {
  id: string
  templateDayId: string | null
  templateDayName: string | null
  startedAt: string
  completedAt: string | null
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
}

export interface DayNutrition {
  caloriesLogged: number
  caloriesTarget: number
  proteinLogged: number
  proteinTarget: number
  mealsCompleted: number
  mealsPlanned: number
  mood: string | null
}

export type TimelineState =
  | 'done_planned'
  | 'done_moved'
  | 'done_bonus'
  | 'missed'
  | 'today_open'
  | 'upcoming'
  | 'rest'

export interface TimelineDay {
  dayNumber: number        // 1 = Mon .. 7 = Sun
  dateIso: string
  dayLabel: string         // "Maandag"
  dayLabelShort: string    // "Ma"
  dateLabel: string        // "14 apr"
  isToday: boolean
  isFuture: boolean
  state: TimelineState

  plannedDayName: string | null
  plannedDayId: string | null

  sessions: DaySession[]

  nutrition: DayNutrition | null
  nutritionPct: number     // 0-100

  movedFromDayName: string | null
}

export interface ActivityLogEntry {
  id: string
  kind: 'workout' | 'checkin' | 'meal' | 'message'
  state: 'done' | 'pending' | 'info' | 'missed'
  title: string
  sub: string | null
  timeLabel: string
  dateIso: string
}

export interface SessionLogEntry {
  id: string
  dateIso: string
  timeLabel: string
  title: string
  sub: string
  state: 'done' | 'missed'
}

export interface DayLogEntry {
  id: string
  dateIso: string
  title: string
  sub: string
  timeLabel: string
  state: 'done' | 'missed'
}

export interface LiftProgressEntry {
  name: string
  /** exerciseId for click-through to /coach/clients/[id]/exercises/[exId] */
  exerciseId: string | null
  latestKg: number | null
  deltaPct: number | null
  deltaLabel: 'up' | 'down' | 'flat' | null
  display: string
}

export interface PrEntry {
  id: string
  exerciseId: string
  exerciseName: string
  recordType: 'weight' | '1rm' | 'reps' | string
  value: number
  achievedAt: string
  dateLabel: string
  /** "120kg × 5" or "+2 reps" — formatted for display */
  display: string
}

export interface ClientWeekTimeline {
  clientId: string
  fullName: string
  firstName: string
  avatarUrl: string | null
  initials: string
  packageTier: string | null

  startDateIso: string | null
  startDateLabel: string | null

  /** Heeft de klant z'n intake afgerond? (profiles.intake_completed) */
  intakeCompleted: boolean
  /**
   * ISO-string van de laatste re-intake-vraag van de coach, of null.
   * Zolang niet-null: task op client-dashboard.
   */
  reintakeRequestedAt: string | null

  weekStartIso: string
  weekEndIso: string

  days: TimelineDay[]

  summary: {
    plannedCount: number
    doneCount: number
    missedCount: number
    totalVolumeKg: number
    totalDurationMin: number
    prCountWeek: number
    needingFeedback: number
  }

  recentMessages: Array<{
    id: string
    senderIsCoach: boolean
    content: string
    messageType: string
    fileUrl: string | null
    createdAt: string
  }>

  programInfo: {
    name: string
    frequencyLabel: string
    phaseLabel: string
    upcomingLabel: string | null
  } | null

  macroTarget: {
    kcal: number
    proteinG: number
    carbsG: number
    fatG: number
    goalLabel: string | null
  } | null

  todayNutrition: {
    loggedKcal: number
    targetKcal: number
    meals: Array<{
      id: string
      name: string
      kcal: number
      proteinG: number
      carbsG: number
      fatG: number
      timeLabel: string
    }>
  } | null

  dayLogs: DayLogEntry[]

  sessionLogs: SessionLogEntry[]

  activityLog: ActivityLogEntry[]

  bodyWeight: {
    latestKg: number | null
    deltaKg4w: number | null
    direction: 'up' | 'down' | 'flat' | null
    windowLabel: string
    series: number[]
  } | null

  liftsProgress: LiftProgressEntry[]

  topPRs: PrEntry[]

  measurements: {
    chestCm: number | null
    waistCm: number | null
    hipsCm: number | null
    armCm: number | null
    dateIso: string
    daysAgoLabel: string
  } | null

  photos: {
    urls: string[]
    count: number
    latestDateIso: string | null
    latestDateLabel: string | null
  } | null
}

// ─── Helpers ────────────────────────────────────────────────────

function getWeekStartDate(offsetWeeks = 0): Date {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1) + offsetWeeks * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

function toDateIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return fullName.substring(0, 2).toUpperCase()
}

const DAY_LABELS_LONG = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag']
const DAY_LABELS_SHORT = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']

/** "vandaag" / "gisteren" / "wo 15/4" */
function formatRelativeDayLabel(dateIso: string, todayIso: string): string {
  const d = new Date(dateIso + 'T00:00:00')
  const t = new Date(todayIso + 'T00:00:00')
  const diff = Math.round((t.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return 'vandaag'
  if (diff === 1) return 'gisteren'
  const dayIdx = (d.getDay() + 6) % 7   // 0 = Ma
  const short = DAY_LABELS_SHORT[dayIdx].toLowerCase()
  return `${short} ${d.getDate()}/${d.getMonth() + 1}`
}

function formatDayMonth(dateIso: string): string {
  const d = new Date(dateIso + 'T00:00:00')
  return d.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })
}

function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso + 'T00:00:00')
  const b = new Date(toIso + 'T00:00:00')
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

// ────────────────────────────────────────────────────────────────

export async function fetchClientWeekTimeline(
  clientId: string,
  coachId: string,
  weekOffset = 0
): Promise<ClientWeekTimeline | null> {
  const supabase = createAdminClient()

  const weekStart = getWeekStartDate(weekOffset)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)
  const weekStartIso = toDateIso(weekStart)
  const weekEndIso = toDateIso(new Date(weekEnd.getTime() - 1))

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayIso = toDateIso(today)

  const fourWeeksAgo = new Date(today)
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)

  // ─── Phase 1 — all independent queries in parallel ──────────
  const [
    { data: profileData },
    { data: programData },
    { data: templateDaysData },
    { data: sessionsData },
    { data: nutritionPlanData },
    { data: nutritionSummariesData },
    { data: messagesData },
    { data: allCheckinsData },
    { data: prsData },
    { data: olderSessionsData },
    { data: olderNutritionSummariesData },
    { data: todayNutritionLogsData },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select(
        'id, full_name, avatar_url, package, start_date, intake_completed, reintake_requested_at',
      )
      .eq('id', clientId)
      .single(),
    supabase
      .from('client_programs')
      .select('schedule, name, current_week, start_date, end_date, coach_notes, template_id')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('program_template_days')
      .select('id, name'),
    supabase
      .from('workout_sessions')
      .select(
        'id, template_day_id, started_at, completed_at, duration_seconds, mood_rating, difficulty_rating, feedback_text, coach_seen'
      )
      .eq('client_id', clientId)
      // OR op started_at óf completed_at binnen de week, zodat zowel
      // "begonnen maar niet afgemaakt" als "al eerder gestart, vandaag klaar"
      // sessies worden meegenomen. Zonder deze vangnet mistte de view sessies
      // die over een dag-grens heen minimized + afgerond werden.
      .or(
        `and(started_at.gte.${weekStart.toISOString()},started_at.lt.${weekEnd.toISOString()}),and(completed_at.gte.${weekStart.toISOString()},completed_at.lt.${weekEnd.toISOString()})`,
      )
      .order('started_at', { ascending: true }),
    supabase
      .from('nutrition_plans')
      .select('calories_target, protein_g, carbs_g, fat_g, title')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('nutrition_daily_summary')
      .select('date, total_calories, total_protein, meals_planned, meals_completed, mood')
      .eq('client_id', clientId)
      .gte('date', weekStartIso)
      .lte('date', weekEndIso),
    supabase
      .from('messages')
      .select('id, sender_id, receiver_id, content, message_type, file_url, created_at')
      .or(
        `and(sender_id.eq.${clientId},receiver_id.eq.${coachId}),and(sender_id.eq.${coachId},receiver_id.eq.${clientId})`
      )
      .order('created_at', { ascending: false })
      .limit(8),
    // Body metrics + photos (newest first, up to 12)
    supabase
      .from('checkins')
      .select(
        'id, date, weight_kg, chest_cm, waist_cm, hips_cm, left_arm_cm, right_arm_cm, photo_front_url, photo_back_url'
      )
      .eq('client_id', clientId)
      .order('date', { ascending: false })
      .limit(12),
    // PRs for the Voortgang tab (up to 50 for good coverage)
    supabase
      .from('personal_records')
      .select('id, exercise_id, record_type, value, achieved_at, exercises(name, name_nl)')
      .eq('client_id', clientId)
      .order('achieved_at', { ascending: false })
      .limit(50),
    // Older completed workout sessions (for the Sessie-logs list)
    supabase
      .from('workout_sessions')
      .select(
        'id, template_day_id, started_at, completed_at, duration_seconds'
      )
      .eq('client_id', clientId)
      .not('completed_at', 'is', null)
      .lt('started_at', weekStart.toISOString())
      .order('started_at', { ascending: false })
      .limit(8),
    // Older nutrition summaries (for the Dag-logs list)
    supabase
      .from('nutrition_daily_summary')
      .select('date, total_calories, total_protein, total_carbs, total_fat, meals_completed, meals_planned')
      .eq('client_id', clientId)
      .lt('date', weekStartIso)
      .order('date', { ascending: false })
      .limit(8),
    // Today's meal log
    supabase
      .from('nutrition_logs')
      .select('id, meal_id, meal_name, completed, foods_eaten, completed_at, created_at')
      .eq('client_id', clientId)
      .eq('date', todayIso)
      .order('created_at', { ascending: true }),
  ])

  if (!profileData) return null

  // ─── Types for rows ────────────────────────────────────────
  type ProfileRow = {
    id: string
    full_name: string | null
    avatar_url: string | null
    package: string | null
    start_date: string | null
  }
  type TemplateDayRow = { id: string; name: string }
  type SessionRow = {
    id: string
    template_day_id: string | null
    started_at: string
    completed_at: string | null
    duration_seconds: number | null
    mood_rating: number | null
    difficulty_rating: number | null
    feedback_text: string | null
    coach_seen: boolean | null
  }
  type OlderSessionRow = {
    id: string
    template_day_id: string | null
    started_at: string
    completed_at: string | null
    duration_seconds: number | null
  }
  type NutritionSummaryRow = {
    date: string
    total_calories: number | null
    total_protein: number | null
    total_carbs?: number | null
    total_fat?: number | null
    meals_planned: number | null
    meals_completed: number | null
    mood?: string | null
  }
  type MessageRow = {
    id: string
    sender_id: string
    receiver_id: string
    content: string
    message_type: string | null
    file_url: string | null
    created_at: string
  }
  type CheckinRow = {
    id: string
    date: string
    weight_kg: number | null
    chest_cm: number | null
    waist_cm: number | null
    hips_cm: number | null
    left_arm_cm: number | null
    right_arm_cm: number | null
    photo_front_url: string | null
    photo_back_url: string | null
  }
  type ExerciseJoin = { name: string | null; name_nl: string | null }
  type PrRow = {
    id: string
    exercise_id: string
    record_type: string
    value: number
    achieved_at: string
    exercises: ExerciseJoin | ExerciseJoin[] | null
  }
  type NutritionLogRow = {
    id: string
    meal_id: string
    meal_name: string
    completed: boolean | null
    foods_eaten: Array<{
      checked?: boolean
      grams?: number
      per100g?: { calories?: number; protein?: number; carbs?: number; fat?: number }
      calories?: number
      protein?: number
      carbs?: number
      fat?: number
    }> | null
    completed_at: string | null
    created_at: string
  }

  // ─── Unpack & destructure ──────────────────────────────────
  const profile = profileData as ProfileRow
  const programRow = programData as {
    schedule?: Record<string, string>
    name?: string | null
    current_week?: number | null
    start_date?: string | null
    end_date?: string | null
    coach_notes?: string | null
    template_id?: string | null
  } | null
  const rawSchedule = (programRow?.schedule || {}) as Record<string, string>
  const templateDays = (templateDaysData || []) as TemplateDayRow[]
  const sessions = (sessionsData || []) as SessionRow[]
  const nutritionPlan = nutritionPlanData as {
    calories_target: number | null
    protein_g: number | null
    carbs_g: number | null
    fat_g: number | null
    title: string | null
  } | null
  const nutritionSummaries = (nutritionSummariesData || []) as NutritionSummaryRow[]
  const messages = (messagesData || []) as MessageRow[]
  const allCheckins = (allCheckinsData || []) as CheckinRow[]
  const prs = (prsData || []) as PrRow[]
  const olderSessions = (olderSessionsData || []) as OlderSessionRow[]
  const olderNutritionSummaries = (olderNutritionSummariesData || []) as NutritionSummaryRow[]
  const todayNutritionLogs = (todayNutritionLogsData || []) as NutritionLogRow[]

  const dayNameMap: Record<string, string> = {}
  for (const td of templateDays) dayNameMap[td.id] = td.name

  // ─── Schedule resilience ────────────────────────────────────
  // client_programs.schedule kan in de praktijk corrupt zijn:
  //   - slot-waarde is de STRING naam ipv UUID (e.g. {"1":"Push"})
  //   - slot-waarde is een stale UUID (template_day deleted+replaced)
  // Vang dit af door te resolven via name-match binnen het actieve template.
  // Ook vereist voor Charles (2026-04-19: schedule["1"] = "Push" ipv UUID).
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const nameToIdInTemplate: Record<string, string> = {}
  // templateDays (all rows) heeft geen template_id in de select. Fetchen
  // we pas als er écht iets te resolven is — anders geen extra round-trip.
  let scheduleNeedsResolving = false
  for (const v of Object.values(rawSchedule)) {
    if (!v) continue
    if (!UUID_RE.test(v) || !dayNameMap[v]) {
      scheduleNeedsResolving = true
      break
    }
  }
  const schedule: Record<string, string> = { ...rawSchedule }
  if (scheduleNeedsResolving && programRow?.template_id) {
    const { data: tdRowsForTemplate } = await supabase
      .from('program_template_days')
      .select('id, name')
      .eq('template_id', programRow.template_id)
    type TdrowForTemplate = { id: string; name: string }
    for (const td of (tdRowsForTemplate || []) as TdrowForTemplate[]) {
      nameToIdInTemplate[String(td.name).toLowerCase()] = td.id
      // Zorg dat dayNameMap ook de canonieke naam kent (voor rendering).
      if (!dayNameMap[td.id]) dayNameMap[td.id] = td.name
    }
    for (const [dow, val] of Object.entries(rawSchedule)) {
      if (!val) continue
      if (UUID_RE.test(val) && dayNameMap[val]) continue // al geldig
      const resolved = nameToIdInTemplate[String(val).toLowerCase()]
      if (resolved) schedule[dow] = resolved
      // anders: laat staan — state-logic valt terug op 'rest' voor deze slot
    }
  }

  // ─── Sets-per-session for this week ─────────────────────────
  let setsById: Record<
    string,
    {
      completedSets: number
      totalSets: number
      volume: number
      prCount: number
      hasPain: boolean
      topByExercise: Record<string, { weight: number; reps: number; exerciseId: string | null }>
    }
  > = {}

  // Combined session IDs (this week + older) so Sessie-logs get stat-lines too
  const allSessionIds = [
    ...sessions.map((s) => s.id),
    ...olderSessions.map((s) => s.id),
  ]

  if (allSessionIds.length > 0) {
    const { data: setsData } = await supabase
      .from('workout_sets')
      .select(
        'workout_session_id, exercise_id, weight_kg, actual_reps, completed, is_pr, is_warmup, pain_flag'
      )
      .in('workout_session_id', allSessionIds)

    type SetRow = {
      workout_session_id: string
      exercise_id: string | null
      weight_kg: number | null
      actual_reps: number | null
      completed: boolean | null
      is_pr: boolean | null
      is_warmup: boolean | null
      pain_flag: boolean | null
    }
    const sets = (setsData || []) as SetRow[]

    setsById = allSessionIds.reduce((acc, id) => {
      const bucket = sets.filter((s) => s.workout_session_id === id)
      const completed = bucket.filter((s) => s.completed && !s.is_warmup)
      const volume = completed.reduce(
        (sum, s) => sum + (s.weight_kg || 0) * (s.actual_reps || 0),
        0
      )
      const prCount = bucket.filter((s) => s.is_pr).length
      const hasPain = bucket.some((s) => s.pain_flag === true)

      const topByExercise: Record<string, { weight: number; reps: number; exerciseId: string | null }> = {}
      for (const s of completed) {
        const eid = s.exercise_id || '__unknown__'
        const w = s.weight_kg || 0
        const r = s.actual_reps || 0
        if (!topByExercise[eid] || w > topByExercise[eid].weight) {
          topByExercise[eid] = { weight: w, reps: r, exerciseId: s.exercise_id }
        }
      }

      acc[id] = {
        completedSets: completed.length,
        totalSets: bucket.filter((s) => !s.is_warmup).length,
        volume,
        prCount,
        hasPain,
        topByExercise,
      }
      return acc
    }, {} as typeof setsById)
  }

  // ─── Exercise-name map (for top-set rendering) ───────────────
  const exerciseNameById: Record<string, string> = {}
  {
    const allExerciseIds = new Set<string>()
    for (const sid of allSessionIds) {
      const bucket = setsById[sid]
      if (!bucket) continue
      for (const eid of Object.keys(bucket.topByExercise)) {
        if (eid !== '__unknown__') allExerciseIds.add(eid)
      }
    }
    if (allExerciseIds.size > 0) {
      const { data: exercisesData } = await supabase
        .from('exercises')
        .select('id, name, name_nl')
        .in('id', Array.from(allExerciseIds))
      type ExRow = { id: string; name: string | null; name_nl: string | null }
      const exList = (exercisesData || []) as ExRow[]
      for (const e of exList) {
        exerciseNameById[e.id] = e.name_nl || e.name || 'Oefening'
      }
    }
  }

  // ─── State detection helpers ────────────────────────────────
  const completedTemplateIds = new Set(
    sessions
      .filter((s) => s.completed_at && s.template_day_id)
      .map((s) => s.template_day_id as string)
  )
  const scheduledIdToDow = new Map<string, number>()
  for (const [dow, tid] of Object.entries(schedule)) {
    if (tid) scheduledIdToDow.set(tid, Number(dow))
  }

  // ─── Build 7 days ───────────────────────────────────────────
  const days: TimelineDay[] = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + i)
    const dateIso = toDateIso(date)
    const dayNumber = i + 1

    const isToday = dateIso === todayIso
    const isFuture = dateIso > todayIso

    const plannedDayId = schedule[String(dayNumber)] || null
    const plannedDayName = plannedDayId ? dayNameMap[plannedDayId] || 'Training' : null

    const dayStart = new Date(dateIso + 'T00:00:00')
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)
    const daySessions = sessions.filter((s) => {
      // Anchor op completed_at zodat een sessie thuishoort bij de dag van
      // afronden, niet die van starten. Zombies die eergisteren gestart
      // werden maar vandaag voltooid zijn vallen zo terecht op vandaag.
      if (!s.completed_at) return false
      const t = new Date(s.completed_at)
      return t >= dayStart && t < dayEnd
    })

    const sessionObjs: DaySession[] = daySessions.map((s) => {
      const stats = setsById[s.id] || {
        completedSets: 0,
        totalSets: 0,
        volume: 0,
        prCount: 0,
        hasPain: false,
        topByExercise: {},
      }
      const durationMin =
        s.duration_seconds ? Math.round(s.duration_seconds / 60) : null
      return {
        id: s.id,
        templateDayId: s.template_day_id,
        templateDayName: s.template_day_id ? dayNameMap[s.template_day_id] || 'Training' : null,
        startedAt: s.started_at,
        completedAt: s.completed_at,
        durationMin,
        totalVolumeKg: Math.round(stats.volume),
        completedSets: stats.completedSets,
        totalSets: stats.totalSets,
        prCount: stats.prCount,
        hasPain: stats.hasPain,
        moodRating: s.mood_rating,
        difficultyRating: s.difficulty_rating,
        feedbackText: s.feedback_text,
        coachSeen: !!s.coach_seen,
      }
    })

    // Compute state
    let state: TimelineState = 'rest'
    let movedFromDayName: string | null = null

    if (sessionObjs.length > 0) {
      const primary = sessionObjs[0]
      if (plannedDayId && primary.templateDayId === plannedDayId) {
        state = 'done_planned'
      } else if (primary.templateDayId && scheduledIdToDow.has(primary.templateDayId)) {
        state = 'done_moved'
        const origDow = scheduledIdToDow.get(primary.templateDayId)
        if (origDow) movedFromDayName = DAY_LABELS_SHORT[origDow - 1] || null
      } else {
        state = 'done_bonus'
      }
    } else if (plannedDayId) {
      if (completedTemplateIds.has(plannedDayId)) {
        state = 'rest'
      } else if (isToday) {
        state = 'today_open'
      } else if (isFuture) {
        state = 'upcoming'
      } else {
        state = 'missed'
      }
    }

    // Nutrition
    const sum = nutritionSummaries.find((n) => n.date === dateIso)
    let nutrition: DayNutrition | null = null
    let nutritionPct = 0
    if (nutritionPlan || sum) {
      nutrition = {
        caloriesLogged: sum?.total_calories || 0,
        caloriesTarget: nutritionPlan?.calories_target || 0,
        proteinLogged: sum?.total_protein || 0,
        proteinTarget: nutritionPlan?.protein_g || 0,
        mealsCompleted: sum?.meals_completed || 0,
        mealsPlanned: sum?.meals_planned || 0,
        mood: sum?.mood || null,
      }
      if (nutrition.caloriesTarget > 0) {
        nutritionPct = Math.min(
          100,
          Math.round((nutrition.caloriesLogged / nutrition.caloriesTarget) * 100)
        )
      }
    }

    days.push({
      dayNumber,
      dateIso,
      dayLabel: DAY_LABELS_LONG[i],
      dayLabelShort: DAY_LABELS_SHORT[i],
      dateLabel: date.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' }),
      isToday,
      isFuture,
      state,
      plannedDayName,
      plannedDayId,
      sessions: sessionObjs,
      nutrition,
      nutritionPct,
      movedFromDayName,
    })
  }

  // ─── Summary (this week) ─────────────────────────────────────
  const plannedCount = Object.keys(schedule).filter((k) => schedule[k]).length
  const doneCount = days.reduce((s, d) => s + d.sessions.length, 0)
  const missedCount = days.filter((d) => d.state === 'missed').length
  const totalVolumeKg = days.reduce(
    (s, d) => s + d.sessions.reduce((ss, x) => ss + x.totalVolumeKg, 0),
    0
  )
  const totalDurationMin = days.reduce(
    (s, d) => s + d.sessions.reduce((ss, x) => ss + (x.durationMin || 0), 0),
    0
  )
  const prCountWeek = days.reduce(
    (s, d) => s + d.sessions.reduce((ss, x) => ss + x.prCount, 0),
    0
  )
  const needingFeedback = days.reduce(
    (s, d) => s + d.sessions.filter((x) => x.feedbackText && !x.coachSeen).length,
    0
  )

  // ─── Recent messages ─────────────────────────────────────────
  const recentMessages = messages
    .slice(0, 8)
    .map((m) => ({
      id: m.id,
      senderIsCoach: m.sender_id === coachId,
      content: m.content,
      messageType: m.message_type || 'text',
      fileUrl: m.file_url,
      createdAt: m.created_at,
    }))
    .reverse()

  // ─── Start-date label ────────────────────────────────────────
  const startDateIso = profile.start_date || null
  const startDateLabel = startDateIso
    ? new Date(startDateIso + 'T00:00:00').toLocaleDateString('nl-BE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null

  // ─── Program info ────────────────────────────────────────────
  let programInfo: ClientWeekTimeline['programInfo'] = null
  if (programRow?.name) {
    const freq = plannedCount > 0 ? `${plannedCount}×/week` : '—'
    const phase = programRow.current_week
      ? `Week ${programRow.current_week}`
      : 'Actief programma'

    // ─── Upcoming hint ───
    // 1. Coach-notes first (human-written)
    // 2. Else derived from end_date
    // 3. Else null
    let upcomingLabel: string | null = null
    const coachNotes = (programRow.coach_notes || '').trim()
    if (coachNotes) {
      // First sentence or first 140 chars
      const firstChunk = coachNotes.split(/\n|\. /)[0].trim()
      upcomingLabel = firstChunk.length > 140
        ? firstChunk.slice(0, 137) + '…'
        : firstChunk
    } else if (programRow.end_date) {
      const endIso = programRow.end_date
      const endDate = new Date(endIso + 'T00:00:00')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const msDay = 86400000
      const daysLeft = Math.round((endDate.getTime() - today.getTime()) / msDay)
      if (daysLeft > 0) {
        const weeksLeft = Math.ceil(daysLeft / 7)
        const endLabel = endDate.toLocaleDateString('nl-BE', {
          day: 'numeric',
          month: 'short',
        })
        if (weeksLeft <= 2) {
          upcomingLabel = `Programma loopt nog tot ${endLabel} · daarna evaluatie en nieuw blok.`
        } else {
          upcomingLabel = `Programma loopt tot ${endLabel} · ${weeksLeft} weken te gaan.`
        }
      }
    }

    programInfo = {
      name: programRow.name,
      frequencyLabel: freq,
      phaseLabel: phase,
      upcomingLabel,
    }
  }

  // ─── Macro target ────────────────────────────────────────────
  let macroTarget: ClientWeekTimeline['macroTarget'] = null
  if (nutritionPlan && (nutritionPlan.calories_target || nutritionPlan.protein_g)) {
    macroTarget = {
      kcal: nutritionPlan.calories_target || 0,
      proteinG: nutritionPlan.protein_g || 0,
      carbsG: nutritionPlan.carbs_g || 0,
      fatG: nutritionPlan.fat_g || 0,
      goalLabel: nutritionPlan.title || null,
    }
  }

  // ─── Today's nutrition (meal breakdown) ─────────────────────
  let todayNutrition: ClientWeekTimeline['todayNutrition'] = null
  if (nutritionPlan && (todayNutritionLogs.length > 0 || macroTarget)) {
    const meals = todayNutritionLogs.map((log) => {
      let kcal = 0,
        p = 0,
        c = 0,
        f = 0
      const foods = Array.isArray(log.foods_eaten) ? log.foods_eaten : []
      const hasCheckField = foods.some((fd) => 'checked' in fd)
      for (const fd of foods) {
        const counts = hasCheckField ? fd.checked === true : !!log.completed
        if (!counts) continue
        const g = fd.grams || 100
        const per = fd.per100g || {}
        kcal += Math.round(((per.calories || fd.calories || 0) * g) / 100)
        p += Math.round(((per.protein || fd.protein || 0) * g) / 100)
        c += Math.round(((per.carbs || fd.carbs || 0) * g) / 100)
        f += Math.round(((per.fat || fd.fat || 0) * g) / 100)
      }
      const when = log.completed_at || log.created_at
      const time = when
        ? new Date(when).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })
        : ''
      return {
        id: log.id,
        name: log.meal_name,
        kcal,
        proteinG: p,
        carbsG: c,
        fatG: f,
        timeLabel: time,
      }
    })
    const loggedKcal = meals.reduce((s, m) => s + m.kcal, 0)
    todayNutrition = {
      loggedKcal,
      targetKcal: nutritionPlan.calories_target || 0,
      meals,
    }
  }

  // ─── Session logs (older completed workouts) ────────────────
  const sessionLogs: SessionLogEntry[] = olderSessions.map((s) => {
    const stats = setsById[s.id]
    const durationMin =
      s.duration_seconds ? Math.round(s.duration_seconds / 60) : null
    const title = `${
      s.template_day_id ? dayNameMap[s.template_day_id] || 'Training' : 'Training'
    }${durationMin ? ` · ${durationMin} min` : ''}`

    let sub = ''
    if (stats) {
      const tops = Object.values(stats.topByExercise)
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 3)
      if (tops.length > 0) {
        sub = tops
          .map((t) => {
            const name = t.exerciseId && exerciseNameById[t.exerciseId]
              ? exerciseNameById[t.exerciseId]
              : 'Oefening'
            if (t.weight > 0) return `${name} ${Math.round(t.weight)}kg`
            if (t.reps > 0) return `${name} ${t.reps}×`
            return name
          })
          .join(' · ')
      }
      if (!sub && stats.completedSets) sub = `${stats.completedSets} sets`
    }
    const dateIso = (s.completed_at || s.started_at).split('T')[0]
    return {
      id: s.id,
      dateIso,
      timeLabel: formatRelativeDayLabel(dateIso, todayIso),
      title,
      sub: sub || '—',
      state: 'done',
    }
  })

  // ─── Day logs (older nutrition summaries) ───────────────────
  const dayLogs: DayLogEntry[] = olderNutritionSummaries
    .filter((n) => (n.total_calories || 0) > 0 || (n.meals_completed || 0) > 0)
    .map((n) => {
      const d = new Date(n.date + 'T00:00:00')
      const dayShort = DAY_LABELS_SHORT[(d.getDay() + 6) % 7]
      const cal = Math.round(n.total_calories || 0)
      const title = `${dayShort} ${d.getDate()}/${d.getMonth() + 1} · ${cal} kcal`
      const p = Math.round(n.total_protein || 0)
      const c = Math.round(n.total_carbs || 0)
      const f = Math.round(n.total_fat || 0)
      let deltaPart = ''
      if (macroTarget && macroTarget.kcal > 0) {
        const delta = cal - macroTarget.kcal
        if (Math.abs(delta) <= 150) deltaPart = ' · op target'
        else if (delta < 0) deltaPart = ` · ${delta} kcal`
        else deltaPart = ` · +${delta} kcal`
      }
      const sub = `P ${p}g · C ${c}g · F ${f}g${deltaPart}`
      const meals = n.meals_completed || 0
      const planned = n.meals_planned || 0
      const mealsLabel = planned > 0 ? `${meals} meals` : `${meals} meals`
      const state: 'done' | 'missed' =
        macroTarget && macroTarget.kcal > 0 && cal < macroTarget.kcal * 0.85
          ? 'missed'
          : 'done'
      return {
        id: n.date,
        dateIso: n.date,
        title,
        sub,
        timeLabel: mealsLabel,
        state,
      }
    })

  // ─── Activity log (Overzicht tab — mixed recent events) ────
  const activityLog: ActivityLogEntry[] = []
  {
    // Add recent completed sessions (this week + a few older)
    const recentSessionEvents = [...sessions, ...olderSessions.slice(0, 4)]
      .filter((s) => s.completed_at)
      .sort(
        (a, b) =>
          new Date(b.completed_at || b.started_at).getTime() -
          new Date(a.completed_at || a.started_at).getTime()
      )
      .slice(0, 4)

    for (const s of recentSessionEvents) {
      const stats = setsById[s.id]
      const durationMin =
        s.duration_seconds ? Math.round(s.duration_seconds / 60) : null
      const name = s.template_day_id ? dayNameMap[s.template_day_id] || 'Training' : 'Training'
      const topLift = stats
        ? Object.values(stats.topByExercise).sort((a, b) => b.weight - a.weight)[0]
        : null
      const topPart = topLift && topLift.weight > 0
        ? `${
            topLift.exerciseId && exerciseNameById[topLift.exerciseId]
              ? exerciseNameById[topLift.exerciseId]
              : 'Top'
          } ${Math.round(topLift.weight)}kg${stats?.prCount ? ' PR' : ''}`
        : ''
      const durPart = durationMin ? `${durationMin} min` : ''
      const subParts = [topPart, durPart].filter(Boolean)
      const dateIso = (s.completed_at || s.started_at).split('T')[0]
      activityLog.push({
        id: `sess:${s.id}`,
        kind: 'workout',
        state: 'done',
        title: `${name} voltooid`,
        sub: subParts.join(' · ') || null,
        timeLabel: formatRelativeDayLabel(dateIso, todayIso),
        dateIso,
      })
    }

    // Add latest checkin
    if (allCheckins.length > 0) {
      const c = allCheckins[0]
      activityLog.push({
        id: `check:${c.id}`,
        kind: 'checkin',
        state: 'pending',
        title: 'Check-in ontvangen',
        sub: 'Wacht op review',
        timeLabel: formatRelativeDayLabel(c.date, todayIso),
        dateIso: c.date,
      })
    }

    // Add yesterday's nutrition summary if logged
    const yesterdayIso = toDateIso(new Date(today.getTime() - 86400000))
    const yesterdayNut = [
      ...nutritionSummaries,
      ...olderNutritionSummaries,
    ].find((n) => n.date === yesterdayIso)
    if (yesterdayNut && (yesterdayNut.total_calories || 0) > 0) {
      const kcal = Math.round(yesterdayNut.total_calories || 0)
      const p = Math.round(yesterdayNut.total_protein || 0)
      const c = Math.round(yesterdayNut.total_carbs || 0)
      const f = Math.round(yesterdayNut.total_fat || 0)
      activityLog.push({
        id: `nut:${yesterdayIso}`,
        kind: 'meal',
        state: 'info',
        title: `Meal log · ${kcal} kcal`,
        sub: `P ${p}g · C ${c}g · F ${f}g`,
        timeLabel: 'gisteren',
        dateIso: yesterdayIso,
      })
    }

    // Add latest message (from client)
    const lastClientMsg = messages.find((m) => m.sender_id === clientId)
    if (lastClientMsg) {
      const d = lastClientMsg.created_at.split('T')[0]
      const preview = (lastClientMsg.content || '').slice(0, 60)
      activityLog.push({
        id: `msg:${lastClientMsg.id}`,
        kind: 'message',
        state: 'info',
        title: `Bericht van ${profile.full_name?.split(' ')[0] || 'cliënt'}`,
        sub: preview ? `"${preview}${lastClientMsg.content.length > 60 ? '…' : ''}"` : null,
        timeLabel: formatRelativeDayLabel(d, todayIso),
        dateIso: d,
      })
    }
  }
  // Sort newest first and cap at 6
  activityLog.sort((a, b) => (a.dateIso < b.dateIso ? 1 : -1))
  activityLog.splice(6)

  // ─── Bodyweight trend ───────────────────────────────────────
  let bodyWeight: ClientWeekTimeline['bodyWeight'] = null
  {
    const weights = allCheckins
      .filter((c) => c.weight_kg != null)
      .map((c) => ({ date: c.date, kg: Number(c.weight_kg) }))
    if (weights.length > 0) {
      const ascending = [...weights].sort((a, b) => (a.date < b.date ? -1 : 1))
      const latestKg = ascending[ascending.length - 1].kg
      const fourWeeksAgoIso = toDateIso(fourWeeksAgo)
      const baseline =
        [...ascending]
          .reverse()
          .find((w) => w.date <= fourWeeksAgoIso) || ascending[0]
      const delta = +(latestKg - baseline.kg).toFixed(1)
      const direction: 'up' | 'down' | 'flat' =
        Math.abs(delta) < 0.3 ? 'flat' : delta > 0 ? 'up' : 'down'
      // Normalize series into 0-1 (low-high) for mini chart, use last 8 points
      const last = ascending.slice(-8).map((w) => w.kg)
      bodyWeight = {
        latestKg,
        deltaKg4w: delta,
        direction,
        windowLabel: '4 weken',
        series: last,
      }
    }
  }

  // ─── Lifts progress (top 6 by freq of PRs, with trend) ──────
  // Geeft per oefening: latestKg, delta, deltaLabel, display, EN exerciseId
  // zodat de Voortgang-tab naar de per-oefening subpage kan linken.
  const liftsProgress: LiftProgressEntry[] = []
  {
    // Group PRs by exercise_id (not name — naam kan verschillen per locale)
    const exerciseNameFromPr = (pr: PrRow): string => {
      const ex = Array.isArray(pr.exercises) ? pr.exercises[0] : pr.exercises
      return ex?.name_nl || ex?.name || 'Oefening'
    }
    const byExercise = new Map<string, { name: string; list: PrRow[] }>()
    for (const pr of prs) {
      if (!pr.exercise_id) continue
      const n = exerciseNameFromPr(pr)
      if (!byExercise.has(pr.exercise_id)) byExercise.set(pr.exercise_id, { name: n, list: [] })
      byExercise.get(pr.exercise_id)!.list.push(pr)
    }
    // Pick top 6 exercises by most recent PR count in the last 90 days
    const ninetyDaysAgoIso = toDateIso(new Date(today.getTime() - 90 * 86400000))
    const ranked = Array.from(byExercise.entries())
      .map(([exerciseId, { name, list }]) => ({
        exerciseId,
        name,
        list,
        recent: list.filter((p) => p.achieved_at >= ninetyDaysAgoIso).length,
      }))
      .sort((a, b) => b.recent - a.recent || b.list.length - a.list.length)
      .slice(0, 6)

    for (const { exerciseId, name, list } of ranked) {
      // Latest weight-type PR, and 4-weeks-ago comparison
      const weightPrs = list
        .filter((p) => p.record_type === 'weight' || p.record_type === '1rm')
        .sort((a, b) => (a.achieved_at < b.achieved_at ? -1 : 1))
      if (weightPrs.length === 0) {
        // Rep PR fallback
        const repPrs = list
          .filter((p) => p.record_type === 'reps')
          .sort((a, b) => (a.achieved_at < b.achieved_at ? -1 : 1))
        if (repPrs.length > 0) {
          const latest = repPrs[repPrs.length - 1]
          liftsProgress.push({
            name,
            exerciseId,
            latestKg: null,
            deltaPct: null,
            deltaLabel: 'up',
            display: `+${Math.round(latest.value)} reps`,
          })
        }
        continue
      }
      const latest = weightPrs[weightPrs.length - 1]
      const fourWIso = toDateIso(fourWeeksAgo)
      const baseline =
        [...weightPrs].reverse().find((p) => p.achieved_at < fourWIso) || weightPrs[0]
      const latestKg = Math.round(Number(latest.value))
      const pct = baseline.value > 0
        ? Math.round(((Number(latest.value) - Number(baseline.value)) / Number(baseline.value)) * 100)
        : 0
      const deltaLabel: 'up' | 'down' | 'flat' =
        Math.abs(pct) < 1 ? 'flat' : pct > 0 ? 'up' : 'down'
      const display =
        deltaLabel === 'flat'
          ? `stabiel · ${latestKg} kg`
          : `${pct > 0 ? '+' : ''}${pct}% · ${latestKg} kg`
      liftsProgress.push({
        name,
        exerciseId,
        latestKg,
        deltaPct: pct,
        deltaLabel,
        display,
      })
    }
  }

  // ─── Top PRs (meest recente 8) ───────────────────────────────
  // Voor het PR-blok in de Voortgang-tab. Klikbaar naar de per-oefening
  // subpage, zodat de coach het verhaal achter een PR kan lezen.
  const topPRs: PrEntry[] = []
  {
    const sorted = [...prs].sort((a, b) => (a.achieved_at < b.achieved_at ? 1 : -1)).slice(0, 8)
    for (const pr of sorted) {
      if (!pr.exercise_id) continue
      const ex = Array.isArray(pr.exercises) ? pr.exercises[0] : pr.exercises
      const exerciseName = ex?.name_nl || ex?.name || 'Oefening'
      const dateIso = pr.achieved_at.split('T')[0]
      const dateLabel = formatRelativeDayLabel(dateIso, todayIso)
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
      topPRs.push({
        id: pr.id,
        exerciseId: pr.exercise_id,
        exerciseName,
        recordType: pr.record_type,
        value: Number(pr.value),
        achievedAt: pr.achieved_at,
        dateLabel,
        display,
      })
    }
  }

  // ─── Measurements (latest checkin with any cm) ──────────────
  let measurements: ClientWeekTimeline['measurements'] = null
  {
    const latest = allCheckins.find(
      (c) =>
        c.chest_cm != null ||
        c.waist_cm != null ||
        c.hips_cm != null ||
        c.left_arm_cm != null ||
        c.right_arm_cm != null
    )
    if (latest) {
      const arm =
        latest.left_arm_cm != null && latest.right_arm_cm != null
          ? +(((latest.left_arm_cm || 0) + (latest.right_arm_cm || 0)) / 2).toFixed(1)
          : latest.left_arm_cm ?? latest.right_arm_cm ?? null
      const daysAgo = daysBetween(latest.date, todayIso)
      const daysAgoLabel =
        daysAgo <= 0 ? 'vandaag' : daysAgo === 1 ? 'gisteren' : `${daysAgo}d geleden`
      measurements = {
        chestCm: latest.chest_cm != null ? Math.round(Number(latest.chest_cm)) : null,
        waistCm: latest.waist_cm != null ? Math.round(Number(latest.waist_cm)) : null,
        hipsCm: latest.hips_cm != null ? Math.round(Number(latest.hips_cm)) : null,
        armCm: arm != null ? Math.round(Number(arm)) : null,
        dateIso: latest.date,
        daysAgoLabel: `${formatDayMonth(latest.date)} · ${daysAgoLabel}`,
      }
    }
  }

  // ─── Photos ──────────────────────────────────────────────────
  let photos: ClientWeekTimeline['photos'] = null
  {
    const withPhoto = allCheckins.filter((c) => c.photo_front_url || c.photo_back_url)
    if (withPhoto.length > 0) {
      const latest = withPhoto[0]
      const urls: string[] = []
      if (latest.photo_front_url) urls.push(latest.photo_front_url)
      if (latest.photo_back_url) urls.push(latest.photo_back_url)
      photos = {
        urls,
        count: withPhoto.length,
        latestDateIso: latest.date,
        latestDateLabel: formatDayMonth(latest.date),
      }
    }
  }

  // ─── Assemble ────────────────────────────────────────────────
  return {
    clientId,
    fullName: profile.full_name || 'Onbekend',
    firstName: (profile.full_name || 'Onbekend').split(' ')[0],
    avatarUrl: profile.avatar_url || null,
    initials: getInitials(profile.full_name || 'Onbekend'),
    packageTier: profile.package || null,
    startDateIso,
    startDateLabel,
    intakeCompleted: !!profile.intake_completed,
    reintakeRequestedAt: profile.reintake_requested_at || null,
    weekStartIso,
    weekEndIso,
    days,
    summary: {
      plannedCount,
      doneCount,
      missedCount,
      totalVolumeKg,
      totalDurationMin,
      prCountWeek,
      needingFeedback,
    },
    recentMessages,
    programInfo,
    macroTarget,
    todayNutrition,
    dayLogs,
    sessionLogs,
    activityLog,
    bodyWeight,
    liftsProgress,
    topPRs,
    measurements,
    photos,
  }
}
