import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/workout-save
 * Saves workout sets using admin client (bypasses RLS).
 * Called from the active workout page when finishing a workout.
 *
 * Body: {
 *   sessionId: string,
 *   sets: Array<{
 *     exercise_id: string,
 *     set_number: number,
 *     prescribed_reps: number | null,
 *     actual_reps: number | null,
 *     weight_kg: number | null,
 *     is_warmup: boolean,
 *     completed: boolean,
 *     is_pr: boolean,
 *   }>
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { sessionId, sets } = body

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify the session belongs to this user
    const { data: session, error: sessionError } = await admin
      .from('workout_sessions')
      .select('id, client_id')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      console.error('[workout-save] Session not found:', sessionError)
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.client_id !== user.id) {
      return NextResponse.json({ error: 'Not your session' }, { status: 403 })
    }

    // Delete all existing sets for this session
    const { error: deleteError } = await admin
      .from('workout_sets')
      .delete()
      .eq('workout_session_id', sessionId)

    if (deleteError) {
      console.error('[workout-save] Delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to clear old sets', details: deleteError.message }, { status: 500 })
    }

    // Insert new sets (if any)
    if (sets && sets.length > 0) {
      const setsToInsert = sets.map((s: any) => ({
        workout_session_id: sessionId,
        exercise_id: s.exercise_id,
        set_number: s.set_number,
        prescribed_reps: s.prescribed_reps || null,
        actual_reps: s.actual_reps || null,
        weight_kg: s.weight_kg || null,
        is_warmup: s.is_warmup || false,
        completed: s.completed !== false, // default true
        is_pr: s.is_pr || false,
      }))

      const { data: inserted, error: insertError } = await admin
        .from('workout_sets')
        .insert(setsToInsert)
        .select('id')

      if (insertError) {
        console.error('[workout-save] Insert error:', insertError)
        return NextResponse.json({ error: 'Failed to save sets', details: insertError.message }, { status: 500 })
      }

      console.log(`[workout-save] Saved ${inserted?.length || 0} sets for session ${sessionId}`)

      return NextResponse.json({
        success: true,
        savedCount: inserted?.length || 0,
      })
    }

    return NextResponse.json({ success: true, savedCount: 0 })
  } catch (error) {
    console.error('[workout-save] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
