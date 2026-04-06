'use client'

import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ArrowRight, AlertTriangle, ChevronDown, ChevronUp, Trophy, Share2, Dumbbell, Clock, Flame, TrendingUp } from 'lucide-react'

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

function AnimatedStat({ value, suffix = '', delay = 0 }: { value: number | string; suffix?: string; delay?: number }) {
  const numValue = typeof value === 'number' ? value : parseFloat(value) || 0
  const [display, setDisplay] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  useEffect(() => {
    if (!visible || numValue === 0) { setDisplay(0); return }
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
  }, [numValue, visible])

  return (
    <span
      className={`stat-number text-[#1A1917] transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{ fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 }}
    >
      {display}{suffix}
    </span>
  )
}

// ─── Confetti (enhanced) ─────────────────────

function useConfetti() {
  return useCallback((intensity: 'subtle' | 'big' = 'subtle') => {
    const colors = ['#D46A3A', '#3D8B5C', '#F0C040', '#4A7BD4', '#9B59B6']
    const container = document.body
    const count = intensity === 'big' ? 30 : 5

    for (let i = 0; i < count; i++) {
      const el = document.createElement('div')
      el.className = 'confetti-particle'
      el.style.position = 'fixed'
      el.style.top = '-10px'
      el.style.left = `${10 + Math.random() * 80}vw`
      el.style.width = `${4 + Math.random() * 8}px`
      el.style.height = `${4 + Math.random() * 8}px`
      el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
      el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px'
      el.style.opacity = '1'
      el.style.zIndex = '9999'
      el.style.pointerEvents = 'none'

      const rotation = Math.random() * 720
      const xDrift = (Math.random() - 0.5) * 200
      const duration = 1.5 + Math.random() * 1.5
      const delay = Math.random() * 0.6

      el.style.animation = `confettiFall ${duration}s ${delay}s ease-out forwards`
      el.style.setProperty('--x-drift', `${xDrift}px`)
      el.style.setProperty('--rotation', `${rotation}deg`)

      container.appendChild(el)
      setTimeout(() => el.remove(), (duration + delay) * 1000 + 200)
    }
  }, [])
}

// ─── Component ──────────────────────────────────────────────

export default function WorkoutCompletePageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#C0C0C0] border-t-[#1A1917]" />
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
  const summaryRef = useRef<HTMLDivElement>(null)

  const [session, setSession] = useState<WorkoutSessionComplete | null>(null)
  const [loading, setLoading] = useState(true)
  const [moodRating, setMoodRating] = useState<number | null>(null)
  const [difficultyRating, setDifficultyRating] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [feedbackText, setFeedbackText] = useState('')
  const [exerciseGroups, setExerciseGroups] = useState<ExerciseGroup[]>([])
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showExerciseDetail, setShowExerciseDetail] = useState(false)

  const spawnConfetti = useConfetti()

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
    if (prsCount > 0) {
      setTimeout(() => spawnConfetti('big'), 400)
      setTimeout(() => spawnConfetti('subtle'), 1200)
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

  // --- Share workout summary ---
  const handleShare = useCallback(async () => {
    if (!session) return
    const workoutSets = session.workout_sets || []
    const totalSets = workoutSets.length
    const totalVolume = workoutSets.reduce((sum, set) => sum + (set.weight_kg || 0) * (set.actual_reps || 0), 0)
    const minutes = Math.floor((new Date().getTime() - new Date(session.started_at).getTime()) / 1000 / 60)
    const prSets = workoutSets.filter(s => s.is_pr)

    let text = `🏋️ MŌVE Workout voltooid!\n\n`
    text += `⏱ ${minutes} min · 💪 ${totalSets} sets · 🔥 ${totalVolume > 1000 ? (totalVolume / 1000).toFixed(1) + 't' : totalVolume + ' kg'} volume\n`
    if (prSets.length > 0) {
      text += `🏆 ${prSets.length} ${prSets.length === 1 ? 'nieuw record' : 'nieuwe records'}!\n`
    }
    text += `\n— movestudio.be`

    if (navigator.share) {
      try {
        await navigator.share({ text })
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text)
      // Brief visual feedback
      alert('Gekopieerd naar klembord!')
    }
  }, [session])

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
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#C0C0C0] border-t-[#1A1917]" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[14px] text-[#ACACAC]">Sessie niet gevonden</p>
      </div>
    )
  }

  const workoutSets = session.workout_sets || []
  const totalSets = workoutSets.length
  const totalVolume = workoutSets.reduce((sum, set) => sum + (set.weight_kg || 0) * (set.actual_reps || 0), 0)
  const startTime = new Date(session.started_at)
  const endTime = new Date()
  const minutes = Math.floor((endTime.getTime() - startTime.getTime()) / 1000 / 60)
  const prSets = workoutSets.filter(s => s.is_pr)
  // Estimate calories: ~0.05 kcal per kg × rep (rough strength training estimate)
  const estCalories = Math.round(totalVolume * 0.05 + minutes * 5)

  const moodOptions = [
    { value: 1, label: 'Zwaar', emoji: '😮‍💨' },
    { value: 2, label: 'Oké', emoji: '😐' },
    { value: 3, label: 'Goed', emoji: '🙂' },
    { value: 4, label: 'Sterk', emoji: '💪' },
    { value: 5, label: 'Top', emoji: '🔥' },
  ]

  const painCount = exerciseGroups.filter(g => g.painFlag).length

  return (
    <div className="pb-28">

      {/* Confetti CSS */}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) translateX(var(--x-drift, 0px)) rotate(var(--rotation, 720deg)); opacity: 0; }
        }
      `}</style>

      {/* ── Header — celebration ── */}
      <div ref={summaryRef} className="pt-10 pb-6 text-center">
        {/* Animated checkmark circle */}
        <div className="mx-auto w-16 h-16 rounded-full bg-[#3D8B5C] flex items-center justify-center mb-5 animate-[scale-in_0.5s_ease-out]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <p className="text-[12px] font-medium text-[#3D8B5C] uppercase tracking-[1.5px] mb-3">
          Voltooid
        </p>
        <h1 className="text-editorial-h1 mb-2">
          Goed gedaan
        </h1>

        {prsCount > 0 && (
          <div className="mt-4 inline-flex items-center gap-2 bg-[#D46A3A]/10 px-4 py-2 rounded-full">
            <Trophy size={16} strokeWidth={2} className="text-[#D46A3A]" />
            <span className="text-[14px] font-bold text-[#D46A3A]">
              {prsCount} {prsCount === 1 ? 'nieuw record' : 'nieuwe records'}!
            </span>
          </div>
        )}

        {/* Share button */}
        <div className="mt-5">
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#F0F0EE] text-[12px] font-semibold text-[#ACACAC] uppercase tracking-[0.06em] hover:bg-[#F8F8F6] transition-colors touch-manipulation"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <Share2 size={14} strokeWidth={2} />
            Delen
          </button>
        </div>
      </div>

      {/* ── Stats grid — 2×2 ── */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="bg-[#F8F8F6] rounded-2xl p-5">
          <div className="flex items-center gap-1.5 mb-2">
            <Clock size={13} strokeWidth={1.5} className="text-[#ACACAC]" />
            <p className="text-[10px] text-[#ACACAC] uppercase tracking-[1px] font-medium">Duur</p>
          </div>
          <div className="flex items-baseline gap-1">
            <AnimatedStat value={minutes} delay={200} />
            <span className="text-[13px] text-[#ACACAC] font-medium">min</span>
          </div>
        </div>
        <div className="bg-[#F8F8F6] rounded-2xl p-5">
          <div className="flex items-center gap-1.5 mb-2">
            <Dumbbell size={13} strokeWidth={1.5} className="text-[#ACACAC]" />
            <p className="text-[10px] text-[#ACACAC] uppercase tracking-[1px] font-medium">Sets</p>
          </div>
          <AnimatedStat value={totalSets} delay={400} />
        </div>
        <div className="bg-[#F8F8F6] rounded-2xl p-5">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp size={13} strokeWidth={1.5} className="text-[#ACACAC]" />
            <p className="text-[10px] text-[#ACACAC] uppercase tracking-[1px] font-medium">Volume</p>
          </div>
          <div className="flex items-baseline gap-1">
            <AnimatedStat
              value={totalVolume > 1000 ? +(totalVolume / 1000).toFixed(1) : totalVolume}
              suffix={totalVolume > 1000 ? 't' : ''}
              delay={600}
            />
            {totalVolume <= 1000 && <span className="text-[13px] text-[#ACACAC] font-medium">kg</span>}
          </div>
        </div>
        <div className="bg-[#F8F8F6] rounded-2xl p-5">
          <div className="flex items-center gap-1.5 mb-2">
            <Flame size={13} strokeWidth={1.5} className="text-[#ACACAC]" />
            <p className="text-[10px] text-[#ACACAC] uppercase tracking-[1px] font-medium">Kcal</p>
          </div>
          <div className="flex items-baseline gap-1">
            <AnimatedStat value={estCalories} delay={800} />
            <span className="text-[11px] text-[#C0C0C0]">est.</span>
          </div>
        </div>
      </div>

      {/* ── PR Records detail ── */}
      {prSets.length > 0 && (
        <div className="mb-8 bg-[#FDF6F0] border border-[#F0E4D8] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={15} strokeWidth={2} className="text-[#D46A3A]" />
            <p className="text-[12px] font-bold text-[#D46A3A] uppercase tracking-[0.06em]">Persoonlijke Records</p>
          </div>
          <div className="space-y-2">
            {prSets.map((set) => (
              <div key={set.id} className="flex items-center justify-between py-1.5">
                <span className="text-[13px] font-medium text-[#1A1917]">
                  {set.exercises?.name_nl || set.exercises?.name || 'Oefening'}
                </span>
                <span className="text-[13px] font-bold text-[#D46A3A] tabular-nums">
                  {set.weight_kg} kg × {set.actual_reps}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Exercise breakdown (collapsible) ── */}
      <div className="mb-8">
        <button
          onClick={() => setShowExerciseDetail(!showExerciseDetail)}
          className="w-full flex items-center justify-between py-3 touch-manipulation"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <p className="text-[11px] text-[#C0C0C0] uppercase tracking-[1px] font-medium">
            Oefeningen ({exerciseGroups.length})
          </p>
          {showExerciseDetail
            ? <ChevronUp size={16} className="text-[#C0C0C0]" />
            : <ChevronDown size={16} className="text-[#C0C0C0]" />
          }
        </button>

        {showExerciseDetail && (
          <div className="space-y-3 mt-1">
            {exerciseGroups.map((group) => {
              const groupVolume = group.sets.reduce((s, set) => s + (set.weight_kg || 0) * (set.actual_reps || 0), 0)
              const bestSet = [...group.sets].sort((a, b) => ((b.weight_kg || 0) * (b.actual_reps || 0)) - ((a.weight_kg || 0) * (a.actual_reps || 0)))[0]
              const hasPR = group.sets.some(s => s.is_pr)

              return (
                <div key={group.exerciseId} className={`rounded-xl border p-4 ${hasPR ? 'border-[#D46A3A]/30 bg-[#FDF6F0]/50' : 'border-[#F0F0EE] bg-white'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold text-[#1A1917]">{group.name}</span>
                      {hasPR && (
                        <span className="text-[9px] font-black text-[#D46A3A] uppercase bg-[#D46A3A]/10 px-1.5 py-0.5 rounded-md">PR</span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#ACACAC] tabular-nums">{Math.round(groupVolume)} kg vol.</span>
                  </div>
                  {/* Mini sets table */}
                  <div className="space-y-0.5">
                    {group.sets.map((set) => (
                      <div key={set.id} className="flex items-center gap-3 py-1">
                        <span className="text-[11px] text-[#C0C0C0] w-[24px] tabular-nums">S{set.set_number}</span>
                        <span className={`text-[12px] font-medium tabular-nums ${set.is_pr ? 'text-[#D46A3A] font-bold' : 'text-[#1A1917]'}`}>
                          {set.weight_kg || 0} kg × {set.actual_reps || 0}
                        </span>
                        {set.is_pr && <Trophy size={10} className="text-[#D46A3A]" />}
                      </div>
                    ))}
                  </div>
                  {/* Best set highlight */}
                  {bestSet && (
                    <div className="mt-2 pt-2 border-t border-[#F0F0EE]">
                      <span className="text-[10px] text-[#ACACAC] uppercase tracking-[0.06em]">
                        Beste set: {bestSet.weight_kg} kg × {bestSet.actual_reps} ({Math.round((bestSet.weight_kg || 0) * (bestSet.actual_reps || 0))} kg vol.)
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Gevoel ── */}
      <div className="border-t border-[#F0F0EE] pt-8 mb-8">
        <p className="text-[11px] text-[#C0C0C0] uppercase tracking-[1px] mb-4">
          Hoe voelde je je?
        </p>
        <div className="flex gap-2">
          {moodOptions.map((m) => (
            <button
              key={m.value}
              onClick={() => setMoodRating(m.value)}
              className={`flex-1 py-3 text-center rounded-xl text-[13px] font-medium transition-all touch-manipulation ${
                moodRating === m.value
                  ? 'bg-[#1A1917] text-white scale-105'
                  : 'border border-[#F0F0EE] text-[#ACACAC] hover:border-[#C0C0C0]'
              }`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <span className="block text-[18px] mb-0.5">{m.emoji}</span>
              <span className="text-[10px]">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Moeilijkheid ── */}
      <div className="border-t border-[#F0F0EE] pt-8 mb-8">
        <p className="text-[11px] text-[#C0C0C0] uppercase tracking-[1px] mb-4">
          Moeilijkheidsgraad
        </p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              onClick={() => setDifficultyRating(level)}
              className={`flex-1 min-h-[44px] py-3 text-center rounded-xl transition-all touch-manipulation ${
                difficultyRating === level
                  ? 'bg-[#D46A3A] text-white scale-105'
                  : 'border border-[#F0F0EE] text-[#ACACAC] hover:border-[#C0C0C0]'
              }`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <span className="section-title">
                {level}
              </span>
            </button>
          ))}
        </div>
        <div className="flex justify-between mt-2 px-1">
          <span className="text-[10px] text-[#D5D5D5]">Makkelijk</span>
          <span className="text-[10px] text-[#D5D5D5]">Te zwaar</span>
        </div>
      </div>

      {/* ── Pijn per oefening ── */}
      {exerciseGroups.length > 0 && (
        <div className="border-t border-[#F0F0EE] pt-8 mb-8">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] text-[#C0C0C0] uppercase tracking-[1px]">
              Pijn of ongemak?
            </p>
            {painCount > 0 && (
              <span className="text-[11px] font-medium text-[#C4372A]">
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
                className="w-full flex items-center gap-3 py-3.5 min-h-[44px] touch-manipulation"
                style={{ WebkitTapHighlightColor: 'transparent' }}
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
                >
                  {group.name}
                </span>
                <span className="text-[12px] text-[#C0C0C0]">
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
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Feedback voor coach ── */}
      <div className="border-t border-[#F0F0EE] pt-8 mb-8">
        <p className="text-[11px] text-[#C0C0C0] uppercase tracking-[1px] mb-3">
          Feedback voor je coach
        </p>
        <textarea
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          placeholder="Welke oefeningen wil je meer of minder?"
          className="w-full px-4 py-3 border border-[#F0F0EE] rounded-xl text-[14px] text-[#1A1917] placeholder-[#C0C0C0] focus:outline-none focus:border-[#1A1917] resize-none h-20 bg-white"
        />
      </div>

      {/* ── Notities ── */}
      <div className="border-t border-[#F0F0EE] pt-8 mb-10">
        <p className="text-[11px] text-[#C0C0C0] uppercase tracking-[1px] mb-3">
          Notities <span className="normal-case tracking-normal text-[#D5D5D5]">(optioneel)</span>
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Hoe ging het? Extra opmerkingen..."
          className="w-full px-4 py-3 border border-[#F0F0EE] rounded-xl text-[14px] text-[#1A1917] placeholder-[#C0C0C0] focus:outline-none focus:border-[#1A1917] resize-none h-20 bg-white"
        />
      </div>

      {/* ── Sticky CTA ── */}
      <div className="fixed bottom-20 left-0 right-0 px-5 z-30 pointer-events-none">
        <div className="max-w-lg mx-auto pointer-events-auto">
          <button
            onClick={handleComplete}
            disabled={saving}
            className="w-full py-4 rounded-2xl bg-[#1A1917] text-white font-bold text-[14px] uppercase tracking-[0.06em] flex items-center justify-center gap-2 shadow-lg shadow-black/10 hover:bg-[#333330] transition-all active:scale-[0.98] disabled:opacity-50 touch-manipulation"
            style={{ WebkitTapHighlightColor: 'transparent' }}
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
        </div>
      </div>

      <p className="text-center text-[12px] text-[#D5D5D5] mt-3">
        Je coach ziet deze feedback bij de volgende aanpassing
      </p>
    </div>
  )
}
