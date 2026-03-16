'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ArrowRight, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────

interface ExerciseInfo {
  id: string
  name: string
  name_nl: string
}

interface WorkoutSet {
  id: string
  exercise_id: string
  set_number: number
  weight_kg: number | null
  actual_reps: number | null
  is_pr: boolean
  pain_flag: boolean
  pain_notes: string | null
  exercises?: ExerciseInfo
}

interface WorkoutSessionComplete {
  id: string
  started_at: string
  workout_sets: WorkoutSet[]
}

interface ExerciseGroup {
  exerciseId: string
  name: string
  sets: WorkoutSet[]
  painFlag: boolean
  painNotes: string
}

// ─── Component ──────────────────────────────────────────────

export default function WorkoutCompletePageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#EEEBE3] flex items-center justify-center">
        <div className="w-6 h-6 border-[1.5px] border-[#CCC7BC] border-t-[#1A1917] rounded-full animate-spin" />
      </div>
    }>
      <WorkoutCompletePage />
    </Suspense>
  )
}

function WorkoutCompletePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')

  const [session, setSession] = useState<WorkoutSessionComplete | null>(null)
  const [loading, setLoading] = useState(true)
  const [moodRating, setMoodRating] = useState<number | null>(null)
  const [difficultyRating, setDifficultyRating] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [feedbackText, setFeedbackText] = useState('')
  const [exerciseGroups, setExerciseGroups] = useState<ExerciseGroup[]>([])
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // ─── Confetti ───────
  const spawnConfetti = useCallback(() => {
    const colors = ['#1A1917', '#E8E4DC', '#34C759', '#007AFF', '#FFD700', '#AF52DE', '#FF9500']
    const container = document.body
    for (let i = 0; i < 40; i++) {
      const el = document.createElement('div')
      el.className = 'confetti-particle'
      el.style.left = `${Math.random() * 100}vw`
      el.style.width = `${6 + Math.random() * 8}px`
      el.style.height = `${6 + Math.random() * 8}px`
      el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
      el.style.borderRadius = '0'
      el.style.animationDelay = `${Math.random() * 1.5}s`
      el.style.animationDuration = `${2 + Math.random() * 2}s`
      container.appendChild(el)
      setTimeout(() => el.remove(), 5000)
    }
  }, [])

  useEffect(() => {
    const loadSession = async () => {
      try {
        if (!sessionId) { router.push('/client/workout'); return }
        const supabase = createClient()
        const { data: sessionData } = await supabase
          .from('workout_sessions')
          .select('*, workout_sets(*, exercises(id, name, name_nl))')
          .eq('id', sessionId)
          .single()

        if (sessionData) {
          const sd = sessionData as unknown as WorkoutSessionComplete
          setSession(sd)
          const groups: Record<string, ExerciseGroup> = {}
          for (const set of sd.workout_sets || []) {
            const exId = set.exercise_id
            if (!groups[exId]) {
              groups[exId] = {
                exerciseId: exId,
                name: set.exercises?.name_nl || set.exercises?.name || 'Oefening',
                sets: [],
                painFlag: false,
                painNotes: '',
              }
            }
            groups[exId].sets.push(set)
          }
          setExerciseGroups(Object.values(groups))
        }
      } catch (error) {
        console.error('Error loading session:', error)
      } finally {
        setLoading(false)
      }
    }
    loadSession()
  }, [sessionId, router])

  // Trigger confetti when PRs detected
  const prsCount = session?.workout_sets?.filter((s) => s.is_pr).length || 0
  useEffect(() => {
    if (prsCount > 0) {
      setTimeout(() => spawnConfetti(), 500)
    }
  }, [prsCount, spawnConfetti])

  const togglePain = (exerciseId: string) => {
    setExerciseGroups(prev =>
      prev.map(g =>
        g.exerciseId === exerciseId ? { ...g, painFlag: !g.painFlag } : g
      )
    )
  }

  const setPainNotes = (exerciseId: string, text: string) => {
    setExerciseGroups(prev =>
      prev.map(g =>
        g.exerciseId === exerciseId ? { ...g, painNotes: text } : g
      )
    )
  }

  const handleComplete = async () => {
    if (!session) return
    try {
      setSaving(true)
      const supabase = createClient()
      const startTime = new Date(session.started_at)
      const endTime = new Date()
      const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)

      await supabase
        .from('workout_sessions')
        .update({
          completed_at: endTime.toISOString(),
          duration_seconds: durationSeconds,
          mood_rating: moodRating,
          difficulty_rating: difficultyRating,
          notes: notes || null,
          feedback_text: feedbackText || null,
        })
        .eq('id', sessionId)

      const painUpdates = exerciseGroups
        .filter(g => g.painFlag)
        .map(g =>
          supabase
            .from('workout_sets')
            .update({ pain_flag: true, pain_notes: g.painNotes || null })
            .eq('workout_session_id', sessionId)
            .eq('exercise_id', g.exerciseId)
        )
      if (painUpdates.length > 0) await Promise.all(painUpdates)
      router.push('/client/workout')
    } catch (error) {
      console.error('Error completing workout:', error)
      setSaving(false)
    }
  }

  // ─── Loading / Empty ─────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#EEEBE3] flex items-center justify-center">
        <div className="w-6 h-6 border-[1.5px] border-[#CCC7BC] border-t-[#1A1917] rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#EEEBE3] flex items-center justify-center">
        <p className="text-[#A09D96] text-[14px]">Sessie niet gevonden</p>
      </div>
    )
  }

  // ─── Computed stats ─────────────────────────────────────

  const workoutSets = session.workout_sets || []
  const totalSets = workoutSets.length
  const totalVolume = workoutSets.reduce((sum, set) => {
    return sum + (set.weight_kg || 0) * (set.actual_reps || 0)
  }, 0)

  const startTime = new Date(session.started_at)
  const endTime = new Date()
  const minutes = Math.floor((endTime.getTime() - startTime.getTime()) / 1000 / 60)

  const moodEmojis = [
    { value: 1, emoji: '😫', label: 'Slecht' },
    { value: 2, emoji: '😐', label: 'Matig' },
    { value: 3, emoji: '😊', label: 'Goed' },
    { value: 4, emoji: '💪', label: 'Sterk' },
    { value: 5, emoji: '🔥', label: 'Top' },
  ]

  const difficultyOptions = [
    { value: 1, label: 'Makkelijk', color: '#3D8B5C' },
    { value: 2, label: 'Goed', color: '#1A1917' },
    { value: 3, label: 'Perfect', color: '#1A1917' },
    { value: 4, label: 'Zwaar', color: '#C47D15' },
    { value: 5, label: 'Te zwaar', color: '#FF3B30' },
  ]

  const painCount = exerciseGroups.filter(g => g.painFlag).length

  // ─── Render ─────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#EEEBE3]">

      {/* ═══ HEADER — editorial celebration ═══════════════ */}
      <div className="pt-16 pb-10 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A09D96] mb-4">Voltooid</p>
        <h1
          className="text-[40px] font-semibold text-[#1A1917] tracking-[-0.03em] leading-none"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Goed gedaan
        </h1>
        {prsCount > 0 && (
          <p className="text-[14px] text-[#1A1917] mt-3 font-medium">
            🏆 {prsCount} {prsCount === 1 ? 'nieuw record' : 'nieuwe records'}
          </p>
        )}
      </div>

      {/* ═══ STATS — editorial numbers ═══════════════════ */}
      <div className="flex justify-center gap-10 pb-8 border-b border-[#E8E4DC]">
        <div className="text-center">
          <p className="text-[28px] font-bold text-[#1A1917] tabular-nums">{minutes}</p>
          <p className="text-label mt-1">Minuten</p>
        </div>
        <div className="text-center">
          <p className="text-[28px] font-bold text-[#1A1917] tabular-nums">{totalSets}</p>
          <p className="text-label mt-1">Sets</p>
        </div>
        <div className="text-center">
          <p className="text-[28px] font-bold text-[#1A1917] tabular-nums">
            {totalVolume > 1000 ? `${(totalVolume / 1000).toFixed(1)}t` : `${totalVolume}`}
          </p>
          <p className="text-label mt-1">Volume</p>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 py-8 pb-32 space-y-6">

        {/* ═══ GEVOEL — editorial mood picker ══════════════ */}
        <div>
          <p className="text-label mb-4">Hoe voelde je je?</p>
          <div className="flex gap-2">
            {moodEmojis.map((mood) => (
              <button
                key={mood.value}
                onClick={() => setMoodRating(mood.value)}
                className={`flex-1 py-4 flex flex-col items-center gap-1.5 transition-all border ${
                  moodRating === mood.value
                    ? 'border-[#1A1917] bg-white'
                    : 'border-[#E8E4DC] bg-white/50 hover:bg-white'
                }`}
              >
                <span className="text-[24px]">{mood.emoji}</span>
                <span className="text-[10px] text-[#A09D96] font-medium uppercase tracking-[0.04em]">{mood.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ═══ MOEILIJKHEID ════════════════════════════════ */}
        <div>
          <p className="text-label mb-4">Moeilijkheidsgraad</p>
          <div className="flex gap-2">
            {difficultyOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDifficultyRating(opt.value)}
                className={`flex-1 py-3 text-center transition-all border text-[12px] font-semibold uppercase tracking-[0.04em] ${
                  difficultyRating === opt.value
                    ? 'border-[#1A1917] bg-[#1A1917] text-white'
                    : 'border-[#E8E4DC] bg-white/50 text-[#A09D96] hover:bg-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ═══ PIJN PER OEFENING ══════════════════════════ */}
        {exerciseGroups.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-label">Pijn of ongemak?</p>
              {painCount > 0 && (
                <span className="text-[11px] font-semibold text-[#FF3B30]">
                  {painCount} oefening{painCount !== 1 ? 'en' : ''}
                </span>
              )}
            </div>
            <div className="bg-white border border-[#E8E4DC]">
              {exerciseGroups.map((group, i) => (
                <div key={group.exerciseId} className={i > 0 ? 'border-t border-[#F0EDE8]' : ''}>
                  <button
                    onClick={() => {
                      togglePain(group.exerciseId)
                      if (!group.painFlag) {
                        setExpandedExercise(group.exerciseId)
                      } else {
                        setExpandedExercise(null)
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-5 py-3.5 transition-colors ${
                      group.painFlag ? 'bg-[#FF3B30]/5' : 'hover:bg-[#FAF8F3]'
                    }`}
                  >
                    <div className={`w-5 h-5 border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      group.painFlag ? 'border-[#FF3B30] bg-[#FF3B30]' : 'border-[#DDD9D0]'
                    }`}>
                      {group.painFlag && (
                        <AlertTriangle size={11} strokeWidth={2.5} className="text-white" />
                      )}
                    </div>
                    <span className={`text-[14px] font-medium flex-1 text-left ${
                      group.painFlag ? 'text-[#FF3B30]' : 'text-[#1A1917]'
                    }`}>
                      {group.name}
                    </span>
                    <span className="text-[12px] text-[#C5C2BC]">
                      {group.sets.length} sets
                    </span>
                    {group.painFlag && (
                      expandedExercise === group.exerciseId
                        ? <ChevronUp size={14} className="text-[#FF3B30]" />
                        : <ChevronDown size={14} className="text-[#FF3B30]" />
                    )}
                  </button>
                  {group.painFlag && expandedExercise === group.exerciseId && (
                    <div className="px-5 pb-4 bg-[#FF3B30]/5">
                      <textarea
                        value={group.painNotes}
                        onChange={(e) => setPainNotes(group.exerciseId, e.target.value)}
                        placeholder="Waar voelde je pijn? (bijv. linkerschouder, onderrug...)"
                        className="w-full px-4 py-3 border border-[#FF3B30]/20 text-[13px] text-[#1A1917] placeholder-[#C5C2BC] focus:outline-none focus:border-[#FF3B30]/40 resize-none h-16 bg-white"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ FEEDBACK VOOR COACH ════════════════════════ */}
        <div>
          <p className="text-label mb-2">Feedback voor je coach</p>
          <p className="text-[12px] text-[#C5C2BC] mb-3">Welke oefeningen wil je meer of minder?</p>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="bijv. &quot;Meer core oefeningen&quot;, &quot;Hip thrusts zijn te zwaar&quot;..."
            className="w-full px-4 py-3 border border-[#E8E4DC] bg-white text-[14px] text-[#1A1917] placeholder-[#C5C2BC] focus:outline-none focus:border-[#1A1917] resize-none h-20"
          />
        </div>

        {/* ═══ NOTITIES ═══════════════════════════════════ */}
        <div>
          <p className="text-label mb-3">Notities <span className="font-normal text-[#C5C2BC]">(optioneel)</span></p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Hoe ging het? Extra opmerkingen..."
            className="w-full px-4 py-3 border border-[#E8E4DC] bg-white text-[14px] text-[#1A1917] placeholder-[#C5C2BC] focus:outline-none focus:border-[#1A1917] resize-none h-20"
          />
        </div>

        {/* ═══ OPSLAAN CTA ════════════════════════════════ */}
        <button
          onClick={handleComplete}
          disabled={saving}
          className="w-full py-4 bg-[#1A1917] text-white font-semibold text-[14px] uppercase tracking-[0.08em] flex items-center justify-center gap-2 hover:bg-[#333330] transition-colors disabled:opacity-50"
        >
          {saving ? 'Opslaan...' : 'Opslaan & afsluiten'}
          <ArrowRight size={16} strokeWidth={2} />
        </button>

        {/* Info note */}
        <p className="text-center text-[12px] text-[#C5C2BC]">
          Je coach ziet deze feedback bij de volgende aanpassing
        </p>
      </main>
    </div>
  )
}
