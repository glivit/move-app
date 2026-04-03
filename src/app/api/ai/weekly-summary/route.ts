import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const maxDuration = 30

/**
 * GET /api/ai/weekly-summary?client_id=X
 * Generates AI weekly summary for a specific client
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Niet geauthenticeerd' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('client_id')
    if (!clientId) {
      return NextResponse.json({ error: 'client_id is verplicht' }, { status: 400 })
    }

    const db = createAdminClient()
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Gather all client data from the past week in parallel
    const [
      profileRes,
      workoutsRes,
      setsRes,
      checkinsRes,
      nutritionRes,
      messagesRes,
      prsRes,
    ] = await Promise.all([
      db.from('profiles').select('full_name').eq('id', clientId).single(),
      db.from('workout_sessions')
        .select('id, started_at, completed_at, duration_seconds, mood_rating')
        .eq('client_id', clientId)
        .gte('started_at', weekAgo.toISOString())
        .order('started_at', { ascending: true }),
      db.from('workout_sets')
        .select('exercise_id, weight_kg, actual_reps, rpe, completed, exercises(name, name_nl)')
        .eq('completed', true)
        .in('workout_session_id',
          (await db.from('workout_sessions').select('id').eq('client_id', clientId).gte('started_at', weekAgo.toISOString())).data?.map((s: any) => s.id) || []
        ),
      db.from('checkins')
        .select('date, weight_kg, body_fat_pct, energy_level, sleep_quality, stress_level, notes')
        .eq('client_id', clientId)
        .gte('date', weekAgo.toISOString().split('T')[0])
        .order('date', { ascending: true }),
      db.from('nutrition_daily_summary')
        .select('date, meals_planned, meals_completed, calories_target, calories_actual')
        .eq('client_id', clientId)
        .gte('date', weekAgo.toISOString().split('T')[0]),
      db.from('messages')
        .select('content, created_at')
        .eq('sender_id', clientId)
        .gte('created_at', weekAgo.toISOString())
        .order('created_at', { ascending: true })
        .limit(20),
      db.from('personal_records')
        .select('value, record_type, exercises(name, name_nl)')
        .eq('client_id', clientId)
        .gte('achieved_at', weekAgo.toISOString()),
    ])

    const clientName = profileRes.data?.full_name || 'Client'
    const completedWorkouts = (workoutsRes.data || []).filter((w: any) => w.completed_at)
    const totalVolume = (setsRes.data || []).reduce((sum: number, s: any) =>
      sum + ((s.weight_kg || 0) * (s.actual_reps || 0)), 0)
    const nutritionCompliance = nutritionRes.data && nutritionRes.data.length > 0
      ? Math.round(nutritionRes.data.reduce((sum: number, n: any) =>
          sum + (n.meals_completed / Math.max(n.meals_planned, 1)), 0) / nutritionRes.data.length * 100)
      : null

    // Build context for AI
    const context = `
Client: ${clientName}
Week: ${weekAgo.toLocaleDateString('nl-BE')} - ${now.toLocaleDateString('nl-BE')}

TRAINING:
- ${completedWorkouts.length} workouts afgerond
- Totaal volume: ${Math.round(totalVolume)}kg
- ${(prsRes.data || []).length} persoonlijke records
${completedWorkouts.map((w: any) => `  - ${new Date(w.started_at).toLocaleDateString('nl-BE', { weekday: 'short' })}: ${Math.round((w.duration_seconds || 0) / 60)} min, mood ${w.mood_rating || '?'}/5`).join('\n')}

${(prsRes.data || []).length > 0 ? `PRs: ${(prsRes.data || []).map((pr: any) => `${(pr as any).exercises?.name_nl || (pr as any).exercises?.name}: ${pr.value}kg`).join(', ')}` : ''}

CHECK-IN DATA:
${(checkinsRes.data || []).map((c: any) => `- ${c.date}: ${c.weight_kg ? c.weight_kg + 'kg' : 'geen gewicht'}${c.energy_level ? ', energie ' + c.energy_level + '/5' : ''}${c.notes ? ' — "' + c.notes.substring(0, 100) + '"' : ''}`).join('\n') || 'Geen check-ins'}

VOEDING:
${nutritionCompliance !== null ? `- Compliance: ${nutritionCompliance}%` : 'Geen voedingsdata'}

BERICHTEN (${(messagesRes.data || []).length} berichten van client):
${(messagesRes.data || []).slice(-5).map((m: any) => `- "${m.content.substring(0, 80)}"`).join('\n') || 'Geen berichten'}
`.trim()

    // Generate AI summary
    const anthropic = new Anthropic()
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Je bent een professionele fitness coach assistent. Maak een beknopte weekelijkse samenvatting (3-5 zinnen) voor de coach over deze client. Focus op: prestaties, aandachtspunten, en concrete suggesties. Schrijf in het Nederlands, informeel maar professioneel.

${context}

Geef de samenvatting in max 5 zinnen. Begin direct met de naam van de client.`,
      }],
    })

    const summary = response.content[0].type === 'text' ? response.content[0].text : ''

    const responseObj = NextResponse.json({
      data: {
        summary,
        stats: {
          workouts: completedWorkouts.length,
          volume: Math.round(totalVolume),
          prs: (prsRes.data || []).length,
          nutritionCompliance,
          checkIns: (checkinsRes.data || []).length,
        },
      },
    })
    responseObj.headers.set('Cache-Control', 'private, max-age=3600, stale-while-revalidate=86400')
    return responseObj
  } catch (error: any) {
    console.error('AI weekly summary error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
