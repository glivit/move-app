'use client'

import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  X,
  Check,
  Plus,
  Clock,
  ChevronDown,
  ChevronUp,
  Play,
  Info,
} from 'lucide-react'
import { ExerciseMedia } from '@/components/ExerciseMedia'

interface Exercise {
  id: string
  name: string
  name_nl: string
  body_part: string
  target_muscle: string
  equipment: string
  gif_url: string
  video_url: string | null
  instructions: string
  coach_tips: string
}

interface ProgramTemplateExercise {
  id: string
  exercise_id: string
  sets: number
  reps_min: number
  reps_max: number
  rest_seconds: number
  tempo: string
  rpe_target: number
  weight_suggestion: number
  notes: string
  exercises: Exercise
}

interface SetData {
  id: string
  set_number: number
  prescribed_reps: number
  actual_reps: number | null
  weight_kg: number | null
  is_warmup: boolean
  completed: boolean
  is_pr: boolean
}

interface PreviousSet {
  set_number: number
  weight_kg: number | null
  actual_reps: number | null
}

interface WorkoutSession {
  id: string
  started_at: string
}

// --- Auto-save helpers ---
const STORAGE_KEY = 'move_active_workout'

interface SavedWorkoutState {
  sessionId: string
  dayId: string
  programId: string
  sets: Record<string, SetData[]>
  savedAt: number
}

function saveWorkoutState(state: SavedWorkoutState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch { /* storage full or unavailable */ }
}

function loadWorkoutState(dayId: string, programId: string): SavedWorkoutState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const saved: SavedWorkoutState = JSON.parse(raw)
    if (saved.dayId === dayId && saved.programId === programId && (Date.now() - saved.savedAt) < 4 * 60 * 60 * 1000) {
      return saved
    }
    localStorage.removeItem(STORAGE_KEY)
    return null
  } catch {
    return null
  }
}

function clearWorkoutState() {
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* ok */ }
}

function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function ActiveWorkoutPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#111110] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#C8A96E] border-t-transparent rounded-full animate-spin" /></div>}>
      <ActiveWorkoutPage />
    </Suspense>
  )
}

function ActiveWorkoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dayId = searchParams.get('dayId')
  const programId = searchParams.get('programId')

  const [exercises, setExercises] = useState<ProgramTemplateExercise[]>([])
  const [sets, setSets] = useState<Record<string, SetData[]>>({})
  const [lastWorkoutWeights, setLastWorkoutWeights] = useState<Record<string, number | null>>({})
  const [previousSets, setPreviousSets] = useState<Record<string, PreviousSet[]>>({})
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<WorkoutSession | null>(null)
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null)
  const [closeConfirm, setCloseConfirm] = useState(false)
  const [prCelebration, setPrCelebration] = useState<string | null>(null)
  const [workoutSeconds, setWorkoutSeconds] = useState(0)
  const [activeRestTimer, setActiveRestTimer] = useState<{ exerciseId: string; setIndex: number; seconds: number; total: number } | null>(null)
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>({})
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)

  // Refs for auto-save
  const setsRef = useRef(sets)
  const sessionRef = useRef(session)
  useEffect(() => { setsRef.current = sets }, [sets])
  useEffect(() => { sessionRef.current = session }, [session])

  // --- Workout duration timer ---
  useEffect(() => {
    if (!session) return
    const start = new Date(session.started_at).getTime()
    setWorkoutSeconds(Math.floor((Date.now() - start) / 1000))
    const interval = setInterval(() => {
      setWorkoutSeconds(Math.floor((Date.now() - start) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [session])

  // --- Inline rest timer countdown ---
  useEffect(() => {
    if (!activeRestTimer || activeRestTimer.seconds <= 0) return
    const interval = setInterval(() => {
      setActiveRestTimer(prev => {
        if (!prev || prev.seconds <= 1) return null
        return { ...prev, seconds: prev.seconds - 1 }
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [activeRestTimer])

  // --- Auto-save ---
  useEffect(() => {
    if (!session || !dayId || !programId || Object.keys(sets).length === 0) return
    saveWorkoutState({ sessionId: session.id, dayId, programId, sets, savedAt: Date.now() })
  }, [sets, session, dayId, programId])

  useEffect(() => {
    const persist = () => {
      const s = sessionRef.current
      if (!s || !dayId || !programId) return
      saveWorkoutState({ sessionId: s.id, dayId, programId, sets: setsRef.current, savedAt: Date.now() })
    }
    const handleVisibility = () => { if (document.visibilityState === 'hidden') persist() }
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('beforeunload', persist)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('beforeunload', persist)
    }
  }, [dayId, programId])

  // --- Load data ---
  useEffect(() => {
    const loadData = async () => {
      try {
        if (!dayId || !programId) { router.push('/client/workout'); return }
        const supabase = createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) { router.push('/auth/login'); return }

        const res = await fetch(`/api/client-workout?dayId=${dayId}`)
        if (!res.ok) { router.push('/client/workout'); return }
        const apiData = await res.json()
        const exercisesData = apiData.exercises as ProgramTemplateExercise[]
        const apiLastWeights = apiData.lastWeights || {}
        const apiPreviousSets = apiData.previousSets || {}

        if (!exercisesData?.length) { router.push('/client/workout'); return }

        setExercises(exercisesData)
        setLastWorkoutWeights(apiLastWeights)
        setPreviousSets(apiPreviousSets)

        const weightsMap: Record<string, number | null> = {}
        for (const ex of exercisesData) {
          weightsMap[ex.id] = apiLastWeights[ex.id] || ex.weight_suggestion || null
        }
        setLastWorkoutWeights(weightsMap)

        // Try restore from localStorage
        const saved = loadWorkoutState(dayId, programId)
        if (saved) {
          const { data: existingSession } = await supabase
            .from('workout_sessions')
            .select('id, started_at, completed_at')
            .eq('id', saved.sessionId)
            .single()
          if (existingSession && !existingSession.completed_at) {
            setSession({ id: existingSession.id, started_at: existingSession.started_at })
            setSets(saved.sets)
            return
          }
          clearWorkoutState()
        }

        // Check DB for incomplete session
        const { data: dbSession } = await supabase
          .from('workout_sessions')
          .select('id, started_at')
          .eq('client_id', authUser.id)
          .eq('template_day_id', dayId)
          .is('completed_at', null)
          .order('started_at', { ascending: false })
          .limit(1)
          .single()

        if (dbSession) {
          setSession({ id: dbSession.id, started_at: dbSession.started_at })
          const { data: dbSets } = await supabase
            .from('workout_sets').select('*').eq('workout_session_id', dbSession.id)
          const setsMap: Record<string, SetData[]> = {}
          for (const ex of exercisesData) {
            const setsList: SetData[] = []
            for (let i = 0; i < ex.sets; i++) {
              const dbSet = dbSets?.find((s: any) => s.exercise_id === ex.exercise_id && s.set_number === i + 1)
              if (dbSet) {
                setsList.push({ id: dbSet.id, set_number: i + 1, prescribed_reps: dbSet.prescribed_reps || ex.reps_min, actual_reps: dbSet.actual_reps, weight_kg: dbSet.weight_kg, is_warmup: dbSet.is_warmup || false, completed: dbSet.completed || false, is_pr: dbSet.is_pr || false })
              } else {
                setsList.push({ id: `temp-${ex.id}-${i}`, set_number: i + 1, prescribed_reps: ex.reps_min, actual_reps: null, weight_kg: null, is_warmup: false, completed: false, is_pr: false })
              }
            }
            setsMap[ex.id] = setsList
          }
          setSets(setsMap)
          return
        }

        // Fresh session
        const setsMap: Record<string, SetData[]> = {}
        for (const ex of exercisesData) {
          const setsList: SetData[] = []
          for (let i = 0; i < ex.sets; i++) {
            setsList.push({ id: `temp-${ex.id}-${i}`, set_number: i + 1, prescribed_reps: ex.reps_min, actual_reps: null, weight_kg: null, is_warmup: false, completed: false, is_pr: false })
          }
          setsMap[ex.id] = setsList
        }
        setSets(setsMap)

        const { data: newSession } = await supabase
          .from('workout_sessions')
          .insert({ client_id: authUser.id, client_program_id: programId, template_day_id: dayId, started_at: new Date().toISOString() })
          .select().single()
        if (newSession) setSession(newSession as WorkoutSession)
      } catch (error) { console.error('Error loading workout:', error) }
      finally { setLoading(false) }
    }
    loadData()
  }, [dayId, programId, router])

  // --- Complete a set ---
  const completeSet = useCallback(async (exerciseId: string, setIndex: number) => {
    const supabase = createClient()
    const setData = sets[exerciseId]?.[setIndex]
    if (!setData || !session) return

    try {
      const exerciseRef = exercises.find(e => e.id === exerciseId)
      const actualExerciseId = exerciseRef?.exercise_id || exerciseId

      let isPR = false
      if (setData.weight_kg && setData.weight_kg > 0 && !setData.is_warmup) {
        const { data: previousBest } = await supabase
          .from('workout_sets').select('weight_kg')
          .eq('exercise_id', actualExerciseId).eq('completed', true).eq('is_warmup', false)
          .order('weight_kg', { ascending: false }).limit(1)
        if (!previousBest?.length || (setData.weight_kg > (previousBest[0].weight_kg || 0))) isPR = true
      }

      const { data: insertedSet } = await supabase
        .from('workout_sets')
        .insert({ workout_session_id: session.id, exercise_id: actualExerciseId, set_number: setIndex + 1, prescribed_reps: setData.prescribed_reps, actual_reps: setData.actual_reps, weight_kg: setData.weight_kg, is_warmup: setData.is_warmup, completed: true, is_pr: isPR })
        .select().single()

      if (insertedSet) {
        const updatedSets = { ...sets }
        updatedSets[exerciseId] = [...updatedSets[exerciseId]]
        updatedSets[exerciseId][setIndex] = { ...setData, id: insertedSet.id, completed: true, is_pr: isPR }

        // Propagate weight to next uncompleted set
        if (setData.weight_kg && setIndex + 1 < updatedSets[exerciseId].length && !updatedSets[exerciseId][setIndex + 1].completed) {
          if (!updatedSets[exerciseId][setIndex + 1].weight_kg) {
            updatedSets[exerciseId][setIndex + 1] = { ...updatedSets[exerciseId][setIndex + 1], weight_kg: setData.weight_kg }
          }
        }
        setSets(updatedSets)

        if (isPR && exerciseRef) {
          setPrCelebration(exerciseRef.exercises?.name_nl || exerciseRef.exercises?.name || 'Oefening')
          setTimeout(() => setPrCelebration(null), 3000)
        }

        // Start inline rest timer
        if (exerciseRef && exerciseRef.rest_seconds > 0) {
          setActiveRestTimer({ exerciseId, setIndex, seconds: exerciseRef.rest_seconds, total: exerciseRef.rest_seconds })
        }
      }
    } catch (error) { console.error('Error completing set:', error) }
  }, [sets, session, exercises])

  // --- Add extra set ---
  const addSet = (exerciseId: string) => {
    setSets(prev => {
      const current = prev[exerciseId] || []
      const ex = exercises.find(e => e.id === exerciseId)
      const newSet: SetData = {
        id: `temp-${exerciseId}-${current.length}`,
        set_number: current.length + 1,
        prescribed_reps: ex?.reps_min || 10,
        actual_reps: null,
        weight_kg: current.length > 0 ? current[current.length - 1].weight_kg : null,
        is_warmup: false,
        completed: false,
        is_pr: false,
      }
      return { ...prev, [exerciseId]: [...current, newSet] }
    })
  }

  const handleFinish = () => {
    clearWorkoutState()
    router.push(`/client/workout/complete?sessionId=${session?.id}`)
  }

  const confirmClose = () => {
    clearWorkoutState()
    router.push('/client/workout')
  }

  // Discard workout — delete session + all sets from DB
  const discardWorkout = async () => {
    if (!session) return
    try {
      const supabase = createClient()
      await supabase.from('workout_sets').delete().eq('workout_session_id', session.id)
      await supabase.from('workout_sessions').delete().eq('id', session.id)
    } catch (err) { console.error('Discard error:', err) }
    clearWorkoutState()
    router.push('/client/workout')
  }

  // Compute totals
  const totalSets = Object.values(sets).flat().length
  const completedTotal = Object.values(sets).flat().filter(s => s.completed).length
  const allDone = totalSets > 0 && completedTotal === totalSets

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111110] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#C8A96E] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-[#111110] z-50 overflow-y-auto pt-safe">
      {/* PR Celebration */}
      {prCelebration && (
        <>
          <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden">
            {Array.from({ length: 40 }).map((_, i) => {
              const left = Math.random() * 100
              const delay = Math.random() * 0.6
              const dur = 1.5 + Math.random() * 1
              const size = 6 + Math.random() * 6
              const colors = ['#C8A96E', '#FF9500', '#34C759', '#FF3B30', '#007AFF', '#FFD700']
              return (
                <div key={i} style={{ position: 'absolute', left: `${left}%`, top: '-10px', width: `${size}px`, height: `${size * 0.6}px`, backgroundColor: colors[i % colors.length], borderRadius: '2px', transform: `rotate(${Math.random() * 360}deg)`, animation: `confettiFall ${dur}s ease-in ${delay}s forwards`, opacity: 0 }} />
              )
            })}
          </div>
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[61] animate-bounce-in">
            <div className="bg-[#C8A96E] text-[#111110] rounded-2xl px-5 py-3 shadow-[0_8px_24px_rgba(200,169,110,0.4)] flex items-center gap-2">
              <span className="text-2xl">🏆</span>
              <div>
                <p className="text-[13px] font-bold uppercase tracking-wide">Nieuw PR!</p>
                <p className="text-[12px] opacity-80">{prCelebration}</p>
              </div>
            </div>
          </div>
          <style dangerouslySetInnerHTML={{ __html: `@keyframes confettiFall { 0% { opacity:1; transform:translateY(0) rotate(0deg); } 100% { opacity:0; transform:translateY(100vh) rotate(720deg); } }` }} />
        </>
      )}

      {/* Close confirmation */}
      {closeConfirm && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-end">
          <div className="w-full bg-[#1E1E1C] rounded-t-3xl p-6 animate-slide-up">
            <h3 className="text-lg font-semibold text-white mb-2">Training afsluiten?</h3>
            <p className="text-[#8A8A8A] text-[14px] mb-6">Je voortgang wordt opgeslagen.</p>
            <div className="flex gap-3">
              <button onClick={() => setCloseConfirm(false)} className="flex-1 bg-[#2A2A28] text-white rounded-xl py-3 font-semibold">Doorgaan</button>
              <button onClick={confirmClose} className="flex-1 bg-[#FF3B30] text-white rounded-xl py-3 font-semibold">Afsluiten</button>
            </div>
          </div>
        </div>
      )}

      {/* --- Top bar: timer + finish --- */}
      <header className="sticky top-0 bg-[#111110]/95 backdrop-blur-xl border-b border-[#2A2A28] z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setCloseConfirm(true)}
            className="p-2 rounded-full hover:bg-[#2A2A28] transition-colors touch-manipulation"
            style={{ WebkitTapHighlightColor: 'transparent', minWidth: '44px', minHeight: '44px' }}
          >
            <X size={22} strokeWidth={2} className="text-[#8A8A8A]" />
          </button>

          <div className="flex items-center gap-2">
            <Clock size={16} className="text-[#C8A96E]" />
            <span className="text-[17px] font-semibold text-white tabular-nums">{formatTimer(workoutSeconds)}</span>
          </div>

          <button
            onClick={handleFinish}
            className={`px-4 py-2 rounded-xl font-semibold text-[14px] transition-all ${
              allDone
                ? 'bg-[#34C759] text-white shadow-[0_2px_12px_rgba(52,199,89,0.3)]'
                : 'bg-[#C8A96E] text-[#111110]'
            }`}
          >
            Afronden
          </button>
        </div>

        {/* Overall progress bar */}
        <div className="h-[2px] bg-[#2A2A28]">
          <div className="h-full bg-[#C8A96E] transition-all duration-500" style={{ width: `${totalSets > 0 ? (completedTotal / totalSets) * 100 : 0}%` }} />
        </div>
      </header>

      {/* --- Exercise list --- */}
      <main className="max-w-lg mx-auto px-4 py-4 pb-24 space-y-4">
        {exercises.map((ex) => {
          const exSets = sets[ex.id] || []
          const exDone = exSets.length > 0 && exSets.every(s => s.completed)
          const exCompleted = exSets.filter(s => s.completed).length
          const exerciseData = ex.exercises
          const isExpanded = expandedExercise === ex.id
          const prevSetsData = previousSets[ex.id] || []
          const prefilledWeight = lastWorkoutWeights[ex.id]

          return (
            <div key={ex.id} className={`rounded-2xl border transition-all ${exDone ? 'border-[#34C759]/30 bg-[#34C759]/5' : 'border-[#2A2A28] bg-[#1A1A18]'}`}>
              {/* Exercise header */}
              <div className="p-4 pb-2">
                <div className="flex items-center justify-between mb-1">
                  <button
                    onClick={() => setExpandedExercise(isExpanded ? null : ex.id)}
                    className="flex items-center gap-2 flex-1 text-left touch-manipulation"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <h3 className="text-[15px] font-semibold text-white leading-tight">
                      {exerciseData.name_nl || exerciseData.name}
                    </h3>
                    <Info size={14} className="text-[#C8A96E] flex-shrink-0" />
                  </button>
                  <span className="text-[12px] text-[#666] font-medium ml-2">
                    {exCompleted}/{exSets.length}
                  </span>
                </div>

                {/* Meta info */}
                <div className="flex items-center gap-2 text-[12px] text-[#666]">
                  <span>{ex.sets}×{ex.reps_min}{ex.reps_max !== ex.reps_min ? `-${ex.reps_max}` : ''}</span>
                  {ex.rest_seconds > 0 && <><span>·</span><span>{ex.rest_seconds}s rust</span></>}
                  {ex.tempo && <><span>·</span><span>Tempo {ex.tempo}</span></>}
                  {ex.rpe_target > 0 && <><span>·</span><span>RPE {ex.rpe_target}</span></>}
                </div>
              </div>

              {/* Expanded: exercise media + tips */}
              {isExpanded && (
                <div className="px-4 pb-3 space-y-3">
                  <div className="rounded-xl overflow-hidden">
                    <ExerciseMedia
                      name={exerciseData.name}
                      nameNl={exerciseData.name_nl}
                      bodyPart={exerciseData.body_part || 'chest'}
                      targetMuscle={exerciseData.target_muscle}
                      equipment={exerciseData.equipment}
                      gifUrl={exerciseData.gif_url}
                      videoUrl={exerciseData.video_url}
                      variant="compact"
                      showLabels={false}
                    />
                  </div>
                  {exerciseData.coach_tips && (
                    <div className="bg-[#C8A96E]/10 rounded-xl p-3">
                      <p className="text-[11px] font-semibold text-[#C8A96E] uppercase tracking-wider mb-1">Coach tips</p>
                      <p className="text-[13px] text-[#CCCAC5] leading-relaxed">{exerciseData.coach_tips}</p>
                    </div>
                  )}
                  {exerciseData.instructions && (
                    <div className="bg-[#222220] rounded-xl p-3">
                      <p className="text-[11px] font-semibold text-[#8A8A8A] uppercase tracking-wider mb-1">Uitvoering</p>
                      <p className="text-[13px] text-[#CCCAC5] leading-relaxed whitespace-pre-wrap">{exerciseData.instructions}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Notes field */}
              <div className="px-4 pb-2">
                <input
                  type="text"
                  value={exerciseNotes[ex.id] || ''}
                  onChange={(e) => setExerciseNotes(prev => ({ ...prev, [ex.id]: e.target.value }))}
                  placeholder="Notities toevoegen..."
                  className="w-full px-0 py-1 bg-transparent text-[12px] text-[#8A8A8A] placeholder-[#444] border-none focus:outline-none focus:text-[#CCCAC5]"
                />
              </div>

              {/* Sets table */}
              <div className="px-4 pb-3">
                {/* Table header */}
                <div className="flex items-center gap-2 mb-1.5 px-1">
                  <span className="text-[11px] font-semibold text-[#555] uppercase w-[32px]">Set</span>
                  <span className="text-[11px] font-semibold text-[#555] uppercase flex-1 text-center">Vorige</span>
                  <span className="text-[11px] font-semibold text-[#555] uppercase w-[72px] text-center">kg</span>
                  <span className="text-[11px] font-semibold text-[#555] uppercase w-[64px] text-center">Reps</span>
                  <span className="w-[36px]" />
                </div>

                {/* Set rows */}
                <div className="space-y-1">
                  {exSets.map((set, idx) => {
                    const prevSet = prevSetsData.find(p => p.set_number === idx + 1)
                    const prevLabel = prevSet
                      ? `${prevSet.weight_kg || 0} kg × ${prevSet.actual_reps || 0}`
                      : (prefilledWeight && idx === 0 ? `${prefilledWeight} kg` : '—')
                    const isRestActive = activeRestTimer?.exerciseId === ex.id && activeRestTimer?.setIndex === idx

                    return (
                      <div key={set.id}>
                        <SetRow
                          set={set}
                          index={idx}
                          prevLabel={prevLabel}
                          prefilledWeight={prefilledWeight}
                          prevSet={prevSet}
                          onComplete={() => completeSet(ex.id, idx)}
                          exerciseId={ex.id}
                          setSets={setSets}
                          exSets={exSets}
                        />
                        {/* Inline rest timer */}
                        {isRestActive && activeRestTimer && (
                          <div className="flex items-center gap-2 px-1 py-1.5">
                            <div className="flex-1 h-[6px] bg-[#2A2A28] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#C8A96E] rounded-full transition-all duration-1000 ease-linear"
                                style={{ width: `${((activeRestTimer.total - activeRestTimer.seconds) / activeRestTimer.total) * 100}%` }}
                              />
                            </div>
                            <button
                              onClick={() => setActiveRestTimer(null)}
                              className="text-[12px] font-semibold text-[#C8A96E] tabular-nums min-w-[44px] text-right"
                            >
                              {formatTimer(activeRestTimer.seconds)}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Add set button */}
                <button
                  onClick={() => addSet(ex.id)}
                  className="w-full mt-2 py-2 flex items-center justify-center gap-1.5 text-[13px] font-medium text-[#C8A96E] hover:bg-[#C8A96E]/10 rounded-xl transition-colors touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <Plus size={14} strokeWidth={2.5} />
                  Set toevoegen
                </button>
              </div>
            </div>
          )
        })}

        {/* Finish button at bottom */}
        {allDone && (
          <button
            onClick={handleFinish}
            className="w-full py-4 bg-[#34C759] text-white rounded-2xl font-bold text-[16px] shadow-[0_4px_20px_rgba(52,199,89,0.3)] hover:bg-[#2DB84E] transition-all flex items-center justify-center gap-2"
          >
            <Check size={20} strokeWidth={2.5} />
            Workout afronden
          </button>
        )}

        {/* Bottom actions */}
        <div className="mt-2 space-y-2">
          <button
            onClick={() => router.push(`/client/workout/active?dayId=${dayId}&programId=${programId}&addExercise=1`)}
            className="w-full py-3.5 bg-[#C8A96E] text-[#111110] rounded-xl font-semibold text-[14px] flex items-center justify-center gap-2"
          >
            <Plus size={16} strokeWidth={2.5} />
            Oefening toevoegen
          </button>

          <button
            onClick={() => setShowDiscardConfirm(true)}
            className="w-full py-3 text-[#FF3B30] text-[13px] font-medium hover:bg-[#FF3B30]/10 rounded-xl transition-colors"
          >
            Workout verwijderen
          </button>
        </div>

        {/* Discard confirmation */}
        {showDiscardConfirm && (
          <div className="fixed inset-0 bg-black/60 z-[70] flex items-end">
            <div className="w-full bg-[#1E1E1C] rounded-t-3xl p-6 animate-slide-up">
              <h3 className="text-lg font-semibold text-white mb-2">Workout verwijderen?</h3>
              <p className="text-[#8A8A8A] text-[14px] mb-6">Alle voortgang van deze sessie wordt permanent verwijderd.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDiscardConfirm(false)} className="flex-1 bg-[#2A2A28] text-white rounded-xl py-3 font-semibold">Annuleer</button>
                <button onClick={discardWorkout} className="flex-1 bg-[#FF3B30] text-white rounded-xl py-3 font-semibold">Verwijderen</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// --- Set row component ---
function SetRow({
  set, index, prevLabel, prefilledWeight, prevSet, onComplete, exerciseId, setSets, exSets,
}: {
  set: SetData
  index: number
  prevLabel: string
  prefilledWeight: number | null
  prevSet?: PreviousSet
  onComplete: () => void
  exerciseId: string
  setSets: React.Dispatch<React.SetStateAction<Record<string, SetData[]>>>
  exSets: SetData[]
}) {
  const defaultWeight = set.weight_kg?.toString() || prefilledWeight?.toString() || ''
  const [weight, setWeight] = useState(defaultWeight)
  const [reps, setReps] = useState(set.actual_reps?.toString() || set.prescribed_reps?.toString() || '')

  // Sync weight when propagated from previous set completion
  useEffect(() => {
    if (!set.completed && set.weight_kg && !weight) {
      setWeight(set.weight_kg.toString())
    }
  }, [set.weight_kg, set.completed, weight])

  const handleWeightChange = (value: string) => {
    setWeight(value)
    setSets((prev: Record<string, SetData[]>) => {
      const updated = [...(prev[exerciseId] || [])]
      updated[index] = { ...updated[index], weight_kg: value ? parseFloat(value) : null }
      return { ...prev, [exerciseId]: updated }
    })
  }

  const handleRepsChange = (value: string) => {
    setReps(value)
    setSets((prev: Record<string, SetData[]>) => {
      const updated = [...(prev[exerciseId] || [])]
      updated[index] = { ...updated[index], actual_reps: value ? parseInt(value) : set.prescribed_reps }
      return { ...prev, [exerciseId]: updated }
    })
  }

  const handleCompleteClick = () => {
    const finalWeight = weight ? parseFloat(weight) : null
    const finalReps = reps ? parseInt(reps) : set.prescribed_reps
    const updatedSets = [...exSets]
    updatedSets[index] = { ...set, weight_kg: finalWeight, actual_reps: finalReps, completed: true }
    // Propagate weight
    if (finalWeight && index + 1 < updatedSets.length && !updatedSets[index + 1].completed && !updatedSets[index + 1].weight_kg) {
      updatedSets[index + 1] = { ...updatedSets[index + 1], weight_kg: finalWeight }
    }
    setSets((prev: Record<string, SetData[]>) => ({ ...prev, [exerciseId]: updatedSets }))
    onComplete()
  }

  return (
    <div className={`flex items-center gap-2 px-1 py-1.5 rounded-lg transition-all ${set.completed ? 'opacity-60' : ''}`}>
      {/* Set number */}
      <span className={`text-[13px] font-bold w-[32px] ${set.completed ? 'text-[#34C759]' : 'text-[#555]'}`}>
        {index + 1}
      </span>

      {/* Previous */}
      <span className="flex-1 text-[12px] text-[#555] text-center truncate">
        {prevLabel}
      </span>

      {/* Weight input */}
      <input
        type="number"
        step="0.5"
        min="0"
        inputMode="decimal"
        value={weight}
        onChange={(e) => handleWeightChange(e.target.value)}
        placeholder={prefilledWeight ? `${prefilledWeight}` : '—'}
        disabled={set.completed}
        className="w-[72px] px-2 py-2 bg-[#222220] border border-[#333] rounded-lg text-[14px] text-center font-semibold text-white disabled:opacity-40 focus:border-[#C8A96E] focus:ring-1 focus:ring-[#C8A96E]/30 transition-all placeholder:text-[#444] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />

      {/* Reps input */}
      <input
        type="number"
        min="0"
        inputMode="numeric"
        value={reps}
        onChange={(e) => handleRepsChange(e.target.value)}
        placeholder={set.prescribed_reps?.toString() || '—'}
        disabled={set.completed}
        className="w-[64px] px-2 py-2 bg-[#222220] border border-[#333] rounded-lg text-[14px] text-center font-semibold text-white disabled:opacity-40 focus:border-[#C8A96E] focus:ring-1 focus:ring-[#C8A96E]/30 transition-all placeholder:text-[#444] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />

      {/* Check button */}
      <button
        onClick={handleCompleteClick}
        disabled={set.completed}
        className={`w-[36px] h-[36px] rounded-lg flex items-center justify-center flex-shrink-0 transition-all touch-manipulation ${
          set.completed
            ? 'bg-[#34C759] text-white'
            : 'bg-[#2A2A28] text-[#666] hover:bg-[#333] active:scale-95'
        }`}
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <Check size={16} strokeWidth={set.completed ? 3 : 2} />
      </button>
    </div>
  )
}
