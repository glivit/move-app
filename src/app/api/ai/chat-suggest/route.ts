import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const maxDuration = 15

/**
 * POST /api/ai/chat-suggest
 * Generates reply suggestions for the coach when viewing a client message
 * Body: { client_id: string, recent_messages: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Niet geauthenticeerd' }, { status: 401 })
    }

    const body = await request.json()
    const { client_id, recent_messages } = body

    if (!client_id) {
      return NextResponse.json({ error: 'client_id is verplicht' }, { status: 400 })
    }

    const db = createAdminClient()

    // Get client context
    const [profileRes, recentWorkout, recentCheckin] = await Promise.all([
      db.from('profiles').select('full_name').eq('id', client_id).single(),
      db.from('workout_sessions')
        .select('started_at, completed_at, duration_seconds')
        .eq('client_id', client_id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single(),
      db.from('checkins')
        .select('date, weight_kg, energy_level, notes')
        .eq('client_id', client_id)
        .order('date', { ascending: false })
        .limit(1)
        .single(),
    ])

    const clientName = profileRes.data?.full_name || 'Client'
    const firstName = clientName.split(' ')[0]

    const context = `
Client: ${clientName}
Laatste workout: ${recentWorkout.data ? new Date(recentWorkout.data.completed_at).toLocaleDateString('nl-BE') : 'onbekend'}
Laatste check-in: ${recentCheckin.data ? `${recentCheckin.data.date}, ${recentCheckin.data.weight_kg ? recentCheckin.data.weight_kg + 'kg' : ''}${recentCheckin.data.notes ? ' — "' + recentCheckin.data.notes.substring(0, 80) + '"' : ''}` : 'geen'}

Recente berichten:
${(recent_messages || []).slice(-5).map((m: string) => `- ${m}`).join('\n') || 'Geen berichten'}
`.trim()

    const anthropic = new Anthropic()
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Je bent een fitness coach (Glenn) die kort en persoonlijk communiceert met clients. Genereer 3 korte antwoord-suggesties (elk max 2 zinnen) op basis van de recente berichten van de client. Gebruik de voornaam "${firstName}". Schrijf in het Nederlands, informeel en motiverend.

${context}

Geef exact 3 suggesties als JSON array: ["suggestie 1", "suggestie 2", "suggestie 3"]`,
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '[]'

    // Parse suggestions
    let suggestions: string[] = []
    try {
      const match = text.match(/\[[\s\S]*\]/)
      if (match) {
        suggestions = JSON.parse(match[0])
      }
    } catch {
      suggestions = [text]
    }

    return NextResponse.json({ data: suggestions.slice(0, 3) })
  } catch (error: any) {
    console.error('AI chat suggest error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
