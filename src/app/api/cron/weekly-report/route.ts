import { createAdminClient } from '@/lib/supabase-admin'
import { generateNudge, saveAIDraft, type NudgeContext } from '@/lib/ai-coach'
import { sendPushToUser } from '@/lib/push-server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/cron/weekly-report
 * Called every Monday at 08:00 via Vercel Cron
 *
 * For each client:
 * 1. Calculate last week's stats (workouts, compliance, volume, PRs)
 * 2. Generate a motivational summary via AI in Glenn's voice
 * 3. Send as message from coach + push notification
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const results: Array<{ clientId: string; sent: boolean; stats: any }> = []

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

    // Get all clients with active programs
    const { data: clients } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'client')

    if (!clients || clients.length === 0) {
      return NextResponse.json({ results: [], message: 'No clients' })
    }

    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - 7)
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(now)
    weekEnd.setHours(0, 0, 0, 0)

    for (const client of clients) {
      try {
        // Last week's workouts
        const { data: workouts } = await supabase
          .from('workout_sessions')
          .select('id, duration_seconds, workout_sets(weight_kg, actual_reps, is_pr)')
          .eq('client_id', client.id)
          .not('completed_at', 'is', null)
          .gte('started_at', weekStart.toISOString())
          .lt('started_at', weekEnd.toISOString())

        const workoutCount = workouts?.length || 0
        if (workoutCount === 0) continue // Skip clients who didn't train at all

        let totalVolume = 0
        let totalSets = 0
        let prCount = 0
        let totalMinutes = 0

        for (const w of workouts || []) {
          totalMinutes += Math.round((w.duration_seconds || 0) / 60)
          for (const s of (w as any).workout_sets || []) {
            totalSets++
            totalVolume += (s.weight_kg || 0) * (s.actual_reps || 0)
            if (s.is_pr) prCount++
          }
        }

        // Nutrition compliance
        const weekStartStr = weekStart.toISOString().split('T')[0]
        const { data: nutritionDays } = await supabase
          .from('nutrition_daily_summary')
          .select('meals_planned, meals_completed')
          .eq('client_id', client.id)
          .gte('date', weekStartStr)

        const mealsPlanned = (nutritionDays || []).reduce((a, d: any) => a + (d.meals_planned || 0), 0)
        const mealsCompleted = (nutritionDays || []).reduce((a, d: any) => a + (d.meals_completed || 0), 0)
        const nutritionPct = mealsPlanned > 0 ? Math.round((mealsCompleted / mealsPlanned) * 100) : null

        // Streak (consecutive training days ending today)
        const { data: streakSessions } = await supabase
          .from('workout_sessions')
          .select('started_at')
          .eq('client_id', client.id)
          .not('completed_at', 'is', null)
          .order('started_at', { ascending: false })
          .limit(30)

        const activeDates = new Set(
          (streakSessions || []).map((s: any) => new Date(s.started_at).toISOString().split('T')[0])
        )
        let streak = 0
        for (let i = 0; i < 30; i++) {
          const d = new Date(now)
          d.setDate(d.getDate() - i)
          if (activeDates.has(d.toISOString().split('T')[0])) streak++
          else if (i === 0) continue
          else break
        }

        // Build weekly summary message
        const firstName = client.full_name?.split(' ')[0] || 'Client'
        const volumeStr = totalVolume > 1000
          ? `${(totalVolume / 1000).toFixed(1)} ton`
          : `${totalVolume} kg`

        // Use AI if available, else build a simple message
        let message = ''

        if (process.env.ANTHROPIC_API_KEY) {
          const Anthropic = (await import('@anthropic-ai/sdk')).default
          const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

          const prompt = `Genereer een kort wekelijks overzichtsbericht (max 4 zinnen) voor ${firstName}. Dit zijn de stats van vorige week:

- ${workoutCount} workouts afgerond
- ${totalMinutes} minuten getraind
- ${totalSets} sets voltooid
- Totaal volume: ${volumeStr}
- ${prCount} PR's behaald
${nutritionPct !== null ? `- Voeding: ${nutritionPct}% compliance` : ''}
${streak > 2 ? `- Streak: ${streak} dagen op rij` : ''}

Stuur als Glenn: kort, specifiek, motiverend. Begin met een samenvatting, eindig met een motiverende zin voor de komende week.`

          try {
            const response = await anthropic.messages.create({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 250,
              system: `Je bent Glenn, personal trainer uit Knokke. Vlaams, kort, motiverend, specifiek. Max 4 zinnen. Noem concrete cijfers.`,
              messages: [{ role: 'user', content: prompt }],
            })
            const text = response.content[0]
            if (text.type === 'text') message = text.text.trim()
          } catch (aiErr) {
            console.error(`[Weekly Report] AI error for ${client.id}:`, aiErr)
          }
        }

        // Fallback message if AI not available
        if (!message) {
          message = `Hey ${firstName}! Vorige week: ${workoutCount} workouts, ${totalMinutes} min, ${volumeStr} volume.`
          if (prCount > 0) message += ` ${prCount} nieuwe PR's! 🏆`
          if (streak > 2) message += ` ${streak} dagen streak — sterk 💪`
          message += ` Nieuwe week, nieuwe kansen!`
        }

        const sent = await saveAIDraft(coachId, client.id, message, 'weekly_motivation', {
          clientName: client.full_name || 'Client',
          workoutsCompleted: completedCount,
          streak,
          prCount,
        })

        results.push({
          clientId: client.id,
          sent,
          stats: { workoutCount, totalMinutes, totalVolume, prCount, nutritionPct, streak },
        })
      } catch (clientErr) {
        console.error(`[Weekly Report] Error for client ${client.id}:`, clientErr)
      }
    }

    return NextResponse.json({ success: true, results, count: results.length })
  } catch (error) {
    console.error('[Weekly Report] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
