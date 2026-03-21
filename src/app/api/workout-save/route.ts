import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/workout-save
 * Saves workout sets using admin client (bypasses RLS).
 * Auth: accepts Bearer token in Authorization header OR Supabase cookies.
 */
export async function POST(request: NextRequest) {
  console.log('[workout-save] === Request received ===')

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

    // Fallback: try cookie-based auth
    if (!userId) {
      try {
        const { createServerSupabaseClient } = await import('@/lib/supabase-server')
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) userId = user.id
      } catch (e: any) {
        console.error('[workout-save] Cookie auth error:', e?.message)
      }
    }

    if (!userId) {
      console.error('[workout-save] No authenticated user (tried token + cookies)')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[workout-save] User authenticated:', userId)

    const body = await request.json()
    const { sessionId, sets } = body

    console.log('[workout-save] sessionId:', sessionId, 'sets count:', sets?.length ?? 0)

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

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

    if (session.client_id !== userId) {
      console.error('[workout-save] Session belongs to', session.client_id, 'not', userId)
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

    // Insert new sets
    if (sets && sets.length > 0) {
      // Clamp values to safe DB ranges: weight_kg NUMERIC(6,2), reps INTEGER
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

      console.log('[workout-save] Inserting', setsToInsert.length, 'sets. First:', JSON.stringify(setsToInsert[0]))

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

      console.log('[workout-save] SUCCESS:', inserted?.length ?? 0, 'sets saved for session', sessionId)

      return NextResponse.json({
        success: true,
        savedCount: inserted?.length ?? 0,
      })
    }

    console.log('[workout-save] No sets to save')
    return NextResponse.json({ success: true, savedCount: 0 })
  } catch (error: any) {
    console.error('[workout-save] UNEXPECTED ERROR:', error?.message ?? error)
    return NextResponse.json({ error: 'Internal server error', details: error?.message }, { status: 500 })
  }
}
