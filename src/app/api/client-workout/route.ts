import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// GET: Fetch exercises for a specific workout day
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dayId = searchParams.get('dayId')

    if (!dayId) {
      return NextResponse.json({ error: 'Missing dayId' }, { status: 400 })
    }

    // Use admin client to bypass RLS
    const { createAdminClient } = await import('@/lib/supabase-admin')
    let adminClient
    try {
      adminClient = createAdminClient()
    } catch {
      adminClient = supabase
    }

    // Fetch exercises for this day with joined exercise details
    const { data: exercisesData, error } = await adminClient
      .from('program_template_exercises')
      .select('*, exercises(*)')
      .eq('template_day_id', dayId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching exercises:', error)
      return NextResponse.json({ error: 'Failed to fetch exercises' }, { status: 500 })
    }

    // Get last workout's complete set data for each exercise (per-set weight × reps)
    const lastWeights: Record<string, number | null> = {}
    const previousSets: Record<string, Array<{ set_number: number; weight_kg: number | null; actual_reps: number | null }>> = {}

    if (exercisesData) {
      // Find the most recent completed workout session for this day
      const { data: lastSession } = await adminClient
        .from('workout_sessions')
        .select('id')
        .eq('client_id', user.id)
        .eq('template_day_id', dayId)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single()

      for (const ex of exercisesData) {
        // Get all completed sets from last session for this exercise
        if (lastSession) {
          const { data: prevSets } = await adminClient
            .from('workout_sets')
            .select('set_number, weight_kg, actual_reps')
            .eq('workout_session_id', lastSession.id)
            .eq('exercise_id', ex.exercise_id)
            .eq('completed', true)
            .order('set_number', { ascending: true })

          if (prevSets && prevSets.length > 0) {
            previousSets[ex.id] = prevSets
            lastWeights[ex.id] = prevSets[0].weight_kg
            continue
          }
        }

        // Fallback: get most recent weight for this exercise from any session
        const { data: lastSets } = await adminClient
          .from('workout_sets')
          .select('weight_kg')
          .eq('exercise_id', ex.exercise_id)
          .eq('completed', true)
          .not('weight_kg', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)

        lastWeights[ex.id] = lastSets?.[0]?.weight_kg || null
      }
    }

    const response = NextResponse.json({
      exercises: exercisesData || [],
      lastWeights,
      previousSets,
    })
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300')
    return response
  } catch (error) {
    console.error('Error in client-workout API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
