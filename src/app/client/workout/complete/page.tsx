'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ChevronRight, AlertCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'

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
    <Suspense fallback={<div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#1A1917] border-t-transparent rounded-full animate-spin" /></div>}>
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

  // ─── Confetti (hook BEFORE any conditional returns) ───────
  const spawnConfetti = useCallback(() => {
    const colors = ['#FF9500', '#1A1917', '#34C759', '#007AFF', '#FF3B30', '#AF52DE', '#FFCC00']
    const container = document.body
    for (let i = 0; i < 40; i++) {
      const el = document.createElement('div')
      el.className = 'confetti-particle'
      el.style.left = `${Math.random() * 100}vw`
      el.style.width = `${6 + Math.random() * 8}px`
      el.style.height = `${6 + Math.random() * 8}px`
      el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
      el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px'
      el.style.animationDelay = `${Math.random() * 1.5}s`
      el.style.animationDuration = `${2 + Math.random() * 2}s`
      container.appendChild(el)
      setTimeout(() => el.remove(), 5000)
    }
  }, [])

  useEffect(() => {
    const loadSession = async () => {
      try {
        if (!sessionId) {
          router.push('/client/workout')
          return
        }

        const supabase = createClient()

        const { data: sessionData } = await supabase
          .from('workout_sessions')
          .select('*, workout_sets(*, exercises(id, name, name_nl))')
          .eq('id', sessionId)
          .single()

        if (sessionData) {
          const sd = sessionData as unknown as WorkoutSessionComplete
          setSession(sd)

          // Group sets by exercise
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

  // Trigger confetti when PRs detected (hook BEFORE conditional returns)
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

      // Update session with feedback
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

      // Update pain flags per exercise
      const painUpdates = exerciseGroups
        .filter(g => g.painFlag)
        .map(g =>
          supabase
            .from('workout_sets')
            .update({
              pain_flag: true,
              pain_notes: g.painNotes || null,
            })
            .eq('workout_session_id', sessionId)
            .eq('exercise_id', g.exerciseId)
        )

      if (painUpdates.length > 0) {
        await Promise.all(painUpdates)
      }

      router.push('/client/workout')
    } catch (error) {
      console.error('Error completing workout:', error)
      setSaving(false)
    }
  }

  // ─── Loading / Empty states ─────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-32 h-32 bg-[#E8E4DC] rounded-2xl mb-4" />
          <div className="w-24 h-4 bg-[#E8E4DC] rounded mx-auto" />
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <p className="text-[#1A1A18]">Sessie niet gevonden</p>
      </div>
    )
  }

  // ─── Computed stats ─────────────────────────────────────

  const workoutSets = session.workout_sets || []
  const totalSets = workoutSets.length
  const totalVolume = workoutSets.reduce((sum, set) => {
    const weight = set.weight_kg || 0
    const reps = set.actual_reps || 0
    return sum + weight * reps
  }, 0)

  const startTime = new Date(session.started_at)
  const endTime = new Date()
  const minutes = Math.floor((endTime.getTime() - startTime.getTime()) / 1000 / 60)
  const secs = Math.floor(((endTime.getTime() - startTime.getTime()) / 1000) % 60)

  const moodEmojis = [
    { value: 1, emoji: '😫', label: 'Verschrikkelijk' },
    { value: 2, emoji: '😐', label: 'Matig' },
    { value: 3, emoji: '😊', label: 'Goed' },
    { value: 4, emoji: '💪', label: 'Sterk' },
    { value: 5, emoji: '🔥', label: 'Geweldig' },
  ]

  const difficultyOptions = [
    { value: 1, label: 'Te makkelijk', color: '#007AFF', bg: '#007AFF' },
    { value: 2, label: 'Makkelijk', color: '#34C759', bg: '#34C759' },
    { value: 3, label: 'Perfect', color: '#1A1917', bg: '#1A1917' },
    { value: 4, label: 'Zwaar', color: '#FF9500', bg: '#FF9500' },
    { value: 5, label: 'Te zwaar', color: '#FF3B30', bg: '#FF3B30' },
  ]

  const painCount = exerciseGroups.filter(g => g.painFlag).length

  // ─── Render ─────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Celebratory header */}
      <header className="bg-white border-b border-[#E8E4DC] pt-6">
        <div className="max-w-2xl mx-auto px-4 text-center pb-8">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="font-display text-3xl font-semibold text-[#1A1A18]">
            Workout Klaar!
          </h1>
          <p className="text-[#8E8E93] text-[14px] mt-2">
            Geweldige prestatie!
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-32">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC]">
            <p className="text-[12px] text-[#8E8E93] uppercase font-medium tracking-wide mb-2">Duur</p>
            <p className="text-3xl font-bold text-[#1A1A18]">{minutes}m {secs}s</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC]">
            <p className="text-[12px] text-[#8E8E93] uppercase font-medium tracking-wide mb-2">Sets</p>
            <p className="text-3xl font-bold text-[#1A1A18]">{totalSets}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC] col-span-2">
            <p className="text-[12px] text-[#8E8E93] uppercase font-medium tracking-wide mb-2">Totaal volume</p>
            <p className="text-3xl font-bold text-[#1A1A18]">{totalVolume.toLocaleString('nl-BE')} kg</p>
          </div>
          {prsCount > 0 && (
            <div className="bg-[#FF9500]/10 rounded-2xl p-5 border border-[#FF9500]/20 col-span-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                <div>
                  <p className="text-[12px] text-[#FF9500] uppercase font-medium tracking-wide">Persoonlijke records</p>
                  <p className="text-[17px] font-semibold text-[#FF9500] mt-0.5">{prsCount} {prsCount === 1 ? 'PR' : 'PRs'} bereikt!</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section: Mood */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC] mb-4">
          <p className="text-[13px] text-[#8E8E93] uppercase font-medium tracking-wide mb-4">
            Hoe voelde je je?
          </p>
          <div className="flex justify-between gap-2">
            {moodEmojis.map((mood) => (
              <button
                key={mood.value}
                onClick={() => setMoodRating(mood.value)}
                className={`flex-1 aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all border-2 ${
                  moodRating === mood.value
                    ? 'border-[#1A1917] bg-[#EDEAE4]'
                    : 'border-transparent hover:bg-[#E8E4DC]'
                }`}
              >
                <span className="text-2xl">{mood.emoji}</span>
                <span className="text-[10px] text-[#8E8E93] font-medium">{mood.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Section: Difficulty */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC] mb-4">
          <p className="text-[13px] text-[#8E8E93] uppercase font-medium tracking-wide mb-4">
            Moeilijkheidsgraad
          </p>
          <div className="flex gap-2">
            {difficultyOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDifficultyRating(opt.value)}
                className={`flex-1 py-2.5 px-1 rounded-xl text-center transition-all border-2 ${
                  difficultyRating === opt.value
                    ? 'text-white'
                    : 'border-transparent bg-[#E8E4DC] text-[#8E8E93] hover:bg-[#E8E8E5]'
                }`}
                style={
                  difficultyRating === opt.value
                    ? { backgroundColor: opt.bg, borderColor: opt.bg }
                    : undefined
                }
              >
                <span className="text-[12px] font-semibold leading-tight">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Section: Pain / Discomfort per exercise */}
        {exerciseGroups.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC] mb-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[13px] text-[#8E8E93] uppercase font-medium tracking-wide">
                Pijn of ongemak?
              </p>
              {painCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#FF3B30]/10 text-[#FF3B30] text-[11px] font-semibold">
                  {painCount} oefening{painCount !== 1 ? 'en' : ''}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {exerciseGroups.map((group) => (
                <div key={group.exerciseId} className="rounded-xl border border-[#E8E4DC] overflow-hidden">
                  <button
                    onClick={() => {
                      togglePain(group.exerciseId)
                      if (!group.painFlag) {
                        setExpandedExercise(group.exerciseId)
                      } else {
                        setExpandedExercise(null)
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                      group.painFlag ? 'bg-[#FF3B30]/5' : 'hover:bg-[#E8E4DC]/50'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      group.painFlag ? 'border-[#FF3B30] bg-[#FF3B30]' : 'border-[#C7C7CC]'
                    }`}>
                      {group.painFlag && (
                        <AlertTriangle size={12} strokeWidth={2.5} className="text-white" />
                      )}
                    </div>
                    <span className={`text-[14px] font-medium flex-1 text-left ${
                      group.painFlag ? 'text-[#FF3B30]' : 'text-[#1A1A18]'
                    }`}>
                      {group.name}
                    </span>
                    <span className="text-[12px] text-[#C7C7CC]">
                      {group.sets.length} sets
                    </span>
                    {group.painFlag ? (
                      expandedExercise === group.exerciseId
                        ? <ChevronUp size={16} className="text-[#FF3B30]" />
                        : <ChevronDown size={16} className="text-[#FF3B30]" />
                    ) : null}
                  </button>
                  {group.painFlag && expandedExercise === group.exerciseId && (
                    <div className="px-4 pb-3 bg-[#FF3B30]/5">
                      <textarea
                        value={group.painNotes}
                        onChange={(e) => setPainNotes(group.exerciseId, e.target.value)}
                        placeholder="Waar voelde je pijn? (bijv. linkerschouder, onderrug...)"
                        className="w-full px-3 py-2 border border-[#FF3B30]/20 rounded-lg text-[13px] text-[#1A1A18] placeholder-[#C7C7CC] focus:outline-none focus:border-[#FF3B30]/40 resize-none h-16 bg-white"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section: Feedback for coach */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC] mb-4">
          <label className="block">
            <p className="text-[13px] text-[#8E8E93] uppercase font-medium tracking-wide mb-3">
              Feedback voor je coach
            </p>
            <p className="text-[12px] text-[#C7C7CC] mb-3">
              Welke oefeningen wil je meer of minder? Suggesties?
            </p>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="bijv. &quot;Meer core oefeningen&quot;, &quot;Hip thrusts zijn te zwaar&quot;..."
              className="w-full px-4 py-3 border border-[#E8E4DC] rounded-xl text-[14px] text-[#1A1A18] placeholder-[#C7C7CC] focus:outline-none focus:border-[#1A1917] resize-none h-20"
            />
          </label>
        </div>

        {/* Section: Notes */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC] mb-6">
          <label className="block">
            <p className="text-[13px] text-[#8E8E93] uppercase font-medium tracking-wide mb-3">
              Notities (optioneel)
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Hoe ging het? Extra opmerkingen..."
              className="w-full px-4 py-3 border border-[#E8E4DC] rounded-xl text-[14px] text-[#1A1A18] placeholder-[#C7C7CC] focus:outline-none focus:border-[#1A1917] resize-none h-20"
            />
          </label>
        </div>

        {/* Save button */}
        <button
          onClick={handleComplete}
          disabled={saving}
          className="w-full py-4 px-4 bg-[#1A1917] text-white rounded-xl font-semibold text-[16px] flex items-center justify-center gap-2 hover:bg-[#6F5612] transition-colors disabled:opacity-60"
        >
          {saving ? 'Opslaan...' : 'Opslaan & Afsluiten'}
          <ChevronRight size={20} strokeWidth={1.5} />
        </button>

        {/* Info */}
        <div className="mt-6 flex gap-3 bg-[#007AFF]/5 rounded-xl p-4 border border-[#007AFF]/20">
          <AlertCircle size={18} strokeWidth={1.5} className="text-[#007AFF] flex-shrink-0 mt-0.5" />
          <p className="text-[13px] text-[#007AFF] font-medium">
            Je coach ziet deze feedback bij de volgende programma-aanpassing
          </p>
        </div>
      </main>
    </div>
  )
}
