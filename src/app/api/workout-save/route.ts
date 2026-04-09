import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/workout-save
 * Saves workout sets using admin client (bypasses RLS).
 * Auth: accepts Bearer token in Authorization header OR Supabase cookies.
 *
 * Modes:
 * - Default (final=true or omitted): DELETE all + INSERT — used when finishing workout
 * - Auto-save (final=false): DELETE all + INSERT — same pattern but includes incomplete sets
 *   Protected by client-side mutex to prevent concurrent saves
 */
export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient()

    // Auth: try Authorization header first, fall back to cookies
    let userId: string | null = null

    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const { data: { user }, error } = await admin.auth.getUser(token)
      if (error) console.error('[workout-save] Token auth error:', error.message)
      if (user) userId = user.id
    }

    // Fallback: try cookie-based auth (fast session parse — middleware already verified)
    if (!userId) {
      try {
        const { getAuthFast } = await import('@/lib/auth-fast')
        const { user } = await getAuthFast()
        if (user) userId = user.id
      } catch (e: any) {
        console.error('[workout-save] Cookie auth error:', e?.message)
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { sessionId, sets } = body

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    // Validate all exercise_ids are valid UUIDs before doing anything
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (sets && sets.length > 0) {
      for (const s of sets) {
        if (!s.exercise_id || !UUID_REGEX.test(s.exercise_id)) {
          console.error('[workout-save] Invalid exercise_id:', s.exercise_id)
          return NextResponse.json({
            error: 'Invalid exercise_id',
            details: `"${s.exercise_id}" is not a valid UUID`,
          }, { status: 400 })
        }
      }
    }

    // Verify the session belongs to this user
    const { data: session, error: sessionError } = await admin
      .from('workout_sessions')
      .select('id, client_id')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found', details: sessionError?.message }, { status: 404 })
    }

    if (session.client_id !== userId) {
      return NextResponse.json({ error: 'Not your session' }, { status: 403 })
    }

    // Delete all existing sets for this session
    const { error: deleteError } = await admin
      .from('workout_sets')
      .delete()
      .eq('workout_session_id', sessionId)

    if (deleteError) {
      console.error('[workout-save] Delete error:', deleteError.message)
      return NextResponse.json({ error: 'Failed to clear old sets', details: deleteError.message }, { status: 500 })
    }

    // Insert new sets
    if (sets && sets.length > 0) {
      const clampNum = (v: any, max: number) => {
        const n = Number(v)
        if (v == null || isNaN(n) || !isFinite(n)) return null
        return Math.min(Math.max(0, n), max)
      }

      const setsToInsert = sets.map((s: any) => ({
        workout_session_id: sessionId,
        exercise_id: s.exercise_id,
        set_number: Math.min(Math.max(1, Number(s.set_number) || 1), 99),
        prescribed_reps: clampNum(s.prescribed_reps, 9999),
        actual_reps: clampNum(s.actual_reps, 9999),
        weight_kg: clampNum(s.weight_kg, 9999.99),
        is_warmup: s.is_warmup ?? false,
        completed: s.completed !== false,
        is_pr: s.is_pr ?? false,
      }))

      const { data: inserted, error: insertError } = await admin
        .from('workout_sets')
        .insert(setsToInsert)
        .select('id')

      if (insertError) {
        console.error('[workout-save] INSERT ERROR:', insertError.message, insertError.details, insertError.hint)
        return NextResponse.json({
          error: 'Failed to save sets',
          details: insertError.message,
          hint: insertError.hint,
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        savedCount: inserted?.length ?? 0,
      })
    }

    return NextResponse.json({ success: true, savedCount: 0 })
  } catch (error: any) {
    console.error('[workout-save] UNEXPECTED ERROR:', error?.message ?? error)
    return NextResponse.json({ error: 'Internal server error', details: error?.message }, { status: 500 })
  }
}
