import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/workout-save
 * Saves workout sets using admin client (bypasses RLS).
 * Called from the active workout page when finishing a workout.
 */
export async function POST(request: NextRequest) {
  console.log('[workout-save] === Request received ===')

  try {
    // Verify the user is authenticated
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.error('[workout-save] Auth error:', authError.message)
    }

    if (!user) {
      console.error('[workout-save] No authenticated user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[workout-save] User authenticated:', user.id)

    const body = await request.json()
    const { sessionId, sets } = body

    console.log('[workout-save] sessionId:', sessionId, 'sets count:', sets?.length ?? 0)

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
      console.error('[workout-save] Session not found:', sessionError?.message)
      return NextResponse.json({ error: 'Session not found', details: sessionError?.message }, { status: 404 })
    }

    if (session.client_id !== user.id) {
      console.error('[workout-save] Session belongs to', session.client_id, 'not', user.id)
      return NextResponse.json({ error: 'Not your session' }, { status: 403 })
    }

    console.log('[workout-save] Session verified, deleting old sets...')

    // Delete all existing sets for this session
    const { error: deleteError } = await admin
      .from('workout_sets')
      .delete()
      .eq('workout_session_id', sessionId)

    if (deleteError) {
      console.error('[workout-save] Delete error:', deleteError.message)
      return NextResponse.json({ error: 'Failed to clear old sets', details: deleteError.message }, { status: 500 })
    }

    console.log('[workout-save] Old sets deleted')

    // Insert new sets (if any)
    if (sets && sets.length > 0) {
      const setsToInsert = sets.map((s: any) => ({
        workout_session_id: sessionId,
        exercise_id: s.exercise_id,
        set_number: s.set_number,
        prescribed_reps: s.prescribed_reps ?? null,
        actual_reps: s.actual_reps ?? null,
        weight_kg: s.weight_kg ?? null,
        is_warmup: s.is_warmup ?? false,
        completed: s.completed !== false,
        is_pr: s.is_pr ?? false,
      }))

      console.log('[workout-save] Inserting', setsToInsert.length, 'sets:', JSON.stringify(setsToInsert.slice(0, 2)))

      const { data: inserted, error: insertError } = await admin
        .from('workout_sets')
        .insert(setsToInsert)
        .select('id')

      if (insertError) {
        console.error('[workout-save] Insert error:', insertError.message, insertError.details, insertError.hint)
        return NextResponse.json({
          error: 'Failed to save sets',
          details: insertError.message,
          hint: insertError.hint,
        }, { status: 500 })
      }

      console.log('[workout-save] SUCCESS: Saved', inserted?.length ?? 0, 'sets for session', sessionId)

      return NextResponse.json({
        success: true,
        savedCount: inserted?.length ?? 0,
      })
    }

    console.log('[workout-save] No sets to save (empty array)')
    return NextResponse.json({ success: true, savedCount: 0 })
  } catch (error: any) {
    console.error('[workout-save] Unexpected error:', error?.message ?? error)
    return NextResponse.json({ error: 'Internal server error', details: error?.message }, { status: 500 })
  }
}
