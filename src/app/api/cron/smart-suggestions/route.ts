import { createAdminClient } from '@/lib/supabase-admin'
import { sendPushToUser } from '@/lib/push-server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/cron/smart-suggestions
 * Called weekly (Sunday evening) via Vercel Cron
 *
 * Analyzes each client's last 2 weeks of workout data and flags:
 * 1. Consistently low difficulty (< 2.5 avg) → suggest increasing weights
 * 2. Consistently high difficulty (> 4 avg) → suggest reducing volume
 * 3. Pain reported 2+ times → suggest exercise modification
 * 4. Low compliance (< 50% of scheduled workouts) → suggest schedule change
 * 5. Program nearing completion (> 80% through) → suggest new program
 *
 * Creates internal notifications for the coach on the dashboard
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const suggestions: Array<{
    clientId: string
    clientName: string
    type: string
    message: string
    priority: 'low' | 'medium' | 'high'
  }> = []

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

    // Get all active client programs
    const { data: programs } = await supabase
      .from('client_programs')
      .select(`
        id, client_id, start_date, schedule,
        profiles!client_programs_client_id_fkey(full_name),
        program_templates(duration_weeks, days_per_week)
      `)
      .eq('is_active', true)

    if (!programs) {
      return NextResponse.json({ suggestions: [] })
    }

    const now = new Date()
    const twoWeeksAgo = new Date(now)
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

    for (const prog of programs) {
      const clientName = (prog as any).profiles?.full_name || 'Client'
      const template = (prog as any).program_templates
      const firstName = clientName.split(' ')[0]

      // Load last 2 weeks of workouts
      const { data: recentWorkouts } = await supabase
        .from('workout_sessions')
        .select('id, difficulty_rating, pain_reported, completed_at, started_at')
        .eq('client_id', prog.client_id)
        .not('completed_at', 'is', null)
        .gte('started_at', twoWeeksAgo.toISOString())

      const workouts = recentWorkouts || []

      // 1. Check average difficulty
      const difficultyRatings = workouts
        .filter(w => w.difficulty_rating != null)
        .map(w => w.difficulty_rating!)

      if (difficultyRatings.length >= 3) {
        const avgDifficulty = difficultyRatings.reduce((a, b) => a + b, 0) / difficultyRatings.length

        if (avgDifficulty < 2.5) {
          suggestions.push({
            clientId: prog.client_id,
            clientName,
            type: 'increase_weights',
            message: `${firstName} geeft gemiddeld ${avgDifficulty.toFixed(1)}/5 moeilijkheid — overwegen gewichten te verhogen`,
            priority: 'medium',
          })
        } else if (avgDifficulty > 4.2) {
          suggestions.push({
            clientId: prog.client_id,
            clientName,
            type: 'reduce_volume',
            message: `${firstName} geeft gemiddeld ${avgDifficulty.toFixed(1)}/5 moeilijkheid — mogelijk te zwaar, volume verlagen?`,
            priority: 'high',
          })
        }
      }

      // 2. Check pain reports
      const painCount = workouts.filter(w => w.pain_reported).length
      if (painCount >= 2) {
        suggestions.push({
          clientId: prog.client_id,
          clientName,
          type: 'pain_alert',
          message: `${firstName} heeft ${painCount}x pijn gemeld in 2 weken — oefeningen aanpassen?`,
          priority: 'high',
        })
      }

      // 3. Check compliance
      const schedule = (prog.schedule || {}) as Record<string, string>
      const scheduledDays = Object.keys(schedule).length
      if (scheduledDays > 0 && workouts.length > 0) {
        const expectedWorkouts = scheduledDays * 2 // 2 weeks
        const compliance = workouts.length / expectedWorkouts

        if (compliance < 0.5 && expectedWorkouts >= 4) {
          suggestions.push({
            clientId: prog.client_id,
            clientName,
            type: 'low_compliance',
            message: `${firstName} heeft maar ${workouts.length}/${expectedWorkouts} geplande workouts gedaan — schema aanpassen?`,
            priority: 'medium',
          })
        }
      }

      // 4. Check program completion
      if (template?.duration_weeks && prog.start_date) {
        const startDate = new Date(prog.start_date)
        const totalDays = template.duration_weeks * 7
        const daysElapsed = Math.floor((now.getTime() - startDate.getTime()) / 86400000)
        const progress = daysElapsed / totalDays

        if (progress > 0.8 && progress < 1.1) {
          suggestions.push({
            clientId: prog.client_id,
            clientName,
            type: 'program_ending',
            message: `${firstName}'s programma is ${Math.round(progress * 100)}% klaar — nieuw programma voorbereiden`,
            priority: 'low',
          })
        }
      }
    }

    // Store suggestions as a system message to coach if there are any
    if (suggestions.length > 0) {
      const highPriority = suggestions.filter(s => s.priority === 'high')
      const medPriority = suggestions.filter(s => s.priority === 'medium')

      let summaryBody = '📋 Wekelijkse programma-analyse:\n\n'
      if (highPriority.length > 0) {
        summaryBody += '🔴 Prioriteit:\n' + highPriority.map(s => `• ${s.message}`).join('\n') + '\n\n'
      }
      if (medPriority.length > 0) {
        summaryBody += '🟡 Aandacht:\n' + medPriority.map(s => `• ${s.message}`).join('\n') + '\n\n'
      }
      const lowPriority = suggestions.filter(s => s.priority === 'low')
      if (lowPriority.length > 0) {
        summaryBody += '💡 Info:\n' + lowPriority.map(s => `• ${s.message}`).join('\n')
      }

      // Send push to coach
      await sendPushToUser(coachId, {
        title: `📋 ${suggestions.length} programma-suggestie${suggestions.length !== 1 ? 's' : ''}`,
        body: highPriority.length > 0
          ? highPriority[0].message
          : suggestions[0].message,
        url: '/coach/activity',
        tag: 'smart-suggestions',
      })

      // Store as system message (coach to self as note)
      await supabase.from('messages').insert({
        sender_id: coachId,
        receiver_id: coachId,
        content: summaryBody,
        message_type: 'system',
      })
    }

    return NextResponse.json({ success: true, suggestions, count: suggestions.length })
  } catch (error) {
    console.error('[Smart Suggestions] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
