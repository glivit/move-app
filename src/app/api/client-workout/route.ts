import { getAuthFast } from '@/lib/auth-fast'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

// GET: Fetch exercises for a specific workout day
export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthFast()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const dayId = searchParams.get('dayId')
    if (!dayId) return NextResponse.json({ error: 'Missing dayId' }, { status: 400 })

    const adminClient = createAdminClient()

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

    // Also check for existing incomplete session + its sets (saves client round-trips)
    const programId = searchParams.get('programId')
    let existingSession: { id: string; started_at: string } | null = null
    let existingSessionSets: any[] = []

    if (exercisesData && exercisesData.length > 0) {
      const exerciseIds = exercisesData.map((ex: any) => ex.exercise_id)

      // Run all independent queries in parallel
      const [lastSessionRes, allLatestSetsRes, incompleteSessionRes] = await Promise.all([
        // Find the most recent completed workout session for this day
        adminClient
          .from('workout_sessions')
          .select('id')
          .eq('client_id', user.id)
          .eq('template_day_id', dayId)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(1)
          .single(),

        // Batch fetch: latest weight for each exercise from ANY session in ONE query
        adminClient
          .from('workout_sets')
          .select('exercise_id, weight_kg, created_at')
          .in('exercise_id', exerciseIds)
          .eq('completed', true)
          .not('weight_kg', 'is', null)
          .order('created_at', { ascending: false }),

        // Find existing incomplete session for this day (avoids client-side round-trip)
        programId
          ? adminClient
              .from('workout_sessions')
              .select('id, started_at')
              .eq('client_id', user.id)
              .eq('template_day_id', dayId)
              .is('completed_at', null)
              .order('started_at', { ascending: false })
              .limit(1)
              .single()
          : Promise.resolve({ data: null }),
      ])

      const lastSession = lastSessionRes.data
      const allLatestSets = allLatestSetsRes.data

      // Fetch previous session sets + existing session sets in parallel (both depend on session IDs)
      const [prevSetsRes, existingSetsRes] = await Promise.all([
        lastSession
          ? adminClient
              .from('workout_sets')
              .select('exercise_id, set_number, weight_kg, actual_reps')
              .eq('workout_session_id', lastSession.id)
              .in('exercise_id', exerciseIds)
              .eq('completed', true)
              .order('set_number', { ascending: true })
          : Promise.resolve({ data: [] }),
        incompleteSessionRes.data
          ? adminClient
              .from('workout_sets')
              .select('*')
              .eq('workout_session_id', incompleteSessionRes.data.id)
          : Promise.resolve({ data: [] }),
      ])

      const allPrevSets = prevSetsRes.data || []
      existingSession = incompleteSessionRes.data
      existingSessionSets = existingSetsRes.data || []

      // Build lookup maps from batch results
      const prevSetsByExercise: Record<string, any[]> = {}
      for (const set of allPrevSets) {
        if (!prevSetsByExercise[set.exercise_id]) {
          prevSetsByExercise[set.exercise_id] = []
        }
        prevSetsByExercise[set.exercise_id].push({
          set_number: set.set_number,
          weight_kg: set.weight_kg,
          actual_reps: set.actual_reps,
        })
      }

      // Latest weight per exercise (first occurrence since sorted desc by created_at)
      const latestWeightByExercise: Record<string, number | null> = {}
      for (const set of allLatestSets || []) {
        if (!(set.exercise_id in latestWeightByExercise)) {
          latestWeightByExercise[set.exercise_id] = set.weight_kg
        }
      }

      // Assign to each exercise (no additional queries needed)
      for (const ex of exercisesData) {
        const prevSets = prevSetsByExercise[ex.exercise_id]
        if (prevSets && prevSets.length > 0) {
          previousSets[ex.id] = prevSets
          lastWeights[ex.id] = prevSets[0].weight_kg
        } else {
          lastWeights[ex.id] = latestWeightByExercise[ex.exercise_id] || null
        }
      }
    }

    const response = NextResponse.json({
      exercises: exercisesData || [],
      lastWeights,
      previousSets,
      existingSession,
      existingSessionSets,
    })
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300')
    return response
  } catch (error) {
    console.error('Error in client-workout API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
