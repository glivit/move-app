import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { calculateNextWeekTargets, estimateBest1RM } from '@/lib/progression'

// GET /api/progression-rules?template_exercise_id=X or ?client_id=X&exercise_id=Y for suggestions
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Niet geauthenticeerd' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const templateExerciseId = searchParams.get('template_exercise_id')
    const clientId = searchParams.get('client_id')
    const exerciseId = searchParams.get('exercise_id')
    const mode = searchParams.get('mode') // 'suggestions' for calculating next week targets

    let db
    try { db = createAdminClient() } catch { db = supabase }

    // Mode: get progression suggestions for a client
    if (mode === 'suggestions' && clientId && exerciseId) {
      // Get the client's active program
      const { data: activeProgram } = await db
        .from('client_programs')
        .select('id, template_id, current_week, program_templates(deload_config)')
        .eq('client_id', clientId)
        .eq('status', 'active')
        .single()

      if (!activeProgram) {
        const response = NextResponse.json({ data: null, message: 'Geen actief programma' })
        response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300')
        return response
      }

      // Find the template exercise and its progression rule
      const { data: templateExercise } = await db
        .from('program_template_exercises')
        .select(`
          id, sets, reps_min, reps_max, rpe_target,
          program_template_days!inner(template_id),
          program_progression_rules(*)
        `)
        .eq('exercise_id', exerciseId)
        .eq('program_template_days.template_id', activeProgram.template_id)
        .limit(1)
        .single()

      if (!templateExercise) {
        const response = NextResponse.json({ data: null, message: 'Oefening niet in template' })
        response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300')
        return response
      }

      const rule = (templateExercise as any).program_progression_rules?.[0]
      if (!rule) {
        const response = NextResponse.json({ data: null, message: 'Geen progressie-regel' })
        response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300')
        return response
      }

      // Get last week's workout data for this exercise
      const { data: recentSets } = await db
        .from('workout_sets')
        .select(`
          weight_kg, actual_reps, set_number, rpe,
          workout_sessions!inner(client_id, started_at, completed_at)
        `)
        .eq('exercise_id', exerciseId)
        .eq('workout_sessions.client_id', clientId)
        .not('workout_sessions.completed_at', 'is', null)
        .eq('completed', true)
        .order('workout_sessions(started_at)', { ascending: false })
        .limit(20)

      // Get estimated 1RM
      const { data: e1rm } = await db
        .from('client_estimated_1rm')
        .select('estimated_1rm')
        .eq('client_id', clientId)
        .eq('exercise_id', exerciseId)
        .single()

      const deloadConfig = (activeProgram as any).program_templates?.deload_config || null

      const suggestion = calculateNextWeekTargets(
        rule,
        recentSets || [],
        activeProgram.current_week || 1,
        e1rm?.estimated_1rm || null,
        {
          sets: templateExercise.sets,
          reps_min: templateExercise.reps_min,
          reps_max: templateExercise.reps_max,
          rpe_target: templateExercise.rpe_target,
        },
        deloadConfig
      )

      const response = NextResponse.json({ data: suggestion })
      response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300')
      return response
    }

    // Mode: list rules for a template exercise
    if (templateExerciseId) {
      const { data: rules, error } = await db
        .from('program_progression_rules')
        .select('*')
        .eq('template_exercise_id', templateExerciseId)

      if (error) throw error
      const response = NextResponse.json({ data: rules || [] })
      response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300')
      return response
    }

    return NextResponse.json({ error: 'template_exercise_id of mode=suggestions met client_id en exercise_id vereist' }, { status: 400 })
  } catch (error: any) {
    console.error('Error fetching progression rules:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

// POST /api/progression-rules — create or update a progression rule
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Niet geauthenticeerd' }, { status: 401 })
    }

    const body = await request.json()
    const { template_exercise_id, progression_type, config } = body

    if (!template_exercise_id || !progression_type) {
      return NextResponse.json({ error: 'template_exercise_id en progression_type zijn verplicht' }, { status: 400 })
    }

    const validTypes = ['linear_weight', 'percentage_weight', 'linear_reps', 'wave', 'rpe_based', 'custom']
    if (!validTypes.includes(progression_type)) {
      return NextResponse.json({ error: 'Ongeldig progressie type' }, { status: 400 })
    }

    let db
    try { db = createAdminClient() } catch { db = supabase }

    // Upsert: delete existing rule for this exercise, insert new one
    await db
      .from('program_progression_rules')
      .delete()
      .eq('template_exercise_id', template_exercise_id)

    const { data, error } = await db
      .from('program_progression_rules')
      .insert({
        template_exercise_id,
        progression_type,
        config: config || {},
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating progression rule:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

// DELETE /api/progression-rules?id=X
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Niet geauthenticeerd' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is verplicht' }, { status: 400 })
    }

    let db
    try { db = createAdminClient() } catch { db = supabase }

    const { error } = await db
      .from('program_progression_rules')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting progression rule:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
