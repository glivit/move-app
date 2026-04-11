import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Shared data-fetching for the coach mobile "week overview" home screen.
 *
 * Returns one row per client with:
 *  - 7-day week strip (Mon..Sun) containing planned + completed status
 *  - nutrition adherence for today
 *  - last activity marker
 *  - attention level ("urgent" | "attention" | "ok")
 *  - unread message count (client → coach direction)
 *
 * All queries run in a single Promise.all batch to keep latency tight.
 */

export type DayState =
  | 'done_planned'         // completed the scheduled day on the scheduled day
  | 'done_moved'           // completed a scheduled day but moved from another day
  | 'done_bonus'           // completed something on a rest day (bonus)
  | 'missed'               // scheduled, day passed, not done, not compensated
  | 'today_open'           // scheduled today, not yet done
  | 'upcoming'             // scheduled in the future
  | 'rest'                 // no workout planned

export interface WeekDay {
  dayNumber: number        // 1 = Mon .. 7 = Sun
  dateIso: string          // YYYY-MM-DD
  isToday: boolean
  isFuture: boolean
  state: DayState
  plannedDayName: string | null   // what was planned this dow
  completedDayName: string | null // what actually got completed this dow
  movedFromDayName: string | null // if the completed session came from a different planned dow
}

export interface ClientWeekRow {
  id: string
  fullName: string
  initials: string
  avatarUrl: string | null
  packageTier: string | null

  week: WeekDay[]

  // Summary
  plannedThisWeek: number
  doneThisWeek: number
  missedSoFar: number

  // Last activity
  lastActivityDaysAgo: number | null
  lastActivityLabel: string | null

  // Nutrition
  hasNutritionPlan: boolean
  nutritionTodayPct: number      // 0-100
  nutritionLoggedToday: boolean

  // Messaging
  unreadFromClient: number

  // Pending check-in
  hasPendingCheckin: boolean

  // Attention
  attention: 'urgent' | 'attention' | 'ok'
  attentionReason: string | null
}

export interface CoachWeekOverview {
  weekStartIso: string           // Monday ISO
  todayIso: string
  clients: ClientWeekRow[]
  summary: {
    total: number
    needsAttention: number
    onTrack: number
  }
}

// ─── Helpers ───────────────────────────────────────────────────

function getWeekStartDate(): Date {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
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

// ───────────────────────────────────────────────────────────────

export async function fetchCoachWeekOverview(coachId: string): Promise<CoachWeekOverview> {
  const supabase = createAdminClient()

  const weekStart = getWeekStartDate()
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayIso = toDateIso(today)

  const weekStartIso = toDateIso(weekStart)
  const weekDates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    weekDates.push(toDateIso(d))
  }

  // Parallel fetch
  const [
    { data: profilesData },
    { data: programsData },
    { data: templateDaysData },
    { data: sessionsData },
    { data: allSessionsData },
    { data: nutritionPlansData },
    { data: nutritionTodayData },
    { data: checkinsData },
    { data: messagesData },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, avatar_url, package')
      .eq('role', 'client'),
    supabase
      .from('client_programs')
      .select('client_id, schedule')
      .eq('is_active', true),
    supabase
      .from('program_template_days')
      .select('id, name'),
    supabase
      .from('workout_sessions')
      .select('client_id, started_at, completed_at, template_day_id')
      .gte('started_at', weekStart.toISOString())
      .lt('started_at', weekEnd.toISOString())
      .not('completed_at', 'is', null),
    supabase
      .from('workout_sessions')
      .select('client_id, started_at, completed_at')
      .not('completed_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(500),
    supabase
      .from('nutrition_plans')
      .select('client_id, calories_target, protein_g')
      .eq('is_active', true),
    supabase
      .from('nutrition_daily_summary')
      .select('client_id, total_calories, total_protein')
      .eq('date', todayIso),
    supabase
      .from('checkins')
      .select('client_id')
      .eq('coach_reviewed', false),
    supabase
      .from('messages')
      .select('sender_id, created_at')
      .eq('receiver_id', coachId)
      .is('read_at', null)
      .order('created_at', { ascending: false })
      .limit(500),
  ])

  const profiles = profilesData || []
  const programs = programsData || []
  const templateDays = templateDaysData || []
  const weekSessions = sessionsData || []
  const allSessions = allSessionsData || []
  const nutritionPlans = nutritionPlansData || []
  const nutritionToday = nutritionTodayData || []
  const checkins = checkinsData || []
  const unreadMessages = messagesData || []

  type ProfileRow = { id: string; full_name: string | null; avatar_url: string | null; package: string | null }
  type ProgramRow = { client_id: string; schedule: Record<string, string> | null }
  type TemplateDayRow = { id: string; name: string }
  type WeekSessionRow = { client_id: string; started_at: string; template_day_id: string | null }
  type AllSessionRow = { client_id: string; started_at: string }
  type NutritionPlanRow = { client_id: string; calories_target: number | null; protein_g: number | null }
  type NutritionTodayRow = { client_id: string; total_calories: number | null; total_protein: number | null }
  type CheckinRow = { client_id: string }
  type MessageRow = { sender_id: string; created_at: string }

  const typedProfiles = profiles as ProfileRow[]
  const typedPrograms = programs as ProgramRow[]
  const typedWeekSessions = weekSessions as WeekSessionRow[]
  const typedAllSessions = allSessions as AllSessionRow[]
  const typedNutritionPlans = nutritionPlans as NutritionPlanRow[]
  const typedNutritionToday = nutritionToday as NutritionTodayRow[]
  const typedCheckins = checkins as CheckinRow[]
  const typedUnread = unreadMessages as MessageRow[]

  const dayNameMap: Record<string, string> = {}
  for (const td of templateDays as TemplateDayRow[]) {
    dayNameMap[td.id] = td.name
  }

  const todayDayNum = (() => {
    const d = new Date().getDay()
    return d === 0 ? 7 : d
  })()

  const clients: ClientWeekRow[] = typedProfiles.map((p) => {
    const fullName = p.full_name || 'Onbekend'
    const initials = getInitials(fullName)

    // Schedule: { "1": template_day_id, ... }
    const program = typedPrograms.find((pr) => pr.client_id === p.id)
    const schedule = (program?.schedule || {}) as Record<string, string>

    // Sessions for this client this week
    const mySessions = typedWeekSessions.filter((s) => s.client_id === p.id)

    // Which scheduled template_day_ids have been completed this week (anywhere)?
    const scheduledIdsMap = new Map<string, number>() // id → intended dow
    for (const [dow, tid] of Object.entries(schedule)) {
      if (tid) scheduledIdsMap.set(tid, Number(dow))
    }

    const completedIdsThisWeek = new Set<string>(
      mySessions
        .filter((s) => !!s.template_day_id)
        .map((s) => s.template_day_id as string)
    )

    // Build 7-day strip
    const week: WeekDay[] = weekDates.map((dateIso, idx) => {
      const dayNumber = idx + 1 // 1 = Mon
      const isToday = dateIso === todayIso
      const isFuture = dateIso > todayIso

      const plannedTemplateId = schedule[String(dayNumber)] || null
      const plannedDayName = plannedTemplateId ? (dayNameMap[plannedTemplateId] || 'Training') : null

      // Was something completed on this actual date?
      const dayStart = new Date(dateIso + 'T00:00:00')
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)
      const sessionOnDay = mySessions.find((s) => {
        const t = new Date(s.started_at)
        return t >= dayStart && t < dayEnd
      })

      let state: DayState = 'rest'
      let completedDayName: string | null = null
      let movedFromDayName: string | null = null

      if (sessionOnDay) {
        const doneTid = sessionOnDay.template_day_id
        completedDayName = doneTid ? (dayNameMap[doneTid] || 'Training') : 'Training'

        if (plannedTemplateId && doneTid === plannedTemplateId) {
          state = 'done_planned'
        } else if (doneTid && scheduledIdsMap.has(doneTid)) {
          // Completed a different day's planned workout here
          state = 'done_moved'
          const origDow = scheduledIdsMap.get(doneTid)
          if (origDow) {
            movedFromDayName = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'][origDow - 1] || null
          }
        } else {
          // Extra work on a rest day
          state = 'done_bonus'
        }
      } else {
        if (plannedTemplateId) {
          // Not completed on this day.
          // If the planned template was done on another day this week → still "done_moved" visual here? No — this day is just "moved out". Treat as rest-ish.
          if (completedIdsThisWeek.has(plannedTemplateId)) {
            state = 'rest' // compensated elsewhere; don't flag missed
          } else if (isToday) {
            state = 'today_open'
          } else if (isFuture) {
            state = 'upcoming'
          } else {
            state = 'missed'
          }
        } else {
          state = 'rest'
        }
      }

      return {
        dayNumber,
        dateIso,
        isToday,
        isFuture,
        state,
        plannedDayName,
        completedDayName,
        movedFromDayName,
      }
    })

    // Summary counts
    const plannedThisWeek = Object.keys(schedule).filter((k) => schedule[k]).length
    const doneThisWeek = mySessions.length
    const missedSoFar = week.filter((d) => d.state === 'missed').length

    // Last activity
    const myAll = typedAllSessions.filter((s) => s.client_id === p.id)
    let lastActivityDaysAgo: number | null = null
    let lastActivityLabel: string | null = null
    if (myAll.length > 0) {
      const last = new Date(myAll[0].started_at)
      const diffMs = Date.now() - last.getTime()
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      lastActivityDaysAgo = days
      if (days === 0) lastActivityLabel = 'Vandaag actief'
      else if (days === 1) lastActivityLabel = 'Gisteren actief'
      else if (days < 7) lastActivityLabel = `${days} dagen geleden`
      else if (days < 14) lastActivityLabel = 'Een week geleden'
      else lastActivityLabel = `${Math.floor(days / 7)} weken geleden`
    }

    // Nutrition
    const plan = typedNutritionPlans.find((np) => np.client_id === p.id)
    const todaySum = typedNutritionToday.find((n) => n.client_id === p.id)
    const hasNutritionPlan = !!plan
    const caloriesLogged = todaySum?.total_calories || 0
    const caloriesTarget = plan?.calories_target || 0
    const nutritionTodayPct = caloriesTarget > 0
      ? Math.min(100, Math.round((caloriesLogged / caloriesTarget) * 100))
      : 0
    const nutritionLoggedToday = caloriesLogged > 0

    // Messages: unread from this client to coach
    const unreadFromClient = typedUnread.filter((m) => m.sender_id === p.id).length

    // Pending check-in
    const hasPendingCheckin = typedCheckins.some((c) => c.client_id === p.id)

    // Attention scoring
    let attention: 'urgent' | 'attention' | 'ok' = 'ok'
    let attentionReason: string | null = null

    const missedToday = week.find((d) => d.dayNumber === todayDayNum)?.state === 'today_open'
    const missedBeforeToday = week.some(
      (d) => d.dayNumber < todayDayNum && d.state === 'missed'
    )

    if (missedSoFar >= 2) {
      attention = 'urgent'
      attentionReason = `${missedSoFar} trainingen gemist`
    } else if (missedBeforeToday) {
      attention = 'urgent'
      attentionReason = '1 training gemist'
    } else if (hasPendingCheckin) {
      attention = 'attention'
      attentionReason = 'Check-in wacht'
    } else if (unreadFromClient > 0) {
      attention = 'attention'
      attentionReason = `${unreadFromClient} bericht${unreadFromClient > 1 ? 'en' : ''}`
    } else if (
      hasNutritionPlan &&
      !nutritionLoggedToday &&
      new Date().getHours() >= 14
    ) {
      attention = 'attention'
      attentionReason = 'Voeding niet gelogd'
    } else if (missedToday) {
      attention = 'attention'
      attentionReason = 'Training vandaag'
    }

    return {
      id: p.id,
      fullName,
      initials,
      avatarUrl: p.avatar_url || null,
      packageTier: p.package || null,
      week,
      plannedThisWeek,
      doneThisWeek,
      missedSoFar,
      lastActivityDaysAgo,
      lastActivityLabel,
      hasNutritionPlan,
      nutritionTodayPct,
      nutritionLoggedToday,
      unreadFromClient,
      hasPendingCheckin,
      attention,
      attentionReason,
    }
  })

  // Sort: urgent → attention → ok, then by name
  const order: Record<'urgent' | 'attention' | 'ok', number> = { urgent: 0, attention: 1, ok: 2 }
  clients.sort((a, b) => {
    if (a.attention !== b.attention) return order[a.attention] - order[b.attention]
    return a.fullName.localeCompare(b.fullName, 'nl')
  })

  const needsAttention = clients.filter((c) => c.attention !== 'ok').length
  const onTrack = clients.length - needsAttention

  return {
    weekStartIso,
    todayIso,
    clients,
    summary: {
      total: clients.length,
      needsAttention,
      onTrack,
    },
  }
}
