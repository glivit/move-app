import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Per-client week timeline — the Phase 2 view.
 *
 * Returns one client's full 7-day timeline with everything the coach
 * needs at a glance: planned workouts, completed sessions (with a
 * compact stat-line and PR/pain flags), nutrition per day, and which
 * sessions still need a coach response.
 */

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

  movedFromDayName: string | null  // set when state=done_moved
}

export interface ClientWeekTimeline {
  clientId: string
  fullName: string
  firstName: string
  avatarUrl: string | null
  initials: string
  packageTier: string | null

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
    needingFeedback: number  // sessions with feedback_text that coach_seen=false
  }

  // Recent general messages (DM track, not workout-specific)
  recentMessages: Array<{
    id: string
    senderIsCoach: boolean
    content: string
    messageType: string
    fileUrl: string | null
    createdAt: string
  }>
}

// ─── Helpers ────────────────────────────────────

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

// ────────────────────────────────────────────────

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

  // Parallel fetch
  const [
    { data: profileData },
    { data: programData },
    { data: templateDaysData },
    { data: sessionsData },
    { data: nutritionPlanData },
    { data: nutritionSummariesData },
    { data: messagesData },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, avatar_url, package')
      .eq('id', clientId)
      .single(),
    supabase
      .from('client_programs')
      .select('schedule')
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
        'id, template_day_id, started_at, completed_at, duration_seconds, duration_minutes, mood_rating, difficulty_rating, feedback_text, coach_seen'
      )
      .eq('client_id', clientId)
      .gte('started_at', weekStart.toISOString())
      .lt('started_at', weekEnd.toISOString())
      .order('started_at', { ascending: true }),
    supabase
      .from('nutrition_plans')
      .select('calories_target, protein_g')
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
  ])

  if (!profileData) return null

  type ProfileRow = { id: string; full_name: string | null; avatar_url: string | null; package: string | null }
  type TemplateDayRow = { id: string; name: string }
  type SessionRow = {
    id: string
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
  type NutritionSummaryRow = {
    date: string
    total_calories: number | null
    total_protein: number | null
    meals_planned: number | null
    meals_completed: number | null
    mood: string | null
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

  const profile = profileData as ProfileRow
  const schedule = ((programData as { schedule?: Record<string, string> } | null)?.schedule || {}) as Record<
    string,
    string
  >
  const templateDays = (templateDaysData || []) as TemplateDayRow[]
  const sessions = (sessionsData || []) as SessionRow[]
  const nutritionPlan = nutritionPlanData as { calories_target: number | null; protein_g: number | null } | null
  const nutritionSummaries = (nutritionSummariesData || []) as NutritionSummaryRow[]
  const messages = (messagesData || []) as MessageRow[]

  const dayNameMap: Record<string, string> = {}
  for (const td of templateDays) dayNameMap[td.id] = td.name

  // Compute session stats in parallel by fetching workout_sets once
  let setsById: Record<string, { completedSets: number; totalSets: number; volume: number; prCount: number; hasPain: boolean }> = {}
  if (sessions.length > 0) {
    const sessionIds = sessions.map((s) => s.id)
    const { data: setsData } = await supabase
      .from('workout_sets')
      .select('workout_session_id, weight_kg, actual_reps, completed, is_pr, is_warmup, pain_flag')
      .in('workout_session_id', sessionIds)

    type SetRow = {
      workout_session_id: string
      weight_kg: number | null
      actual_reps: number | null
      completed: boolean | null
      is_pr: boolean | null
      is_warmup: boolean | null
      pain_flag: boolean | null
    }
    const sets = (setsData || []) as SetRow[]

    setsById = sessionIds.reduce((acc, id) => {
      const bucket = sets.filter((s) => s.workout_session_id === id)
      const completed = bucket.filter((s) => s.completed && !s.is_warmup)
      const volume = completed.reduce(
        (sum, s) => sum + (s.weight_kg || 0) * (s.actual_reps || 0),
        0
      )
      const prCount = bucket.filter((s) => s.is_pr).length
      const hasPain = bucket.some((s) => s.pain_flag === true)
      acc[id] = {
        completedSets: completed.length,
        totalSets: bucket.filter((s) => !s.is_warmup).length,
        volume,
        prCount,
        hasPain,
      }
      return acc
    }, {} as Record<string, { completedSets: number; totalSets: number; volume: number; prCount: number; hasPain: boolean }>)
  }

  // Set of completed template_day_ids this week (for "moved" detection)
  const completedTemplateIds = new Set(
    sessions.filter((s) => s.completed_at && s.template_day_id).map((s) => s.template_day_id as string)
  )

  // Scheduled template_day_id → original dow (for "moved from" label)
  const scheduledIdToDow = new Map<string, number>()
  for (const [dow, tid] of Object.entries(schedule)) {
    if (tid) scheduledIdToDow.set(tid, Number(dow))
  }

  // Build 7 days
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

    // Sessions on this day
    const dayStart = new Date(dateIso + 'T00:00:00')
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)
    const daySessions = sessions.filter((s) => {
      const t = new Date(s.started_at)
      return t >= dayStart && t < dayEnd && s.completed_at
    })

    // Convert to DaySession shape
    const sessionObjs: DaySession[] = daySessions.map((s) => {
      const stats = setsById[s.id] || {
        completedSets: 0,
        totalSets: 0,
        volume: 0,
        prCount: 0,
        hasPain: false,
      }
      const durationMin =
        s.duration_minutes ?? (s.duration_seconds ? Math.round(s.duration_seconds / 60) : null)
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

  // Summary
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

  // Recent messages (simplified — map direction). Reversed so the array reads
  // oldest → newest, the natural order for a chat panel.
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

  return {
    clientId,
    fullName: profile.full_name || 'Onbekend',
    firstName: (profile.full_name || 'Onbekend').split(' ')[0],
    avatarUrl: profile.avatar_url || null,
    initials: getInitials(profile.full_name || 'Onbekend'),
    packageTier: profile.package || null,
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
  }
}
