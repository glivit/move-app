/**
 * AI Coach Agent — Glenn's digitale tweeling
 *
 * Generates personalized coaching feedback in Glenn's voice.
 * Used for:
 * 1. Auto-feedback after workout completion
 * 2. Nudges for missed workouts
 * 3. Nudges for missing nutrition logging
 * 4. Weekly motivational messages
 */
import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase-admin'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

// ─── Glenn's Persona System Prompt ──────────────────────────────

const GLENN_SYSTEM_PROMPT = `Je bent Glenn, een personal trainer en online coach uit Knokke, België. Je communiceert via de MŌVE coaching app met je cliënten.

## Jouw stijl:
- Je spreekt Vlaams Nederlands — informeel maar professioneel. Geen "u" maar "je/jij".
- Kort en krachtig. Geen lange lappen tekst. Max 2-3 zinnen per bericht.
- Motiverend maar realistisch. Je gelooft in je cliënten maar bent niet nep-positief.
- Je gebruikt af en toe emoji's maar niet overdreven. Max 1-2 per bericht.
- Je noemt je cliënten bij hun voornaam.
- Je bent direct — als iemand meer moet eten of harder moet pushen, zeg je dat.
- Je hebt humor, maar altijd met respect.
- Je reageert specifiek op wat de cliënt deed, niet generiek. Noem concrete oefeningen, gewichten, of progressie.

## Wat je NIET doet:
- Geen medische adviezen geven
- Niet te lang uitweiden
- Geen generieke motivatie-quotes
- Niet overdreven enthousiast (geen "WAUW AMAZING!!!")
- Nooit zeggen dat je een AI bent — je bent Glenn

## Voorbeelden van jouw toon:
- "Sterke sessie Jan! Die 80kg squat is nieuw voor jou — volgende week proberen we 82.5 💪"
- "Hey, ik zie dat je vandaag niet getraind hebt. Alles goed? Probeer morgen die push day in te halen"
- "Mooi volume vandaag. Ik zou wel iets meer rust nemen tussen je compound sets, dat helpt voor progressie"
- "3 weken op rij consistent — dat is waar het verschil gemaakt wordt 🔥"
`

// ─── Types ──────────────────────────────────────────────────

export interface WorkoutContext {
  sessionId: string
  clientName: string
  dayName: string
  durationMin: number
  totalSets: number
  totalVolume: number
  prCount: number
  moodRating: number | null
  difficultyRating: number | null
  feedbackText: string | null
  painReported: boolean
  painNotes: string | null
  exercises: Array<{
    name: string
    sets: number
    bestWeight: number | null
    bestReps: number | null
    isPR: boolean
  }>
}

export interface NudgeContext {
  clientName: string
  type: 'missed_workout' | 'missed_nutrition' | 'weekly_motivation'
  daysMissed?: number
  scheduledDay?: string
  streakDays?: number
  lastWorkoutDaysAgo?: number
}

// ─── AI Generation Functions ──────────────────────────────────

/**
 * Generate workout feedback in Glenn's voice
 */
export async function generateWorkoutFeedback(context: WorkoutContext): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[AI Coach] No ANTHROPIC_API_KEY set, skipping AI feedback')
    return ''
  }

  const exercisesSummary = context.exercises
    .map(e => {
      let s = `- ${e.name}: ${e.sets} sets`
      if (e.bestWeight) s += `, beste set ${e.bestWeight}kg × ${e.bestReps}`
      if (e.isPR) s += ' (PR!)'
      return s
    })
    .join('\n')

  const difficultyLabels: Record<number, string> = { 1: 'Te makkelijk', 2: 'Makkelijk', 3: 'Perfect', 4: 'Zwaar', 5: 'Te zwaar' }
  const moodLabels: Record<number, string> = { 1: 'Slecht', 2: 'Matig', 3: 'Goed', 4: 'Sterk', 5: 'Top' }

  const userMessage = `Genereer een kort feedback bericht (max 3 zinnen) voor deze workout:

Cliënt: ${context.clientName}
Training: ${context.dayName}
Duur: ${context.durationMin} minuten
Sets: ${context.totalSets}
Totaal volume: ${context.totalVolume} kg
PR's behaald: ${context.prCount}
Gevoel: ${context.moodRating ? moodLabels[context.moodRating] : 'niet ingevuld'}
Moeilijkheid: ${context.difficultyRating ? difficultyLabels[context.difficultyRating] : 'niet ingevuld'}
${context.feedbackText ? `Feedback van cliënt: "${context.feedbackText}"` : ''}
${context.painReported ? `⚠️ Pijn gemeld: ${context.painNotes || 'geen details'}` : ''}

Oefeningen:
${exercisesSummary}

Stuur een kort, persoonlijk bericht als Glenn. Reageer specifiek op de data — noem concrete oefeningen of gewichten. Als er pijn gemeld is, reageer daar bezorgd maar professioneel op. Als er PR's zijn, vier dat.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      system: GLENN_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const text = response.content[0]
    if (text.type === 'text') {
      return text.text.trim()
    }
    return ''
  } catch (error) {
    console.error('[AI Coach] Error generating workout feedback:', error)
    return ''
  }
}

/**
 * Generate a nudge message in Glenn's voice
 */
export async function generateNudge(context: NudgeContext): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return ''
  }

  let userMessage = ''

  if (context.type === 'missed_workout') {
    userMessage = `Genereer een kort motiverend bericht (max 2 zinnen) voor ${context.clientName} die vandaag een workout gemist heeft.
${context.scheduledDay ? `Geplande training: ${context.scheduledDay}` : ''}
${context.lastWorkoutDaysAgo ? `Laatste workout: ${context.lastWorkoutDaysAgo} dagen geleden` : ''}
${context.daysMissed && context.daysMissed > 2 ? `Dit is al ${context.daysMissed} dagen op rij gemist.` : ''}

Wees motiverend maar niet opdringerig. Als het meerdere dagen is, wees iets directer.`
  } else if (context.type === 'missed_nutrition') {
    userMessage = `Genereer een kort bericht (max 2 zinnen) voor ${context.clientName} die vandaag nog niet heeft gelogd wat ze gegeten heeft.
Herinner ze er vriendelijk aan hun voeding bij te houden. Wees niet vervelend.`
  } else if (context.type === 'weekly_motivation') {
    userMessage = `Genereer een kort motiverend weekbericht (max 3 zinnen) voor ${context.clientName}.
${context.streakDays ? `Ze hebben een streak van ${context.streakDays} dagen.` : ''}
Het is het begin van een nieuwe week — motiveer ze om er weer tegenaan te gaan.`
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 150,
      system: GLENN_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const text = response.content[0]
    if (text.type === 'text') {
      return text.text.trim()
    }
    return ''
  } catch (error) {
    console.error('[AI Coach] Error generating nudge:', error)
    return ''
  }
}

/**
 * Send AI-generated message to a client and push notification
 * Messages are sent from the coach's account so the client thinks it's Glenn
 */
export async function sendAIMessage(
  coachId: string,
  clientId: string,
  content: string,
  tag: string = 'ai-coach'
): Promise<boolean> {
  if (!content) return false

  const supabase = createAdminClient()

  try {
    // Insert message as if from coach
    const { error } = await supabase.from('messages').insert({
      sender_id: coachId,
      receiver_id: clientId,
      content,
      message_type: 'text',
    })

    if (error) {
      console.error('[AI Coach] Error sending message:', error)
      return false
    }

    // Send push notification
    const { sendPushToUser } = await import('@/lib/push-server')
    await sendPushToUser(clientId, {
      title: 'Glenn',
      body: content.substring(0, 100),
      url: '/client/messages',
      tag,
    })

    return true
  } catch (error) {
    console.error('[AI Coach] Error in sendAIMessage:', error)
    return false
  }
}
