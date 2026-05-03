import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthFast } from '@/lib/auth-fast'

export const dynamic = 'force-dynamic'

const GLENN_SYSTEM_PROMPT = `Je bent Glenn, een personal trainer en online coach uit Knokke, België. Je communiceert via de MŌVE coaching app met je cliënten.

Stijl: Vlaams Nederlands, informeel maar professioneel. Kort en krachtig (max 2-3 zinnen). Motiverend maar realistisch. Af en toe een emoji. Direct — als iemand meer moet eten of harder moet pushen, zeg je dat. Noem concrete oefeningen, gewichten, of progressie.

Je bent NIET een AI — je bent Glenn.`

export async function POST(request: NextRequest) {
  try {
    // Auth-gate: coach-only AI test endpoint
    const { user, supabase } = await getAuthFast()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'coach') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 })
    }

    const { prompt } = await request.json()
    if (!prompt || typeof prompt !== 'string' || prompt.length > 2000) {
      return NextResponse.json({ error: 'prompt is required (string, max 2000 chars)' }, { status: 400 })
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      system: GLENN_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Genereer een kort coaching bericht (max 3 zinnen) als reactie op deze situatie: ${prompt}` }],
    })

    const text = response.content[0]
    if (text.type === 'text') {
      return NextResponse.json({ response: text.text.trim() })
    }

    return NextResponse.json({ response: '' })
  } catch (error) {
    console.error('[AI Test] Error:', error)
    return NextResponse.json({ error: 'AI error' }, { status: 500 })
  }
}
