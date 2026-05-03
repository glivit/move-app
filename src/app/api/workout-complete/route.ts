import { createAdminClient } from '@/lib/supabase-admin'
import { sendPushToUser } from '@/lib/push-server'
import { checkAndAwardMilestones } from '@/lib/milestones'
import { getAuthFast } from '@/lib/auth-fast'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/workout-complete
 * Called when a client completes their workout
 *
 * Request: { sessionId: string }
 *
 * Actions:
 * 1. Load workout session with client profile, template day, and sets
 * 2. Calculate stats: duration, total volume, PR count, set count
 * 3. Find coach (single-coach app)
 * 4. Send push notification to coach
 * 5. Create system message with workout summary
 * 6. Return success
 */
export async function POST(request: NextRequest) {
  try {
    // Auth-gate: only the session's client (or a coach) can complete a workout.
    const { user, supabase: userSupabase } = await getAuthFast()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { sessionId } = body

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Load workout session with client profile, template day, and sets
    const { data: session, error: sessionError } = await supabase
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
        workout_sets(
          id,
          weight_kg,
          actual_reps,
          is_pr
        )
      `)
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Workout session not found' },
        { status: 404 }
      )
    }

    // Authorization: caller must own this workout session, OR be a coach.
    if (session.client_id !== user.id) {
      const { data: profile } = await userSupabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (profile?.role !== 'coach') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Calculate stats
    const durationMin = Math.round((session.duration_seconds || 0) / 60)
    const sets = session.workout_sets || []
    const totalSets = sets.length

    // Calculate total volume (sum of weight × reps for completed sets)
    const totalVolume = sets.reduce((sum: number, set: any) => {
      const weight = set.weight_kg || 0
      const reps = set.actual_reps || 0
      return sum + weight * reps
    }, 0)

    // Count PRs (personal records)
    const prCount = sets.filter((set: any) => set.is_pr).length

    // Get client name and profile
    const clientProfile = Array.isArray(session.profiles) ? session.profiles[0] : session.profiles
    const clientId = session.client_id
    const clientName = (clientProfile as any)?.full_name || 'Client'
    const templateDay = Array.isArray(session.program_template_days) ? session.program_template_days[0] : session.program_template_days
    const dayName = (templateDay as any)?.name || 'Workout'

    // Find the coach (single-coach app)
    const { data: coaches, error: coachError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'coach')
      .limit(1)

    if (coachError || !coaches || coaches.length === 0) {
      console.error('No coach found:', coachError)
      return NextResponse.json(
        { error: 'Coach not found' },
        { status: 500 }
      )
    }

    const coach = coaches[0]
    const coachId = coach.id

    // Build push notification
    const firstName = clientName.split(' ')[0]
    const pushTitle = `💪 ${firstName} heeft getraind`
    const pushBody = `${dayName} — ${durationMin} min · ${totalSets} sets · ${prCount} PR${prCount === 1 ? '' : "'s"}`
    const pushUrl = `/coach/clients/${clientId}/workout/${sessionId}`

    // Send push notification to coach
    await sendPushToUser(coachId, {
      title: pushTitle,
      body: pushBody,
      url: pushUrl,
      tag: `workout-complete-${sessionId}`,
    })

    // Note: No chat message created — push notification to coach is sufficient.
    // Workout data is accessible via /coach/activity and workout detail page.

    // Check milestones (non-blocking)
    checkAndAwardMilestones(clientId).catch(e => console.error('[Milestones]', e))

    // Trigger AI feedback (delayed, non-blocking)
    // Wait 3 minutes before sending AI feedback to give coach a chance to respond manually
    if (process.env.ANTHROPIC_API_KEY && process.env.CRON_SECRET) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000'

      setTimeout(async () => {
        try {
          await fetch(`${baseUrl}/api/ai-feedback`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              authorization: `Bearer ${process.env.CRON_SECRET}`,
            },
            body: JSON.stringify({ sessionId: session.id }),
          })
        } catch (e) {
          console.error('[AI Feedback] Delayed trigger failed:', e)
        }
      }, 3 * 60 * 1000) // 3 minutes delay
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      stats: {
        durationMin,
        totalVolume,
        prCount,
        totalSets,
      },
    })
  } catch (error) {
    console.error('Error in workout-complete API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
