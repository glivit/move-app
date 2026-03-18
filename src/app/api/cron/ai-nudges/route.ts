import { createAdminClient } from '@/lib/supabase-admin'
import { generateNudge, sendAIMessage, type NudgeContext } from '@/lib/ai-coach'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/cron/ai-nudges
 * Called daily at 20:00 (8pm) via Vercel Cron
 *
 * Checks for:
 * 1. Clients who had a scheduled workout today but didn't complete it
 * 2. Sends a personalized nudge via AI
 *
 * Protected by CRON_SECRET
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ skipped: true, reason: 'AI not configured' })
  }

  const supabase = createAdminClient()
  const results: Array<{ clientId: string; type: string; sent: boolean }> = []

  try {
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

    // Get today's ISO weekday (1=Monday, 7=Sunday)
    const now = new Date()
    const jsDay = now.getDay()
    const isoDay = jsDay === 0 ? 7 : jsDay

    // Get all active client programs with schedules
    const { data: clientPrograms } = await supabase
      .from('client_programs')
      .select('client_id, schedule, profiles!client_programs_client_id_fkey(full_name)')
      .eq('is_active', true)

    if (!clientPrograms) {
      return NextResponse.json({ results: [] })
    }

    // For each client with a workout scheduled today
    for (const cp of clientPrograms) {
      const schedule = (cp.schedule || {}) as Record<string, string>
      const scheduledDayId = schedule[String(isoDay)]

      if (!scheduledDayId) continue // Not scheduled today

      // Check if they completed a workout today
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { data: todayWorkouts } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('client_id', cp.client_id)
        .not('completed_at', 'is', null)
        .gte('started_at', todayStart.toISOString())
        .limit(1)

      if (todayWorkouts && todayWorkouts.length > 0) continue // Already trained

      // Check we haven't already nudged today
      const { data: todayMessages } = await supabase
        .from('messages')
        .select('id')
        .eq('sender_id', coachId)
        .eq('receiver_id', cp.client_id)
        .gte('created_at', todayStart.toISOString())
        .limit(1)

      if (todayMessages && todayMessages.length > 0) continue // Already messaged

      // Get template day name
      const { data: templateDay } = await supabase
        .from('program_template_days')
        .select('name')
        .eq('id', scheduledDayId)
        .single()

      // Find how many days since last workout
      const { data: lastWorkout } = await supabase
        .from('workout_sessions')
        .select('completed_at')
        .eq('client_id', cp.client_id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)

      const lastWorkoutDaysAgo = lastWorkout && lastWorkout.length > 0
        ? Math.floor((now.getTime() - new Date(lastWorkout[0].completed_at).getTime()) / (1000 * 60 * 60 * 24))
        : undefined

      const clientName = (cp as any).profiles?.full_name || 'Client'

      // Generate nudge
      const context: NudgeContext = {
        clientName,
        type: 'missed_workout',
        scheduledDay: templateDay?.name || 'training',
        lastWorkoutDaysAgo,
      }

      const nudge = await generateNudge(context)

      if (nudge) {
        const sent = await sendAIMessage(coachId, cp.client_id, nudge, `nudge-workout-${cp.client_id}`)
        results.push({ clientId: cp.client_id, type: 'missed_workout', sent })
      }
    }

    return NextResponse.json({ success: true, results, count: results.length })
  } catch (error) {
    console.error('[AI Nudges] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
