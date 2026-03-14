'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { RestTimer } from '@/components/client/RestTimer'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  Zap,
} from 'lucide-react'

interface Exercise {
  id: string
  name: string
  name_nl: string
  gif_url: string
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

interface WorkoutSession {
  id: string
  started_at: string
}

export default function ActiveWorkoutPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#8B6914] border-t-transparent rounded-full animate-spin" /></div>}>
      <ActiveWorkoutPage />
    </Suspense>
  )
}

function ActiveWorkoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dayId = searchParams.get('dayId')
  const programId = searchParams.get('programId')

  const [user, setUser] = useState<any>(null)
  const [exercises, setExercises] = useState<ProgramTemplateExercise[]>([])
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [sets, setSets] = useState<Record<string, SetData[]>>({})
  const [lastWorkoutWeights, setLastWorkoutWeights] = useState<Record<string, number | null>>({})
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<WorkoutSession | null>(null)
  const [showRestTimer, setShowRestTimer] = useState(false)
  const [restSeconds, setRestSeconds] = useState(0)
  const [expandedTips, setExpandedTips] = useState(false)
  const [expandedInstructions, setExpandedInstructions] = useState(false)
  const [closeConfirm, setCloseConfirm] = useState(false)
  const [slideDirection, setSlideDirection] = useState<'right' | 'left'>('right')
  const [prCelebration, setPrCelebration] = useState<string | null>(null) // exercise name for PR toast

  // Load exercises and create workout session
  useEffect(() => {
    const loadData = async () => {
      try {
        if (!dayId || !programId) {
          router.push('/client/workout')
          return
        }

        const supabase = createClient()

        // Get current user
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
          router.push('/auth/login')
          return
        }

        setUser({ id: authUser.id })

        // Fetch exercises for this day
        const { data: exercisesData } = await supabase
          .from('program_template_exercises')
          .select('*, exercises(*)')
          .eq('template_day_id', dayId)
          .order('sort_order', { ascending: true })

        if (exercisesData) {
          setExercises(exercisesData as ProgramTemplateExercise[])

          // Initialize sets for each exercise
          const setsMap: Record<string, SetData[]> = {}
          const weightsMap: Record<string, number | null> = {}

          for (const ex of exercisesData as ProgramTemplateExercise[]) {
            const setsList: SetData[] = []
            for (let i = 0; i < ex.sets; i++) {
              setsList.push({
                id: `temp-${ex.id}-${i}`,
                set_number: i + 1,
                prescribed_reps: ex.reps_min,
                actual_reps: null,
                weight_kg: null,
                is_warmup: false,
                completed: false,
                is_pr: false,
              })
            }
            setsMap[ex.id] = setsList

            // Get last workout weight for this exercise
            const { data: lastSets } = await supabase
              .from('workout_sets')
              .select('weight_kg')
              .eq('exercise_id', ex.exercise_id)
              .eq('completed', true)
              .order('created_at', { ascending: false })
              .limit(1)

            if (lastSets && lastSets.length > 0) {
              weightsMap[ex.id] = lastSets[0].weight_kg
            } else {
              weightsMap[ex.id] = ex.weight_suggestion || null
            }
          }

          setSets(setsMap)
          setLastWorkoutWeights(weightsMap)

          // Create workout session
          const { data: newSession } = await supabase
            .from('workout_sessions')
            .insert({
              client_id: authUser.id,
              client_program_id: programId,
              template_day_id: dayId,
              started_at: new Date().toISOString(),
            })
            .select()
            .single()

          if (newSession) {
            setSession(newSession as WorkoutSession)
          }
        }
      } catch (error) {
        console.error('Error loading workout:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [dayId, programId, router])

  // Handle set completion with PR auto-detection
  const completeSet = useCallback(
    async (exerciseId: string, setIndex: number) => {
      const supabase = createClient()
      const setData = sets[exerciseId]?.[setIndex]

      if (!setData || !session) return

      try {
        // Find the exercise_id (from the exercises table, not prescription id)
        const exerciseRef = exercises.find(e => e.id === exerciseId)
        const actualExerciseId = exerciseRef?.exercise_id || exerciseId

        // PR auto-detection: check if this weight is higher than all previous sets for this exercise
        let isPR = false
        if (setData.weight_kg && setData.weight_kg > 0 && !setData.is_warmup) {
          const { data: previousBest } = await supabase
            .from('workout_sets')
            .select('weight_kg')
            .eq('exercise_id', actualExerciseId)
            .eq('completed', true)
            .eq('is_warmup', false)
            .order('weight_kg', { ascending: false })
            .limit(1)

          if (!previousBest || previousBest.length === 0 || (setData.weight_kg > (previousBest[0].weight_kg || 0))) {
            isPR = true
          }
        }

        // Save to database
        const { data: insertedSet } = await supabase
          .from('workout_sets')
          .insert({
            workout_session_id: session.id,
            exercise_id: actualExerciseId,
            set_number: setIndex + 1,
            prescribed_reps: setData.prescribed_reps,
            actual_reps: setData.actual_reps,
            weight_kg: setData.weight_kg,
            is_warmup: setData.is_warmup,
            completed: true,
            is_pr: isPR,
          })
          .select()
          .single()

        if (insertedSet) {
          // Update the local set with the database ID
          const updatedSets = { ...sets }
          updatedSets[exerciseId][setIndex] = {
            ...setData,
            id: insertedSet.id,
            completed: true,
            is_pr: isPR,
          }
          setSets(updatedSets)

          // Show PR celebration toast
          if (isPR && exerciseRef) {
            const exName = exerciseRef.exercises?.name_nl || exerciseRef.exercises?.name || 'Oefening'
            setPrCelebration(exName)
            setTimeout(() => setPrCelebration(null), 3000)
          }

          // Start rest timer
          const currentExercise = exercises[currentExerciseIndex]
          if (currentExercise) {
            setRestSeconds(currentExercise.rest_seconds)
            setShowRestTimer(true)
          }
        }
      } catch (error) {
        console.error('Error completing set:', error)
      }
    },
    [sets, session, exercises, currentExerciseIndex]
  )

  // Handle next exercise
  const handleNextExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setSlideDirection('right')
      setCurrentExerciseIndex(currentExerciseIndex + 1)
      setExpandedTips(false)
      setExpandedInstructions(false)
    }
  }

  // Handle previous exercise
  const handlePrevExercise = () => {
    if (currentExerciseIndex > 0) {
      setSlideDirection('left')
      setCurrentExerciseIndex(currentExerciseIndex - 1)
      setExpandedTips(false)
      setExpandedInstructions(false)
    }
  }

  // Handle close with confirmation
  const handleClose = async () => {
    if (closeConfirm) {
      router.push('/client/workout')
      return
    }
    setCloseConfirm(true)
  }

  const confirmClose = () => {
    router.push('/client/workout')
  }

  // Check if all sets are completed for current exercise
  const currentExerciseId = exercises[currentExerciseIndex]?.id
  const currentSets = currentExerciseId ? sets[currentExerciseId] : []
  const allSetsCompleted = currentSets.length > 0 && currentSets.every((s) => s.completed)
  const completedSetsCount = currentSets.filter((s) => s.completed).length

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-32 h-32 bg-client-surface-muted rounded-2xl mb-4" />
          <div className="w-24 h-4 bg-client-surface-muted rounded mx-auto" />
        </div>
      </div>
    )
  }

  const currentExercise = exercises[currentExerciseIndex]
  if (!currentExercise) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <p className="text-text-primary">Geen oefeningen gevonden</p>
      </div>
    )
  }

  const exerciseData = currentExercise.exercises
  const prefilledWeight = lastWorkoutWeights[currentExercise.id]

  return (
    <div className="fixed inset-0 bg-[#FAFAFA] z-50 overflow-y-auto pt-safe">
      {/* Rest Timer */}
      {showRestTimer && (
        <RestTimer
          initialSeconds={restSeconds}
          onDismiss={() => setShowRestTimer(false)}
        />
      )}

      {/* PR Celebration Toast */}
      {prCelebration && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce-in">
          <div className="bg-[#FF9500] text-white rounded-2xl px-6 py-3 shadow-[0_8px_24px_rgba(255,149,0,0.3)] flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-[13px] font-bold uppercase tracking-wide">Nieuw PR!</p>
              <p className="text-[12px] opacity-90">{prCelebration}</p>
            </div>
          </div>
        </div>
      )}

      {/* Close confirmation dialog */}
      {closeConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="w-full bg-white rounded-t-3xl p-6 animate-slide-up">
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Training afsluiten?
            </h3>
            <p className="text-client-text-secondary text-[14px] mb-6">
              Je voortgang wordt opgeslagen.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCloseConfirm(false)}
                className="flex-1 bg-client-surface-muted text-text-primary rounded-xl py-3 font-semibold transition-colors hover:bg-[#E5E5E3]"
              >
                Doorgaan
              </button>
              <button
                onClick={confirmClose}
                className="flex-1 bg-[#FF3B30] text-white rounded-xl py-3 font-semibold transition-colors hover:bg-[#E63328]"
              >
                Afsluiten
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <header className="sticky top-0 bg-white/90 backdrop-blur-xl border-b border-[#F0F0ED] z-40">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={handleClose}
            className="p-2 hover:bg-client-surface-muted rounded-full transition-colors"
            aria-label="Close workout"
          >
            <X size={24} strokeWidth={1.5} className="text-text-primary" />
          </button>

          <div className="text-center flex-1">
            <p className="text-[12px] text-client-text-secondary font-medium uppercase tracking-wide">
              Set {completedSetsCount + 1} van {currentSets.length}
            </p>
            <h1 className="font-semibold text-text-primary mt-0.5 text-[17px]">
              {exerciseData.name_nl || exerciseData.name}
            </h1>
          </div>

          <div className="w-10" />
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-client-surface-muted">
          <div
            className="h-full bg-[#8B6914] transition-all"
            style={{
              width: `${((currentExerciseIndex + 1) / exercises.length) * 100}%`,
            }}
          />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-32">
        <div key={currentExerciseIndex} className={slideDirection === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left'}>
        {/* Exercise GIF — lazy loaded */}
        <div className="mb-6">
          {exerciseData.gif_url ? (
            <div className="bg-[#FAFAFA] rounded-2xl overflow-hidden aspect-square flex items-center justify-center">
              <img
                src={exerciseData.gif_url}
                alt={exerciseData.name}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
                style={{ mixBlendMode: 'multiply' }}
              />
            </div>
          ) : (
            <div className="bg-client-surface-muted rounded-2xl aspect-square flex items-center justify-center">
              <Zap size={48} strokeWidth={1.5} className="text-client-text-secondary opacity-30" />
            </div>
          )}
        </div>

        {/* Coach tips (expandable) */}
        {exerciseData.coach_tips && (
          <div className="mb-4 bg-[#F5F0E8] rounded-2xl overflow-hidden border border-[#E5DDD1]">
            <button
              onClick={() => setExpandedTips(!expandedTips)}
              className="w-full p-4 flex items-start gap-3 hover:bg-[#F0EAE0] transition-colors"
            >
              <div className="flex-1 text-left">
                <p className="text-[13px] font-semibold text-[#8B6914] uppercase tracking-wide">
                  Coach tips
                </p>
                {expandedTips && (
                  <p className="text-[14px] text-text-primary mt-2 whitespace-pre-wrap">
                    {exerciseData.coach_tips}
                  </p>
                )}
              </div>
              <ChevronRight
                size={18}
                strokeWidth={1.5}
                className={`text-[#8B6914] flex-shrink-0 transition-transform ${
                  expandedTips ? 'rotate-90' : ''
                }`}
              />
            </button>
          </div>
        )}

        {/* Instructions (expandable) */}
        {exerciseData.instructions && (
          <div className="mb-6 bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED]">
            <button
              onClick={() => setExpandedInstructions(!expandedInstructions)}
              className="w-full p-4 flex items-start gap-3 hover:bg-[#F5F5F3] transition-colors"
            >
              <div className="flex-1 text-left">
                <p className="text-[13px] font-semibold text-client-text-secondary uppercase tracking-wide">
                  Uitvoering
                </p>
                {expandedInstructions && (
                  <p className="text-[14px] text-text-primary mt-2 whitespace-pre-wrap">
                    {exerciseData.instructions}
                  </p>
                )}
              </div>
              <ChevronRight
                size={18}
                strokeWidth={1.5}
                className={`text-client-text-secondary flex-shrink-0 transition-transform ${
                  expandedInstructions ? 'rotate-90' : ''
                }`}
              />
            </button>
          </div>
        )}

        {/* Sets logging table */}
        <div className="mb-6">
          <div className="space-y-2">
            {currentSets.map((set, index) => (
              <SetRow
                key={set.id}
                set={set}
                index={index}
                prefilledWeight={prefilledWeight}
                onComplete={() => completeSet(currentExercise.id, index)}
                exerciseId={currentExercise.id}
                currentSets={currentSets}
                setSets={setSets}
              />
            ))}
          </div>
        </div>
        </div>{/* end animation wrapper */}

        {/* Navigation buttons */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#F0F0ED] p-4">
          <div className="max-w-2xl mx-auto flex gap-3">
            <button
              onClick={handlePrevExercise}
              disabled={currentExerciseIndex === 0}
              className="flex-1 py-3 px-4 rounded-xl border border-[#F0F0ED] text-text-primary font-semibold flex items-center justify-center gap-2 disabled:opacity-30 hover:bg-client-surface-muted transition-colors"
            >
              <ChevronLeft size={18} strokeWidth={1.5} />
              Vorige
            </button>

            {allSetsCompleted ? (
              <button
                onClick={handleNextExercise}
                disabled={currentExerciseIndex === exercises.length - 1}
                className="flex-1 py-3 px-4 rounded-xl bg-[#8B6914] text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-[#6F5612] transition-colors"
              >
                {currentExerciseIndex === exercises.length - 1 ? 'Klaar' : 'Volgende'}
                <ChevronRight size={18} strokeWidth={1.5} />
              </button>
            ) : (
              <div className="flex-1 py-3 px-4 rounded-xl bg-client-surface-muted flex items-center justify-center gap-2">
                <AlertCircle size={18} strokeWidth={1.5} className="text-client-text-secondary" />
                <span className="text-[13px] text-client-text-secondary font-medium">
                  {currentSets.length - completedSetsCount} set{currentSets.length - completedSetsCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

// Set row component
function SetRow({
  set,
  index,
  prefilledWeight,
  onComplete,
  exerciseId,
  currentSets,
  setSets,
}: {
  set: SetData
  index: number
  prefilledWeight: number | null
  onComplete: () => void
  exerciseId: string
  currentSets: SetData[]
  setSets: React.Dispatch<React.SetStateAction<Record<string, SetData[]>>>
}) {
  const [weight, setWeight] = useState(set.weight_kg?.toString() || prefilledWeight?.toString() || '')
  const [reps, setReps] = useState(set.actual_reps?.toString() || set.prescribed_reps?.toString() || '')

  // Update weight display when smart default propagates from previous set
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
    // Ensure weight and reps are set
    const finalWeight = weight ? parseFloat(weight) : null
    const finalReps = reps ? parseInt(reps) : set.prescribed_reps

    const updatedSets = [...currentSets]
    updatedSets[index] = {
      ...set,
      weight_kg: finalWeight,
      actual_reps: finalReps,
      completed: true,
    }

    // Smart default: propagate weight to next uncompleted set
    if (finalWeight && index + 1 < updatedSets.length && !updatedSets[index + 1].completed) {
      if (!updatedSets[index + 1].weight_kg) {
        updatedSets[index + 1] = {
          ...updatedSets[index + 1],
          weight_kg: finalWeight,
        }
      }
    }

    setSets((prev: Record<string, SetData[]>) => ({ ...prev, [exerciseId]: updatedSets }))
    onComplete()
  }

  return (
    <div
      className={`rounded-xl border transition-all ${
        set.completed
          ? 'bg-[#34C759]/5 border-[#34C759]/20'
          : 'bg-white border-[#F0F0ED]'
      } p-4`}
    >
      <div className="flex items-center gap-3">
        <div className="text-[13px] font-semibold text-client-text-secondary min-w-[40px]">
          Set {index + 1}
        </div>

        {/* Weight input */}
        <input
          type="number"
          step="0.5"
          min="0"
          value={weight}
          onChange={(e) => handleWeightChange(e.target.value)}
          placeholder="kg"
          disabled={set.completed}
          className="w-20 px-3 py-2 border border-[#F0F0ED] rounded-lg text-[14px] text-center font-medium disabled:opacity-50 disabled:bg-client-surface-muted"
        />

        <span className="text-[12px] text-client-text-secondary">×</span>

        {/* Reps input */}
        <input
          type="number"
          min="0"
          value={reps}
          onChange={(e) => handleRepsChange(e.target.value)}
          placeholder="reps"
          disabled={set.completed}
          className="w-20 px-3 py-2 border border-[#F0F0ED] rounded-lg text-[14px] text-center font-medium disabled:opacity-50 disabled:bg-client-surface-muted"
        />

        {/* Complete button */}
        <button
          onClick={handleCompleteClick}
          disabled={set.completed}
          className={`ml-auto p-3 rounded-lg transition-all flex-shrink-0 ${
            set.completed
              ? 'bg-[#34C759] text-white'
              : 'bg-[#8B6914] text-white hover:bg-[#6F5612]'
          }`}
        >
          <Check size={18} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
