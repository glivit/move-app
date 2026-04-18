import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/coach-duplicate-day
 * Copies the exercise prescriptions from `sourceDayId` into `targetDayId`,
 * replacing any existing exercises on the target day.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient()

    // Auth
    let userId: string | null = null
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const {
        data: { user },
      } = await admin.auth.getUser(token)
      if (user) userId = user.id
    }
    if (!userId) {
      try {
        const { createServerSupabaseClient } = await import('@/lib/supabase-server')
        const supabase = await createServerSupabaseClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) userId = user.id
      } catch {
        /* ignore */
      }
    }
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    if (!profile || profile.role !== 'coach') {
      return NextResponse.json({ error: 'Coach role required' }, { status: 403 })
    }

    const { sourceDayId, targetDayId } = await request.json()
    if (!sourceDayId || !targetDayId) {
      return NextResponse.json({ error: 'Missing sourceDayId or targetDayId' }, { status: 400 })
    }
    if (sourceDayId === targetDayId) {
      return NextResponse.json({ error: 'Source and target must differ' }, { status: 400 })
    }

    const { data: sourceExercises } = await admin
      .from('program_template_exercises')
      .select(
        'exercise_id, sets, reps_min, reps_max, rest_seconds, rpe_target, tempo, weight_suggestion, notes, sort_order, superset_group_id',
      )
      .eq('template_day_id', sourceDayId)
      .order('sort_order', { ascending: true })

    await admin.from('program_template_exercises').delete().eq('template_day_id', targetDayId)

    if (sourceExercises && sourceExercises.length > 0) {
      const rows = sourceExercises.map((ex, idx) => ({
        template_day_id: targetDayId,
        exercise_id: ex.exercise_id,
        sets: ex.sets,
        reps_min: ex.reps_min,
        reps_max: ex.reps_max,
        rest_seconds: ex.rest_seconds,
        rpe_target: ex.rpe_target,
        tempo: ex.tempo,
        weight_suggestion: ex.weight_suggestion,
        notes: ex.notes,
        sort_order: idx,
        superset_group_id: ex.superset_group_id,
      }))
      const { error } = await admin.from('program_template_exercises').insert(rows)
      if (error) {
        console.error('[coach-duplicate-day] Insert error:', error)
        return NextResponse.json({ error: 'Failed to duplicate' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, copied: sourceExercises?.length || 0 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('[coach-duplicate-day] Error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
