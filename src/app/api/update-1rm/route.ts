import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { estimateBest1RM } from '@/lib/progression'

export const dynamic = 'force-dynamic'

/**
 * POST /api/update-1rm
 * Called after workout completion to update estimated 1RMs
 * Body: { session_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Niet geauthenticeerd' }, { status: 401 })
    }

    const body = await request.json()
    const { session_id } = body

    if (!session_id) {
      return NextResponse.json({ error: 'session_id is verplicht' }, { status: 400 })
    }

    let db
    try { db = createAdminClient() } catch { db = supabase }

    // Get all completed sets from this session
    const { data: sets, error: setsError } = await db
      .from('workout_sets')
      .select('exercise_id, weight_kg, actual_reps, set_number')
      .eq('workout_session_id', session_id)
      .eq('completed', true)

    if (setsError) throw setsError
    if (!sets || sets.length === 0) {
      return NextResponse.json({ message: 'Geen sets gevonden', updated: 0 })
    }

    // Group sets by exercise
    const byExercise: Record<string, typeof sets> = {}
    for (const set of sets) {
      if (!byExercise[set.exercise_id]) {
        byExercise[set.exercise_id] = []
      }
      byExercise[set.exercise_id].push(set)
    }

    let updated = 0

    for (const [exerciseId, exerciseSets] of Object.entries(byExercise)) {
      const estimated = estimateBest1RM(exerciseSets)
      if (estimated <= 0) continue

      // Check if current 1RM exists and if new estimate is higher
      const { data: existing } = await db
        .from('client_estimated_1rm')
        .select('id, estimated_1rm')
        .eq('client_id', user.id)
        .eq('exercise_id', exerciseId)
        .single()

      if (existing) {
        // Only update if new estimate is at least as high
        if (estimated >= existing.estimated_1rm) {
          await db
            .from('client_estimated_1rm')
            .update({
              estimated_1rm: estimated,
              calculated_from: 'epley',
              source_session_id: session_id,
              calculated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
          updated++
        }
      } else {
        // Insert new
        await db
          .from('client_estimated_1rm')
          .insert({
            client_id: user.id,
            exercise_id: exerciseId,
            estimated_1rm: estimated,
            calculated_from: 'epley',
            source_session_id: session_id,
          })
        updated++
      }
    }

    return NextResponse.json({ message: '1RM bijgewerkt', updated })
  } catch (error: any) {
    console.error('Error updating 1RM:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
