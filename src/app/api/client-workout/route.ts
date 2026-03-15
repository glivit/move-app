import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

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

    // Get last workout weights for each exercise
    const lastWeights: Record<string, number | null> = {}
    if (exercisesData) {
      for (const ex of exercisesData) {
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

    return NextResponse.json({
      exercises: exercisesData || [],
      lastWeights,
    })
  } catch (error) {
    console.error('Error in client-workout API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
