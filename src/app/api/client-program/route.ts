import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// GET: Fetch the active program for the authenticated client
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use admin client to bypass RLS on client_programs
    const { createAdminClient } = await import('@/lib/supabase-admin')
    let adminClient
    try {
      adminClient = createAdminClient()
    } catch {
      adminClient = supabase
    }

    // Get active program for this user
    const { data: activeProgram, error: programError } = await adminClient
      .from('client_programs')
      .select('*')
      .eq('client_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (programError || !activeProgram) {
      return NextResponse.json({ program: null, days: [], schedule: {} })
    }

    // Get template days + completed workouts in parallel
    const today = new Date()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const [templateDaysRes, completedSessionsRes] = await Promise.all([
      adminClient
        .from('program_template_days')
        .select('*')
        .eq('template_id', activeProgram.template_id)
        .order('sort_order', { ascending: true }),
      adminClient
        .from('workout_sessions')
        .select('template_day_id')
        .eq('client_id', user.id)
        .eq('client_program_id', activeProgram.id)
        .not('completed_at', 'is', null)
        .gte('started_at', weekStart.toISOString())
        .lte('started_at', new Date().toISOString()),
    ])

    const templateDays = templateDaysRes.data
    const completedSessions = completedSessionsRes.data

    // Get exercise counts for ALL days in a single query (fixes N+1)
    const dayIds = (templateDays || []).map((d: any) => d.id)
    const { data: allExercises } = dayIds.length > 0
      ? await adminClient
          .from('program_template_exercises')
          .select('template_day_id')
          .in('template_day_id', dayIds)
      : { data: [] }

    // Count exercises per day in memory
    const exerciseCountMap: Record<string, number> = {}
    for (const ex of allExercises || []) {
      exerciseCountMap[ex.template_day_id] = (exerciseCountMap[ex.template_day_id] || 0) + 1
    }

    const days = (templateDays || []).map((day: any) => ({
      ...day,
      exercise_count: exerciseCountMap[day.id] || 0,
    }))

    const uniqueCompletedDays = new Set(
      (completedSessions || []).map(s => s.template_day_id)
    )
    const workoutsThisWeek = uniqueCompletedDays.size

    // Schedule: map of weekday -> template_day_id
    const schedule = (activeProgram.schedule as Record<string, string>) || {}

    // Determine today's scheduled workout
    // ISO weekday: 1=Mon, 7=Sun. JS getDay: 0=Sun, 1=Mon...6=Sat
    const jsDay = today.getDay()
    const isoDay = jsDay === 0 ? 7 : jsDay
    const todayDayId = schedule[String(isoDay)] || null
    const todayDay = todayDayId ? days.find(d => d.id === todayDayId) || null : null
    const todayCompleted = todayDayId ? uniqueCompletedDays.has(todayDayId) : false

    const response = NextResponse.json({
      program: activeProgram,
      days,
      workoutsThisWeek,
      schedule,
      todayDay,
      todayCompleted,
    })
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300')
    return response
  } catch (error) {
    console.error('Error fetching client program:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
