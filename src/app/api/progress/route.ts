import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/progress
 * Returns all stats for the animated Voortgang overview page.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const now = new Date()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const ninetyDaysAgo = new Date(now)
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const [
      profileRes,
      workoutsAllRes,
      workouts30Res,
      prsRes,
      checkinsRes,
      nutritionLogsRes,
      streakSessions,
    ] = await Promise.all([
      supabase.from('profiles').select('created_at, start_date').eq('id', user.id).single(),

      // All completed workouts
      supabase.from('workout_sessions').select('id, started_at, completed_at, duration_seconds')
        .eq('client_id', user.id).not('completed_at', 'is', null)
        .order('started_at', { ascending: false }),

      // Last 30 days workouts
      supabase.from('workout_sessions').select('id, started_at, completed_at, duration_seconds')
        .eq('client_id', user.id).not('completed_at', 'is', null)
        .gte('started_at', thirtyDaysAgo.toISOString()),

      // All PRs
      supabase.from('personal_records').select('id, exercise_id, record_type, value, achieved_at, exercises(name, name_nl)')
        .eq('client_id', user.id).order('achieved_at', { ascending: false }),

      // All check-ins (for weight/body data)
      supabase.from('checkins').select('id, date, weight, body_fat_pct, photo_front_url, photo_back_url')
        .eq('client_id', user.id).order('date', { ascending: true }),

      // Last 30 days nutrition compliance
      supabase.from('nutrition_daily_summary').select('date, meals_planned, meals_completed')
        .eq('client_id', user.id).gte('date', thirtyDaysAgo.toISOString().split('T')[0]),

      // For streak computation
      supabase.from('workout_sessions').select('started_at')
        .eq('client_id', user.id).not('completed_at', 'is', null)
        .gte('started_at', ninetyDaysAgo.toISOString())
        .order('started_at', { ascending: false }),
    ])

    const profile = profileRes.data
    const allWorkouts = workoutsAllRes.data || []
    const workouts30 = workouts30Res.data || []
    const prs = prsRes.data || []
    const checkins = checkinsRes.data || []
    const nutritionLogs = nutritionLogsRes.data || []

    // ── Streak ────────────────────────────────────────────
    const activeDates = new Set(
      (streakSessions.data || []).map((s: any) => new Date(s.started_at).toISOString().split('T')[0])
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
    const weightData = checkins
      .filter((c: any) => c.weight)
      .map((c: any) => ({
        date: c.date,
        weight: c.weight,
        label: new Date(c.date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' }),
      }))

    const weightStart = weightData.length > 0 ? weightData[0].weight : null
    const weightCurrent = weightData.length > 0 ? weightData[weightData.length - 1].weight : null
    const weightChange = weightStart && weightCurrent ? +(weightCurrent - weightStart).toFixed(1) : null

    // ── Body fat ─────────────────────────────────────────
    const bodyFatData = checkins
      .filter((c: any) => c.body_fat_pct)
      .map((c: any) => ({
        date: c.date,
        value: c.body_fat_pct,
        label: new Date(c.date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' }),
      }))

    // ── Photos ───────────────────────────────────────────
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

    // ── Nutrition compliance ─────────────────────────────
    const totalPlanned = nutritionLogs.reduce((a: number, l: any) => a + (l.meals_planned || 0), 0)
    const totalCompleted = nutritionLogs.reduce((a: number, l: any) => a + (l.meals_completed || 0), 0)
    const nutritionCompliance = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : null

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
    })
    response.headers.set('Cache-Control', 'private, max-age=120, stale-while-revalidate=600')
    return response
  } catch (err) {
    console.error('Progress API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
