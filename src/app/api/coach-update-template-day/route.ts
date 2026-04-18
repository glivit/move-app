import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/coach-update-template-day
 * Coach-only endpoint: updates the full exercise prescription list for a
 * program_template_day. Replaces the existing rows with the provided ones in
 * the given order. Also allows updating the day-level name/focus.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient()

    // Auth — accept Bearer token or cookie session
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

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    if (!profile || profile.role !== 'coach') {
      return NextResponse.json({ error: 'Coach role required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      dayId,
      dayName,
      dayFocus,
      estimatedDurationMin,
      exercises,
    }: {
      dayId: string
      dayName?: string
      dayFocus?: string | null
      estimatedDurationMin?: number | null
      exercises: Array<{
        exercise_id: string
        sets: number
        reps_min: number
        reps_max: number | null
        rest_seconds: number
        rpe_target: number | null
        tempo?: string | null
        weight_suggestion?: string | null
        notes?: string | null
      }>
    } = body

    if (!dayId || !Array.isArray(exercises)) {
      return NextResponse.json({ error: 'Missing dayId or exercises' }, { status: 400 })
    }

    // Verify the day exists
    const { data: day } = await admin
      .from('program_template_days')
      .select('id, template_id')
      .eq('id', dayId)
      .single()

    if (!day) {
      return NextResponse.json({ error: 'Template day not found' }, { status: 404 })
    }

    // Optionally patch the day header
    const dayPatch: Record<string, unknown> = {}
    if (typeof dayName === 'string' && dayName.trim()) dayPatch.name = dayName.trim()
    if (dayFocus !== undefined) dayPatch.focus = dayFocus
    if (estimatedDurationMin !== undefined) dayPatch.estimated_duration_min = estimatedDurationMin
    if (Object.keys(dayPatch).length > 0) {
      await admin.from('program_template_days').update(dayPatch).eq('id', dayId)
    }

    // Replace exercises atomically
    const { error: deleteError } = await admin
      .from('program_template_exercises')
      .delete()
      .eq('template_day_id', dayId)
    if (deleteError) {
      console.error('[coach-update-template-day] Delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to clear exercises' }, { status: 500 })
    }

    if (exercises.length > 0) {
      const insertRows = exercises.map((ex, index) => ({
        template_day_id: dayId,
        exercise_id: ex.exercise_id,
        sort_order: index,
        sets: ex.sets || 3,
        reps_min: ex.reps_min || 8,
        reps_max: ex.reps_max || null,
        rest_seconds: ex.rest_seconds ?? 90,
        tempo: ex.tempo ?? null,
        rpe_target: ex.rpe_target ?? null,
        weight_suggestion: ex.weight_suggestion ?? null,
        notes: ex.notes ?? null,
      }))

      const { error: insertError } = await admin
        .from('program_template_exercises')
        .insert(insertRows)

      if (insertError) {
        console.error('[coach-update-template-day] Insert error:', insertError)
        return NextResponse.json({ error: 'Failed to save exercises' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, count: exercises.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('[coach-update-template-day] Error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
