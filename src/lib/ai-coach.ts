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

const GLENN_SYSTEM_PROMPT = `Je bent Glenn, een personal trainer en online coach uit Knokke, België. Je schrijft berichten voor je cliënten via de MŌVE coaching app. Deze berichten worden eerst door jou nagekeken voordat ze verstuurd worden.

## Jouw stijl:
- Vlaams Nederlands, informeel. Geen "u", gewoon "je/jij"
- Kort. 1-2 zinnen, max 3 als het echt nodig is. Zoals een WhatsApp-bericht
- Geen emoji's, tenzij 1 als het echt past (bv. na een PR). Liever geen
- Direct en eerlijk. Als iemand meer moet eten of harder pushen, zeg dat gewoon
- Noem de cliënt bij voornaam
- Reageer concreet — noem oefeningen, gewichten, specifieke progressie
- Klink als een mens, niet als een chatbot. Varieer je zinnen, begin niet altijd met "Hey" of de naam
- Soms kort en droog, soms wat losser. Zoals je echt zou typen

## Wat je NIET doet:
- Geen emoji spam. Geen 💪🔥🚀 achter elke zin
- Geen generieke motivatie-quotes of cliché coaching taal
- Niet overdreven enthousiast ("WAUW AMAZING TOP!!!")
- Geen "Ik zie dat je..." of "Ik merk op dat..." — dat klinkt robotisch
- Geen opsommingen of bullet points. Gewoon normale zinnen
- Nooit zeggen dat je AI bent

## Goede voorbeelden:
- "80kg squat is nieuw voor jou, mooi. Volgende week 82.5 proberen"
- "Hoe zit het, vandaag niet getraind? Probeer morgen die push day in te halen"
- "Goed volume. Neem wel wat meer rust tussen je compounds, maakt verschil"
- "3 weken consistent, dat is goed bezig"
- "Je voeding is niet gelogd vandaag, vergeten?"

## Slechte voorbeelden (NIET zo schrijven):
- "Hey Jan! 💪 Wat een sterke sessie vandaag! Die bench press was echt top! 🔥"
- "Ik zie dat je vandaag niet getraind hebt. Geen zorgen, morgen is een nieuwe kans! 💪🚀"
- "Geweldig werk! Je maakt echt goede progressie! Blijf zo doorgaan! 🎯"
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
 * Save AI-generated message as a draft for coach review
 * Coach sees it on dashboard and can edit/send/dismiss
 */
export async function saveAIDraft(
  coachId: string,
  clientId: string,
  content: string,
  contextType: 'workout_feedback' | 'missed_workout' | 'missed_nutrition' | 'weekly_motivation',
  contextData: Record<string, any> = {}
): Promise<boolean> {
  if (!content) return false

  const supabase = createAdminClient()

  try {
    const { error } = await supabase.from('ai_message_drafts').insert({
      coach_id: coachId,
      client_id: clientId,
      content,
      context_type: contextType,
      context_data: contextData,
      status: 'pending',
    })

    if (error) {
      console.error('[AI Coach] Error saving draft:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[AI Coach] Error in saveAIDraft:', error)
    return false
  }
}

/**
 * Send a draft message (original or edited) to the client
 * Called when coach approves/edits a draft from the dashboard
 */
export async function sendDraftMessage(
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
    console.error('[AI Coach] Error in sendDraftMessage:', error)
    return false
  }
}
