import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check coach role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'coach') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const clientId = req.nextUrl.searchParams.get('client_id')
  const unreviewed = req.nextUrl.searchParams.get('unreviewed') === 'true'

  let query = supabase
    .from('workout_sessions')
    .select(`
      id, client_id, started_at, completed_at, duration_seconds,
      mood_rating, difficulty_rating, notes, feedback_text,
      coach_seen, coach_notes,
      profiles!workout_sessions_client_id_fkey(full_name),
      workout_sets(id, exercise_id, pain_flag, pain_notes, exercises(name, name_nl))
    `)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(50)

  if (clientId) {
    query = query.eq('client_id', clientId)
  }

  if (unreviewed) {
    query = query.eq('coach_seen', false)
  }

  // Only get sessions with some feedback
  const { data: sessions, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Filter to sessions that actually have feedback
  const feedbackSessions = (sessions || []).filter((s: any) =>
    s.difficulty_rating || s.feedback_text || s.mood_rating ||
    (s.workout_sets || []).some((ws: any) => ws.pain_flag)
  )

  return NextResponse.json({ sessions: feedbackSessions })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { session_id, coach_notes } = body

  if (!session_id) {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('workout_sessions')
    .update({
      coach_seen: true,
      coach_notes: coach_notes || null,
    })
    .eq('id', session_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
