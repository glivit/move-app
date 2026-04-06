import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/dashboard
 * Single endpoint that returns everything the client dashboard needs.
 * Reduces waterfall requests from ~10 to 1.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toISOString()

    // ── All parallel fetches ──────────────────────────────
    const monthStart = new Date()
    monthStart.setDate(1)

    const weekStartDate = getWeekStartDate()

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
      // Profile (include intake_completed for onboarding)
      supabase.from('profiles').select('id, full_name, role, package, start_date, intake_completed')
        .eq('id', user.id).single(),

      // Active program with template days
      supabase.from('client_programs').select(`
        id, name, start_date, is_active, current_week, template_id,
        program_template_days(id, day_number, name, focus, estimated_duration_min)
      `).eq('client_id', user.id).eq('is_active', true).single(),

      // Active nutrition plan with meals
      supabase.from('nutrition_plans').select('id, title, calories_target, protein_g, carbs_g, fat_g, meals')
        .eq('client_id', user.id).eq('is_active', true).single(),

      // Today's meal logs
      supabase.from('nutrition_logs').select('meal_id, meal_name, completed, completed_at, client_notes')
        .eq('client_id', user.id).eq('date', today),

      // Today's nutrition summary
      supabase.from('nutrition_daily_summary').select('meals_planned, meals_completed, total_calories, total_protein, total_carbs, total_fat')
        .eq('client_id', user.id).eq('date', today).single(),

      // Today's workout sessions
      supabase.from('workout_sessions').select('id, started_at, completed_at, template_day_id')
        .eq('client_id', user.id).gte('started_at', `${today}T00:00:00`).lte('started_at', `${today}T23:59:59`),

      // This week's completed workouts (for momentum strip)
      supabase.from('workout_sessions').select('id, completed_at')
        .eq('client_id', user.id).not('completed_at', 'is', null)
        .gte('started_at', getWeekStart()),

      // Unread messages count
      supabase.from('messages').select('id', { count: 'exact', head: true })
        .eq('receiver_id', user.id).is('read_at', null),

      // Next video call — only truly future, not completed or cancelled
      supabase.from('video_sessions').select('id, scheduled_at, duration_minutes')
        .eq('client_id', user.id).in('status', ['scheduled'])
        .gte('scheduled_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .order('scheduled_at').limit(1),

      // Today's accountability check
      supabase.from('accountability_responses').select('id, responded')
        .eq('client_id', user.id).eq('date', today).single(),

      // Pending prompts (coach sent, client hasn't responded)
      supabase.from('prompt_responses').select('id, prompt_id, prompts(question)')
        .eq('client_id', user.id).eq('response', '')
        .order('created_at', { ascending: false }).limit(1),

      // Unread broadcasts targeted at this client
      supabase.from('broadcasts')
        .select('id, title, content, created_at, target_clients, read_by')
        .order('created_at', { ascending: false })
        .limit(20),

      // Intake form (for onboarding progress)
      supabase.from('intake_forms').select('id, completed, primary_goal, training_experience, dietary_preferences, weight_kg, photo_front_url, chest_cm')
        .eq('client_id', user.id).single(),

      // Last check-in (for monthly check-in reminder)
      supabase.from('checkins').select('id, date')
        .eq('client_id', user.id)
        .order('date', { ascending: false })
        .limit(1)
        .single(),

      // Streak (was sequential before — now parallel)
      computeStreak(supabase, user.id),

      // Weight change this month (was sequential before — now parallel)
      supabase.from('health_metrics').select('value, measured_at')
        .eq('client_id', user.id).eq('metric_type', 'weight')
        .gte('measured_at', monthStart.toISOString())
        .order('measured_at'),

      // Weekly check-in this week (has the client submitted?)
      supabase.from('weekly_checkins').select('id, date, weight_kg')
        .eq('client_id', user.id)
        .gte('date', weekStartDate)
        .order('date', { ascending: false })
        .limit(1)
        .single(),

      // Weight logs this week (for 2x/week minimum tracking)
      supabase.from('health_metrics').select('id, value, measured_at')
        .eq('client_id', user.id).eq('metric_type', 'weight')
        .gte('measured_at', `${weekStartDate}T00:00:00`)
        .order('measured_at', { ascending: false }),
    ])

    // ── Compute derived data ──────────────────────────────

    const profile = profileRes.data
    const program = programRes.data
    const nutritionPlan = nutritionPlanRes.data
    const todayMealLogs = todayMealLogsRes.data || []
    const todaySummary = todaySummaryRes.data
    const todayWorkouts = todayWorkoutsRes.data || []
    const weekWorkouts = weekWorkoutsRes.data || []

    // Today's day of week (1=Monday, 7=Sunday)
    const todayDow = (() => { const d = new Date().getDay(); return d === 0 ? 7 : d })()

    // Today's scheduled workout from program
    const todayTemplateDay = program?.program_template_days?.find(
      (d: any) => d.day_number === todayDow
    )

    // Next training day (look ahead up to 7 days)
    let nextTrainingDay: any = null
    if (program?.program_template_days) {
      const days = program.program_template_days as any[]
      for (let offset = 1; offset <= 7; offset++) {
        const checkDow = ((todayDow - 1 + offset) % 7) + 1
        const found = days.find((d: any) => d.day_number === checkDow)
        if (found) {
          const dayNames = ['', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag']
          nextTrainingDay = {
            ...found,
            label: offset === 1 ? 'morgen' : dayNames[checkDow],
          }
          break
        }
      }
    }

    // Today's workout completed?
    const todayWorkoutDone = todayWorkouts.some((w: any) => w.completed_at)

    // Streak (fetched in parallel above)
    const streak = streakResult

    // Meals from nutrition plan — ensure each meal has a unique ID
    const planMeals = (nutritionPlan as any)?.meals || []
    const mealStatus = planMeals.map((meal: any, index: number) => {
      // Generate stable unique ID: use meal.id if it exists, otherwise create from name+index
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
    // Use the computed count from meal matching, but fall back to the
    // nutrition_daily_summary which is always updated by the POST handler
    const computedCompleted = mealStatus.filter((m: any) => m.completed).length
    const mealsCompleted = computedCompleted > 0
      ? computedCompleted
      : (todaySummary as any)?.meals_completed || 0
    const mealsTotal = mealStatus.length || (todaySummary as any)?.meals_planned || 0

    // Weight change this month (fetched in parallel above)
    const weightEntries = weightEntriesRes.data
    let weightChangeMonth: number | null = null
    if (weightEntries && weightEntries.length >= 2) {
      weightChangeMonth = +(weightEntries[weightEntries.length - 1].value - weightEntries[0].value).toFixed(1)
    }

    // Pending prompt question — promptsRes.data is an array (no .single())
    const promptRow = Array.isArray(promptsRes.data) && promptsRes.data.length > 0
      ? promptsRes.data[0]
      : null
    const pendingPrompt = promptRow
      ? {
          id: (promptRow as any).id,
          question: (promptRow as any).prompts?.question || null,
        }
      : null

    // Accountability pending?
    const accountabilityPending = accountabilityRes.data
      ? !(accountabilityRes.data as any).responded
      : false

    // Unread broadcasts count — targeted at this user and not yet read
    const unreadBroadcastCount = (broadcastsRes.data || []).filter((b: any) => {
      const targets = b.target_clients || []
      const readBy = b.read_by || []
      return targets.includes(user.id) && !readBy.includes(user.id)
    }).length

    // ── Onboarding progress ────────────────────────────────
    const intakeForm = intakeRes.data
    const onboardingComplete = !!profile?.intake_completed

    // Calculate onboarding step progress (matches /onboarding page steps)
    // Steps: 0=welcome, 1=goals, 2=training, 3=health, 4=nutrition, 5=lifestyle, 6=measurements, 7=photos, 8=tape, 9=done
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

    // ── Weekly check-in status ─────────────────────────────
    const weeklyCheckinDone = !!weeklyCheckinRes.data
    const weeklyCheckinData = weeklyCheckinRes.data
    // Only show weekly check-in after 7 days (not right after onboarding)
    const daysSinceStart = profile?.start_date
      ? Math.floor((Date.now() - new Date(profile.start_date).getTime()) / 86400000)
      : 0
    const weeklyCheckinShouldShow = daysSinceStart >= 7

    // ── Weight log frequency this week ───────────────────
    const weightLogsThisWeek = weightLogsThisWeekRes.data || []
    const weightLogCount = weightLogsThisWeek.length
    const lastWeightLog = weightLogsThisWeek.length > 0 ? weightLogsThisWeek[0] : null

    // ── Check-in due (improved logic) ────────────────────
    const lastCheckin = lastCheckinRes.data
    const checkInDueInfo = (() => {
      if (!profile?.start_date) return null

      const startDate = new Date(profile.start_date)
      const nowDate = new Date()

      // If the client just started (less than 25 days ago), no check-in needed yet
      const daysSinceStart = Math.floor((nowDate.getTime() - startDate.getTime()) / 86400000)
      if (daysSinceStart < 25) return null

      if (lastCheckin) {
        // Days since last check-in
        const lastCheckinDate = new Date(lastCheckin.date)
        const daysSinceLast = Math.floor((nowDate.getTime() - lastCheckinDate.getTime()) / 86400000)

        // Check-in is due when it's been ~30 days since the last one
        // Show reminder from 5 days before due, and stay visible until done
        const daysUntilDue = 30 - daysSinceLast
        if (daysUntilDue <= 5) {
          return {
            daysUntil: Math.max(0, daysUntilDue),
            overdue: daysUntilDue < 0,
          }
        }
        return null
      } else {
        // Never done a check-in — due now (if > 25 days active)
        return { daysUntil: 0, overdue: true }
      }
    })()

    // ── Response ──────────────────────────────────────────

    const response = NextResponse.json({
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
          exerciseCount: null, // Could be computed from template
          completed: todayWorkoutDone,
        } : null,
        next: nextTrainingDay ? {
          name: nextTrainingDay.name,
          label: nextTrainingDay.label,
        } : null,
        completedToday: todayWorkoutDone,
        isRestDay: !todayTemplateDay,
        // All scheduled training days (day_number → name) for calendar
        scheduleDays: (program?.program_template_days || []).map((d: any) => ({
          dayNumber: d.day_number,
          name: d.name,
          focus: d.focus,
        })),
        // Recent completed workout dates for calendar dots
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
          // Only show if the call hasn't ended yet (scheduled_at + duration + 30min buffer)
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
        lastValue: lastWeightLog ? lastWeightLog.value : null,
        lastDate: lastWeightLog ? lastWeightLog.measured_at : null,
      },

      momentum: {
        streakDays: streak,
        workoutsThisWeek: weekWorkouts.length,
        weightChangeMonth,
      },

      // Total notification count for badge
      notificationCount:
        (messagesRes.count || 0) +
        (pendingPrompt ? 1 : 0) +
        (accountabilityPending ? 1 : 0) +
        unreadBroadcastCount,
    })

    // Allow browser to cache for 30s, serve stale for 120s while revalidating
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=120')
    return response
  } catch (err) {
    console.error('Dashboard API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
  // Get last 60 days of workout sessions
  const sixtyDaysAgo = new Date()
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select('started_at, completed_at')
    .eq('client_id', userId)
    .not('completed_at', 'is', null)
    .gte('started_at', sixtyDaysAgo.toISOString())
    .order('started_at', { ascending: false })

  if (!sessions || sessions.length === 0) return 0

  // Unique active dates
  const activeDates = new Set(
    sessions.map((s: any) => new Date(s.started_at).toISOString().split('T')[0])
  )

  // Count consecutive days back from today (including rest days as part of streak
  // if the next training day was completed)
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 60; i++) {
    const checkDate = new Date(today)
    checkDate.setDate(checkDate.getDate() - i)
    const dateStr = checkDate.toISOString().split('T')[0]

    if (activeDates.has(dateStr)) {
      streak++
    } else if (i === 0) {
      // Today doesn't need to be active yet — still counting
      continue
    } else {
      break
    }
  }

  return streak
}
