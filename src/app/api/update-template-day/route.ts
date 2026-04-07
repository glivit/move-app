import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/update-template-day
 * Updates a program template day's exercises (order, sets, new exercises).
 * Used when a client modifies their workout and chooses "Opslaan in programma".
 */
export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient()

    // Auth
    let userId: string | null = null
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const { data: { user }, error } = await admin.auth.getUser(token)
      if (error) console.error('[update-template-day] Token auth error:', error.message)
      if (user) userId = user.id
    }

    if (!userId) {
      try {
        const { createServerSupabaseClient } = await import('@/lib/supabase-server')
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) userId = user.id
      } catch { /* ignore */ }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { dayId, exercises } = await request.json()
    if (!dayId || !exercises || !Array.isArray(exercises)) {
      return NextResponse.json({ error: 'Missing dayId or exercises' }, { status: 400 })
    }

    // Verify the user has access to this template day (via their active program)
    const { data: program } = await admin
      .from('client_programs')
      .select('id, template_id')
      .eq('client_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!program) {
      return NextResponse.json({ error: 'No active program found' }, { status: 403 })
    }

    // Verify dayId belongs to this template
    const { data: day } = await admin
      .from('program_template_days')
      .select('id, template_id')
      .eq('id', dayId)
      .eq('template_id', program.template_id)
      .single()

    if (!day) {
      return NextResponse.json({ error: 'Template day not found' }, { status: 404 })
    }

    // Delete existing exercises for this day
    const { error: deleteError } = await admin
      .from('program_template_exercises')
      .delete()
      .eq('template_day_id', dayId)

    if (deleteError) {
      console.error('[update-template-day] Delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to clear exercises' }, { status: 500 })
    }

    // Insert updated exercises
    const insertRows = exercises.map((ex: any, index: number) => ({
      template_day_id: dayId,
      exercise_id: ex.exercise_id,
      sort_order: index,
      sets: ex.sets || 3,
      reps_min: ex.reps_min || 8,
      reps_max: ex.reps_max || 12,
      rest_seconds: ex.rest_seconds || 90,
      tempo: ex.tempo || null,
      rpe_target: ex.rpe_target || null,
      notes: ex.notes || null,
    }))

    const { error: insertError } = await admin
      .from('program_template_exercises')
      .insert(insertRows)

    if (insertError) {
      console.error('[update-template-day] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to save exercises' }, { status: 500 })
    }

    return NextResponse.json({ success: true, count: insertRows.length })
  } catch (err: any) {
    console.error('[update-template-day] Error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
