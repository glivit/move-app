import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { sendPushToUser } from '@/lib/push-server'
import { checkAndAwardMilestones } from '@/lib/milestones'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/workout-finish
 * Marks a workout session as completed and handles all post-completion logic.
 * Uses admin client to bypass RLS for reliability.
 *
 * Body: {
 *   sessionId: string,
 *   completedAt: string (ISO),
 *   durationSeconds: number,
 *   moodRating: number | null,
 *   difficultyRating: number | null,
 *   notes: string | null,
 *   feedbackText: string | null,
 *   painData: Array<{ exerciseId: string, painNotes: string }> | null,
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
    const {
      sessionId,
      completedAt,
      durationSeconds,
      moodRating,
      difficultyRating,
      notes,
      feedbackText,
      painData,
    } = body

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify the session belongs to this user
    const { data: session, error: sessionError } = await admin
      .from('workout_sessions')
      .select('id, client_id, started_at, template_day_id')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      console.error('[workout-finish] Session not found:', sessionError)
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.client_id !== user.id) {
      return NextResponse.json({ error: 'Not your session' }, { status: 403 })
    }

    // Update the session with completion data
    const updateData: Record<string, any> = {
      completed_at: completedAt || new Date().toISOString(),
      duration_seconds: durationSeconds || null,
      mood_rating: moodRating || null,
      notes: notes || null,
    }

    // Only include these if the columns exist (added in migration 005)
    if (difficultyRating !== undefined) updateData.difficulty_rating = difficultyRating || null
    if (feedbackText !== undefined) updateData.feedback_text = feedbackText || null

    const { error: updateError } = await admin
      .from('workout_sessions')
      .update(updateData)
      .eq('id', sessionId)

    if (updateError) {
      console.error('[workout-finish] Update session error:', updateError)
      // If update fails, try without the optional fields
      const { error: fallbackError } = await admin
        .from('workout_sessions')
        .update({
          completed_at: updateData.completed_at,
          duration_seconds: updateData.duration_seconds,
          mood_rating: updateData.mood_rating,
          notes: updateData.notes,
        })
        .eq('id', sessionId)

      if (fallbackError) {
        console.error('[workout-finish] Fallback update also failed:', fallbackError)
        return NextResponse.json({ error: 'Failed to update session', details: fallbackError.message }, { status: 500 })
      }
    }

    // Update pain flags on workout_sets (if any)
    if (painData && painData.length > 0) {
      for (const pain of painData) {
        await admin
          .from('workout_sets')
          .update({ pain_flag: true, pain_notes: pain.painNotes || null })
          .eq('workout_session_id', sessionId)
          .eq('exercise_id', pain.exerciseId)
      }
    }

    // === Post-completion: notifications, milestones, AI ===

    // Load session details for notifications
    const { data: fullSession } = await admin
      .from('workout_sessions')
      .select(`
        id,
        client_id,
        started_at,
        completed_at,
        duration_seconds,
        template_day_id,
        mood_rating,
        difficulty_rating,
        feedback_text,
        profiles!workout_sessions_client_id_fkey(id, full_name),
        program_template_days(id, name),
        workout_sets(id, weight_kg, actual_reps, is_pr)
      `)
      .eq('id', sessionId)
      .single()

    if (fullSession) {
      const sets = fullSession.workout_sets || []
      const durationMin = Math.round((fullSession.duration_seconds || 0) / 60)
      const totalSets = sets.length
      const totalVolume = sets.reduce((sum: number, set: any) => sum + (set.weight_kg || 0) * (set.actual_reps || 0), 0)
      const prCount = sets.filter((set: any) => set.is_pr).length

      const clientProfile = Array.isArray(fullSession.profiles) ? fullSession.profiles[0] : fullSession.profiles
      const clientName = (clientProfile as any)?.full_name || 'Client'
      const templateDay = Array.isArray(fullSession.program_template_days) ? fullSession.program_template_days[0] : fullSession.program_template_days
      const dayName = (templateDay as any)?.name || 'Workout'

      // Find coach
      const { data: coaches } = await admin
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'coach')
        .limit(1)

      if (coaches && coaches.length > 0) {
        const coachId = coaches[0].id
        const firstName = clientName.split(' ')[0]

        // Push notification to coach
        await sendPushToUser(coachId, {
          title: `💪 ${firstName} heeft getraind`,
          body: `${dayName} — ${durationMin} min · ${totalSets} sets · ${prCount} PR${prCount === 1 ? '' : "'s"}`,
          url: `/coach/clients/${fullSession.client_id}/workout/${sessionId}`,
          tag: `workout-complete-${sessionId}`,
        }).catch(e => console.error('[workout-finish] Push error:', e))
      }

      // Check milestones (non-blocking)
      checkAndAwardMilestones(fullSession.client_id).catch(e => console.error('[workout-finish] Milestones:', e))

      // AI feedback (delayed, non-blocking)
      if (process.env.ANTHROPIC_API_KEY) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
        setTimeout(async () => {
          try {
            await fetch(`${baseUrl}/api/ai-feedback`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId }),
            })
          } catch (e) {
            console.error('[workout-finish] AI feedback trigger failed:', e)
          }
        }, 3 * 60 * 1000)
      }

      return NextResponse.json({
        success: true,
        stats: { durationMin, totalVolume, prCount, totalSets },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[workout-finish] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
