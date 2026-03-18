'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { sendPushToClient } from '@/lib/push-notifications'
import {
  ArrowLeft, Clock, Dumbbell, CheckCircle2, AlertTriangle,
  TrendingUp, Trophy, Loader2, MessageSquare, Send
} from 'lucide-react'

interface WorkoutSet {
  id: string
  exercise_id: string
  set_number: number
  prescribed_reps: number | null
  actual_reps: number | null
  weight_kg: number | null
  rpe: number | null
  is_warmup: boolean
  is_pr: boolean
  completed: boolean
  notes: string | null
  exercise?: {
    name: string
    name_nl: string | null
    target_muscle: string | null
    body_part: string | null
  }
}

interface WorkoutSession {
  id: string
  client_id: string
  client_program_id: string | null
  template_day_id: string | null
  started_at: string
  completed_at: string | null
  duration_seconds: number | null
  duration_minutes: number | null
  notes: string | null
  mood_rating: number | null
  difficulty_rating: number | null
  feedback_text: string | null
  pain_reported: boolean | null
  pain_notes: string | null
  coach_seen: boolean | null
  template_day?: { name: string; focus: string | null }
}

interface GroupedExercise {
  exercise_id: string
  name: string
  target_muscle: string | null
  body_part: string | null
  sets: WorkoutSet[]
  totalVolume: number
  bestSet: { weight: number; reps: number } | null
  hasPR: boolean
}

interface CoachMessage {
  id: string
  sender_id: string
  content: string
  created_at: string
}

export default function CoachWorkoutDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string
  const sessionId = params.sessionId as string
  const supabase = createClient()

  const [session, setSession] = useState<WorkoutSession | null>(null)
  const [exercises, setExercises] = useState<GroupedExercise[]>([])
  const [clientName, setClientName] = useState('')
  const [loading, setLoading] = useState(true)
  const [feedbackText, setFeedbackText] = useState('')
  const [sendingFeedback, setSendingFeedback] = useState(false)
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [coachMessages, setCoachMessages] = useState<CoachMessage[]>([])
  const [coachId, setCoachId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        // Get current coach ID
        const { data: authData } = await supabase.auth.getUser()
        if (authData.user) setCoachId(authData.user.id)

        // Load session + client name + auth in parallel
        const [{ data: sessionData, error: sessionError }, { data: profile }] = await Promise.all([
          supabase
            .from('workout_sessions')
            .select('*, program_template_days(name, focus)')
            .eq('id', sessionId)
            .single(),
          supabase
            .from('profiles')
            .select('full_name')
            .eq('id', clientId)
            .single(),
        ])

        // Fallback if join fails
        let session = sessionData
        if (sessionError) {
          const { data: fallback } = await supabase
            .from('workout_sessions')
            .select('*')
            .eq('id', sessionId)
            .single()
          session = fallback
        }

        if (!session) {
          router.push(`/coach/clients/${clientId}`)
          return
        }

        if (profile) setClientName(profile.full_name)

        const rawDay = (session as any).program_template_days
        const templateDay = Array.isArray(rawDay) ? rawDay[0] : rawDay

        setSession({
          ...session,
          template_day: templateDay || undefined,
        })



        // Load sets with exercise info
        const { data: setsData, error: setsError } = await supabase
          .from('workout_sets')
          .select('*, exercises(name, name_nl, target_muscle, body_part)')
          .eq('workout_session_id', sessionId)
          .order('set_number', { ascending: true })

        // Fallback without join if it fails
        let sets = setsData
        if (setsError) {
          console.warn('Sets join failed, trying without:', setsError.message)
          const { data: fallback } = await supabase
            .from('workout_sets')
            .select('*')
            .eq('workout_session_id', sessionId)
            .order('set_number', { ascending: true })
          sets = fallback
        }

        if (sets && sets.length > 0) {
          // Group by exercise
          const grouped: Record<string, GroupedExercise> = {}

          sets.forEach((set: any) => {
            const exId = set.exercise_id
            const rawEx = set.exercises
            const ex = Array.isArray(rawEx) ? rawEx[0] : rawEx

            if (!grouped[exId]) {
              grouped[exId] = {
                exercise_id: exId,
                name: ex?.name_nl || ex?.name || 'Onbekende oefening',
                target_muscle: ex?.target_muscle || null,
                body_part: ex?.body_part || null,
                sets: [],
                totalVolume: 0,
                bestSet: null,
                hasPR: false,
              }
            }

            grouped[exId].sets.push({
              ...set,
              exercise: ex || undefined,
            })

            // Calculate volume
            if (set.completed && set.weight_kg && set.actual_reps) {
              grouped[exId].totalVolume += set.weight_kg * set.actual_reps
            }

            // Track best set (highest weight)
            if (set.completed && set.weight_kg && set.actual_reps) {
              if (!grouped[exId].bestSet || set.weight_kg > grouped[exId].bestSet!.weight) {
                grouped[exId].bestSet = { weight: set.weight_kg, reps: set.actual_reps }
              }
            }

            if (set.is_pr) grouped[exId].hasPR = true
          })

          setExercises(Object.values(grouped))
        }

        // Load existing coach messages about this session
        if (authData.user) {
          const sessionCompletedAt = sessionData.completed_at
            ? new Date(sessionData.completed_at).getTime()
            : new Date(sessionData.started_at).getTime()
          const oneHourBefore = new Date(sessionCompletedAt - 60 * 60 * 1000).toISOString()
          const oneHourAfter = new Date(sessionCompletedAt + 60 * 60 * 1000).toISOString()

          const { data: messagesData } = await supabase
            .from('messages')
            .select('id, sender_id, content, created_at')
            .eq('sender_id', authData.user.id)
            .eq('receiver_id', clientId)
            .gte('created_at', oneHourBefore)
            .lte('created_at', oneHourAfter)
            .order('created_at', { ascending: false })

          if (messagesData) {
            setCoachMessages(messagesData as CoachMessage[])
          }
        }

        // Mark as coach_seen
        await supabase
          .from('workout_sessions')
          .update({ coach_seen: true })
          .eq('id', sessionId)

      } catch (error) {
        console.error('Error loading workout:', error)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [sessionId, clientId, supabase, router])

  const handleSendFeedback = async () => {
    if (!feedbackText.trim() || !coachId) return

    setSendingFeedback(true)
    try {
      // Insert message
      const { error: msgError } = await supabase.from('messages').insert({
        sender_id: coachId,
        receiver_id: clientId,
        content: feedbackText,
        message_type: 'text',
      })

      if (msgError) throw msgError

      // Send push notification
      const previewText = feedbackText.substring(0, 80)
      sendPushToClient(clientId, 'Glenn heeft je training bekeken', previewText, '/client/messages')

      // Update session
      await supabase
        .from('workout_sessions')
        .update({ coach_seen: true })
        .eq('id', sessionId)

      // Show success state
      setFeedbackSent(true)
      setFeedbackText('')

      // Reload messages
      const { data: messagesData } = await supabase
        .from('messages')
        .select('id, sender_id, content, created_at')
        .eq('sender_id', coachId)
        .eq('receiver_id', clientId)
        .order('created_at', { ascending: false })

      if (messagesData) {
        setCoachMessages(messagesData as CoachMessage[])
      }

      // Clear success message after 2 seconds
      setTimeout(() => setFeedbackSent(false), 2000)
    } catch (error) {
      console.error('Error sending feedback:', error)
    } finally {
      setSendingFeedback(false)
    }
  }

  const quickReplies = [
    'Sterk gedaan! 💪',
    'Goed volume, volgende week gaan we zwaarder',
    'Probeer meer rust tussen je sets',
    'Mooie progressie, keep going!',
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#8E8E93]" />
      </div>
    )
  }

  if (!session) return null

  const isCompleted = !!session.completed_at
  const sessionDate = new Date(session.started_at)
  const dateStr = sessionDate.toLocaleDateString('nl-BE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const timeStr = sessionDate.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })

  const durationMin = session.duration_minutes
    || (session.duration_seconds ? Math.round(session.duration_seconds / 60) : null)

  const totalVolume = exercises.reduce((sum, ex) => sum + ex.totalVolume, 0)
  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.filter(s => s.completed).length, 0)
  const totalPRs = exercises.reduce((sum, ex) => sum + ex.sets.filter(s => s.is_pr).length, 0)

  const moodEmojis: Record<number, string> = { 1: '😫', 2: '😐', 3: '😊', 4: '💪', 5: '🔥' }
  const difficultyLabels: Record<number, string> = { 1: 'Makkelijk', 2: 'Normaal', 3: 'Gemiddeld', 4: 'Zwaar', 5: 'Maximaal' }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/coach/clients/${clientId}`}
          className="inline-flex items-center gap-1 text-[#8E8E93] hover:text-[#1A1917] transition-colors mb-4"
        >
          <ArrowLeft strokeWidth={1.5} className="w-4 h-4" />
          <span className="text-sm font-medium">Terug naar {clientName || 'cliënt'}</span>
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-[family-name:var(--font-display)] text-[#1A1A18]">
              {session.template_day?.name || 'Training'}
            </h1>
            <p className="text-[14px] text-[#8E8E93] mt-1 capitalize">{dateStr} om {timeStr}</p>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold ${
            isCompleted
              ? 'bg-green-50 text-green-700'
              : 'bg-orange-50 text-orange-600'
          }`}>
            {isCompleted ? (
              <><CheckCircle2 strokeWidth={1.5} className="w-3.5 h-3.5" /> Afgerond</>
            ) : (
              <><Clock strokeWidth={1.5} className="w-3.5 h-3.5" /> Niet afgerond</>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-[#E8E4DC] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[11px] text-[#8E8E93] uppercase font-semibold tracking-wide">Duur</p>
          <p className="text-xl font-bold text-[#1A1917] mt-1">
            {durationMin ? `${durationMin} min` : '—'}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-[#E8E4DC] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[11px] text-[#8E8E93] uppercase font-semibold tracking-wide">Volume</p>
          <p className="text-xl font-bold text-[#1A1917] mt-1">
            {totalVolume > 0 ? `${totalVolume.toLocaleString('nl-BE')} kg` : '—'}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-[#E8E4DC] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[11px] text-[#8E8E93] uppercase font-semibold tracking-wide">Sets</p>
          <p className="text-xl font-bold text-[#1A1917] mt-1">{totalSets}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-[#E8E4DC] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-[11px] text-[#8E8E93] uppercase font-semibold tracking-wide">PR&apos;s</p>
          <p className="text-xl font-bold text-[#1A1917] mt-1">
            {totalPRs > 0 ? (
              <span className="flex items-center gap-1">
                {totalPRs} <Trophy strokeWidth={1.5} className="w-4 h-4 text-[#FF9500]" />
              </span>
            ) : '0'}
          </p>
        </div>
      </div>

      {/* Feedback & Mood */}
      {(session.mood_rating || session.difficulty_rating || session.feedback_text || session.pain_reported) && (
        <div className="bg-white rounded-2xl p-5 border border-[#E8E4DC] shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
          <h2 className="text-[13px] text-[#8E8E93] uppercase font-semibold tracking-wide">Feedback van {clientName?.split(' ')[0] || 'cliënt'}</h2>

          <div className="flex flex-wrap gap-4">
            {session.mood_rating && (
              <div>
                <p className="text-[11px] text-[#8E8E93] uppercase font-medium mb-1">Gevoel</p>
                <p className="text-2xl">{moodEmojis[session.mood_rating] || '—'}</p>
              </div>
            )}
            {session.difficulty_rating && (
              <div>
                <p className="text-[11px] text-[#8E8E93] uppercase font-medium mb-1">Moeilijkheid</p>
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div
                        key={i}
                        className={`w-5 h-2 rounded-full ${i <= session.difficulty_rating! ? 'bg-[var(--color-pop)]' : 'bg-[#E8E4DC]'}`}
                      />
                    ))}
                  </div>
                  <span className="text-[12px] font-medium text-[#1A1917]">
                    {difficultyLabels[session.difficulty_rating] || `${session.difficulty_rating}/5`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {session.feedback_text && (
            <div className="bg-[#FAFAFA] rounded-xl p-4">
              <div className="flex items-start gap-2">
                <MessageSquare strokeWidth={1.5} className="w-4 h-4 text-[#8E8E93] mt-0.5 flex-shrink-0" />
                <p className="text-[14px] text-[#1A1917] whitespace-pre-wrap">{session.feedback_text}</p>
              </div>
            </div>
          )}

          {session.pain_reported && (
            <div className="bg-red-50 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle strokeWidth={1.5} className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] font-semibold text-red-700">Pijn gemeld tijdens training</p>
                {session.pain_notes && (
                  <p className="text-[13px] text-red-600 mt-1">{session.pain_notes}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Session Notes */}
      {session.notes && (
        <div className="bg-[#FAFAFA] rounded-2xl p-5 border border-[#E8E4DC]">
          <p className="text-[12px] text-[#8E8E93] uppercase font-semibold tracking-wide mb-2">Notities</p>
          <p className="text-[14px] text-[#1A1917] whitespace-pre-wrap">{session.notes}</p>
        </div>
      )}

      {/* Exercises */}
      {exercises.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-[13px] text-[#8E8E93] uppercase font-semibold tracking-wide">
            Oefeningen — {exercises.length}
          </h2>

          {exercises.map((ex, exIdx) => (
            <div
              key={ex.exercise_id}
              className="bg-white rounded-2xl border border-[#E8E4DC] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden"
            >
              {/* Exercise header */}
              <div className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#EDEAE4] flex items-center justify-center flex-shrink-0">
                    <span className="text-[12px] font-bold text-[#1A1917]">{exIdx + 1}</span>
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold text-[#1A1917]">{ex.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[12px] text-[#8E8E93]">
                      {ex.target_muscle && <span>{ex.target_muscle}</span>}
                      {ex.body_part && ex.target_muscle && <span>·</span>}
                      {ex.body_part && <span>{ex.body_part}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {ex.hasPR && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FF9500]/10">
                      <Trophy strokeWidth={1.5} className="w-3 h-3 text-[#FF9500]" />
                      <span className="text-[11px] font-semibold text-[#FF9500]">PR</span>
                    </div>
                  )}
                  {ex.totalVolume > 0 && (
                    <span className="text-[12px] font-medium text-[#8E8E93]">
                      {ex.totalVolume.toLocaleString('nl-BE')} kg
                    </span>
                  )}
                </div>
              </div>

              {/* Sets table */}
              <div className="border-t border-[#E8E4DC]">
                <div className="grid grid-cols-5 text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wide px-5 py-2 bg-[#FAFAFA]">
                  <span>Set</span>
                  <span className="text-right">Gewicht</span>
                  <span className="text-right">Reps</span>
                  <span className="text-right">RPE</span>
                  <span className="text-right">Status</span>
                </div>
                {ex.sets.map((set) => (
                  <div
                    key={set.id}
                    className={`grid grid-cols-5 items-center px-5 py-2.5 text-[13px] border-t border-[#F0EDE8] ${
                      set.is_warmup ? 'text-[#A09D96] bg-[#FAFAFA]' : 'text-[#1A1917]'
                    }`}
                  >
                    <span className="font-medium">
                      {set.is_warmup ? 'W' : set.set_number}
                      {set.is_pr && <Trophy strokeWidth={1.5} className="w-3 h-3 text-[#FF9500] inline ml-1" />}
                    </span>
                    <span className="text-right font-semibold tabular-nums">
                      {set.weight_kg != null ? `${set.weight_kg} kg` : '—'}
                    </span>
                    <span className="text-right tabular-nums">
                      {set.actual_reps != null ? set.actual_reps : '—'}
                      {set.prescribed_reps && set.actual_reps != null && set.actual_reps !== set.prescribed_reps && (
                        <span className="text-[10px] text-[#8E8E93] ml-0.5">/{set.prescribed_reps}</span>
                      )}
                    </span>
                    <span className="text-right tabular-nums">
                      {set.rpe != null ? set.rpe : '—'}
                    </span>
                    <span className="text-right">
                      {set.completed ? (
                        <CheckCircle2 strokeWidth={1.5} className="w-4 h-4 text-green-500 inline" />
                      ) : (
                        <span className="text-[#C7C7CC]">—</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {/* Best set summary */}
              {ex.bestSet && (
                <div className="px-5 py-2.5 border-t border-[#E8E4DC] bg-[#FAFAFA] flex items-center justify-between text-[12px]">
                  <span className="text-[#8E8E93] font-medium">Beste set</span>
                  <span className="font-semibold text-[#1A1917]">
                    {ex.bestSet.weight} kg × {ex.bestSet.reps}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-8 border border-[#E8E4DC] text-center">
          <Dumbbell strokeWidth={1.5} className="w-10 h-10 mx-auto mb-3 text-[#8E8E93] opacity-40" />
          <p className="text-[14px] text-[#8E8E93]">Geen oefeningen gelogd voor deze sessie.</p>
        </div>
      )}

      {/* Quick Feedback Section */}
      <div className="bg-white rounded-2xl border border-[#E8E4DC] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 space-y-4">
        <h2 className="text-[13px] text-[#8E8E93] uppercase font-semibold tracking-wide">
          Feedback naar {clientName?.split(' ')[0] || 'cliënt'}
        </h2>

        {/* Existing Messages */}
        {coachMessages.length > 0 && (
          <div className="space-y-2 pb-4 border-b border-[#E8E4DC]">
            {coachMessages.map((msg) => (
              <div key={msg.id} className="bg-[#FAFAFA] rounded-xl p-3">
                <p className="text-[13px] text-[#1A1917] whitespace-pre-wrap">{msg.content}</p>
                <p className="text-[11px] text-[#8E8E93] mt-1">
                  {new Date(msg.created_at).toLocaleDateString('nl-BE', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Quick Reply Buttons */}
        <div className="flex flex-wrap gap-2">
          {quickReplies.map((reply) => (
            <button
              key={reply}
              onClick={() => setFeedbackText(reply)}
              className="px-3 py-1.5 rounded-full bg-[#EDEAE4] hover:bg-[#E0DCD2] transition-colors text-[13px] font-medium text-[#1A1917]"
            >
              {reply}
            </button>
          ))}
        </div>

        {/* Feedback Input */}
        {feedbackSent ? (
          <div className="flex items-center justify-center py-4">
            <p className="text-[14px] font-medium text-green-600">Feedback verstuurd ✓</p>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Typ je feedback hier..."
              className="w-full p-3 rounded-lg border border-[#E8E4DC] text-[14px] text-[#1A1917] placeholder:text-[#8E8E93] focus:outline-none focus:ring-1 focus:ring-[#D46A3A] resize-none"
              rows={3}
            />
            <button
              onClick={handleSendFeedback}
              disabled={!feedbackText.trim() || sendingFeedback}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[var(--color-pop)] hover:bg-[#C85A2A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white font-semibold text-[14px]"
            >
              {sendingFeedback ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Verstuur feedback
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
