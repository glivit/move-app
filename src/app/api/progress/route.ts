import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/progress
 * Returns all stats for the animated Voortgang overview page.
 * Uses admin client to bypass RLS (matches /api/client-program pattern).
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Use admin client to bypass RLS — queries still filter by user.id
    let db: ReturnType<typeof createAdminClient>
    try {
      db = createAdminClient()
    } catch {
      db = supabase as any
    }

    const now = new Date()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const ninetyDaysAgo = new Date(now)
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    // Week boundaries (Monday–Sunday)
    const dayOfWeek = now.getDay() // 0=Sun,1=Mon,..6=Sat
    const monday = new Date(now)
    monday.setHours(0, 0, 0, 0)
    monday.setDate(monday.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    const sunday = new Date(monday)
    sunday.setDate(sunday.getDate() + 7)
    const mondayStr = monday.toISOString().split('T')[0]
    const sundayStr = sunday.toISOString().split('T')[0]

    const [
      profileRes,
      workoutsAllRes,
      workouts30Res,
      prsRes,
      checkinsRes,
      nutritionLogsRes,
      streakSessions,
      thisWeekSessionsRes,
      thisWeekNutritionRes,
      activeNutritionPlanRes,
      thisWeekCheckInRes,
      coachRes,
      weeklyCheckInsRes,
      weeklyWeightsRes,
      intakeWeightRes,
    ] = await Promise.all([
      db.from('profiles').select('created_at, start_date, coach_id, height_cm').eq('id', user.id).single(),

      // All completed workouts
      db.from('workout_sessions').select('id, started_at, completed_at, duration_seconds')
        .eq('client_id', user.id).not('completed_at', 'is', null)
        .order('started_at', { ascending: false }),

      // Last 30 days workouts
      db.from('workout_sessions').select('id, started_at, completed_at, duration_seconds')
        .eq('client_id', user.id).not('completed_at', 'is', null)
        .gte('started_at', thirtyDaysAgo.toISOString()),

      // All PRs
      db.from('personal_records').select('id, exercise_id, record_type, value, achieved_at, exercises(name, name_nl)')
        .eq('client_id', user.id).order('achieved_at', { ascending: false }),

      // All check-ins (body metrics + photos + coach notes — full monthly dataset)
      db.from('checkins').select('id, date, weight_kg, body_fat_pct, muscle_mass_kg, chest_cm, waist_cm, hips_cm, left_arm_cm, right_arm_cm, left_thigh_cm, right_thigh_cm, left_calf_cm, right_calf_cm, photo_front_url, photo_back_url, coach_notes')
        .eq('client_id', user.id).order('date', { ascending: true }),

      // Last 30 days nutrition compliance
      db.from('nutrition_daily_summary').select('date, meals_planned, meals_completed')
        .eq('client_id', user.id).gte('date', thirtyDaysAgo.toISOString().split('T')[0]),

      // For streak computation
      db.from('workout_sessions').select('started_at, completed_at')
        .eq('client_id', user.id).not('completed_at', 'is', null)
        .gte('completed_at', ninetyDaysAgo.toISOString())
        .order('completed_at', { ascending: false }),

      // This week's sessions (for 7-dot rhythm) — dated by completion (workouts completed this week, regardless of when started)
      db.from('workout_sessions').select('started_at, completed_at')
        .eq('client_id', user.id)
        .not('completed_at', 'is', null)
        .gte('completed_at', monday.toISOString())
        .lt('completed_at', sunday.toISOString()),

      // This week's daily nutrition (for adherence bars)
      db.from('nutrition_daily_summary').select('date, total_calories')
        .eq('client_id', user.id)
        .gte('date', mondayStr)
        .lt('date', sundayStr),

      // Active nutrition plan for kcal target
      db.from('nutrition_plans').select('calories_target')
        .eq('client_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle(),

      // This week's check-in (lightweight)
      db.from('weekly_checkins').select('id, date')
        .eq('client_id', user.id)
        .gte('date', mondayStr)
        .lt('date', sundayStr)
        .maybeSingle(),

      // Coach identity (two-step: fetch profile then coach)
      (async () => {
        const { data: p } = await db.from('profiles').select('coach_id').eq('id', user.id).single()
        if (!p?.coach_id) return { data: null }
        return db.from('profiles').select('id, full_name').eq('id', p.coach_id).single()
      })(),

      // Weekly check-ins history (last 12)
      db.from('weekly_checkins').select('id, date, energy_level, sleep_quality, nutrition_adherence, notes, weight_kg')
        .eq('client_id', user.id)
        .order('date', { ascending: false })
        .limit(12),

      // All weekly check-ins with weight (for weight journey — no limit, just the weight+date)
      db.from('weekly_checkins').select('date, weight_kg')
        .eq('client_id', user.id)
        .not('weight_kg', 'is', null)
        .order('date', { ascending: true }),

      // Intake form weight (starting point)
      db.from('intake_forms').select('weight_kg, created_at')
        .eq('client_id', user.id)
        .not('weight_kg', 'is', null)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ])

    const profile = profileRes.data
    const allWorkouts = workoutsAllRes.data || []
    const workouts30 = workouts30Res.data || []
    const prs = prsRes.data || []
    const checkins = checkinsRes.data || []
    const nutritionLogs = nutritionLogsRes.data || []

    // ── Streak ────────────────────────────────────────────
    // Streak uses completion date so late-completed workouts still extend the streak on the day they finished.
    const activeDates = new Set(
      (streakSessions.data || []).map((s: any) =>
        new Date(s.completed_at || s.started_at).toISOString().split('T')[0]
      )
    )
    let streak = 0
    for (let i = 0; i < 90; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const ds = d.toISOString().split('T')[0]
      if (activeDates.has(ds)) { streak++ }
      else if (i === 0) { continue }
      else { break }
    }

    // ── Days on program ──────────────────────────────────
    const startDate = profile?.start_date || profile?.created_at
    const daysOnProgram = startDate
      ? Math.floor((now.getTime() - new Date(startDate).getTime()) / 86400000)
      : 0

    // ── Total workouts & time ────────────────────────────
    const totalWorkouts = allWorkouts.length
    const totalMinutes = Math.round(
      allWorkouts.reduce((acc: number, w: any) => acc + (w.duration_seconds || 0), 0) / 60
    )
    const avgSessionMin = totalWorkouts > 0 ? Math.round(totalMinutes / totalWorkouts) : 0

    // ── Workouts per week (last 30 days) ─────────────────
    const workoutsPerWeek = workouts30.length > 0
      ? +(workouts30.length / (30 / 7)).toFixed(1)
      : 0

    // ── Weekly workout chart (last 12 weeks) ─────────────
    const weeklyWorkouts: { week: string; count: number }[] = []
    for (let w = 11; w >= 0; w--) {
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - (w * 7 + now.getDay()))
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)

      const count = allWorkouts.filter((s: any) => {
        const d = new Date(s.started_at)
        return d >= weekStart && d < weekEnd
      }).length

      const weekLabel = `W${12 - w}`
      weeklyWorkouts.push({ week: weekLabel, count })
    }

    // ── Weight journey ───────────────────────────────────
    // Merge weight entries from 3 sources: intake form (baseline), weekly check-ins, monthly check-ins.
    // Priority on date collision: monthly > weekly > intake (more complete data wins).
    const weightByDate = new Map<string, { weight: number; source: 'intake' | 'weekly' | 'monthly' }>()

    // 1. Intake form (one-time baseline)
    const intakeWeight = intakeWeightRes.data as any
    if (intakeWeight?.weight_kg && intakeWeight.created_at) {
      const d = intakeWeight.created_at.split('T')[0]
      weightByDate.set(d, { weight: Number(intakeWeight.weight_kg), source: 'intake' })
    }

    // 2. Weekly check-ins (regular weigh-ins)
    const weeklyWeights = (weeklyWeightsRes.data as any[]) || []
    for (const w of weeklyWeights) {
      if (!w.weight_kg || !w.date) continue
      const d = String(w.date).split('T')[0]
      const existing = weightByDate.get(d)
      if (!existing || existing.source === 'intake') {
        weightByDate.set(d, { weight: Number(w.weight_kg), source: 'weekly' })
      }
    }

    // 3. Monthly check-ins (highest priority — full body data)
    for (const c of checkins) {
      if (!c.weight_kg || !c.date) continue
      const d = String(c.date).split('T')[0]
      weightByDate.set(d, { weight: Number(c.weight_kg), source: 'monthly' })
    }

    const weightData = Array.from(weightByDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({
        date,
        weight: v.weight,
        label: new Date(date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' }),
      }))

    const weightStart = weightData.length > 0 ? weightData[0].weight : null
    const weightCurrent = weightData.length > 0 ? weightData[weightData.length - 1].weight : null
    const weightChange = weightStart && weightCurrent ? +(weightCurrent - weightStart).toFixed(1) : null

    // ── Body measurements (latest value + delta vs. previous) ──
    const measurementKeys = [
      { key: 'chest_cm', label: 'Borst' },
      { key: 'waist_cm', label: 'Taille' },
      { key: 'hips_cm', label: 'Heup' },
      { key: 'arm_cm', label: 'Arm', avg: ['left_arm_cm', 'right_arm_cm'] as const },
      { key: 'thigh_cm', label: 'Dij', avg: ['left_thigh_cm', 'right_thigh_cm'] as const },
      { key: 'calf_cm', label: 'Kuit', avg: ['left_calf_cm', 'right_calf_cm'] as const },
    ]
    const avg = (a: number | null | undefined, b: number | null | undefined): number | null => {
      const aN = typeof a === 'number' ? a : null
      const bN = typeof b === 'number' ? b : null
      if (aN !== null && bN !== null) return +((aN + bN) / 2).toFixed(1)
      if (aN !== null) return aN
      if (bN !== null) return bN
      return null
    }
    const getVal = (c: any, k: { key: string; avg?: readonly string[] }): number | null => {
      if (k.avg) return avg(c[k.avg[0]], c[k.avg[1]])
      return typeof c[k.key] === 'number' ? Number(c[k.key]) : null
    }
    const measurements = measurementKeys.map((mk) => {
      // Find most recent checkin with this measurement + the one before that
      const withMeas = [...checkins].reverse().filter((c: any) => getVal(c, mk) !== null)
      const current = withMeas[0] ? getVal(withMeas[0], mk) : null
      const prev = withMeas[1] ? getVal(withMeas[1], mk) : null
      const delta = current !== null && prev !== null ? +(current - prev).toFixed(1) : null
      return { key: mk.key, label: mk.label, current, delta }
    })

    // ── Body fat ─────────────────────────────────────────
    const bodyFatData = checkins
      .filter((c: any) => c.body_fat_pct)
      .map((c: any) => ({
        date: c.date,
        value: Number(c.body_fat_pct),
        label: new Date(c.date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' }),
      }))

    // ── Lean mass + height ────────────────────────────────
    const heightCm = (profile as any)?.height_cm ? Number((profile as any).height_cm) : null
    const latestWithBf = [...checkins].reverse().find((c: any) => c.weight_kg && c.body_fat_pct)
    const leanMassCurrent = latestWithBf
      ? +(Number(latestWithBf.weight_kg) * (1 - Number(latestWithBf.body_fat_pct) / 100)).toFixed(1)
      : null
    const bodyFatCurrent = bodyFatData.length > 0 ? bodyFatData[bodyFatData.length - 1].value : null

    // ── Photos list (dates + front-url, newest first) ────
    const photoList = checkins
      .filter((c: any) => c.photo_front_url || c.photo_back_url)
      .map((c: any) => ({
        date: c.date,
        frontUrl: c.photo_front_url || null,
        backUrl: c.photo_back_url || null,
      }))
      .reverse()

    // ── Photos (legacy field kept for back-compat) ───────
    const photoDates = checkins
      .filter((c: any) => c.photo_front_url || c.photo_back_url)
      .map((c: any) => ({ date: c.date, hasFront: !!c.photo_front_url, hasBack: !!c.photo_back_url }))

    // ── PRs ──────────────────────────────────────────────
    const recentPrs = prs.slice(0, 5).map((pr: any) => ({
      id: pr.id,
      exercise: (Array.isArray(pr.exercises) ? pr.exercises[0] : pr.exercises)?.name_nl
        || (Array.isArray(pr.exercises) ? pr.exercises[0] : pr.exercises)?.name
        || 'Oefening',
      value: pr.value,
      type: pr.record_type,
      date: pr.achieved_at,
    }))
    const totalPrs = prs.length
    const prsThisMonth = prs.filter((pr: any) => new Date(pr.achieved_at) >= thirtyDaysAgo).length

    // ── Nutrition compliance (overall last 30 days) ──────
    const totalPlanned = nutritionLogs.reduce((a: number, l: any) => a + (l.meals_planned || 0), 0)
    const totalCompleted = nutritionLogs.reduce((a: number, l: any) => a + (l.meals_completed || 0), 0)
    const nutritionCompliance = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : null

    // ── This week's daily rhythm (Mo–Su) ─────────────────
    // Dot position follows completion day, not start day — workouts done late still count on the day they finished.
    const trainedDates = new Set(
      (thisWeekSessionsRes.data || []).map((s: any) =>
        new Date(s.completed_at || s.started_at).toISOString().split('T')[0]
      )
    )

    const kcalTarget = (activeNutritionPlanRes.data as any)?.calories_target || null
    const kcalByDate = new Map<string, number>()
    for (const log of (thisWeekNutritionRes.data || []) as any[]) {
      kcalByDate.set(log.date, log.total_calories || 0)
    }

    const todayStr = now.toISOString().split('T')[0]
    const weekDays: Array<{
      date: string
      dayLabel: string
      trained: boolean
      isToday: boolean
      isFuture: boolean
      kcalPct: number | null
      withinBudget: boolean | null
    }> = []
    const dayLabels = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      const ds = d.toISOString().split('T')[0]
      const kcal = kcalByDate.get(ds)
      let kcalPct: number | null = null
      let withinBudget: boolean | null = null
      if (kcalTarget && kcal !== undefined) {
        kcalPct = Math.round((kcal / kcalTarget) * 100)
        withinBudget = kcal >= kcalTarget * 0.8 && kcal <= kcalTarget * 1.1
      }
      weekDays.push({
        date: ds,
        dayLabel: dayLabels[i],
        trained: trainedDates.has(ds),
        isToday: ds === todayStr,
        isFuture: d > now,
        kcalPct,
        withinBudget,
      })
    }

    const thisWeekWorkouts = weekDays.filter((d) => d.trained).length
    const weekTarget = 4 // default weekly workout target; can be personalised later

    // ── This week adherence % ────────────────────────────
    const trackedDays = weekDays.filter((d) => d.kcalPct !== null && !d.isFuture)
    const withinBudgetDays = trackedDays.filter((d) => d.withinBudget).length
    const weekAdherence = trackedDays.length > 0
      ? Math.round((withinBudgetDays / trackedDays.length) * 100)
      : null

    // ── Week streak (consecutive weeks with ≥1 workout) ──
    let weekStreak = 0
    for (let wk = 0; wk < 52; wk++) {
      const wkStart = new Date(monday)
      wkStart.setDate(wkStart.getDate() - wk * 7)
      const wkEnd = new Date(wkStart)
      wkEnd.setDate(wkEnd.getDate() + 7)
      const anyWorkout = allWorkouts.some((s: any) => {
        const d = new Date(s.completed_at || s.started_at)
        return d >= wkStart && d < wkEnd
      })
      if (anyWorkout) weekStreak++
      else if (wk === 0) continue
      else break
    }

    // ── Coach + weekly check-in status ───────────────────
    const coach = coachRes?.data ? {
      id: (coachRes.data as any).id,
      name: (coachRes.data as any).full_name || 'Je coach',
    } : null

    const weeklyCheckIn = {
      pending: !thisWeekCheckInRes.data,
      weekStart: mondayStr,
    }

    // ── Monthly check-ins (from checkins table, enriched with month stats) ──
    const monthlyCheckIns = [...(checkins as any[])].reverse().slice(0, 12).map((c: any) => {
      const d = new Date(c.date)
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1)
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1)
      const workoutsInMonth = allWorkouts.filter((s: any) => {
        const sd = new Date(s.started_at)
        return sd >= mStart && sd < mEnd
      }).length
      // Previous check-in (for weight/waist delta)
      const idx = checkins.findIndex((cc: any) => cc.id === c.id)
      const prev = idx > 0 ? (checkins as any[])[idx - 1] : null
      return {
        id: c.id,
        date: c.date,
        weightKg: c.weight_kg ? Number(c.weight_kg) : null,
        weightDelta: c.weight_kg && prev?.weight_kg ? +(Number(c.weight_kg) - Number(prev.weight_kg)).toFixed(1) : null,
        waistCm: c.waist_cm ? Number(c.waist_cm) : null,
        waistDelta: c.waist_cm && prev?.waist_cm ? +(Number(c.waist_cm) - Number(prev.waist_cm)).toFixed(1) : null,
        bodyFatPct: c.body_fat_pct ? Number(c.body_fat_pct) : null,
        photoFrontUrl: c.photo_front_url || null,
        photoBackUrl: c.photo_back_url || null,
        coachNotes: c.coach_notes || null,
        workoutsInMonth,
      }
    })

    // ── Weekly check-ins history ──────────────────────────
    const weeklyHistory = ((weeklyCheckInsRes.data || []) as any[]).map((w: any) => ({
      id: w.id,
      date: w.date,
      weightKg: w.weight_kg ? Number(w.weight_kg) : null,
      energyLevel: w.energy_level,
      sleepQuality: w.sleep_quality,
      nutritionAdherence: w.nutrition_adherence,
      notes: w.notes || null,
    }))

    const response = NextResponse.json({
      headline: {
        daysOnProgram,
        streak,
        totalWorkouts,
        totalPrs,
      },
      training: {
        totalMinutes,
        avgSessionMin,
        workoutsPerWeek,
        workoutsThisMonth: workouts30.length,
        weeklyChart: weeklyWorkouts,
      },
      body: {
        weightData,
        weightStart,
        weightCurrent,
        weightChange,
        bodyFatData,
        bodyFatCurrent,
        heightCm,
        leanMassCurrent,
        measurements,
        photos: photoList,
        photoDates,
        hasPhotos: photoDates.length > 0,
      },
      strength: {
        recentPrs,
        totalPrs,
        prsThisMonth,
      },
      nutrition: {
        compliance: nutritionCompliance,
        daysTracked: nutritionLogs.length,
      },
      // ── Overzicht-tab payload ─────────────────────────
      week: {
        target: weekTarget,
        done: thisWeekWorkouts,
        days: weekDays,
        kcalTarget,
        adherence: weekAdherence,
      },
      weeklyCheckIn,
      checkIns: {
        monthly: monthlyCheckIns,
        weekly: weeklyHistory,
      },
      coach,
      summary: {
        weekStreak,
        totalWorkouts,
        totalPrs,
        adherence: weekAdherence,
      },
    })
    response.headers.set('Cache-Control', 'private, max-age=120, stale-while-revalidate=600')
    return response
  } catch (err) {
    console.error('Progress API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
