'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ArrowRight, AlertTriangle, ChevronDown, ChevronUp, Trophy } from 'lucide-react'

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

// ─── Animated Counter ─────────────────────

function AnimatedStat({ value, suffix = '' }: { value: number | string; suffix?: string }) {
  const numValue = typeof value === 'number' ? value : parseFloat(value) || 0
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (numValue === 0) { setDisplay(0); return }
    const startTime = performance.now()
    const isDecimal = !Number.isInteger(numValue)

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / 800, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = eased * numValue
      setDisplay(isDecimal ? +current.toFixed(1) : Math.round(current))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [numValue])

  return (
    <span
      className="text-[40px] tracking-[-1.5px] leading-[0.9] text-[#1A1917]"
      style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}
    >
      {display}{suffix}
    </span>
  )
}

// ─── Component ──────────────────────────────────────────────

export default function WorkoutCompletePageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1A1917] border-t-transparent" />
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

  // Subtle confetti
  const spawnConfetti = useCallback(() => {
    const colors = ['#D46A3A', '#3D8B5C', '#F0F0EE']
    const container = document.body
    const count = 3 + Math.floor(Math.random() * 3)
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div')
      el.className = 'confetti-particle'
      el.style.left = `${30 + Math.random() * 40}vw`
      el.style.width = `${5 + Math.random() * 5}px`
      el.style.height = `${5 + Math.random() * 5}px`
      el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
      el.style.borderRadius = '50%'
      el.style.animationDelay = `${Math.random() * 0.4}s`
      el.style.animationDuration = `${1.5 + Math.random() * 0.5}s`
      container.appendChild(el)
      setTimeout(() => el.remove(), 3000)
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

          // RESCUE: If no sets in DB, recover from localStorage
          if (workoutSets.length === 0) {
            try {
              const raw = localStorage.getItem('move_active_workout')
              if (raw) {
                const saved = JSON.parse(raw)
                if (saved.sessionId === sessionId && saved.sets) {
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

      const painData = exerciseGroups
        .filter(g => g.painFlag)
        .map(g => ({ exerciseId: g.exerciseId, painNotes: g.painNotes || null }))

      const { data: { session: authSession } } = await supabase.auth.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (authSession?.access_token) {
        headers['Authorization'] = `Bearer ${authSession.access_token}`
      }

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
        console.error('[handleComplete] Server error:', await res.json())
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

        for (const pain of painData) {
          await supabase
            .from('workout_sets')
            .update({ pain_flag: true, pain_notes: pain.painNotes })
            .eq('workout_session_id', sessionId)
            .eq('exercise_id', pain.exerciseId)
        }

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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1A1917] border-t-transparent" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[14px] text-[#ACACAC]" style={{ fontFamily: 'var(--font-body)' }}>Sessie niet gevonden</p>
      </div>
    )
  }

  const workoutSets = session.workout_sets || []
  const totalSets = workoutSets.length
  const totalVolume = workoutSets.reduce((sum, set) => sum + (set.weight_kg || 0) * (set.actual_reps || 0), 0)
  const startTime = new Date(session.started_at)
  const endTime = new Date()
  const minutes = Math.floor((endTime.getTime() - startTime.getTime()) / 1000 / 60)

  const moodOptions = [
    { value: 1, label: 'Zwaar' },
    { value: 2, label: 'Oké' },
    { value: 3, label: 'Goed' },
    { value: 4, label: 'Sterk' },
    { value: 5, label: 'Top' },
  ]

  const painCount = exerciseGroups.filter(g => g.painFlag).length

  return (
    <div className="pb-28">

      {/* ── Header — celebration ── */}
      <div className="pt-8 pb-2 text-center mb-8">
        <p
          className="text-[12px] font-medium text-[#3D8B5C] uppercase tracking-[1.5px] mb-4"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Voltooid
        </p>
        <h1
          className="text-[40px] tracking-[-1.5px] leading-[1.05] text-[#1A1917]"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
        >
          Goed gedaan
        </h1>
        {prsCount > 0 && (
          <div className="mt-4 inline-flex items-center gap-2">
            <Trophy size={16} strokeWidth={2} className="text-[#D46A3A]" />
            <span
              className="text-[14px] font-semibold text-[#D46A3A]"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {prsCount} {prsCount === 1 ? 'nieuw record' : 'nieuwe records'}
            </span>
          </div>
        )}
      </div>

      {/* ── Stats row ── */}
      <div className="flex items-center justify-center gap-8 mb-12">
        <div className="text-center">
          <AnimatedStat value={minutes} />
          <p className="text-[11px] text-[#C0C0C0] uppercase tracking-[1px] mt-1" style={{ fontFamily: 'var(--font-body)' }}>
            Minuten
          </p>
        </div>
        <div className="w-px h-10 bg-[#F0F0EE]" />
        <div className="text-center">
          <AnimatedStat value={totalSets} />
          <p className="text-[11px] text-[#C0C0C0] uppercase tracking-[1px] mt-1" style={{ fontFamily: 'var(--font-body)' }}>
            Sets
          </p>
        </div>
        <div className="w-px h-10 bg-[#F0F0EE]" />
        <div className="text-center">
          <AnimatedStat
            value={totalVolume > 1000 ? +(totalVolume / 1000).toFixed(1) : totalVolume}
            suffix={totalVolume > 1000 ? 't' : ''}
          />
          <p className="text-[11px] text-[#C0C0C0] uppercase tracking-[1px] mt-1" style={{ fontFamily: 'var(--font-body)' }}>
            Volume
          </p>
        </div>
      </div>

      {/* ── Gevoel ── */}
      <div className="border-t border-[#F0F0EE] pt-6 mb-8">
        <p
          className="text-[11px] text-[#C0C0C0] uppercase tracking-[1px] mb-4"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Hoe voelde je je?
        </p>
        <div className="flex gap-2">
          {moodOptions.map((m) => (
            <button
              key={m.value}
              onClick={() => setMoodRating(m.value)}
              className={`flex-1 py-3 text-center rounded-xl text-[13px] font-medium transition-all ${
                moodRating === m.value
                  ? 'bg-[#1A1917] text-white'
                  : 'border border-[#F0F0EE] text-[#ACACAC] hover:border-[#C0C0C0]'
              }`}
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Moeilijkheid ── */}
      <div className="border-t border-[#F0F0EE] pt-6 mb-8">
        <p
          className="text-[11px] text-[#C0C0C0] uppercase tracking-[1px] mb-4"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Moeilijkheidsgraad
        </p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              onClick={() => setDifficultyRating(level)}
              className={`flex-1 py-3 text-center rounded-xl transition-all ${
                difficultyRating === level
                  ? 'bg-[#D46A3A] text-white'
                  : 'border border-[#F0F0EE] text-[#ACACAC] hover:border-[#C0C0C0]'
              }`}
            >
              <span
                className="text-[20px]"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
              >
                {level}
              </span>
            </button>
          ))}
        </div>
        <div className="flex justify-between mt-2 px-1">
          <span className="text-[10px] text-[#D5D5D5]" style={{ fontFamily: 'var(--font-body)' }}>Makkelijk</span>
          <span className="text-[10px] text-[#D5D5D5]" style={{ fontFamily: 'var(--font-body)' }}>Te zwaar</span>
        </div>
      </div>

      {/* ── Pijn per oefening ── */}
      {exerciseGroups.length > 0 && (
        <div className="border-t border-[#F0F0EE] pt-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <p
              className="text-[11px] text-[#C0C0C0] uppercase tracking-[1px]"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Pijn of ongemak?
            </p>
            {painCount > 0 && (
              <span className="text-[11px] font-medium text-[#C4372A]" style={{ fontFamily: 'var(--font-body)' }}>
                {painCount} oefening{painCount !== 1 ? 'en' : ''}
              </span>
            )}
          </div>

          {exerciseGroups.map((group, i) => (
            <div key={group.exerciseId} className={i > 0 ? 'border-t border-[#F0F0EE]' : ''}>
              <button
                onClick={() => {
                  togglePain(group.exerciseId)
                  setExpandedExercise(!group.painFlag ? group.exerciseId : null)
                }}
                className="w-full flex items-center gap-3 py-3.5"
              >
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  group.painFlag ? 'border-[#C4372A] bg-[#C4372A]' : 'border-[#E0E0E0]'
                }`}>
                  {group.painFlag && <AlertTriangle size={10} strokeWidth={2.5} className="text-white" />}
                </div>
                <span
                  className={`text-[14px] font-medium flex-1 text-left ${
                    group.painFlag ? 'text-[#C4372A]' : 'text-[#1A1917]'
                  }`}
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {group.name}
                </span>
                <span className="text-[12px] text-[#C0C0C0]" style={{ fontFamily: 'var(--font-body)' }}>
                  {group.sets.length} sets
                </span>
                {group.painFlag && (
                  expandedExercise === group.exerciseId
                    ? <ChevronUp size={14} className="text-[#C4372A]" />
                    : <ChevronDown size={14} className="text-[#C4372A]" />
                )}
              </button>
              {group.painFlag && expandedExercise === group.exerciseId && (
                <div className="pb-4 pl-8">
                  <textarea
                    value={group.painNotes}
                    onChange={(e) => setPainNotes(group.exerciseId, e.target.value)}
                    placeholder="Waar voelde je pijn? (bijv. linkerschouder, onderrug...)"
                    className="w-full px-4 py-3 border border-[#F0F0EE] rounded-xl text-[13px] text-[#1A1917] placeholder-[#C0C0C0] focus:outline-none focus:border-[#C4372A]/40 resize-none h-16 bg-white"
                    style={{ fontFamily: 'var(--font-body)' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Feedback voor coach ── */}
      <div className="border-t border-[#F0F0EE] pt-6 mb-8">
        <p
          className="text-[11px] text-[#C0C0C0] uppercase tracking-[1px] mb-3"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Feedback voor je coach
        </p>
        <textarea
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          placeholder="Welke oefeningen wil je meer of minder?"
          className="w-full px-4 py-3 border border-[#F0F0EE] rounded-xl text-[14px] text-[#1A1917] placeholder-[#C0C0C0] focus:outline-none focus:border-[#1A1917] resize-none h-20 bg-white"
          style={{ fontFamily: 'var(--font-body)' }}
        />
      </div>

      {/* ── Notities ── */}
      <div className="border-t border-[#F0F0EE] pt-6 mb-10">
        <p
          className="text-[11px] text-[#C0C0C0] uppercase tracking-[1px] mb-3"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Notities <span className="normal-case tracking-normal text-[#D5D5D5]">(optioneel)</span>
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Hoe ging het? Extra opmerkingen..."
          className="w-full px-4 py-3 border border-[#F0F0EE] rounded-xl text-[14px] text-[#1A1917] placeholder-[#C0C0C0] focus:outline-none focus:border-[#1A1917] resize-none h-20 bg-white"
          style={{ fontFamily: 'var(--font-body)' }}
        />
      </div>

      {/* ── CTA ── */}
      <button
        onClick={handleComplete}
        disabled={saving}
        className="w-full py-4 rounded-xl bg-[#1A1917] text-white font-bold text-[14px] uppercase tracking-[0.06em] flex items-center justify-center gap-2 hover:bg-[#333] transition-colors disabled:opacity-50"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {saving ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            Opslaan & afsluiten
            <ArrowRight size={16} strokeWidth={2} />
          </>
        )}
      </button>

      <p className="text-center text-[12px] text-[#D5D5D5] mt-3" style={{ fontFamily: 'var(--font-body)' }}>
        Je coach ziet deze feedback bij de volgende aanpassing
      </p>
    </div>
  )
}
