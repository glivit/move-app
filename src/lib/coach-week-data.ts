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

/**
 * One entry per planned training in the client's program for the week.
 * Shows what's scheduled (by name) and whether it's been completed.
 */
export type ProgramDayStatus = 'done' | 'today' | 'upcoming' | 'missed'

export interface ProgramDayEntry {
  templateDayId: string
  name: string               // template day name, e.g. "Push", "Upper A"
  scheduledDayNumber: number // 1=Mon..7=Sun — where it's planned
  scheduledDayLabel: string  // "Ma", "Di", ...
  status: ProgramDayStatus
  completedOnLabel: string | null // if moved, the dow it was actually done, else null
}

/**
 * One entry per day for the diet strip. Dieet heeft geen 'rest' state —
 * je eet elke dag. Een dag zonder plan = 'open' (neutral ring).
 */
export type DietDayState =
  | 'done'      // logged & hit target band (80–110%)
  | 'today'     // today, incomplete/partial
  | 'missed'    // past day, no logging or way under target
  | 'open'      // no plan or future day

export interface DietDay {
  dayNumber: number      // 1 = Mon .. 7 = Sun
  dateIso: string
  isToday: boolean
  isFuture: boolean
  state: DietDayState
  pct: number            // 0–100, 0 if not logged
  logged: boolean
}

export interface ClientWeekRow {
  id: string
  fullName: string
  initials: string
  avatarUrl: string | null
  packageTier: string | null

  week: WeekDay[]

  // Program checklist: one entry per scheduled training this week
  programDays: ProgramDayEntry[]

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
  dietWeek: DietDay[]            // 7-day diet strip for the dieet tab

  // One-sentence summaries shown under the week-dots, one per tab
  workoutSummary: string
  dietSummary: string

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
      .select('client_id, date, total_calories, total_protein')
      .gte('date', weekStartIso)
      .lt('date', toDateIso(weekEnd)),
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
  const nutritionWeek = nutritionTodayData || []
  const checkins = checkinsData || []
  const unreadMessages = messagesData || []

  type ProfileRow = { id: string; full_name: string | null; avatar_url: string | null; package: string | null }
  type ProgramRow = { client_id: string; schedule: Record<string, string> | null }
  type TemplateDayRow = { id: string; name: string }
  type WeekSessionRow = { client_id: string; started_at: string; template_day_id: string | null }
  type AllSessionRow = { client_id: string; started_at: string }
  type NutritionPlanRow = { client_id: string; calories_target: number | null; protein_g: number | null }
  type NutritionDayRow = { client_id: string; date: string; total_calories: number | null; total_protein: number | null }
  type CheckinRow = { client_id: string }
  type MessageRow = { sender_id: string; created_at: string }

  const typedProfiles = profiles as ProfileRow[]
  const typedPrograms = programs as ProgramRow[]
  const typedWeekSessions = weekSessions as WeekSessionRow[]
  const typedAllSessions = allSessions as AllSessionRow[]
  const typedNutritionPlans = nutritionPlans as NutritionPlanRow[]
  const typedNutritionWeek = nutritionWeek as NutritionDayRow[]
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

    // Program checklist: one entry per scheduled training this week,
    // showing the template day name + done/today/upcoming/missed status.
    const dayLabels = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
    const programDays: ProgramDayEntry[] = []
    for (const [dowKey, tid] of Object.entries(schedule)) {
      if (!tid) continue
      const scheduledDayNumber = Number(dowKey)
      if (!Number.isFinite(scheduledDayNumber) || scheduledDayNumber < 1 || scheduledDayNumber > 7) continue

      const name = dayNameMap[tid] || 'Training'
      const scheduledDayLabel = dayLabels[scheduledDayNumber - 1] || ''

      // Was this specific template day completed somewhere this week?
      const completedSession = mySessions.find((s) => s.template_day_id === tid)

      let status: ProgramDayStatus
      let completedOnLabel: string | null = null

      if (completedSession) {
        status = 'done'
        const t = new Date(completedSession.started_at)
        const jsDow = t.getDay() // 0=Sun..6=Sat
        const completedDow = jsDow === 0 ? 7 : jsDow
        if (completedDow !== scheduledDayNumber) {
          completedOnLabel = dayLabels[completedDow - 1] || null
        }
      } else if (scheduledDayNumber === todayDayNum) {
        status = 'today'
      } else if (scheduledDayNumber > todayDayNum) {
        status = 'upcoming'
      } else {
        status = 'missed'
      }

      programDays.push({
        templateDayId: tid,
        name,
        scheduledDayNumber,
        scheduledDayLabel,
        status,
        completedOnLabel,
      })
    }
    programDays.sort((a, b) => a.scheduledDayNumber - b.scheduledDayNumber)

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

    // Nutrition — plan + 7-day strip
    const plan = typedNutritionPlans.find((np) => np.client_id === p.id)
    const caloriesTarget = plan?.calories_target || 0
    const hasNutritionPlan = !!plan

    const myNutritionWeek = typedNutritionWeek.filter((n) => n.client_id === p.id)
    const sumByDate = new Map<string, number>()
    for (const row of myNutritionWeek) {
      sumByDate.set(row.date, row.total_calories || 0)
    }

    const dietWeek: DietDay[] = weekDates.map((dateIso, idx) => {
      const dayNumber = idx + 1
      const isToday = dateIso === todayIso
      const isFuture = dateIso > todayIso
      const logged = sumByDate.has(dateIso) && (sumByDate.get(dateIso) || 0) > 0
      const kcal = sumByDate.get(dateIso) || 0
      const pct = caloriesTarget > 0 ? Math.min(200, Math.round((kcal / caloriesTarget) * 100)) : 0

      let state: DietDayState = 'open'
      if (!hasNutritionPlan) {
        state = 'open'
      } else if (isFuture) {
        state = 'open'
      } else if (isToday) {
        // Today: done if we already hit 80%+, else "today" (pulsing)
        state = logged && pct >= 80 ? 'done' : 'today'
      } else {
        // Past day: done if logged & within 80–120% band, else missed (0% or way off)
        if (logged && pct >= 60 && pct <= 120) state = 'done'
        else if (logged && pct > 120) state = 'missed' // over-eating counts as a miss for the strip
        else state = 'missed'
      }

      return { dayNumber, dateIso, isToday, isFuture, state, pct, logged }
    })

    const todayDiet = dietWeek.find((d) => d.isToday)
    const nutritionTodayPct = todayDiet?.pct || 0
    const nutritionLoggedToday = todayDiet?.logged || false

    // Build 1-sentence summaries
    const pastDietDays = dietWeek.filter((d) => !d.isFuture && !d.isToday)
    const dietDone = pastDietDays.filter((d) => d.state === 'done').length
    const dietMissed = pastDietDays.filter((d) => d.state === 'missed').length

    let dietSummary: string
    if (!hasNutritionPlan) {
      dietSummary = 'Geen voedingsplan actief'
    } else if (dietMissed >= 3) {
      dietSummary = `Voeding loopt achter · ${dietMissed} dagen gemist`
    } else if (dietMissed > 0) {
      dietSummary = `${dietDone}/${pastDietDays.length} dagen op doel · ${dietMissed} gemist`
    } else if (todayDiet?.isToday && todayDiet.logged) {
      dietSummary = `Vandaag ${nutritionTodayPct}% · week strak`
    } else if (todayDiet?.isToday) {
      dietSummary = pastDietDays.length > 0
        ? `Week strak · vandaag nog te loggen`
        : `Start van de week · nog niks gelogd`
    } else {
      dietSummary = 'Alles op koers'
    }

    // Workout summary — derived from week[] + programDays
    const todayWorkout = week.find((d) => d.isToday)
    const todayIsTrainDay = todayWorkout?.state === 'today_open' || todayWorkout?.state === 'done_planned' || todayWorkout?.state === 'done_moved'
    const plannedName = todayWorkout?.plannedDayName || null
    let workoutSummary: string
    if (plannedThisWeek === 0) {
      workoutSummary = 'Geen programma deze week'
    } else if (missedSoFar >= 2) {
      workoutSummary = `${missedSoFar} workouts gemist deze week`
    } else if (missedSoFar === 1) {
      workoutSummary = `1 gemist · ${doneThisWeek}/${plannedThisWeek} gedaan`
    } else if (todayWorkout?.state === 'today_open') {
      workoutSummary = plannedName
        ? `${doneThisWeek}/${plannedThisWeek} gedaan · vandaag ${plannedName}`
        : `${doneThisWeek}/${plannedThisWeek} gedaan · vandaag training`
    } else if (doneThisWeek >= plannedThisWeek && plannedThisWeek > 0) {
      workoutSummary = `Week compleet · ${doneThisWeek}/${plannedThisWeek}`
    } else if (todayIsTrainDay) {
      workoutSummary = `${doneThisWeek}/${plannedThisWeek} gedaan deze week`
    } else {
      workoutSummary = `${doneThisWeek}/${plannedThisWeek} gedaan deze week`
    }

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
      programDays,
      plannedThisWeek,
      doneThisWeek,
      missedSoFar,
      lastActivityDaysAgo,
      lastActivityLabel,
      hasNutritionPlan,
      nutritionTodayPct,
      nutritionLoggedToday,
      dietWeek,
      workoutSummary,
      dietSummary,
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
