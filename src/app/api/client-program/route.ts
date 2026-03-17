import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

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

    // Get template days
    const { data: templateDays } = await adminClient
      .from('program_template_days')
      .select('*')
      .eq('template_id', activeProgram.template_id)
      .order('sort_order', { ascending: true })

    // Get exercise counts for each day
    const days = []
    if (templateDays) {
      for (const day of templateDays) {
        const { count } = await adminClient
          .from('program_template_exercises')
          .select('*', { count: 'exact', head: true })
          .eq('template_day_id', day.id)

        days.push({
          ...day,
          exercise_count: count || 0,
        })
      }
    }

    // Get completed workouts for this week (only count completed, unique per day)
    const today = new Date()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const { data: completedSessions } = await adminClient
      .from('workout_sessions')
      .select('template_day_id')
      .eq('client_id', user.id)
      .eq('client_program_id', activeProgram.id)
      .not('completed_at', 'is', null)
      .gte('started_at', weekStart.toISOString())
      .lte('started_at', new Date().toISOString())

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

    return NextResponse.json({
      program: activeProgram,
      days,
      workoutsThisWeek,
      schedule,
      todayDay,
      todayCompleted,
    })
  } catch (error) {
    console.error('Error fetching client program:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
