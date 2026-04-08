import { createAdminClient } from '@/lib/supabase-admin'
import { generateWorkoutFeedback, saveAIDraft, type WorkoutContext } from '@/lib/ai-coach'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * POST /api/ai-feedback
 * Generates and sends AI workout feedback to client
 *
 * Request: { sessionId: string }
 *
 * Flow:
 * 1. Load workout session + sets + exercises
 * 2. Build context for AI
 * 3. Generate feedback via Claude
 * 4. Check if coach already sent feedback (skip if yes)
 * 5. Send message from coach to client
 * 6. Push notification to client
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
    }

    const supabase = createAdminClient()

    // Load workout session
    const { data: session, error: sessionError } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Check if coach already manually reviewed (skip AI if so)
    if (session.coach_seen) {
      return NextResponse.json({ skipped: true, reason: 'Coach already reviewed' })
    }

    // Load client profile
    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', session.client_id)
      .single()

    // Load template day name
    const { data: templateDay } = session.template_day_id
      ? await supabase
          .from('program_template_days')
          .select('name')
          .eq('id', session.template_day_id)
          .single()
      : { data: null }

    // Load sets with exercise details
    const { data: sets } = await supabase
      .from('workout_sets')
      .select('*, exercises(name, name_nl)')
      .eq('workout_session_id', sessionId)
      .order('set_number', { ascending: true })

    // Group sets by exercise
    const exerciseMap: Record<string, {
      name: string
      sets: number
      bestWeight: number | null
      bestReps: number | null
      isPR: boolean
    }> = {}

    let totalVolume = 0
    let totalSets = 0
    let prCount = 0

    for (const set of sets || []) {
      const exId = set.exercise_id
      const ex = (set as any).exercises

      if (!exerciseMap[exId]) {
        exerciseMap[exId] = {
          name: ex?.name_nl || ex?.name || 'Oefening',
          sets: 0,
          bestWeight: null,
          bestReps: null,
          isPR: false,
        }
      }

      if (set.completed) {
        exerciseMap[exId].sets++
        totalSets++

        if (set.weight_kg && set.actual_reps) {
          totalVolume += set.weight_kg * set.actual_reps

          if (!exerciseMap[exId].bestWeight || set.weight_kg > exerciseMap[exId].bestWeight!) {
            exerciseMap[exId].bestWeight = set.weight_kg
            exerciseMap[exId].bestReps = set.actual_reps
          }
        }
      }

      if (set.is_pr) {
        exerciseMap[exId].isPR = true
        prCount++
      }
    }

    const durationMin = session.duration_seconds
      ? Math.round(session.duration_seconds / 60)
      : 0

    // Build context
    const context: WorkoutContext = {
      sessionId,
      clientName: clientProfile?.full_name || 'Client',
      dayName: templateDay?.name || 'Training',
      durationMin,
      totalSets,
      totalVolume,
      prCount,
      moodRating: session.mood_rating,
      difficultyRating: session.difficulty_rating,
      feedbackText: session.feedback_text,
      painReported: session.pain_reported || false,
      painNotes: session.pain_notes || null,
      exercises: Object.values(exerciseMap),
    }

    // Generate AI feedback
    const feedback = await generateWorkoutFeedback(context)

    if (!feedback) {
      return NextResponse.json({ skipped: true, reason: 'AI returned empty response' })
    }

    // Find coach
    const { data: coaches } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'coach')
      .limit(1)

    if (!coaches || coaches.length === 0) {
      return NextResponse.json({ error: 'No coach found' }, { status: 500 })
    }

    const coachId = coaches[0].id

    // Check if coach already sent a message about this workout (within 2 hours)
    const twoHoursAgo = new Date()
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2)

    const { data: existingMessages } = await supabase
      .from('messages')
      .select('id')
      .eq('sender_id', coachId)
      .eq('receiver_id', session.client_id)
      .gte('created_at', twoHoursAgo.toISOString())
      .limit(1)

    if (existingMessages && existingMessages.length > 0) {
      return NextResponse.json({ skipped: true, reason: 'Coach already sent a message recently' })
    }

    // Save as draft for coach review (not auto-sent anymore)
    const saved = await saveAIDraft(
      coachId,
      session.client_id,
      feedback,
      'workout_feedback',
      {
        sessionId,
        clientName: clientProfile?.full_name || 'Client',
        dayName: templateDay?.name || 'Training',
        durationMin,
        totalSets,
        totalVolume,
        prCount,
      }
    )

    return NextResponse.json({
      success: saved,
      feedback,
      sessionId,
      draft: true,
    })
  } catch (error) {
    console.error('[AI Feedback] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
