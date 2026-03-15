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
      // Fallback to regular client if no service role key
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
      return NextResponse.json({ program: null, days: [] })
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

    // Get workout count for this week
    const today = new Date()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const { count: workoutsThisWeek } = await adminClient
      .from('workout_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', user.id)
      .gte('started_at', weekStart.toISOString())
      .lte('started_at', new Date().toISOString())

    return NextResponse.json({
      program: activeProgram,
      days,
      workoutsThisWeek: workoutsThisWeek || 0,
    })
  } catch (error) {
    console.error('Error fetching client program:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
