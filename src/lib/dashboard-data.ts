import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Fetch all dashboard data for a given user.
 * Shared between:
 *  - Server Component (page.tsx) — called directly, no HTTP round trip
 *  - API route (GET /api/dashboard) — called via fetch for client-side revalidation
 */
export async function fetchDashboardData(userId: string) {
  const db = createAdminClient()

  const today = new Date().toISOString().split('T')[0]

  const monthStart = new Date()
  monthStart.setDate(1)

  const weekStartDate = getWeekStartDate()

  // ── All parallel fetches ──────────────────────────────
  const [
    profileRes,
    programRes,
    nutritionPlanRes,
    todayMealLogsRes,
    todaySummaryRes,
    todayWorkoutsRes,
    weekWorkoutsRes,
    messagesRes,
    videoRes,
    accountabilityRes,
    promptsRes,
    broadcastsRes,
    intakeRes,
    lastCheckinRes,
    streakResult,
    weightEntriesRes,
    weeklyCheckinRes,
    weightLogsThisWeekRes,
  ] = await Promise.all([
    db.from('profiles').select('id, full_name, role, package, start_date, intake_completed, reintake_requested_at')
      .eq('id', userId).single(),

    // Collapsed: client_programs + nested template_days + per-day exercise count
    // in één round-trip. Vervangt twee opvolgende awaits (templateDays + count-query)
    // verderop in deze functie — ~1s winst op initial load.
    db.from('client_programs').select(`
        id, name, start_date, is_active, current_week, template_id, schedule,
        program_templates (
          template_days:program_template_days (
            id, day_number, name, focus, estimated_duration_min, sort_order,
            program_template_exercises ( count )
          )
        )
      `)
      .eq('client_id', userId).eq('is_active', true)
      .order('created_at', { ascending: false }).limit(1).single(),

    db.from('nutrition_plans').select('id, title, calories_target, protein_g, carbs_g, fat_g, meals')
      .eq('client_id', userId).eq('is_active', true)
      .order('created_at', { ascending: false }).limit(1).single(),

    db.from('nutrition_logs').select('meal_id, meal_name, completed, completed_at, client_notes')
      .eq('client_id', userId).eq('date', today),

    db.from('nutrition_daily_summary').select('meals_planned, meals_completed, total_calories, total_protein, total_carbs, total_fat')
      .eq('client_id', userId).eq('date', today).single(),

    // Today's scheduled-slot sessions — started today. Used for "today is done" hero only;
    // late-completed workouts from earlier in the week count toward the weekview below, not here.
    db.from('workout_sessions').select('id, started_at, completed_at, template_day_id')
      .eq('client_id', userId).gte('started_at', `${today}T00:00:00`).lte('started_at', `${today}T23:59:59`),

    // Workouts COMPLETED this week (completion date — not start date — drives weekview + voltooid counter)
    // template_day_id nodig voor inhaal-logica: een sessie die op woensdag Upper-A
    // (gescheduled voor maandag) heeft afgerond, vervult de maandag-slot.
    db.from('workout_sessions').select('id, completed_at, template_day_id')
      .eq('client_id', userId).not('completed_at', 'is', null)
      .gte('completed_at', getWeekStart()),

    db.from('messages').select('id', { count: 'exact', head: true })
      .eq('receiver_id', userId).is('read_at', null),

    db.from('video_sessions').select('id, scheduled_at, duration_minutes')
      .eq('client_id', userId).in('status', ['scheduled'])
      .gte('scheduled_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .order('scheduled_at').limit(1),

    db.from('accountability_responses').select('id, responded')
      .eq('client_id', userId).eq('date', today).single(),

    db.from('prompt_responses').select('id, prompt_id, prompts(question)')
      .eq('client_id', userId).eq('response', '')
      .order('created_at', { ascending: false }).limit(1),

    db.from('broadcasts')
      .select('id, title, content, created_at, target_clients, read_by')
      .order('created_at', { ascending: false })
      .limit(20),

    db.from('intake_forms').select('id, completed, primary_goal, training_experience, dietary_preferences, weight_kg, photo_front_url, chest_cm')
      .eq('client_id', userId).single(),

    db.from('checkins').select('id, date')
      .eq('client_id', userId)
      .order('date', { ascending: false })
      .limit(1)
      .single(),

    computeStreak(db, userId),

    db.from('health_metrics').select('weight_kg, date')
      .eq('client_id', userId).not('weight_kg', 'is', null)
      .gte('date', monthStart.toISOString().split('T')[0])
      .order('date'),

    db.from('weekly_checkins').select('id, date, weight_kg')
      .eq('client_id', userId)
      .gte('date', weekStartDate)
      .order('date', { ascending: false })
      .limit(1)
      .single(),

    db.from('health_metrics').select('id, weight_kg, date')
      .eq('client_id', userId).not('weight_kg', 'is', null)
      .gte('date', weekStartDate)
      .order('date', { ascending: false }),
  ])

  // ── Compute derived data ──────────────────────────────

  const profile = profileRes.data
  const program = programRes.data
  const nutritionPlan = nutritionPlanRes.data
  const todayMealLogs = todayMealLogsRes.data || []
  const todaySummary = todaySummaryRes.data
  const todayWorkouts = todayWorkoutsRes.data || []
  const weekWorkouts = weekWorkoutsRes.data || []

  // Template-days komen nu uit de embed op client_programs — geen extra round-trip.
  const templateDaysRaw: any[] =
    (program as any)?.program_templates?.template_days || []
  const templateDays = [...templateDaysRaw].sort(
    (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  )

  const todayDow = (() => { const d = new Date().getDay(); return d === 0 ? 7 : d })()
  const schedule = (program?.schedule as Record<string, string>) || {}

  const todayDayId = schedule[String(todayDow)] || null
  const todayTemplateDay = todayDayId
    ? templateDays.find((d: any) => d.id === todayDayId) || null
    : null

  // Exercise-count voor vandaag komt uit de nested embed — geen aparte count-query meer.
  const todayExerciseCount: number | null =
    (todayTemplateDay as any)?.program_template_exercises?.[0]?.count ?? null

  let nextTrainingDay: any = null
  for (let offset = 1; offset <= 7; offset++) {
    const checkDow = ((todayDow - 1 + offset) % 7) + 1
    const nextDayId = schedule[String(checkDow)] || null
    if (nextDayId) {
      const found = templateDays.find((d: any) => d.id === nextDayId)
      if (found) {
        const dayNames = ['', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag']
        nextTrainingDay = { ...found, label: offset === 1 ? 'morgen' : dayNames[checkDow] }
        break
      }
    }
  }

  const todayWorkoutDone = todayWorkouts.some((w: any) => w.completed_at)
  const streak = streakResult

  // ── Inhaal-detectie ──────────────────────────────────────
  // Als er vandaag geen workout is (of de rustdag-sprint voorbij is), kijk dan
  // terug door de huidige week: eerste gescheduled-day die nog niet is voltooid
  // (via template_day_id-match over álle sessies deze week) wordt getoond als
  // inhaal-kandidaat. Reden: Glenn wil dat clients niet verloren lopen op
  // rustdagen — liever subtiel nudgen dat ze nog iets kunnen inhalen.
  const weekCompletedTemplateDayIds = new Set(
    (weekWorkouts || [])
      .map((w: any) => w.template_day_id)
      .filter((id: any): id is string => typeof id === 'string' && id.length > 0)
  )
  const dayNamesNl = ['', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag']
  let catchupTemplateDay: any = null
  let catchupMissedDow = 0
  for (let dow = 1; dow < todayDow; dow++) {
    const dayId = schedule[String(dow)] || null
    if (!dayId) continue
    if (weekCompletedTemplateDayIds.has(dayId)) continue
    const d = templateDays.find((x: any) => x.id === dayId)
    if (!d) continue
    catchupTemplateDay = d
    catchupMissedDow = dow
    break // chronologisch = oudste gemiste eerst
  }
  const catchupExerciseCount: number | null = catchupTemplateDay
    ? (catchupTemplateDay as any).program_template_exercises?.[0]?.count ?? null
    : null

  const planMeals = (nutritionPlan as any)?.meals || []
  const mealStatus = planMeals.map((meal: any, index: number) => {
    const mealId = meal.id || `meal-${index}-${(meal.name || '').toLowerCase().replace(/\s+/g, '-')}`
    const log = todayMealLogs.find((l: any) => l.meal_id === mealId || l.meal_name === meal.name)
    return {
      id: mealId,
      name: meal.name,
      time: meal.time || null,
      completed: log?.completed || false,
      items: (meal.items || meal.foods || []).map((item: any) => ({
        name: item.name,
        grams: item.grams || null,
        calories: item.calories || (item.per100g ? Math.round((item.per100g.calories * (item.grams || 100)) / 100) : 0),
        protein: item.protein || (item.per100g ? Math.round((item.per100g.protein * (item.grams || 100)) / 100) : 0),
      })),
      clientNotes: log?.client_notes || null,
    }
  })
  const computedCompleted = mealStatus.filter((m: any) => m.completed).length
  const mealsCompleted = computedCompleted > 0
    ? computedCompleted
    : (todaySummary as any)?.meals_completed || 0
  const mealsTotal = mealStatus.length || (todaySummary as any)?.meals_planned || 0

  const weightEntries = weightEntriesRes.data
  let weightChangeMonth: number | null = null
  if (weightEntries && weightEntries.length >= 2) {
    weightChangeMonth = +(weightEntries[weightEntries.length - 1].weight_kg - weightEntries[0].weight_kg).toFixed(1)
  }

  const promptRow = Array.isArray(promptsRes.data) && promptsRes.data.length > 0
    ? promptsRes.data[0]
    : null
  const pendingPrompt = promptRow
    ? { id: (promptRow as any).id, question: (promptRow as any).prompts?.question || null }
    : null

  const accountabilityPending = accountabilityRes.data
    ? !(accountabilityRes.data as any).responded
    : false

  const unreadBroadcastCount = (broadcastsRes.data || []).filter((b: any) => {
    const targets = b.target_clients || []
    const readBy = b.read_by || []
    return targets.includes(userId) && !readBy.includes(userId)
  }).length

  const intakeForm = intakeRes.data
  const onboardingComplete = !!profile?.intake_completed

  let onboardingStep = 0
  if (intakeForm) {
    if (intakeForm.primary_goal) onboardingStep = 2
    if (intakeForm.training_experience) onboardingStep = 3
    if (intakeForm.dietary_preferences) onboardingStep = 5
    if (intakeForm.weight_kg) onboardingStep = 7
    if ((intakeForm as any).photo_front_url) onboardingStep = 8
    if ((intakeForm as any).chest_cm) onboardingStep = 9
    if (intakeForm.completed) onboardingStep = 10
  }

  const weeklyCheckinDone = !!weeklyCheckinRes.data
  const weeklyCheckinData = weeklyCheckinRes.data
  const daysSinceStart = profile?.start_date
    ? Math.floor((Date.now() - new Date(profile.start_date).getTime()) / 86400000)
    : 0
  const weeklyCheckinShouldShow = daysSinceStart >= 7

  const weightLogsThisWeek = weightLogsThisWeekRes.data || []
  const weightLogCount = weightLogsThisWeek.length
  const lastWeightLog = weightLogsThisWeek.length > 0 ? weightLogsThisWeek[0] : null

  const lastCheckin = lastCheckinRes.data
  const checkInDueInfo = (() => {
    if (!profile?.start_date) return null
    const startDate = new Date(profile.start_date)
    const nowDate = new Date()
    const ds = Math.floor((nowDate.getTime() - startDate.getTime()) / 86400000)
    if (ds < 25) return null
    if (lastCheckin) {
      const lastCheckinDate = new Date(lastCheckin.date)
      const daysSinceLast = Math.floor((nowDate.getTime() - lastCheckinDate.getTime()) / 86400000)
      const daysUntilDue = 30 - daysSinceLast
      if (daysUntilDue <= 5) {
        return { daysUntil: Math.max(0, daysUntilDue), overdue: daysUntilDue < 0 }
      }
      return null
    } else {
      return { daysUntil: 0, overdue: true }
    }
  })()

  const pendingTodos: Array<{ key: string; label: string; sub: string; href: string; priority: 'high' | 'medium' }> = []

  // Coach vroeg een re-intake → eerste prioriteit op het dashboard.
  // We flippen `intake_completed` niet (dat zou de middleware-gate triggeren
  // en de klant hard naar /onboarding redirecten), dus de klant ziet dit als
  // zachte task en kan 'm op een moment-dat-het-past invullen.
  const reintakeRequestedAt =
    (profile as { reintake_requested_at?: string | null } | null)?.reintake_requested_at ?? null
  if (reintakeRequestedAt) {
    pendingTodos.push({
      key: 'reintake',
      label: 'Je coach vraagt je intake opnieuw in te vullen',
      sub: 'Paar minuten — zodat we je plan scherper kunnen maken',
      href: '/onboarding',
      priority: 'high',
    })
  }

  const hasPhotos = !!(intakeForm as any)?.photo_front_url
  if (!hasPhotos) {
    pendingTodos.push({
      key: 'photos',
      label: 'Voortgangsfoto\'s nemen',
      sub: 'Nodig voor je startpunt — duurt 2 min',
      href: '/client/check-in?step=photos',
      priority: 'high',
    })
  }
  const hasMeasurements = !!(intakeForm as any)?.chest_cm
  if (!hasMeasurements) {
    pendingTodos.push({
      key: 'measurements',
      label: 'Lichaamsafmetingen invullen',
      sub: 'Borst, taille, heupen, armen, benen',
      href: '/client/check-in?step=measurements',
      priority: 'high',
    })
  }
  if (hasPhotos && hasMeasurements && checkInDueInfo) {
    pendingTodos.push({
      key: 'monthly-checkin',
      label: checkInDueInfo.overdue ? 'Maandelijkse check-in is verlopen' : 'Maandelijkse check-in binnenkort',
      sub: checkInDueInfo.overdue
        ? 'Neem nieuwe foto\'s en afmetingen'
        : `Nog ${checkInDueInfo.daysUntil} dag${checkInDueInfo.daysUntil !== 1 ? 'en' : ''}`,
      href: '/client/check-in',
      priority: checkInDueInfo.overdue ? 'high' : 'medium',
    })
  }

  // ── Return data ──────────────────────────────────────────
  return {
    profile: profile ? {
      firstName: profile.full_name?.split(' ')[0] || '',
      startDate: profile.start_date,
    } : null,

    onboarding: {
      complete: onboardingComplete,
      currentStep: onboardingStep,
      totalSteps: 10,
    },

    training: {
      today: todayTemplateDay ? {
        id: todayTemplateDay.id,
        name: todayTemplateDay.name,
        focus: todayTemplateDay.focus,
        durationMin: todayTemplateDay.estimated_duration_min,
        exerciseCount: todayExerciseCount,
        completed: todayWorkoutDone,
      } : null,
      next: nextTrainingDay ? {
        name: nextTrainingDay.name,
        label: nextTrainingDay.label,
      } : null,
      // Gemiste workout deze week die nog ingehaald kan worden (chronologisch
      // oudste eerst). null als er niets in te halen is OF als vandaag al een
      // training heeft — inhaal-card surfaced enkel bij rustdag.
      catchup: catchupTemplateDay ? {
        id: catchupTemplateDay.id,
        name: catchupTemplateDay.name,
        focus: catchupTemplateDay.focus,
        durationMin: catchupTemplateDay.estimated_duration_min,
        exerciseCount: catchupExerciseCount,
        missedOnLabel: dayNamesNl[catchupMissedDow] || '',
      } : null,
      completedToday: todayWorkoutDone,
      isRestDay: !todayTemplateDay,
      scheduleDays: Object.entries(schedule).map(([weekday, dayId]) => {
        const day = templateDays.find((d: any) => d.id === dayId)
        return day ? { dayNumber: Number(weekday), name: day.name as string, focus: day.focus as string | null } : null
      }).filter((d): d is { dayNumber: number; name: string; focus: string | null } => d !== null),
      completedDates: (weekWorkouts || [])
        .filter((w: any) => w.completed_at)
        .map((w: any) => w.completed_at?.split('T')[0]),
    },

    nutrition: nutritionPlan ? {
      meals: mealStatus,
      mealsCompleted,
      mealsTotal,
      targets: {
        calories: nutritionPlan.calories_target,
        protein: nutritionPlan.protein_g,
        carbs: nutritionPlan.carbs_g,
        fat: nutritionPlan.fat_g,
      },
      consumed: {
        calories: (todaySummary as any)?.total_calories || 0,
        protein: (todaySummary as any)?.total_protein || 0,
        carbs: (todaySummary as any)?.total_carbs || 0,
        fat: (todaySummary as any)?.total_fat || 0,
      },
      planId: nutritionPlan.id,
    } : null,

    actions: {
      accountabilityPending,
      pendingPrompt,
      unreadMessages: messagesRes.count || 0,
      nextVideoCall: (() => {
        const vc = videoRes.data?.[0]
        if (!vc) return null
        const endTime = new Date(vc.scheduled_at).getTime() + ((vc.duration_minutes || 30) + 30) * 60000
        if (Date.now() > endTime) return null
        return { id: vc.id, scheduled_at: vc.scheduled_at }
      })(),
      checkInDue: checkInDueInfo,
    },

    weeklyCheckIn: weeklyCheckinShouldShow ? {
      submitted: weeklyCheckinDone,
      date: weeklyCheckinData?.date || null,
      weightKg: weeklyCheckinData?.weight_kg || null,
    } : null,

    weightLog: {
      entriesThisWeek: weightLogCount,
      targetPerWeek: 2,
      lastValue: lastWeightLog ? lastWeightLog.weight_kg : null,
      lastDate: lastWeightLog ? lastWeightLog.date : null,
    },

    momentum: {
      streakDays: streak,
      workoutsThisWeek: weekWorkouts.length,
      weightChangeMonth,
    },

    pendingTodos,

    notificationCount:
      (messagesRes.count || 0) +
      (pendingPrompt ? 1 : 0) +
      (accountabilityPending ? 1 : 0) +
      unreadBroadcastCount,
  }
}

// ── Helpers ──────────────────────────────────────────────

function getWeekStart() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff)).toISOString().split('T')[0] + 'T00:00:00'
}

function getWeekStartDate() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff)).toISOString().split('T')[0]
}

async function computeStreak(supabase: any, userId: string): Promise<number> {
  const sixtyDaysAgo = new Date()
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select('started_at, completed_at')
    .eq('client_id', userId)
    .not('completed_at', 'is', null)
    .gte('completed_at', sixtyDaysAgo.toISOString())
    .order('completed_at', { ascending: false })

  if (!sessions || sessions.length === 0) return 0

  // Streak keyed on completion day so late-completed workouts still count on the day they finished.
  const activeDates = new Set(
    sessions.map((s: any) => new Date(s.completed_at || s.started_at).toISOString().split('T')[0])
  )

  let streak = 0
  const today = new Date()
  for (let i = 0; i < 60; i++) {
    const checkDate = new Date(today)
    checkDate.setDate(checkDate.getDate() - i)
    const dateStr = checkDate.toISOString().split('T')[0]
    if (activeDates.has(dateStr)) {
      streak++
    } else if (i === 0) {
      continue
    } else {
      break
    }
  }

  return streak
}
