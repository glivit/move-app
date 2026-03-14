import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs'
import path from 'path'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check coach role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'coach') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { client_id, period_weeks = 4, coach_notes = '' } = body

  if (!client_id) {
    return NextResponse.json({ error: 'client_id required' }, { status: 400 })
  }

  try {
    // ─── Gather all client data ─────────────────────

    const periodEnd = new Date()
    const periodStart = new Date()
    periodStart.setDate(periodStart.getDate() - period_weeks * 7)

    const startISO = periodStart.toISOString()
    const endISO = periodEnd.toISOString()
    const startDate = periodStart.toISOString().split('T')[0]
    const endDate = periodEnd.toISOString().split('T')[0]

    // Fetch client profile
    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('full_name, package, start_date')
      .eq('id', client_id)
      .single()

    // Fetch check-ins for body measurements
    const { data: checkins } = await supabase
      .from('checkins')
      .select('date, weight_kg, body_fat_pct, muscle_mass_kg, waist_cm')
      .eq('client_id', client_id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    // All check-ins for delta calculation
    const { data: allCheckins } = await supabase
      .from('checkins')
      .select('date, weight_kg, body_fat_pct, muscle_mass_kg')
      .eq('client_id', client_id)
      .order('date', { ascending: true })

    // Workout sessions in period
    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('id, started_at, completed_at, duration_seconds, mood_rating, difficulty_rating, feedback_text')
      .eq('client_id', client_id)
      .not('completed_at', 'is', null)
      .gte('started_at', startISO)
      .lte('started_at', endISO)
      .order('started_at', { ascending: true })

    // Workout sets for volume + PRs
    const sessionIds = (sessions || []).map((s: any) => s.id)
    let workoutSets: any[] = []
    if (sessionIds.length > 0) {
      const { data: setsData } = await supabase
        .from('workout_sets')
        .select('*, exercises(name, name_nl)')
        .in('workout_session_id', sessionIds)
        .eq('completed', true)

      workoutSets = setsData || []
    }

    // Personal records in period
    const { data: prsData } = await supabase
      .from('personal_records')
      .select('*, exercises(name, name_nl)')
      .eq('client_id', client_id)
      .gte('achieved_at', startISO)
      .order('achieved_at', { ascending: false })

    // Nutrition daily summaries
    const { data: nutritionData } = await supabase
      .from('nutrition_daily_summary')
      .select('*')
      .eq('client_id', client_id)
      .gte('date', startDate)
      .lte('date', endDate)

    // Nutrition plan (targets)
    const { data: nutritionPlan } = await supabase
      .from('nutrition_plans')
      .select('target_calories, target_protein, target_carbs, target_fat')
      .eq('client_id', client_id)
      .eq('is_active', true)
      .single()

    // Habits
    const { data: habitsData } = await supabase
      .from('habits')
      .select('id, name, icon')
      .eq('client_id', client_id)
      .eq('is_active', true)

    let habitStats: any[] = []
    if (habitsData && habitsData.length > 0) {
      const habitIds = habitsData.map((h: any) => h.id)
      const { data: completions } = await supabase
        .from('habit_completions')
        .select('habit_id, date, completed')
        .in('habit_id', habitIds)
        .gte('date', startDate)
        .lte('date', endDate)

      const totalDays = Math.max(1, period_weeks * 7)
      habitStats = habitsData.map((h: any) => {
        const hCompletions = (completions || []).filter((c: any) => c.habit_id === h.id && c.completed)
        // Calculate streak
        let streak = 0
        const today = new Date()
        for (let i = 0; i < 30; i++) {
          const d = new Date(today)
          d.setDate(d.getDate() - i)
          const dateStr = d.toISOString().split('T')[0]
          if (hCompletions.find((c: any) => c.date === dateStr)) {
            streak++
          } else {
            break
          }
        }

        return {
          name: h.name,
          icon: h.icon,
          streak,
          completion_pct: (hCompletions.length / totalDays) * 100,
        }
      })
    }

    // ─── Build report data ──────────────────────

    const allC = allCheckins || []
    const firstCheckin = allC[0]
    const lastCheckin = allC[allC.length - 1]

    const totalVolume = workoutSets.reduce((sum: number, s: any) => {
      return sum + (s.weight_kg || 0) * (s.actual_reps || 0)
    }, 0)

    const avgDuration = sessions && sessions.length > 0
      ? sessions.reduce((sum: number, s: any) => sum + (s.duration_seconds || 0), 0) / sessions.length / 60
      : 0

    // Weekly volume
    const weekMap: Record<string, number> = {}
    for (const s of workoutSets) {
      const date = new Date(s.created_at)
      const weekStart = new Date(date)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
      const weekKey = weekStart.toISOString().split('T')[0]
      weekMap[weekKey] = (weekMap[weekKey] || 0) + (s.weight_kg || 0) * (s.actual_reps || 0)
    }

    const weeklyVolume = Object.entries(weekMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, volume]) => {
        const d = new Date(date)
        const weekNum = Math.ceil(((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7)
        return { week: `W${weekNum}`, volume: Math.round(volume) }
      })

    // Nutrition averages
    const nutData = nutritionData || []
    const nutCount = Math.max(1, nutData.length)
    const avgCalories = nutData.reduce((s: number, n: any) => s + (n.total_calories || 0), 0) / nutCount
    const avgProtein = nutData.reduce((s: number, n: any) => s + (n.total_protein || 0), 0) / nutCount
    const avgCarbs = nutData.reduce((s: number, n: any) => s + (n.total_carbs || 0), 0) / nutCount
    const avgFat = nutData.reduce((s: number, n: any) => s + (n.total_fat || 0), 0) / nutCount
    const mealCompliance = nutData.length > 0
      ? nutData.reduce((s: number, n: any) => s + (n.meals_planned > 0 ? (n.meals_completed / n.meals_planned) * 100 : 0), 0) / nutCount
      : 0

    const reportData = {
      output_path: `/tmp/move-report-${client_id.slice(0, 8)}-${Date.now()}.pdf`,
      client: {
        name: clientProfile?.full_name || 'Cliënt',
        package: clientProfile?.package || 'essential',
      },
      period: {
        start: periodStart.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' }),
        end: periodEnd.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' }),
      },
      body: {
        current_weight: lastCheckin?.weight_kg || '-',
        current_bf: lastCheckin?.body_fat_pct || '-',
        weight_delta: lastCheckin?.weight_kg && firstCheckin?.weight_kg
          ? Number(lastCheckin.weight_kg) - Number(firstCheckin.weight_kg) : null,
        bf_delta: lastCheckin?.body_fat_pct && firstCheckin?.body_fat_pct
          ? Number(lastCheckin.body_fat_pct) - Number(firstCheckin.body_fat_pct) : null,
        measurements: (checkins || []).map((c: any) => ({
          date: new Date(c.date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' }),
          weight: c.weight_kg,
          body_fat: c.body_fat_pct,
          muscle: c.muscle_mass_kg,
          waist: c.waist_cm,
        })),
      },
      workouts: {
        total_sessions: sessions?.length || 0,
        total_volume: Math.round(totalVolume),
        avg_duration_min: avgDuration,
        total_prs: prsData?.length || 0,
        compliance_pct: period_weeks > 0 && sessions
          ? Math.round((sessions.length / (period_weeks * 3)) * 100) // Assume 3 sessions/week target
          : 0,
        weekly_volume: weeklyVolume,
      },
      prs: (prsData || []).map((pr: any) => ({
        exercise: pr.exercises?.name_nl || pr.exercises?.name || '',
        weight: pr.value,
        reps: pr.record_type === '1rm' ? 1 : '-',
        date: new Date(pr.achieved_at).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' }),
      })),
      nutrition: nutritionPlan ? {
        avg_calories: avgCalories,
        avg_protein: avgProtein,
        avg_carbs: avgCarbs,
        avg_fat: avgFat,
        target_calories: nutritionPlan.target_calories || 0,
        target_protein: nutritionPlan.target_protein || 0,
        target_carbs: nutritionPlan.target_carbs || 0,
        target_fat: nutritionPlan.target_fat || 0,
        meal_compliance_pct: mealCompliance,
      } : null,
      habits: {
        list: habitStats,
      },
      feedback: (sessions || [])
        .filter((s: any) => s.difficulty_rating || s.feedback_text)
        .map((s: any) => ({
          date: new Date(s.started_at).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' }),
          difficulty_rating: s.difficulty_rating,
          mood_rating: s.mood_rating,
          feedback_text: s.feedback_text,
        })),
      coach_notes,
    }

    // ─── Generate PDF ───────────────────────────

    const scriptPath = path.join(process.cwd(), 'scripts', 'generate_report.py')
    const jsonInputPath = `/tmp/report-input-${Date.now()}.json`

    writeFileSync(jsonInputPath, JSON.stringify(reportData), 'utf8')

    try {
      execSync(
        `python3 "${scriptPath}" < "${jsonInputPath}"`,
        { timeout: 30000 }
      )
    } finally {
      if (existsSync(jsonInputPath)) unlinkSync(jsonInputPath)
    }

    // Read PDF and return
    const pdfPath = reportData.output_path
    if (!existsSync(pdfPath)) {
      return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
    }

    const pdfBuffer = readFileSync(pdfPath)
    unlinkSync(pdfPath) // Clean up

    const filename = `MOVE-Rapport-${(clientProfile?.full_name || 'client').replace(/\s+/g, '-')}-${endDate}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('Report generation error:', error)
    return NextResponse.json({ error: error.message || 'Report generation failed' }, { status: 500 })
  }
}
