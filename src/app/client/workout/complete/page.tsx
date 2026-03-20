'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ArrowRight, AlertTriangle, ChevronDown, ChevronUp, Trophy, Timer, Layers, BarChart3 } from 'lucide-react'

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
    const colors = ['#D46A3A', '#E8E4DC', '#3D8B5C', '#007AFF', '#FFD700', '#AF52DE', '#FF9500']
    const container = document.body
    for (let i = 0; i < 40; i++) {
      const el = document.createElement('div')
      el.className = 'confetti-particle'
      el.style.left = `${Math.random() * 100}vw`
      el.style.width = `${6 + Math.random() * 8}px`
      el.style.height = `${6 + Math.random() * 8}px`
      el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
      el.style.borderRadius = '2px'
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
          let workoutSets = sd.workout_sets || []

          // RESCUE: If no sets in DB, recover from localStorage and save them
          if (workoutSets.length === 0) {
            try {
              const raw = localStorage.getItem('move_active_workout')
              if (raw) {
                const saved = JSON.parse(raw)
                if (saved.sessionId === sessionId && saved.sets) {
                  // Map template exercise IDs to real exercise IDs
                  const templateExIds = Object.keys(saved.sets)
                  const { data: templateExercises } = await supabase
                    .from('program_template_exercises')
                    .select('id, exercise_id')
                    .in('id', templateExIds)

                  const idMap: Record<string, string> = {}
                  for (const te of templateExercises || []) {
                    idMap[te.id] = te.exercise_id
                  }

                  const setsToInsert: any[] = []
                  for (const [templateExId, exSets] of Object.entries(saved.sets)) {
                    const realExId = idMap[templateExId] || templateExId
                    for (const s of exSets as any[]) {
                      if (!s.weight_kg && !s.actual_reps) continue
                      setsToInsert.push({
                        workout_session_id: sessionId,
                        exercise_id: realExId,
                        set_number: s.set_number,
                        prescribed_reps: s.prescribed_reps || null,
                        actual_reps: s.actual_reps,
                        weight_kg: s.weight_kg,
                        is_warmup: s.is_warmup || false,
                        completed: true,
                        is_pr: s.is_pr || false,
                      })
                    }
                  }

                  if (setsToInsert.length > 0) {
                    const { error: insertErr } = await supabase.from('workout_sets').insert(setsToInsert)
                    if (!insertErr) {
                      // Reload with fresh data
                      const { data: refreshed } = await supabase
                        .from('workout_sessions')
                        .select('*, workout_sets(*, exercises(id, name, name_nl))')
                        .eq('id', sessionId)
                        .single()
                      if (refreshed) {
                        workoutSets = (refreshed as any).workout_sets || []
                      }
                    }
                  }
                }
              }
            } catch (e) {
              console.error('Recovery from localStorage failed:', e)
            }
            // Clean up
            try {
              localStorage.removeItem('move_active_workout')
              localStorage.removeItem('move_minimized_workout')
            } catch { /* ok */ }
          }

          setSession({ ...sd, workout_sets: workoutSets })
          const groups: Record<string, ExerciseGroup> = {}
          for (const set of workoutSets) {
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

  const prsCount = session?.workout_sets?.filter((s) => s.is_pr).length || 0
  useEffect(() => {
    if (prsCount > 0) setTimeout(() => spawnConfetti(), 500)
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

      // Collect pain data
      const painData = exerciseGroups
        .filter(g => g.painFlag)
        .map(g => ({ exerciseId: g.exerciseId, painNotes: g.painNotes || null }))

      // Get auth token to pass to server route
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (authSession?.access_token) {
        headers['Authorization'] = `Bearer ${authSession.access_token}`
      }

      // Use server route (admin client) for reliable write
      const res = await fetch('/api/workout-finish', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId,
          completedAt: endTime.toISOString(),
          durationSeconds,
          moodRating: moodRating ?? null,
          difficultyRating: difficultyRating ?? null,
          notes: notes || null,
          feedbackText: feedbackText || null,
          painData: painData.length > 0 ? painData : null,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        console.error('[handleComplete] Server error:', err)

        // Fallback: try direct Supabase write
        console.warn('[handleComplete] Falling back to direct write...')
        await supabase
          .from('workout_sessions')
          .update({
            completed_at: endTime.toISOString(),
            duration_seconds: durationSeconds,
            mood_rating: moodRating ?? null,
            difficulty_rating: difficultyRating ?? null,
            notes: notes || null,
            feedback_text: feedbackText || null,
          })
          .eq('id', sessionId)

        // Pain updates via browser client
        for (const pain of painData) {
          await supabase
            .from('workout_sets')
            .update({ pain_flag: true, pain_notes: pain.painNotes })
            .eq('workout_session_id', sessionId)
            .eq('exercise_id', pain.exerciseId)
        }

        // Fire & forget notification
        fetch('/api/workout-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        }).catch(() => {})
      }

      router.push('/client/workout')
    } catch (error) {
      console.error('Error completing workout:', error)
      setSaving(false)
    }
  }

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

  const workoutSets = session.workout_sets || []
  const totalSets = workoutSets.length
  const totalVolume = workoutSets.reduce((sum, set) => sum + (set.weight_kg || 0) * (set.actual_reps || 0), 0)
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
    { value: 1, label: 'Makkelijk' },
    { value: 2, label: 'Goed' },
    { value: 3, label: 'Perfect' },
    { value: 4, label: 'Zwaar' },
    { value: 5, label: 'Te zwaar' },
  ]

  const painCount = exerciseGroups.filter(g => g.painFlag).length

  return (
    <div className="min-h-screen bg-[#EEEBE3]">

      {/* ═══ HEADER — celebration ═══════════════════ */}
      <div className="pt-16 pb-8 text-center">
        <p className="text-label mb-4">Voltooid</p>
        <h1 className="text-editorial-h1 text-[#1A1917]">
          Goed gedaan
        </h1>
        {prsCount > 0 && (
          <div className="mt-4 inline-flex items-center gap-2 bg-[var(--color-pop-light)] px-4 py-2 rounded-xl">
            <Trophy size={16} strokeWidth={2} className="text-[var(--color-pop)]" />
            <span className="text-[14px] font-semibold text-[var(--color-pop)]">
              {prsCount} {prsCount === 1 ? 'nieuw record' : 'nieuwe records'}
            </span>
          </div>
        )}
      </div>

      {/* ═══ STATS — editorial cards ═══════════════ */}
      <div className="max-w-lg mx-auto px-4 mb-8">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl shadow-[var(--shadow-card)] p-4 text-center">
            <div className="w-8 h-8 bg-[var(--color-pop-light)] rounded-lg flex items-center justify-center mx-auto mb-2">
              <Timer size={16} strokeWidth={2} className="text-[var(--color-pop)]" />
            </div>
            <p className="text-[24px] font-bold text-[#1A1917] tabular-nums">{minutes}</p>
            <p className="text-label mt-0.5">Minuten</p>
          </div>
          <div className="bg-white rounded-2xl shadow-[var(--shadow-card)] p-4 text-center">
            <div className="w-8 h-8 bg-[#F0EDE8] rounded-lg flex items-center justify-center mx-auto mb-2">
              <Layers size={16} strokeWidth={2} className="text-[#6B6862]" />
            </div>
            <p className="text-[24px] font-bold text-[#1A1917] tabular-nums">{totalSets}</p>
            <p className="text-label mt-0.5">Sets</p>
          </div>
          <div className="bg-white rounded-2xl shadow-[var(--shadow-card)] p-4 text-center">
            <div className="w-8 h-8 bg-[#F0EDE8] rounded-lg flex items-center justify-center mx-auto mb-2">
              <BarChart3 size={16} strokeWidth={2} className="text-[#6B6862]" />
            </div>
            <p className="text-[24px] font-bold text-[#1A1917] tabular-nums">
              {totalVolume > 1000 ? `${(totalVolume / 1000).toFixed(1)}t` : `${totalVolume}`}
            </p>
            <p className="text-label mt-0.5">Volume</p>
          </div>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 pb-32 space-y-6">

        {/* ═══ GEVOEL — mood picker ══════════════════ */}
        <div className="bg-white rounded-2xl shadow-[var(--shadow-card)] p-5">
          <p className="text-label mb-4">Hoe voelde je je?</p>
          <div className="flex gap-2">
            {moodEmojis.map((mood) => (
              <button
                key={mood.value}
                onClick={() => setMoodRating(mood.value)}
                className={`flex-1 py-3.5 flex flex-col items-center gap-1.5 transition-all rounded-xl ${
                  moodRating === mood.value
                    ? 'bg-[var(--color-pop-light)] ring-2 ring-[var(--color-pop)]'
                    : 'bg-[#F5F2EC] hover:bg-[#F0EDE8]'
                }`}
              >
                <span className="text-[22px]">{mood.emoji}</span>
                <span className="text-[10px] text-[#A09D96] font-medium uppercase tracking-[0.04em]">{mood.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ═══ MOEILIJKHEID ════════════════════════ */}
        <div className="bg-white rounded-2xl shadow-[var(--shadow-card)] p-5">
          <p className="text-label mb-4">Moeilijkheidsgraad</p>
          <div className="flex gap-2">
            {difficultyOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDifficultyRating(opt.value)}
                className={`flex-1 py-3 text-center transition-all text-[12px] font-semibold uppercase tracking-[0.04em] rounded-xl ${
                  difficultyRating === opt.value
                    ? 'bg-[#1A1917] text-white'
                    : 'bg-[#F5F2EC] text-[#A09D96] hover:bg-[#F0EDE8]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ═══ PIJN PER OEFENING ══════════════════ */}
        {exerciseGroups.length > 0 && (
          <div className="bg-white rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
            <div className="flex items-center justify-between p-5 pb-3">
              <p className="text-label">Pijn of ongemak?</p>
              {painCount > 0 && (
                <span className="text-[11px] font-semibold text-[#FF3B30] bg-[#FF3B30]/8 px-2.5 py-1 rounded-lg">
                  {painCount} oefening{painCount !== 1 ? 'en' : ''}
                </span>
              )}
            </div>
            <div className="px-5 pb-5">
              <div className="rounded-xl overflow-hidden border border-[#F0EDE8]">
                {exerciseGroups.map((group, i) => (
                  <div key={group.exerciseId} className={i > 0 ? 'border-t border-[#F0EDE8]' : ''}>
                    <button
                      onClick={() => {
                        togglePain(group.exerciseId)
                        setExpandedExercise(!group.painFlag ? group.exerciseId : null)
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 transition-colors ${
                        group.painFlag ? 'bg-[#FF3B30]/5' : 'hover:bg-[#FAF8F3]'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        group.painFlag ? 'border-[#FF3B30] bg-[#FF3B30]' : 'border-[#DDD9D0]'
                      }`}>
                        {group.painFlag && <AlertTriangle size={10} strokeWidth={2.5} className="text-white" />}
                      </div>
                      <span className={`text-[14px] font-medium flex-1 text-left ${
                        group.painFlag ? 'text-[#FF3B30]' : 'text-[#1A1917]'
                      }`}>
                        {group.name}
                      </span>
                      <span className="text-[12px] text-[#CCC7BC]">{group.sets.length} sets</span>
                      {group.painFlag && (
                        expandedExercise === group.exerciseId
                          ? <ChevronUp size={14} className="text-[#FF3B30]" />
                          : <ChevronDown size={14} className="text-[#FF3B30]" />
                      )}
                    </button>
                    {group.painFlag && expandedExercise === group.exerciseId && (
                      <div className="px-4 pb-4 bg-[#FF3B30]/5">
                        <textarea
                          value={group.painNotes}
                          onChange={(e) => setPainNotes(group.exerciseId, e.target.value)}
                          placeholder="Waar voelde je pijn? (bijv. linkerschouder, onderrug...)"
                          className="w-full px-4 py-3 border border-[#FF3B30]/20 rounded-xl text-[13px] text-[#1A1917] placeholder-[#C5C2BC] focus:outline-none focus:border-[#FF3B30]/40 resize-none h-16 bg-white"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ FEEDBACK VOOR COACH ════════════════ */}
        <div className="bg-white rounded-2xl shadow-[var(--shadow-card)] p-5">
          <p className="text-label mb-2">Feedback voor je coach</p>
          <p className="text-[12px] text-[#CCC7BC] mb-3">Welke oefeningen wil je meer of minder?</p>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="bijv. &quot;Meer core oefeningen&quot;, &quot;Hip thrusts zijn te zwaar&quot;..."
            className="w-full px-4 py-3 border border-[#F0EDE8] rounded-xl bg-[#FAF8F3] text-[14px] text-[#1A1917] placeholder-[#C5C2BC] focus:outline-none focus:border-[#1A1917] resize-none h-20"
          />
        </div>

        {/* ═══ NOTITIES ═══════════════════════════ */}
        <div className="bg-white rounded-2xl shadow-[var(--shadow-card)] p-5">
          <p className="text-label mb-3">Notities <span className="font-normal text-[#C5C2BC]">(optioneel)</span></p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Hoe ging het? Extra opmerkingen..."
            className="w-full px-4 py-3 border border-[#F0EDE8] rounded-xl bg-[#FAF8F3] text-[14px] text-[#1A1917] placeholder-[#C5C2BC] focus:outline-none focus:border-[#1A1917] resize-none h-20"
          />
        </div>

        {/* ═══ OPSLAAN CTA ════════════════════════ */}
        <button
          onClick={handleComplete}
          disabled={saving}
          className="btn-pop w-full flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? 'Opslaan...' : 'Opslaan & afsluiten'}
          <ArrowRight size={16} strokeWidth={2} />
        </button>

        <p className="text-center text-[12px] text-[#CCC7BC]">
          Je coach ziet deze feedback bij de volgende aanpassing
        </p>
      </main>
    </div>
  )
}
