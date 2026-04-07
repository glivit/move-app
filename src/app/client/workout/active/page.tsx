'use client'

import { useEffect, useState, useCallback, useRef, Suspense, useMemo, memo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import {
  X,
  Check,
  Plus,
  Minus,
  Clock,
  ChevronDown,
  Search,
  Trash2,
  GripVertical,
  Play,
  Pause,
  RotateCcw,
  Timer,
  Zap,
  Flame,
  Footprints,
} from 'lucide-react'
// StepperInput removed — plain inputs like Hevy
import { ExerciseMedia } from '@/components/ExerciseMedia'
import { notifyWorkoutBarChanged } from '@/components/workout/ActiveWorkoutBar'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ─── Exercise Info Panel — large GIF + collapsible text ────

function ExerciseInfoPanelComponent({ exerciseData }: { exerciseData: Exercise }) {
  const [showTips, setShowTips] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)

  const hasGif = useMemo(() => exerciseData.gif_url && !imgError, [exerciseData.gif_url, imgError])

  const handleTipsToggle = useCallback(() => setShowTips(!showTips), [showTips])
  const handleInstructionsToggle = useCallback(() => setShowInstructions(!showInstructions), [showInstructions])
  const handleImageLoad = useCallback(() => setImgLoaded(true), [])
  const handleImageError = useCallback(() => setImgError(true), [])

  return (
    <div className="px-5 pb-3 space-y-3">
      {/* Large GIF display */}
      <div className="overflow-hidden bg-[#F8F8F6] rounded-xl relative" style={{ maxHeight: '50vh' }}>
        {hasGif ? (
          <>
            {!imgLoaded && (
              <div className="aspect-[4/3] flex items-center justify-center">
                <div className="w-8 h-8 border-[1.5px] border-[#D5D5D5] border-t-[#1A1917] rounded-full animate-spin" />
              </div>
            )}
            <Image
              src={exerciseData.gif_url!}
              alt={exerciseData.name_nl || exerciseData.name}
              width={500}
              height={375}
              unoptimized
              onLoad={handleImageLoad}
              onError={handleImageError}
              className="w-full object-contain transition-opacity duration-500"
              style={{
                maxHeight: '50vh',
                opacity: imgLoaded ? 1 : 0,
                mixBlendMode: 'multiply',
                filter: 'saturate(0.3) contrast(0.95)',
              }}
            />
          </>
        ) : (
          <div className="aspect-[4/3] flex items-center justify-center">
            <p className="text-[12px] text-[#C0C0C0]">{exerciseData.target_muscle}</p>
          </div>
        )}
      </div>

      {/* Equipment + muscle labels */}
      <div className="flex items-center gap-2">
        {exerciseData.equipment && (
          <span className="text-[11px] font-semibold text-[#ACACAC] bg-[#F0F0EE] px-2.5 py-1 rounded-lg">
            {exerciseData.equipment}
          </span>
        )}
        {exerciseData.target_muscle && (
          <span className="text-[11px] font-semibold text-[#ACACAC] bg-[#F0F0EE] px-2.5 py-1 rounded-lg">
            {exerciseData.target_muscle}
          </span>
        )}
      </div>

      {/* Collapsible: Coach tips */}
      {exerciseData.coach_tips && (
        <div className="border border-[#F0F0EE] rounded-xl overflow-hidden">
          <button
            onClick={handleTipsToggle}
            className="w-full flex items-center justify-between p-3"
          >
            <p className="text-[11px] font-semibold text-[#ACACAC] uppercase tracking-[0.08em]">Coach tips</p>
            <ChevronDown size={14} className={`text-[#ACACAC] transition-transform ${showTips ? 'rotate-180' : ''}`} />
          </button>
          {showTips && (
            <div className="px-3 pb-3 -mt-1">
              <p className="text-[13px] text-[#ACACAC] leading-relaxed">{exerciseData.coach_tips}</p>
            </div>
          )}
        </div>
      )}

      {/* Collapsible: Instructions */}
      {exerciseData.instructions && (
        <div className="border border-[#F0F0EE] rounded-xl overflow-hidden">
          <button
            onClick={handleInstructionsToggle}
            className="w-full flex items-center justify-between p-3"
          >
            <p className="text-[11px] font-semibold text-[#ACACAC] uppercase tracking-[0.08em]">Uitvoering</p>
            <ChevronDown size={14} className={`text-[#ACACAC] transition-transform ${showInstructions ? 'rotate-180' : ''}`} />
          </button>
          {showInstructions && (
            <div className="px-3 pb-3 -mt-1">
              <p className="text-[13px] text-[#ACACAC] leading-relaxed whitespace-pre-wrap">{exerciseData.instructions}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const ExerciseInfoPanel = memo(ExerciseInfoPanelComponent)

// ─── Cardio Timer Panel — stopwatch + stats ──────────────────

function CardioTimerPanelComponent({
  exerciseId,
  exerciseName,
  onComplete,
}: {
  exerciseId: string
  exerciseName: string
  onComplete: (durationSeconds: number) => void
}) {
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0) // seconds
  const [startTime, setStartTime] = useState<number | null>(null)
  const [pausedAt, setPausedAt] = useState(0)

  useEffect(() => {
    if (!running || !startTime) return
    const tick = () => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000) + pausedAt)
    }
    tick()
    const interval = setInterval(tick, 250)
    return () => clearInterval(interval)
  }, [running, startTime, pausedAt])

  const handleStart = () => {
    setStartTime(Date.now())
    setRunning(true)
  }

  const handlePause = () => {
    setPausedAt(elapsed)
    setStartTime(null)
    setRunning(false)
  }

  const handleResume = () => {
    setStartTime(Date.now())
    setRunning(true)
  }

  const handleFinish = () => {
    setRunning(false)
    onComplete(elapsed)
  }

  const handleReset = () => {
    setRunning(false)
    setElapsed(0)
    setStartTime(null)
    setPausedAt(0)
  }

  const hours = Math.floor(elapsed / 3600)
  const minutes = Math.floor((elapsed % 3600) / 60)
  const seconds = elapsed % 60

  // Estimate calories (very rough: ~8-12 kcal/min for cardio)
  const estimatedCals = Math.round((elapsed / 60) * 9)

  return (
    <div className="px-5 pb-5">
      {/* Timer display */}
      <div className="bg-[#F8F8F6] rounded-2xl p-6 text-center mb-4">
        <p className="text-[48px] font-bold text-[#1A1917] tabular-nums tracking-tight leading-none">
          {hours > 0 && `${hours}:`}{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </p>

        {/* Stats row */}
        {elapsed > 0 && (
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-1.5">
              <Flame size={14} strokeWidth={1.5} className="text-[#D46A3A]" />
              <span className="text-[13px] font-semibold text-[#ACACAC]">
                ~{estimatedCals} kcal
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={14} strokeWidth={1.5} className="text-[#D46A3A]" />
              <span className="text-[13px] font-semibold text-[#ACACAC]">
                {minutes} min
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {!running && elapsed === 0 ? (
          <button
            onClick={handleStart}
            className="flex-1 flex items-center justify-center gap-2 py-4 bg-[#3D8B5C] text-white rounded-2xl font-semibold text-[14px] uppercase tracking-[0.06em] hover:bg-[#347A50] transition-colors active:scale-[0.98]"
          >
            <Play size={18} strokeWidth={2} fill="currentColor" />
            Start
          </button>
        ) : running ? (
          <button
            onClick={handlePause}
            className="flex-1 flex items-center justify-center gap-2 py-4 bg-[#E8A838] text-white rounded-2xl font-semibold text-[14px] uppercase tracking-[0.06em] hover:bg-[#D49A30] transition-colors active:scale-[0.98]"
          >
            <Pause size={18} strokeWidth={2} />
            Pauze
          </button>
        ) : (
          <>
            <button
              onClick={handleResume}
              className="flex-1 flex items-center justify-center gap-2 py-4 bg-[#3D8B5C] text-white rounded-2xl font-semibold text-[14px] uppercase tracking-[0.06em] hover:bg-[#347A50] transition-colors active:scale-[0.98]"
            >
              <Play size={18} strokeWidth={2} fill="currentColor" />
              Hervat
            </button>
            <button
              onClick={handleReset}
              className="w-14 h-14 flex items-center justify-center bg-[#F0F0EE] rounded-2xl hover:bg-[#E0E0DE] transition-colors"
            >
              <RotateCcw size={18} strokeWidth={1.5} className="text-[#ACACAC]" />
            </button>
          </>
        )}

        {elapsed > 30 && (
          <button
            onClick={handleFinish}
            className="w-14 h-14 flex items-center justify-center bg-[#1A1917] rounded-2xl hover:bg-[#333330] transition-colors"
          >
            <Check size={18} strokeWidth={2.5} className="text-white" />
          </button>
        )}
      </div>
    </div>
  )
}

const CardioTimerPanel = memo(CardioTimerPanelComponent)

// ─── Interval Timer Panel — work/rest rounds ─────────────────

function IntervalTimerPanelComponent({
  exerciseId,
  exerciseName,
  onComplete,
}: {
  exerciseId: string
  exerciseName: string
  onComplete: (durationSeconds: number) => void
}) {
  const [workSeconds, setWorkSeconds] = useState(30)
  const [restSeconds, setRestSeconds] = useState(30)
  const [totalRounds, setTotalRounds] = useState(8)
  const [currentRound, setCurrentRound] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'work' | 'rest' | 'done'>('idle')
  const [timeLeft, setTimeLeft] = useState(0)
  const [endTime, setEndTime] = useState<number | null>(null)
  const [totalElapsed, setTotalElapsed] = useState(0)
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    if (phase === 'idle' || phase === 'done' || !endTime) return
    const tick = () => {
      const remaining = Math.ceil((endTime - Date.now()) / 1000)
      if (remaining <= 0) {
        // Phase complete
        if (phase === 'work') {
          if (currentRound >= totalRounds) {
            setPhase('done')
            setTimeLeft(0)
            setTotalElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
          } else {
            setPhase('rest')
            setTimeLeft(restSeconds)
            setEndTime(Date.now() + restSeconds * 1000)
          }
        } else if (phase === 'rest') {
          setCurrentRound(prev => prev + 1)
          setPhase('work')
          setTimeLeft(workSeconds)
          setEndTime(Date.now() + workSeconds * 1000)
        }
      } else {
        setTimeLeft(remaining)
      }
    }
    tick()
    const interval = setInterval(tick, 100)
    return () => clearInterval(interval)
  }, [phase, endTime, currentRound, totalRounds, workSeconds, restSeconds])

  const handleStart = () => {
    startTimeRef.current = Date.now()
    setCurrentRound(1)
    setPhase('work')
    setTimeLeft(workSeconds)
    setEndTime(Date.now() + workSeconds * 1000)
  }

  const handleFinish = () => {
    setTotalElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    setPhase('done')
    onComplete(totalElapsed || Math.floor((Date.now() - startTimeRef.current) / 1000))
  }

  const displayMinutes = Math.floor(timeLeft / 60)
  const displaySeconds = timeLeft % 60

  const WORK_PRESETS = [20, 30, 45, 60, 90]
  const REST_PRESETS = [10, 15, 20, 30, 45, 60]
  const ROUND_PRESETS = [4, 6, 8, 10, 12]

  if (phase === 'idle') {
    return (
      <div className="px-5 pb-5 space-y-5">
        {/* Work time */}
        <div>
          <label className="text-[11px] font-semibold text-[#ACACAC] uppercase tracking-[0.08em] mb-2 block">
            <Zap size={12} className="inline mr-1 text-[#3D8B5C]" />
            Werk (sec)
          </label>
          <div className="flex flex-wrap gap-2">
            {WORK_PRESETS.map(s => (
              <button
                key={s}
                onClick={() => setWorkSeconds(s)}
                className={`px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                  workSeconds === s
                    ? 'bg-[#3D8B5C] text-white'
                    : 'bg-[#F8F8F6] text-[#ACACAC] border border-[#F0F0EE]'
                }`}
              >
                {s}s
              </button>
            ))}
          </div>
        </div>

        {/* Rest time */}
        <div>
          <label className="text-[11px] font-semibold text-[#ACACAC] uppercase tracking-[0.08em] mb-2 block">
            <Pause size={12} className="inline mr-1 text-[#E8A838]" />
            Rust (sec)
          </label>
          <div className="flex flex-wrap gap-2">
            {REST_PRESETS.map(s => (
              <button
                key={s}
                onClick={() => setRestSeconds(s)}
                className={`px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                  restSeconds === s
                    ? 'bg-[#E8A838] text-white'
                    : 'bg-[#F8F8F6] text-[#ACACAC] border border-[#F0F0EE]'
                }`}
              >
                {s}s
              </button>
            ))}
          </div>
        </div>

        {/* Rounds */}
        <div>
          <label className="text-[11px] font-semibold text-[#ACACAC] uppercase tracking-[0.08em] mb-2 block">
            <RotateCcw size={12} className="inline mr-1 text-[#D46A3A]" />
            Rondes
          </label>
          <div className="flex flex-wrap gap-2">
            {ROUND_PRESETS.map(r => (
              <button
                key={r}
                onClick={() => setTotalRounds(r)}
                className={`px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                  totalRounds === r
                    ? 'bg-[#D46A3A] text-white'
                    : 'bg-[#F8F8F6] text-[#ACACAC] border border-[#F0F0EE]'
                }`}
              >
                {r}×
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-[#F8F8F6] rounded-xl px-4 py-3 text-center">
          <p className="text-[12px] text-[#ACACAC]">
            Totaal: <span className="font-semibold text-[#1A1917]">{totalRounds} rondes</span> · {Math.round((totalRounds * (workSeconds + restSeconds)) / 60)} min
          </p>
        </div>

        <button
          onClick={handleStart}
          className="w-full flex items-center justify-center gap-2 py-4 bg-[#3D8B5C] text-white rounded-2xl font-semibold text-[14px] uppercase tracking-[0.06em] hover:bg-[#347A50] transition-colors active:scale-[0.98]"
        >
          <Play size={18} strokeWidth={2} fill="currentColor" />
          Start interval timer
        </button>
      </div>
    )
  }

  if (phase === 'done') {
    const doneMinutes = Math.floor(totalElapsed / 60)
    const doneCals = Math.round((totalElapsed / 60) * 11)
    return (
      <div className="px-5 pb-5">
        <div className="bg-[#F6FBF7] border border-[#3D8B5C]/15 rounded-2xl p-6 text-center">
          <div className="w-12 h-12 bg-[#3D8B5C] rounded-full flex items-center justify-center mx-auto mb-3">
            <Check size={20} strokeWidth={3} className="text-white" />
          </div>
          <p className="text-[18px] font-semibold text-[#1A1917]">{totalRounds} rondes klaar!</p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <span className="text-[13px] text-[#ACACAC]">{doneMinutes} min</span>
            <span className="text-[13px] text-[#ACACAC]">~{doneCals} kcal</span>
          </div>
        </div>
      </div>
    )
  }

  // Active phase (work or rest)
  const progressPct = phase === 'work'
    ? ((workSeconds - timeLeft) / workSeconds) * 100
    : ((restSeconds - timeLeft) / restSeconds) * 100

  return (
    <div className="px-5 pb-5">
      <div className={`rounded-2xl p-6 text-center transition-colors duration-300 ${
        phase === 'work' ? 'bg-[#3D8B5C]/10' : 'bg-[#E8A838]/10'
      }`}>
        {/* Phase label */}
        <p className={`text-[12px] font-bold uppercase tracking-[0.12em] mb-1 ${
          phase === 'work' ? 'text-[#3D8B5C]' : 'text-[#E8A838]'
        }`}>
          {phase === 'work' ? 'WERK' : 'RUST'}
        </p>

        {/* Big timer */}
        <p className="text-[56px] font-bold text-[#1A1917] tabular-nums tracking-tight leading-none">
          {displayMinutes > 0 && `${displayMinutes}:`}{String(displaySeconds).padStart(2, '0')}
        </p>

        {/* Progress bar */}
        <div className="h-[4px] bg-white/50 rounded-full mt-4 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              phase === 'work' ? 'bg-[#3D8B5C]' : 'bg-[#E8A838]'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Round counter */}
        <p className="text-[13px] font-semibold text-[#ACACAC] mt-3">
          Ronde {currentRound} / {totalRounds}
        </p>
      </div>

      {/* Skip / finish */}
      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={() => {
            // Skip to next phase
            if (phase === 'work') {
              if (currentRound >= totalRounds) {
                setPhase('done')
                setTotalElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
              } else {
                setPhase('rest')
                setTimeLeft(restSeconds)
                setEndTime(Date.now() + restSeconds * 1000)
              }
            } else {
              setCurrentRound(prev => prev + 1)
              setPhase('work')
              setTimeLeft(workSeconds)
              setEndTime(Date.now() + workSeconds * 1000)
            }
          }}
          className="flex-1 py-3.5 bg-[#F8F8F6] text-[#ACACAC] rounded-xl font-semibold text-[13px] hover:bg-[#F0F0EE] transition-colors"
        >
          Skip →
        </button>
        <button
          onClick={handleFinish}
          className="px-6 py-3.5 bg-[#1A1917] text-white rounded-xl font-semibold text-[13px] hover:bg-[#333330] transition-colors"
        >
          Stop
        </button>
      </div>
    </div>
  )
}

const IntervalTimerPanel = memo(IntervalTimerPanelComponent)

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
  category?: string
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
  superset_group_id?: string | null
}

type SetType = 'normal' | 'warmup' | 'failure' | 'dropset'

const SET_TYPE_CONFIG: Record<SetType, { label: string; short: string; color: string; bg: string }> = {
  normal:  { label: 'Normaal',  short: '',  color: '#ACACAC', bg: 'transparent' },
  warmup:  { label: 'Warm-up',  short: 'W', color: '#E8A838', bg: '#FEF3E0' },
  failure: { label: 'Failure',  short: 'F', color: '#E04040', bg: '#FEECEC' },
  dropset: { label: 'Drop Set', short: 'D', color: '#7B61FF', bg: '#F0ECFF' },
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
  set_type?: SetType
}

interface PreviousSet {
  set_number: number
  weight_kg: number | null
  actual_reps: number | null
  completed?: boolean
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
  exerciseNotes?: Record<string, string>
  exerciseOrder?: string[]
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

// ─── Exercise Picker Modal ────────────────────────────────

const BODY_PART_OPTIONS = ['chest', 'back', 'shoulders', 'legs', 'arms', 'core', 'full body']
const EQUIPMENT_OPTIONS = ['barbell', 'dumbbell', 'machine', 'cable', 'kettlebell', 'body weight', 'band', 'other']

function ExercisePickerModalComponent({
  onSelect,
  onClose,
}: {
  onSelect: (exercise: Exercise) => void
  onClose: () => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [newExercise, setNewExercise] = useState({
    name_nl: '',
    body_part: '',
    target_muscle: '',
    equipment: 'body weight',
  })

  useEffect(() => {
    const loadExercises = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('exercises')
          .select('id, name, name_nl, body_part, target_muscle, equipment, gif_url, video_url, instructions, coach_tips, category')
          .order('name_nl', { ascending: true })
          .limit(500)
        if (data) {
          setExercises(data as Exercise[])
          setFilteredExercises(data as Exercise[])
        }
      } catch (err) {
        console.error('Error loading exercises:', err)
      } finally {
        setLoading(false)
      }
    }
    loadExercises()
  }, [])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredExercises(exercises)
      return
    }
    const q = searchQuery.toLowerCase()
    setFilteredExercises(
      exercises.filter(
        (ex) =>
          (ex.name_nl || '').toLowerCase().includes(q) ||
          (ex.name || '').toLowerCase().includes(q) ||
          (ex.body_part || '').toLowerCase().includes(q) ||
          (ex.target_muscle || '').toLowerCase().includes(q) ||
          (ex.equipment || '').toLowerCase().includes(q)
      )
    )
  }, [searchQuery, exercises])

  const handleSelectExercise = useCallback((exercise: Exercise) => {
    onSelect(exercise)
  }, [onSelect])

  const handleCreateExercise = async () => {
    if (!newExercise.name_nl.trim()) {
      setCreateError('Vul een naam in')
      return
    }
    if (!newExercise.body_part) {
      setCreateError('Kies een lichaamsgroep')
      return
    }
    if (!newExercise.target_muscle.trim()) {
      setCreateError('Vul een doelspier in')
      return
    }

    setCreating(true)
    setCreateError('')

    try {
      const supabase = createClient()
      const { data: { session: authSession } } = await supabase.auth.getSession()

      const res = await fetch('/api/exercises/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authSession?.access_token ? { Authorization: `Bearer ${authSession.access_token}` } : {}),
        },
        body: JSON.stringify({
          name_nl: newExercise.name_nl.trim(),
          body_part: newExercise.body_part,
          target_muscle: newExercise.target_muscle.trim(),
          equipment: newExercise.equipment,
          category: 'strength',
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Kon oefening niet aanmaken')
      if (result.exercise) {
        onSelect(result.exercise as Exercise)
      }
    } catch (err) {
      console.error('Error creating exercise:', err)
      setCreateError(err instanceof Error ? err.message : 'Kon oefening niet aanmaken')
    } finally {
      setCreating(false)
    }
  }

  // Pre-fill name when switching to create form from search
  const handleShowCreateForm = () => {
    if (searchQuery.trim()) {
      setNewExercise(prev => ({ ...prev, name_nl: searchQuery.trim() }))
    }
    setShowCreateForm(true)
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-[80] flex items-end">
      <div className="w-full h-[75vh] bg-white rounded-t-2xl flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0F0EE]">
          <h3 className="text-[18px] font-semibold text-[#1A1917] page-title">
            {showCreateForm ? 'Nieuwe oefening' : 'Oefening toevoegen'}
          </h3>
          <button
            onClick={showCreateForm ? () => setShowCreateForm(false) : onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#F0F0EE] transition-colors"
          >
            <X size={18} strokeWidth={1.5} className="text-[#ACACAC]" />
          </button>
        </div>

        {showCreateForm ? (
          /* ─── Create Custom Exercise Form ─── */
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Name */}
            <div>
              <label className="text-[11px] font-semibold text-[#ACACAC] uppercase tracking-[0.08em] mb-1.5 block">
                Naam oefening
              </label>
              <input
                type="text"
                value={newExercise.name_nl}
                onChange={(e) => setNewExercise(prev => ({ ...prev, name_nl: e.target.value }))}
                placeholder="bv. Bulgarian Split Squat"
                autoFocus
                className="w-full bg-[#F8F8F6] rounded-xl px-4 py-3 text-[14px] text-[#1A1917] placeholder-[#C0C0C0] border border-[#F0F0EE] focus:outline-none focus:ring-2 focus:ring-[#D46A3A]/30"
              />
            </div>

            {/* Body part */}
            <div>
              <label className="text-[11px] font-semibold text-[#ACACAC] uppercase tracking-[0.08em] mb-1.5 block">
                Lichaamsgroep
              </label>
              <div className="flex flex-wrap gap-2">
                {BODY_PART_OPTIONS.map((bp) => (
                  <button
                    key={bp}
                    onClick={() => setNewExercise(prev => ({ ...prev, body_part: bp }))}
                    className={`px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${
                      newExercise.body_part === bp
                        ? 'bg-[#1A1917] text-white'
                        : 'bg-[#F8F8F6] text-[#ACACAC] border border-[#F0F0EE]'
                    }`}
                  >
                    {bp}
                  </button>
                ))}
              </div>
            </div>

            {/* Target muscle */}
            <div>
              <label className="text-[11px] font-semibold text-[#ACACAC] uppercase tracking-[0.08em] mb-1.5 block">
                Doelspier
              </label>
              <input
                type="text"
                value={newExercise.target_muscle}
                onChange={(e) => setNewExercise(prev => ({ ...prev, target_muscle: e.target.value }))}
                placeholder="bv. quadriceps, glutes"
                className="w-full bg-[#F8F8F6] rounded-xl px-4 py-3 text-[14px] text-[#1A1917] placeholder-[#C0C0C0] border border-[#F0F0EE] focus:outline-none focus:ring-2 focus:ring-[#D46A3A]/30"
              />
            </div>

            {/* Equipment */}
            <div>
              <label className="text-[11px] font-semibold text-[#ACACAC] uppercase tracking-[0.08em] mb-1.5 block">
                Materiaal
              </label>
              <div className="flex flex-wrap gap-2">
                {EQUIPMENT_OPTIONS.map((eq) => (
                  <button
                    key={eq}
                    onClick={() => setNewExercise(prev => ({ ...prev, equipment: eq }))}
                    className={`px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${
                      newExercise.equipment === eq
                        ? 'bg-[#1A1917] text-white'
                        : 'bg-[#F8F8F6] text-[#ACACAC] border border-[#F0F0EE]'
                    }`}
                  >
                    {eq}
                  </button>
                ))}
              </div>
            </div>

            {createError && (
              <div className="bg-[rgba(196,55,42,0.06)] border border-[rgba(196,55,42,0.1)] rounded-xl px-4 py-3">
                <p className="text-[13px] text-[#C4372A]">{createError}</p>
              </div>
            )}

            {/* Create button */}
            <button
              onClick={handleCreateExercise}
              disabled={creating}
              className="w-full bg-[#D46A3A] text-white font-semibold text-[13px] uppercase tracking-[0.08em] rounded-2xl py-4 hover:bg-[#C45E30] transition-colors active:scale-[0.98] disabled:opacity-50 mt-2"
            >
              {creating ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
              ) : 'Oefening aanmaken & toevoegen'}
            </button>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="px-5 py-3">
              <div className="flex items-center gap-2 bg-white rounded-xl px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-[#D46A3A]/30">
                <Search size={16} strokeWidth={1.5} className="text-[#ACACAC] flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Zoek oefening..."
                  autoFocus
                  className="flex-1 bg-transparent text-[14px] text-[#1A1917] placeholder-[#C0C0C0] border-none focus:outline-none"
                />
              </div>
            </div>

            {/* Exercise list */}
            <div className="flex-1 overflow-y-auto px-5 pb-8">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-[1.5px] border-[#D5D5D5] border-t-[#1A1917] rounded-full animate-spin" />
                </div>
              ) : filteredExercises.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 min-h-[200px] space-y-4">
                  <p className="text-[14px] text-[#ACACAC]">Geen oefeningen gevonden voor &ldquo;{searchQuery}&rdquo;</p>
                  <button
                    onClick={handleShowCreateForm}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-[#D46A3A] text-white rounded-xl text-[13px] font-semibold hover:bg-[#C45E30] transition-colors active:scale-[0.98]"
                  >
                    <Plus size={16} strokeWidth={2} />
                    Maak &ldquo;{searchQuery.trim()}&rdquo; aan
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredExercises.map((ex) => (
                    <button
                      key={ex.id}
                      onClick={() => handleSelectExercise(ex)}
                      className="w-full text-left px-4 py-3.5 rounded-xl hover:bg-white transition-colors flex items-center gap-3"
                    >
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden border border-[#F0F0EE]">
                        {ex.gif_url ? (
                          <Image src={ex.gif_url} alt="" width={40} height={40} className="w-full h-full object-cover" unoptimized loading="lazy" style={{ filter: 'saturate(0.3)' }} />
                        ) : (
                          <span className="text-[10px] text-[#ACACAC] uppercase">{ex.target_muscle?.slice(0, 3)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-[#1A1917] truncate">{ex.name_nl || ex.name}</p>
                        <p className="text-[11px] text-[#ACACAC] mt-0.5">
                          {ex.target_muscle}{ex.equipment ? ` · ${ex.equipment}` : ''}
                        </p>
                      </div>
                      <Plus size={16} strokeWidth={2} className="text-[#D46A3A] flex-shrink-0" />
                    </button>
                  ))}

                  {/* Always-visible create button at bottom of list */}
                  <button
                    onClick={handleShowCreateForm}
                    className="w-full text-left px-4 py-3.5 rounded-xl hover:bg-[#F8F8F6] transition-colors flex items-center gap-3 border border-dashed border-[#E0E0DE] mt-3"
                  >
                    <div className="w-10 h-10 bg-[#F8F8F6] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Plus size={16} strokeWidth={2} className="text-[#D46A3A]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-[#D46A3A]">Maak nieuwe oefening</p>
                      <p className="text-[11px] text-[#ACACAC] mt-0.5">Staat je oefening er niet bij?</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const ExercisePickerModal = memo(ExercisePickerModalComponent)

// ─── Sortable Exercise Wrapper ────────────────────────────────
function SortableExerciseItem({ id, children }: { id: string; children: (dragHandleProps: { listeners: any; attributes: any }) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  }
  return (
    <div ref={setNodeRef} style={style}>
      {children({ listeners, attributes })}
    </div>
  )
}

// ─── Form Check Modal ────────────────────────────────────────

function FormCheckModalComponent({ exerciseName, onClose }: { exerciseName: string; onClose: () => void }) {
  const [uploading, setUploading] = useState(false)
  const [sent, setSent] = useState(false)
  const [note, setNote] = useState('')
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      // Upload via server-side API route (bypasses storage RLS)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', 'message-attachments')

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload mislukt')

      const supabase = createClient()

      // Get current user and coach
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Niet ingelogd')

      const { data: coaches } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'coach')
        .limit(1)

      if (!coaches || coaches.length === 0) throw new Error('Coach niet gevonden')

      // Send as message
      const content = `📹 Form check: ${exerciseName}${note ? `\n${note}` : ''}`
      await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: coaches[0].id,
        content,
        message_type: 'video',
        file_url: uploadData.url,
      })

      setSent(true)
      setTimeout(onClose, 1500)
    } catch (err) {
      console.error('Form check upload fout:', err)
      setUploadError(err instanceof Error ? err.message : 'Upload mislukt, probeer opnieuw')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[70] flex items-end justify-center">
      <div className="w-full max-w-lg bg-white rounded-t-2xl p-6 animate-slide-up">
        <h3 className="text-[18px] font-semibold text-[#1A1917] mb-1 page-title">
          Form Check
        </h3>
        <p className="text-[13px] text-[#ACACAC] mb-5">
          Neem een video op van je {exerciseName} en stuur deze naar je coach voor feedback.
        </p>

        {sent ? (
          <div className="text-center py-6">
            <div className="text-[32px] mb-2">✅</div>
            <p className="text-[15px] font-semibold text-[#1A1917]">Verstuurd naar je coach!</p>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optioneel: vraag of opmerking..."
              className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] text-[14px] text-[#1A1917] placeholder-[#C0C0C0] mb-4 focus:outline-none"
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {uploadError && (
              <p className="text-[13px] text-[#C4372A] mb-3 text-center">{uploadError}</p>
            )}
            <button
              onClick={() => { setUploadError(' + chr(39) + chr(39) + '); fileInputRef.current?.click() }}
              disabled={uploading}
              className="w-full py-4 rounded-2xl font-bold text-[14px] uppercase tracking-[0.08em] bg-[#D46A3A] text-white flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-[1.5px] border-[#C0C0C0] border-t-[#1A1917] rounded-full animate-spin" />
                  Uploaden...
                </>
              ) : (
                '📹 Video opnemen'
              )}
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 mt-2 text-[14px] text-[#ACACAC] font-medium"
            >
              Annuleren
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const FormCheckModal = memo(FormCheckModalComponent)

// ─── Main Wrapper ──────────────────────────────────────────

export default function ActiveWorkoutPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-[1.5px] border-[#D5D5D5] border-t-[#1A1917] rounded-full animate-spin" />
      </div>
    }>
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
  const [activeRestTimer, setActiveRestTimer] = useState<{ exerciseId: string; setIndex: number; seconds: number; total: number; endTime: number } | null>(null)
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>({})
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('move-weight-unit') as 'kg' | 'lbs') || 'kg'
    }
    return 'kg'
  })
  const [showExercisePicker, setShowExercisePicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [formCheckExercise, setFormCheckExercise] = useState<{ id: string; name: string } | null>(null)
  const [originalExercises, setOriginalExercises] = useState<ProgramTemplateExercise[]>([])
  const [showSaveChangesModal, setShowSaveChangesModal] = useState(false)
  const [savingToTemplate, setSavingToTemplate] = useState(false)
  const [cardioCompleted, setCardioCompleted] = useState<Record<string, number>>({}) // exerciseId -> duration in seconds

  // Refs for auto-save
  const setsRef = useRef(sets)
  const sessionRef = useRef(session)
  useEffect(() => { setsRef.current = sets }, [sets])
  useEffect(() => { sessionRef.current = session }, [session])

  // --- KG/LBS conversion helpers ---
  const KG_TO_LBS = 2.20462
  const toggleWeightUnit = useCallback(() => {
    setWeightUnit(prev => {
      const next = prev === 'kg' ? 'lbs' : 'kg'
      localStorage.setItem('move-weight-unit', next)
      return next
    })
  }, [])
  const displayWeight = useCallback((kg: number | null): string => {
    if (kg === null || kg === undefined) return ''
    if (weightUnit === 'lbs') return (kg * KG_TO_LBS).toFixed(1)
    return kg.toString()
  }, [weightUnit])
  const toKg = useCallback((displayVal: string): number | null => {
    if (!displayVal) return null
    const num = parseFloat(displayVal)
    if (isNaN(num)) return null
    if (weightUnit === 'lbs') return Math.round((num / KG_TO_LBS) * 100) / 100
    return num
  }, [weightUnit])

  // --- Haptic helper ---
  const haptic = useCallback((pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern)
    }
  }, [])

  // --- Audio beep for timer ---
  const playBeep = useCallback((frequency: number = 880, duration: number = 120) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = frequency
      osc.type = 'sine'
      gain.gain.value = 0.3
      osc.start()
      osc.stop(ctx.currentTime + duration / 1000)
      setTimeout(() => ctx.close(), duration + 50)
    } catch { /* audio not available */ }
  }, [])

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

  // --- Inline rest timer countdown (endTime-based, survives app-switch) ---
  useEffect(() => {
    if (!activeRestTimer || activeRestTimer.seconds <= 0) return
    const tick = () => {
      setActiveRestTimer(prev => {
        if (!prev) return null
        const remaining = Math.ceil((prev.endTime - Date.now()) / 1000)
        // Beep at 3, 2, 1 seconds
        if (remaining > 0 && remaining <= 3 && remaining !== prev.seconds) {
          playBeep(660, 100)
          haptic(15)
        }
        // Final beep (done) — longer, higher pitch
        if (remaining <= 0) {
          playBeep(1100, 250)
          haptic([40, 30, 40])
          return null
        }
        return { ...prev, seconds: remaining }
      })
    }
    // Tick immediately (catches up after background), then every 250ms for smooth updates
    tick()
    const interval = setInterval(tick, 250)
    return () => clearInterval(interval)
  }, [activeRestTimer?.endTime, playBeep, haptic])

  // --- Auto-save (includes notes + exercise order) ---
  useEffect(() => {
    if (!session || !dayId || !programId || Object.keys(sets).length === 0) return
    saveWorkoutState({
      sessionId: session.id, dayId, programId, sets, savedAt: Date.now(),
      exerciseNotes,
      exerciseOrder: exercises.map(e => e.id),
    })
  }, [sets, session, dayId, programId, exerciseNotes, exercises])

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

  // --- Check for addExercise param ---
  useEffect(() => {
    if (searchParams.get('addExercise') === '1') {
      setShowExercisePicker(true)
    }
  }, [searchParams])

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

        setOriginalExercises(exercisesData)
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
            // Restore notes
            if (saved.exerciseNotes) setExerciseNotes(saved.exerciseNotes)
            // Restore exercise order
            if (saved.exerciseOrder && saved.exerciseOrder.length > 0) {
              const orderedExercises = saved.exerciseOrder
                .map(id => exercisesData.find(e => e.id === id))
                .filter(Boolean) as ProgramTemplateExercise[]
              // Add any new exercises not in saved order
              for (const ex of exercisesData) {
                if (!orderedExercises.find(o => o.id === ex.id)) orderedExercises.push(ex)
              }
              setExercises(orderedExercises)
            }
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

        // Fresh session — prefill with previous session data
        const setsMap: Record<string, SetData[]> = {}
        for (const ex of exercisesData) {
          const prevSets = apiPreviousSets[ex.id] || []
          const lastWeight = weightsMap[ex.id]
          const setsList: SetData[] = []
          for (let i = 0; i < ex.sets; i++) {
            const prev = prevSets.find((p: any) => p.set_number === i + 1)
            setsList.push({
              id: `temp-${ex.id}-${i}`,
              set_number: i + 1,
              prescribed_reps: ex.reps_min,
              actual_reps: prev?.actual_reps ?? null,
              weight_kg: prev?.weight_kg ?? lastWeight ?? null,
              is_warmup: false,
              completed: false,
              is_pr: false,
            })
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

  // --- Complete a set: PR check + rest timer + haptic + auto-focus ---
  const completeSet = useCallback(async (exerciseId: string, setIndex: number, weight: number | null) => {
    if (!session) return

    // Haptic on set completion
    haptic(25)

    try {
      const exerciseRef = exercises.find(e => e.id === exerciseId)

      // PR detection: simple client-side check (server also checks via trigger)
      let isPR = false
      if (weight && weight > 0) {
        try {
          const supabase = createClient()
          const { data: previousBest } = await supabase
            .from('workout_sets').select('weight_kg')
            .eq('exercise_id', exerciseRef?.exercise_id || exerciseId).eq('completed', true).eq('is_warmup', false)
            .order('weight_kg', { ascending: false }).limit(1)
          if (!previousBest?.length || (weight > (previousBest[0].weight_kg || 0))) isPR = true
        } catch { /* PR check is non-critical */ }
      }

      // Only update is_pr flag — use functional updater to not overwrite reps/weight
      if (isPR) {
        haptic([50, 50, 100]) // Strong double-buzz for PR
        setSets(prev => {
          const updated = { ...prev }
          updated[exerciseId] = [...(updated[exerciseId] || [])]
          updated[exerciseId][setIndex] = { ...updated[exerciseId][setIndex], is_pr: true }
          return updated
        })

        if (exerciseRef) {
          setPrCelebration(exerciseRef.exercises?.name_nl || exerciseRef.exercises?.name || 'Oefening')
          setTimeout(() => setPrCelebration(null), 3000)
        }
      }

      if (exerciseRef && exerciseRef.rest_seconds > 0) {
        setActiveRestTimer({ exerciseId, setIndex, seconds: exerciseRef.rest_seconds, total: exerciseRef.rest_seconds, endTime: Date.now() + exerciseRef.rest_seconds * 1000 })
      }

      // Auto-focus next set's weight field
      const exSets = sets[exerciseId] || []
      const nextIndex = setIndex + 1
      if (nextIndex < exSets.length && !exSets[nextIndex].completed) {
        setTimeout(() => {
          const nextInput = document.getElementById(`weight-${exerciseId}-${nextIndex}`)
          if (nextInput) {
            nextInput.focus()
            ;(nextInput as HTMLInputElement).select()
          }
        }, 150)
      }
    } catch (error) { console.error('Error completing set:', error) }
  }, [session, exercises, haptic, sets])

  // --- Reorder exercises ---
  const moveExercise = useCallback((fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1
    if (toIndex < 0 || toIndex >= exercises.length) return
    setExercises(prev => {
      const updated = [...prev]
      const temp = updated[fromIndex]
      updated[fromIndex] = updated[toIndex]
      updated[toIndex] = temp
      return updated
    })
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10)
  }, [exercises.length])

  // --- Remove exercise from workout ---
  const [confirmRemoveExercise, setConfirmRemoveExercise] = useState<string | null>(null)
  const removeExercise = useCallback((exerciseId: string) => {
    setExercises(prev => prev.filter(e => e.id !== exerciseId))
    setSets(prev => {
      const { [exerciseId]: _, ...rest } = prev
      return rest
    })
    setConfirmRemoveExercise(null)
    if (expandedExercise === exerciseId) setExpandedExercise(null)
  }, [expandedExercise])

  // --- Remove set from exercise ---
  const removeSet = useCallback((exerciseId: string, setIndex: number) => {
    setSets(prev => {
      const current = prev[exerciseId] || []
      if (current.length <= 1) return prev // keep at least 1 set
      const updated = current.filter((_, i) => i !== setIndex)
        .map((s, i) => ({ ...s, set_number: i + 1 }))
      return { ...prev, [exerciseId]: updated }
    })
  }, [])

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

  // --- Add exercise from picker ---
  const handleAddExercise = (exercise: Exercise) => {
    const tempId = `added-${exercise.id}-${Date.now()}`
    const newPTE: ProgramTemplateExercise = {
      id: tempId,
      exercise_id: exercise.id,
      sets: 3,
      reps_min: 10,
      reps_max: 12,
      rest_seconds: 60,
      tempo: '',
      rpe_target: 0,
      weight_suggestion: 0,
      notes: '',
      exercises: exercise,
    }
    setExercises(prev => [...prev, newPTE])
    setSets(prev => ({
      ...prev,
      [tempId]: Array.from({ length: 3 }, (_, i) => ({
        id: `temp-${tempId}-${i}`,
        set_number: i + 1,
        prescribed_reps: 10,
        actual_reps: null,
        weight_kg: null,
        is_warmup: false,
        completed: false,
        is_pr: false,
      })),
    }))
    setShowExercisePicker(false)
  }

  // --- Drag & drop reorder ---
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setExercises(prev => {
        const oldIndex = prev.findIndex(e => e.id === active.id)
        const newIndex = prev.findIndex(e => e.id === over.id)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }, [])

  const exerciseIds = useMemo(() => exercises.map(e => e.id), [exercises])

  // --- Detect workout modifications ---
  const hasWorkoutChanges = useMemo(() => {
    if (originalExercises.length === 0) return false
    // Different number of exercises
    if (exercises.length !== originalExercises.length) return true
    // Different exercises or different order
    for (let i = 0; i < exercises.length; i++) {
      if (exercises[i].id !== originalExercises[i].id) return true
      // Check if sets count changed
      const currentSets = sets[exercises[i].id] || []
      if (currentSets.length !== exercises[i].sets) return true
    }
    return false
  }, [exercises, originalExercises, sets])

  // --- Save changes to template ---
  const saveChangesToTemplate = async () => {
    if (!dayId) return
    setSavingToTemplate(true)
    try {
      const supabase = createClient()
      const { data: { session: authSession } } = await supabase.auth.getSession()

      // Build updated exercises list for the template day
      const updatedExercises = exercises.map((ex, index) => ({
        exercise_id: ex.exercise_id,
        sort_order: index,
        sets: (sets[ex.id] || []).length || ex.sets,
        reps_min: ex.reps_min,
        reps_max: ex.reps_max,
        rest_seconds: ex.rest_seconds,
        tempo: ex.tempo || null,
        rpe_target: ex.rpe_target || null,
        notes: ex.notes || null,
      }))

      const res = await fetch('/api/update-template-day', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authSession?.access_token ? { Authorization: `Bearer ${authSession.access_token}` } : {}),
        },
        body: JSON.stringify({ dayId, exercises: updatedExercises }),
      })

      if (!res.ok) {
        console.error('Failed to save template changes:', await res.text())
      }
    } catch (err) {
      console.error('Error saving template changes:', err)
    } finally {
      setSavingToTemplate(false)
      setShowSaveChangesModal(false)
      // Continue with normal finish
      await doFinishWorkout()
    }
  }

  const handleFinishOnlyThisTime = async () => {
    setShowSaveChangesModal(false)
    await doFinishWorkout()
  }

  const handleFinish = async () => {
    // If workout was modified, show save-changes modal first
    if (hasWorkoutChanges) {
      setShowSaveChangesModal(true)
      return
    }
    await doFinishWorkout()
  }

  const doFinishWorkout = async () => {
    if (!session || saving) return
    setSaving(true)
    setSaveError(null)

    // Collect all sets with data from React state
    const allSetsToSave: Array<{
      exercise_id: string
      set_number: number
      prescribed_reps: number | null
      actual_reps: number | null
      weight_kg: number | null
      is_warmup: boolean
      completed: boolean
      is_pr: boolean
    }> = []

    for (const [templateExId, exerciseSets] of Object.entries(sets)) {
      const exerciseRef = exercises.find(e => e.id === templateExId)
      const actualExerciseId = exerciseRef?.exercise_id || templateExId

      for (const s of exerciseSets) {
        // Skip sets with no data at all
        if (!s.weight_kg && !s.actual_reps) continue

        // Clamp values to safe DB ranges: weight_kg NUMERIC(6,2) max 9999.99, reps INTEGER
        const safeWeight = s.weight_kg != null ? Math.min(Math.max(0, Number(s.weight_kg) || 0), 9999.99) : null
        const safeReps = s.actual_reps != null ? Math.min(Math.max(0, Math.round(Number(s.actual_reps) || 0)), 9999) : null
        const safePrescribed = s.prescribed_reps != null ? Math.min(Math.max(0, Math.round(Number(s.prescribed_reps) || 0)), 9999) : null

        allSetsToSave.push({
          exercise_id: actualExerciseId,
          set_number: s.set_number,
          prescribed_reps: safePrescribed,
          actual_reps: safeReps,
          weight_kg: safeWeight === 0 && s.weight_kg == null ? null : safeWeight,
          is_warmup: s.set_type === 'warmup' || s.is_warmup,
          completed: true,
          is_pr: s.is_pr,
        })
      }
    }

    // Add cardio exercises as single sets (duration stored in actual_reps as seconds)
    for (const [exerciseId, durationSec] of Object.entries(cardioCompleted)) {
      const exerciseRef = exercises.find(e => e.id === exerciseId)
      const actualExerciseId = exerciseRef?.exercise_id || exerciseId
      allSetsToSave.push({
        exercise_id: actualExerciseId,
        set_number: 1,
        prescribed_reps: null,
        actual_reps: durationSec, // duration in seconds
        weight_kg: null,
        is_warmup: false,
        completed: true,
        is_pr: false,
      })
    }

    console.log('[handleFinish] Sets to save:', allSetsToSave.length, JSON.stringify(allSetsToSave))

    // Get the user's access token to pass to server route
    const supabase = createClient()
    const { data: { session: authSession } } = await supabase.auth.getSession()
    const accessToken = authSession?.access_token

    let saved = false
    let lastError = ''

    if (allSetsToSave.length > 0) {
      // Try server route (admin client, bypasses RLS)
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

        const res = await fetch('/api/workout-save', {
          method: 'POST',
          headers,
          body: JSON.stringify({ sessionId: session.id, sets: allSetsToSave }),
        })
        const result = await res.json()
        if (res.ok && result.success) {
          console.log('[handleFinish] Server save OK:', result.savedCount, 'sets')
          saved = true
        } else {
          lastError = `Server ${res.status}: ${result.error || 'unknown'} ${result.details || ''}`
          console.error('[handleFinish] Server save failed:', lastError)
        }
      } catch (err: any) {
        lastError = `Fetch error: ${err?.message || err}`
        console.error('[handleFinish] Server route error:', err)
      }

      // Fallback: direct Supabase browser client
      if (!saved) {
        console.warn('[handleFinish] Falling back to direct Supabase write...')
        try {
          const { error: delErr } = await supabase.from('workout_sets').delete().eq('workout_session_id', session.id)
          if (delErr) {
            lastError = `Fallback delete: ${delErr.message}`
            console.error('[handleFinish] Fallback delete error:', delErr)
          }

          const insertRows = allSetsToSave.map(s => ({ ...s, workout_session_id: session.id }))
          const { data: inserted, error: insErr } = await supabase.from('workout_sets').insert(insertRows).select()
          if (insErr) {
            lastError = `Fallback insert: ${insErr.message}`
            console.error('[handleFinish] Fallback insert error:', insErr)
          } else {
            console.log('[handleFinish] Fallback saved:', inserted?.length, 'sets')
            saved = true
          }
        } catch (fbErr: any) {
          lastError = `Fallback error: ${fbErr?.message || fbErr}`
          console.error('[handleFinish] Fallback error:', fbErr)
        }
      }
    } else {
      saved = true
    }

    if (!saved) {
      setSaving(false)
      setSaveError(`Opslaan mislukt: ${lastError}`)
      return
    }

    // Mark the workout session as completed in DB
    // This ensures it is recorded even if the user skips the feedback page
    try {
      const supabaseFinish = createClient()
      await supabaseFinish
        .from('workout_sessions')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', session.id)
    } catch { /* best-effort -- workout-finish page will retry */ }

    // Auto-update estimated 1RMs based on this session's performance
    try {
      fetch('/api/update-1rm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.id }),
      }).catch(() => { /* best-effort */ })
    } catch { /* ignore */ }

    clearWorkoutState()
    try { localStorage.removeItem('move_minimized_workout'); notifyWorkoutBarChanged() } catch { /* ok */ }
    router.push(`/client/workout/complete?sessionId=${session.id}`)
  }

  // --- Minimize workout (persistent bar) ---
  const handleMinimize = () => {
    if (!session || !dayId || !programId) return
    saveWorkoutState({ sessionId: session.id, dayId, programId, sets, savedAt: Date.now() })
    try {
      localStorage.setItem('move_minimized_workout', JSON.stringify({
        sessionId: session.id,
        dayId,
        programId,
        startedAt: session.started_at,
      }))
      notifyWorkoutBarChanged()
    } catch { /* ok */ }
    router.push('/client')
  }

  const confirmClose = () => {
    clearWorkoutState()
    try { localStorage.removeItem('move_minimized_workout'); notifyWorkoutBarChanged() } catch { /* ok */ }
    router.push('/client/workout')
  }

  // Discard workout
  const discardWorkout = async () => {
    if (!session) return
    try {
      const supabase = createClient()
      await supabase.from('workout_sets').delete().eq('workout_session_id', session.id)
      await supabase.from('workout_sessions').delete().eq('id', session.id)
    } catch (err) { console.error('Discard error:', err) }
    clearWorkoutState()
    try { localStorage.removeItem('move_minimized_workout'); notifyWorkoutBarChanged() } catch { /* ok */ }
    router.push('/client/workout')
  }

  // Compute totals (strength exercises)
  const strengthExercises = exercises.filter(e => e.exercises?.category !== 'cardio')
  const cardioExercises = exercises.filter(e => e.exercises?.category === 'cardio')
  const totalSets = strengthExercises.reduce((acc, e) => acc + (sets[e.id]?.length || 0), 0)
  const completedTotal = strengthExercises.reduce((acc, e) => acc + (sets[e.id]?.filter(s => s.completed)?.length || 0), 0)
  const allCardioCompleted = cardioExercises.length === 0 || cardioExercises.every(e => !!cardioCompleted[e.id])
  const allStrengthDone = strengthExercises.length === 0 || (totalSets > 0 && completedTotal === totalSets)
  const allDone = exercises.length > 0 && allStrengthDone && allCardioCompleted

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-[1.5px] border-[#D5D5D5] border-t-[#1A1917] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto pt-safe">
      {/* PR Celebration */}
      {prCelebration && (
        <>
          <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden">
            {Array.from({ length: 40 }).map((_, i) => {
              const left = Math.random() * 100
              const delay = Math.random() * 0.6
              const dur = 1.5 + Math.random() * 1
              const size = 6 + Math.random() * 6
              const colors = ['#D46A3A', '#1A1917', '#3D8B5C', '#C4372A', '#ACACAC', '#F0F0EE']
              return (
                <div key={i} style={{ position: 'absolute', left: `${left}%`, top: '-10px', width: `${size}px`, height: `${size * 0.6}px`, backgroundColor: colors[i % colors.length], borderRadius: '2px', transform: `rotate(${Math.random() * 360}deg)`, animation: `confettiFall ${dur}s ease-in ${delay}s forwards`, opacity: 0 }} />
              )
            })}
          </div>
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[61] animate-bounce-in">
            <div className="bg-[#D46A3A] text-white px-6 py-3 rounded-2xl flex items-center gap-3 border border-white/20">
              <span className="text-2xl">🏆</span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/80">Nieuw PR</p>
                <p className="text-[14px] font-semibold">{prCelebration}</p>
              </div>
            </div>
          </div>
          <style dangerouslySetInnerHTML={{ __html: `@keyframes confettiFall { 0% { opacity:1; transform:translateY(0) rotate(0deg); } 100% { opacity:0; transform:translateY(100vh) rotate(720deg); } }` }} />
        </>
      )}

      {/* Close confirmation — bottom sheet */}
      {closeConfirm && (
        <div className="fixed inset-0 bg-black/30 z-[70] flex items-end">
          <div className="w-full bg-white p-6 rounded-t-2xl shadow-xl animate-slide-up">
            <h3
              className="text-[20px] font-semibold text-[#1A1917] tracking-[-0.02em] mb-2 page-title"
            >
              Training afsluiten?
            </h3>
            <p className="text-[14px] text-[#ACACAC] mb-6">Je voortgang wordt opgeslagen.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setCloseConfirm(false)}
                className="flex-1 bg-[#F8F8F6] text-[#1A1917] py-3.5 rounded-xl font-semibold text-[14px] uppercase tracking-[0.06em] transition-colors hover:bg-white"
              >
                Doorgaan
              </button>
              <button
                onClick={confirmClose}
                className="flex-1 bg-[#C4372A] text-white py-3.5 rounded-xl font-semibold text-[14px] uppercase tracking-[0.06em] transition-colors hover:bg-[#A82D22]"
              >
                Afsluiten
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise picker modal */}
      {showExercisePicker && (
        <ExercisePickerModal
          onSelect={handleAddExercise}
          onClose={() => setShowExercisePicker(false)}
        />
      )}

      {/* Form Check Modal */}
      {formCheckExercise && (
        <FormCheckModal
          exerciseName={formCheckExercise.name}
          onClose={() => setFormCheckExercise(null)}
        />
      )}

      {/* ═══ TOP BAR ═══════════════════════════════ */}
      <header className="sticky top-0 bg-white/95 backdrop-blur-xl z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={handleMinimize}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#F0F0EE] transition-colors touch-manipulation"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <X size={18} strokeWidth={1.5} className="text-[#ACACAC]" />
          </button>

          <div className="flex items-center gap-1.5">
            <Clock size={13} strokeWidth={1.5} className="text-[#D46A3A]" />
            <span className="stat-number text-[18px] text-[#1A1917] tabular-nums">
              {formatTimer(workoutSeconds)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* KG / LBS toggle */}
            <button
              onClick={toggleWeightUnit}
              className="h-8 px-2.5 rounded-lg bg-[#F8F8F6] text-[11px] font-bold uppercase tracking-[0.04em] text-[#ACACAC] active:scale-95 transition-all touch-manipulation"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {weightUnit.toUpperCase()}
            </button>

            <button
              onClick={handleFinish}
              disabled={saving}
              className={`px-5 h-10 rounded-xl font-semibold text-[13px] transition-all touch-manipulation ${
                saving
                  ? 'bg-[#E0E0DE] text-[#ACACAC] cursor-wait'
                  : allDone
                    ? 'bg-[#3D8B5C] text-white'
                    : 'bg-[#1A1917] text-white'
              }`}
            >
              {saving ? 'Opslaan...' : 'Klaar'}
            </button>
          </div>
        </div>

        {/* Progress line */}
        <div className="h-[3px] bg-[#F0F0EE]">
          <div
            className="h-full bg-[#3D8B5C] transition-all duration-500 ease-out"
            style={{ width: `${exercises.length > 0 ? ((completedTotal + Object.keys(cardioCompleted).length) / (totalSets + cardioExercises.length)) * 100 : 0}%` }}
          />
        </div>
      </header>

      {/* ═══ EXERCISE LIST ═══════════════════════════ */}
      <main className="max-w-lg mx-auto px-4 py-6 pb-24 space-y-4">
        <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={exerciseIds} strategy={verticalListSortingStrategy}>
        {exercises.map((ex, exIndex) => {
          const exerciseData = ex.exercises
          const exSets = sets[ex.id] || []
          const isCardio = exerciseData?.category === 'cardio'
          const exDone = isCardio ? !!cardioCompleted[ex.id] : (exSets.length > 0 && exSets.every(s => s.completed))
          const exCompleted = isCardio ? (cardioCompleted[ex.id] ? 1 : 0) : exSets.filter(s => s.completed).length
          const isExpanded = expandedExercise === ex.id
          const prevSetsData = previousSets[ex.id] || []
          const prefilledWeight = lastWorkoutWeights[ex.id]

          // Superset detection
          const ssGroup = (ex as any).superset_group_id
          const isSuperset = !!ssGroup
          const ssExercises = isSuperset ? exercises.filter(e => (e as any).superset_group_id === ssGroup) : []
          const ssIndex = isSuperset ? ssExercises.findIndex(e => e.id === ex.id) : -1
          const ssLabel = isSuperset ? String.fromCharCode(65 + ssIndex) : '' // A, B, C...
          const ssColors = ['#D46A3A', '#3D8B5C', '#4A7BD4', '#9B59B6']
          const ssColor = isSuperset ? ssColors[ssIndex % ssColors.length] : ''
          const isFirstInGroup = isSuperset && (exIndex === 0 || (exercises[exIndex - 1] as any).superset_group_id !== ssGroup)
          const isLastInGroup = isSuperset && (exIndex === exercises.length - 1 || (exercises[exIndex + 1] as any).superset_group_id !== ssGroup)

          return (
            <SortableExerciseItem key={ex.id} id={ex.id}>
            {({ listeners, attributes }) => (
            <div>
              {/* Superset group header */}
              {isFirstInGroup && (
                <div className="flex items-center gap-2 mb-1.5 px-1">
                  <div className="flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 4h8M3 7h8M3 10h8" stroke="#D46A3A" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    <span className="text-[11px] font-bold text-[#D46A3A] uppercase tracking-[0.08em]">Superset</span>
                  </div>
                </div>
              )}
              <div
                className={`rounded-2xl transition-all ${
                  exDone
                    ? 'bg-[#F6FBF7] border border-[#3D8B5C]/15'
                    : 'bg-white border border-[#F0F0EE]'
                } ${isSuperset ? 'relative overflow-hidden' : ''} ${isSuperset && !isLastInGroup ? 'mb-0 rounded-b-none border-b-0' : ''} ${isSuperset && !isFirstInGroup ? 'rounded-t-none border-t border-dashed border-t-[#E0E0DE]' : ''}`}
              >
                {/* Superset color sidebar */}
                {isSuperset && (
                  <div
                    className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
                    style={{ backgroundColor: ssColor }}
                  />
                )}
              {/* Exercise header — sticky on scroll */}
              <div className={`${isSuperset ? 'pl-7' : 'px-5'} ${!isSuperset ? 'px-5' : 'pr-5'} pt-5 pb-3 sticky top-14 bg-white/95 backdrop-blur-sm z-10 ${isFirstInGroup || !isSuperset ? 'rounded-t-2xl' : ''}`}>
                <div className="flex items-center justify-between">
                  {/* Drag handle */}
                  <button
                    {...listeners}
                    {...attributes}
                    className="w-[24px] h-[36px] flex items-center justify-center flex-shrink-0 cursor-grab active:cursor-grabbing touch-manipulation -ml-1 mr-1"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                    aria-label="Versleep oefening"
                  >
                    <GripVertical size={16} strokeWidth={1.5} className="text-[#D5D5D5]" />
                  </button>
                  <button
                    onClick={() => setExpandedExercise(isExpanded ? null : ex.id)}
                    className="flex items-center gap-2.5 flex-1 text-left touch-manipulation min-w-0"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    {isSuperset && (
                      <span
                        className="text-[11px] font-black uppercase w-[22px] h-[22px] flex items-center justify-center rounded-md flex-shrink-0"
                        style={{ backgroundColor: ssColor + '18', color: ssColor }}
                      >
                        {ssLabel}{ssIndex + 1}
                      </span>
                    )}
                    {/* Exercise thumbnail */}
                    {exerciseData.gif_url && (
                      <div className="w-[36px] h-[36px] rounded-lg bg-[#F8F8F6] flex-shrink-0 overflow-hidden">
                        <Image
                          src={exerciseData.gif_url}
                          alt=""
                          width={36}
                          height={36}
                          unoptimized
                          loading="lazy"
                          className="w-full h-full object-cover"
                          style={{ filter: 'saturate(0.3) contrast(0.95)', mixBlendMode: 'multiply' }}
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3
                        className={`text-[15px] font-semibold leading-tight tracking-[-0.01em] truncate ${
                          exDone ? 'text-[#3D8B5C]' : 'text-[#1A1917]'
                        }`}
                      >
                        {exerciseData.name_nl || exerciseData.name}
                      </h3>
                      {/* Meta inline under title */}
                      <p className="text-[12px] text-[#ACACAC] mt-0.5">
                        {ex.sets}×{ex.reps_min}{ex.reps_max !== ex.reps_min ? `-${ex.reps_max}` : ''}
                        {ex.rest_seconds > 0 ? ` · ${ex.rest_seconds}s` : ''}
                        {ex.rpe_target > 0 ? ` · RPE ${ex.rpe_target}` : ''}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
                    {exDone ? (
                      <div className="w-[28px] h-[28px] rounded-full bg-[#3D8B5C] flex items-center justify-center">
                        <Check size={14} strokeWidth={3} className="text-white" />
                      </div>
                    ) : isCardio ? (
                      <Timer size={16} strokeWidth={1.5} className="text-[#D46A3A]" />
                    ) : (
                      <span className="text-[13px] font-semibold tabular-nums text-[#ACACAC]">
                        {exCompleted}/{exSets.length}
                      </span>
                    )}
                    {/* Remove exercise button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmRemoveExercise(ex.id) }}
                      className="w-[28px] h-[28px] flex items-center justify-center rounded-lg hover:bg-[#FEF0F0] transition-colors touch-manipulation"
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      <Trash2 size={13} strokeWidth={1.5} className="text-[#C0C0C0]" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded: large GIF + collapsible tips */}
              {isExpanded && (
                <ExerciseInfoPanel exerciseData={exerciseData} />
              )}

              {/* Cardio or Sets */}
              {exerciseData.category === 'cardio' ? (
                // ─── Cardio exercise: show timer ───
                cardioCompleted[ex.id] ? (
                  <div className="px-5 pb-5">
                    <div className="bg-[#F6FBF7] border border-[#3D8B5C]/15 rounded-xl p-4 flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#3D8B5C] rounded-full flex items-center justify-center flex-shrink-0">
                        <Check size={16} strokeWidth={3} className="text-white" />
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-[#3D8B5C]">Klaar!</p>
                        <p className="text-[12px] text-[#ACACAC]">
                          {Math.floor(cardioCompleted[ex.id] / 60)} min {cardioCompleted[ex.id] % 60}s
                          {' · '}~{Math.round((cardioCompleted[ex.id] / 60) * 9)} kcal
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (exerciseName => {
                  const isInterval = (exerciseData.name || '').toLowerCase().includes('interval') ||
                    (exerciseData.name_nl || '').toLowerCase().includes('interval')
                  return isInterval ? (
                    <IntervalTimerPanel
                      exerciseId={ex.id}
                      exerciseName={exerciseData.name_nl || exerciseData.name}
                      onComplete={(duration) => setCardioCompleted(prev => ({ ...prev, [ex.id]: duration }))}
                    />
                  ) : (
                    <CardioTimerPanel
                      exerciseId={ex.id}
                      exerciseName={exerciseData.name_nl || exerciseData.name}
                      onComplete={(duration) => setCardioCompleted(prev => ({ ...prev, [ex.id]: duration }))}
                    />
                  )
                })(exerciseData.name)
              ) : (
                // ─── Strength exercise: show sets table ───
                <div className="px-5 pb-5">
                  {/* Column header */}
                  <div className="flex items-center gap-2 mb-1.5 px-2">
                    <span className="text-[10px] font-semibold text-[#C0C0C0] uppercase tracking-[0.08em] w-[28px] text-center">Set</span>
                    <span className="text-[10px] font-semibold text-[#C0C0C0] uppercase tracking-[0.08em] flex-1 text-center">Vorige</span>
                    <span className="text-[10px] font-semibold text-[#C0C0C0] uppercase tracking-[0.08em] w-[80px] text-center">{weightUnit.toUpperCase()}</span>
                    <span className="text-[10px] font-semibold text-[#C0C0C0] uppercase tracking-[0.08em] w-[64px] text-center">Reps</span>
                    <span className="w-[40px]" />
                  </div>

                  {/* Rows */}
                  <div className="space-y-1">
                    {exSets.map((set, idx) => {
                      const prevSet = prevSetsData.find(p => p.set_number === idx + 1)
                      const prevLabel = prevSet
                        ? `${displayWeight(prevSet.weight_kg) || 0}×${prevSet.actual_reps || 0}`
                        : (prefilledWeight && idx === 0 ? `${displayWeight(prefilledWeight)} ${weightUnit}` : '—')
                      const isRestActive = activeRestTimer?.exerciseId === ex.id && activeRestTimer?.setIndex === idx

                      return (
                        <div key={set.id}>
                          <SetRow
                            set={set}
                            index={idx}
                            prevLabel={prevLabel}
                            prefilledWeight={prefilledWeight}
                            prevSet={prevSet}
                            onComplete={(weight: number | null) => completeSet(ex.id, idx, weight)}
                            exerciseId={ex.id}
                            setSets={setSets}
                            exSets={exSets}
                            weightUnit={weightUnit}
                            displayWeight={displayWeight}
                            toKg={toKg}
                          />
                          {/* Inline rest timer */}
                          {isRestActive && activeRestTimer && (
                            <div className="mx-2 my-2 rounded-xl overflow-hidden">
                              {/* Progress bar (full width, thin) */}
                              <div className="w-full h-[3px] bg-[#F0F0EE]">
                                <div
                                  className="h-full bg-[#D46A3A] rounded-full transition-all duration-1000 ease-linear"
                                  style={{ width: `${((activeRestTimer.total - activeRestTimer.seconds) / activeRestTimer.total) * 100}%` }}
                                />
                              </div>
                              {/* Timer row */}
                              <div className="flex items-center justify-between px-2 py-2">
                                <button
                                  onClick={() => setActiveRestTimer(prev => prev ? { ...prev, seconds: Math.max(0, prev.seconds - 15), total: prev.total, endTime: prev.endTime - 15000 } : null)}
                                  className="px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-[#ACACAC] hover:bg-[#F8F8F6] active:scale-95 transition-all touch-manipulation"
                                  style={{ WebkitTapHighlightColor: 'transparent' }}
                                >
                                  −15s
                                </button>
                                <div className="flex items-center gap-2">
                                  <span className="stat-number text-[22px] font-bold text-[#D46A3A] tabular-nums">
                                    {formatTimer(activeRestTimer.seconds)}
                                  </span>
                                  <button
                                    onClick={() => setActiveRestTimer(null)}
                                    className="text-[11px] font-semibold text-[#ACACAC] uppercase tracking-[0.04em] hover:text-[#1A1917] transition-colors touch-manipulation"
                                    style={{ WebkitTapHighlightColor: 'transparent' }}
                                  >
                                    Skip
                                  </button>
                                </div>
                                <button
                                  onClick={() => setActiveRestTimer(prev => prev ? { ...prev, seconds: prev.seconds + 15, total: Math.max(prev.total, prev.seconds + 15), endTime: prev.endTime + 15000 } : null)}
                                  className="px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-[#ACACAC] hover:bg-[#F8F8F6] active:scale-95 transition-all touch-manipulation"
                                  style={{ WebkitTapHighlightColor: 'transparent' }}
                                >
                                  +15s
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Add set */}
                  <button
                    onClick={() => addSet(ex.id)}
                    className="w-full mt-2 py-2.5 flex items-center justify-center gap-1.5 text-[12px] font-medium text-[#ACACAC] rounded-xl hover:bg-[#F8F8F6] transition-colors touch-manipulation"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <Plus size={13} strokeWidth={2} />
                    Set toevoegen
                  </button>
                </div>
              )}
            </div>
          </div>
          )}
          </SortableExerciseItem>
          )
        })}
        </SortableContext>
        </DndContext>

        {/* Save error message */}
        {saveError && (
          <div className="w-full px-4 py-3 bg-[#C4372A]/10 border border-[#C4372A]/20 rounded-xl text-center">
            <p className="text-[#C4372A] text-[13px] font-medium">{saveError}</p>
          </div>
        )}

        {/* Finish CTA */}
        {allDone && (
          <button
            onClick={handleFinish}
            disabled={saving}
            className={`w-full py-4 rounded-2xl font-semibold text-[15px] flex items-center justify-center gap-2 transition-all shadow-lg ${
              saving
                ? 'bg-[#E0E0DE] text-[#ACACAC] cursor-wait shadow-none'
                : 'bg-[#3D8B5C] text-white shadow-[#3D8B5C]/25'
            }`}
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-[1.5px] border-[#C0C0C0] border-t-white rounded-full animate-spin" />
                Opslaan...
              </>
            ) : (
              <>
                <Check size={18} strokeWidth={2.5} />
                Workout afronden
              </>
            )}
          </button>
        )}

        {/* Bottom actions */}
        <div className="mt-4 space-y-3">
          <button
            onClick={() => setShowExercisePicker(true)}
            className="w-full py-3.5 border border-dashed border-[#D5D5D5] text-[#ACACAC] rounded-2xl font-medium text-[13px] flex items-center justify-center gap-2 transition-all hover:border-[#ACACAC] hover:text-[#1A1917]"
          >
            <Plus size={14} strokeWidth={2} />
            Oefening toevoegen
          </button>

          <button
            onClick={() => setShowDiscardConfirm(true)}
            className="w-full py-2.5 text-[#C4372A]/60 text-[12px] font-medium hover:text-[#C4372A] transition-colors"
          >
            Workout verwijderen
          </button>
        </div>

        {/* Remove exercise confirmation */}
        {confirmRemoveExercise && (
          <div className="fixed inset-0 bg-black/30 z-[70] flex items-end">
            <div className="w-full bg-white p-6 rounded-t-2xl shadow-xl animate-slide-up">
              <h3 className="text-[20px] font-semibold text-[#1A1917] tracking-[-0.02em] mb-2 page-title">
                Oefening verwijderen?
              </h3>
              <p className="text-[14px] text-[#ACACAC] mb-6">
                {exercises.find(e => e.id === confirmRemoveExercise)?.exercises?.name_nl || 'Deze oefening'} wordt uit deze workout verwijderd.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmRemoveExercise(null)}
                  className="flex-1 bg-[#F8F8F6] text-[#1A1917] py-3.5 rounded-xl font-semibold text-[14px] uppercase tracking-[0.06em] hover:bg-white transition-colors"
                >
                  Annuleer
                </button>
                <button
                  onClick={() => removeExercise(confirmRemoveExercise)}
                  className="flex-1 bg-[#C4372A] text-white py-3.5 rounded-xl font-semibold text-[14px] uppercase tracking-[0.06em] hover:bg-[#A82D22] transition-colors"
                >
                  Verwijderen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Discard confirmation */}
        {/* Save changes modal */}
        {showSaveChangesModal && (
          <div className="fixed inset-0 bg-black/30 z-[70] flex items-end">
            <div className="w-full bg-white p-6 rounded-t-2xl shadow-xl animate-slide-up">
              <h3 className="text-[20px] font-semibold text-[#1A1917] tracking-[-0.02em] mb-2 page-title">
                Je hebt aanpassingen gemaakt
              </h3>
              <p className="text-[14px] text-[#ACACAC] mb-6">
                Wil je de wijzigingen opslaan in je programma, of alleen voor deze workout?
              </p>
              <div className="space-y-3">
                <button
                  onClick={saveChangesToTemplate}
                  disabled={savingToTemplate}
                  className="w-full bg-[#1A1917] text-white py-3.5 rounded-xl font-semibold text-[14px] uppercase tracking-[0.06em] hover:bg-[#333330] transition-colors disabled:opacity-50"
                >
                  {savingToTemplate ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                  ) : 'Opslaan in programma'}
                </button>
                <button
                  onClick={handleFinishOnlyThisTime}
                  className="w-full bg-[#F8F8F6] text-[#1A1917] py-3.5 rounded-xl font-semibold text-[14px] uppercase tracking-[0.06em] hover:bg-white transition-colors"
                >
                  Alleen deze keer
                </button>
                <button
                  onClick={() => setShowSaveChangesModal(false)}
                  className="w-full py-2.5 text-[#ACACAC] text-[12px] font-medium hover:text-[#1A1917] transition-colors"
                >
                  Annuleer
                </button>
              </div>
            </div>
          </div>
        )}

        {showDiscardConfirm && (
          <div className="fixed inset-0 bg-black/30 z-[70] flex items-end">
            <div className="w-full bg-white p-6 rounded-t-2xl shadow-xl animate-slide-up">
              <h3
                className="text-[20px] font-semibold text-[#1A1917] tracking-[-0.02em] mb-2 page-title"
              >
                Workout verwijderen?
              </h3>
              <p className="text-[14px] text-[#ACACAC] mb-6">Alle voortgang wordt permanent verwijderd.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDiscardConfirm(false)}
                  className="flex-1 bg-[#F8F8F6] text-[#1A1917] py-3.5 rounded-xl font-semibold text-[14px] uppercase tracking-[0.06em] hover:bg-white transition-colors"
                >
                  Annuleer
                </button>
                <button
                  onClick={discardWorkout}
                  className="flex-1 bg-[#C4372A] text-white py-3.5 rounded-xl font-semibold text-[14px] uppercase tracking-[0.06em] hover:bg-[#A82D22] transition-colors"
                >
                  Verwijderen
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// --- Set row component ---
function SetRowComponent({
  set, index, prevLabel, prefilledWeight, prevSet, onComplete, exerciseId, setSets, exSets,
  weightUnit = 'kg', displayWeight, toKg,
}: {
  set: SetData
  index: number
  prevLabel: string
  prefilledWeight: number | null
  prevSet?: PreviousSet
  onComplete: (weight: number | null) => void
  exerciseId: string
  setSets: React.Dispatch<React.SetStateAction<Record<string, SetData[]>>>
  exSets: SetData[]
  weightUnit?: 'kg' | 'lbs'
  displayWeight?: (kg: number | null) => string
  toKg?: (displayVal: string) => number | null
}) {
  const toDisplay = displayWeight || ((kg: number | null) => kg?.toString() || '')
  const fromDisplay = toKg || ((v: string) => v ? parseFloat(v) : null)

  // Smart prefill: cap weight at what previous set actually achieved
  // (you don't get stronger during a workout — if set 2 was lighter, set 3 should match)
  const getDefaultWeight = () => {
    if (set.weight_kg != null) return toDisplay(set.weight_kg)
    if (prevSet?.completed && prevSet.weight_kg != null && prefilledWeight != null) {
      const cappedWeight = Math.min(prevSet.weight_kg, prefilledWeight)
      return toDisplay(cappedWeight)
    }
    return toDisplay(prefilledWeight) || ''
  }
  const [weight, setWeight] = useState(getDefaultWeight)

  // Smart prefill: cap reps at what previous set achieved
  const getDefaultReps = () => {
    if (set.actual_reps != null) return set.actual_reps.toString()
    if (prevSet?.completed && prevSet.actual_reps != null && prevSet.actual_reps < (set.prescribed_reps || 0)) {
      return prevSet.actual_reps.toString()
    }
    return set.prescribed_reps?.toString() || ''
  }
  const [reps, setReps] = useState(getDefaultReps)

  // Sync display when unit changes
  useEffect(() => {
    if (set.weight_kg != null) {
      setWeight(toDisplay(set.weight_kg))
    } else if (prefilledWeight != null && !weight) {
      setWeight(toDisplay(prefilledWeight))
    }
  }, [weightUnit]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!set.completed && set.weight_kg && !weight) {
      setWeight(toDisplay(set.weight_kg))
    }
  }, [set.weight_kg, set.completed, weight, toDisplay])

  // Smart prefill: when previous set completes, cap this set's prefill
  useEffect(() => {
    if (!set.completed && prevSet?.completed && !set.weight_kg) {
      // Cap weight at previous set's actual weight
      if (prevSet.weight_kg != null && prefilledWeight != null) {
        const capped = Math.min(prevSet.weight_kg, prefilledWeight)
        setWeight(toDisplay(capped))
        setSets((prev: Record<string, SetData[]>) => {
          const updated = [...(prev[exerciseId] || [])]
          if (updated[index] && !updated[index].weight_kg) {
            updated[index] = { ...updated[index], weight_kg: capped }
          }
          return { ...prev, [exerciseId]: updated }
        })
      }
      // Cap reps at previous set's actual reps
      if (prevSet.actual_reps != null && prevSet.actual_reps < (set.prescribed_reps || 0) && !set.actual_reps) {
        setReps(prevSet.actual_reps.toString())
      }
    }
  }, [prevSet?.completed, prevSet?.weight_kg, prevSet?.actual_reps]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleWeightChange = useCallback((value: string) => {
    setWeight(value)
    const kgValue = fromDisplay(value)
    setSets((prev: Record<string, SetData[]>) => {
      const updated = [...(prev[exerciseId] || [])]
      updated[index] = { ...updated[index], weight_kg: kgValue }
      return { ...prev, [exerciseId]: updated }
    })
  }, [exerciseId, index, setSets])

  const handleRepsChange = useCallback((value: string) => {
    setReps(value)
    setSets((prev: Record<string, SetData[]>) => {
      const updated = [...(prev[exerciseId] || [])]
      updated[index] = { ...updated[index], actual_reps: value ? parseInt(value) : set.prescribed_reps }
      return { ...prev, [exerciseId]: updated }
    })
  }, [exerciseId, index, set.prescribed_reps, setSets])

  const handleCompleteClick = useCallback(() => {
    if (set.completed) {
      // Uncheck: toggle back to incomplete
      const updatedSets = [...exSets]
      updatedSets[index] = { ...set, completed: false, is_pr: false }
      setSets((prev: Record<string, SetData[]>) => ({ ...prev, [exerciseId]: updatedSets }))
      return
    }
    const finalWeight = fromDisplay(weight)
    const finalReps = reps ? parseInt(reps) : set.prescribed_reps
    const updatedSets = [...exSets]
    updatedSets[index] = { ...set, weight_kg: finalWeight, actual_reps: finalReps, completed: true }
    if (finalWeight && index + 1 < updatedSets.length && !updatedSets[index + 1].completed && !updatedSets[index + 1].weight_kg) {
      updatedSets[index + 1] = { ...updatedSets[index + 1], weight_kg: finalWeight }
    }
    setSets((prev: Record<string, SetData[]>) => ({ ...prev, [exerciseId]: updatedSets }))
    onComplete(finalWeight)
  }, [set, weight, reps, exSets, index, exerciseId, onComplete, setSets, fromDisplay])

  // --- Set type selector (long press on set number) ---
  const [showTypeMenu, setShowTypeMenu] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentType: SetType = set.set_type || (set.is_warmup ? 'warmup' : 'normal')
  const typeConfig = SET_TYPE_CONFIG[currentType]

  const handleSetTypeChange = useCallback((type: SetType) => {
    setSets((prev: Record<string, SetData[]>) => {
      const updated = [...(prev[exerciseId] || [])]
      updated[index] = { ...updated[index], set_type: type, is_warmup: type === 'warmup' }
      return { ...prev, [exerciseId]: updated }
    })
    setShowTypeMenu(false)
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10)
  }, [exerciseId, index, setSets])

  const handleSetNumberPointerDown = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      setShowTypeMenu(true)
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20)
    }, 500)
  }, [])

  const handleSetNumberPointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  return (
    <div className={`relative flex items-center gap-2 px-2 py-2 rounded-xl transition-all ${
      set.completed
        ? 'bg-[#E8F5E9]/60'
        : 'hover:bg-[#FAFAF9]'
    }`}>
      {/* Set number — long press to change type */}
      <button
        onPointerDown={handleSetNumberPointerDown}
        onPointerUp={handleSetNumberPointerUp}
        onPointerLeave={handleSetNumberPointerUp}
        onContextMenu={(e) => e.preventDefault()}
        className={`text-[13px] font-bold tabular-nums w-[28px] h-[28px] flex items-center justify-center rounded-lg transition-all touch-manipulation select-none ${
          currentType !== 'normal'
            ? ''
            : set.completed ? 'text-[#3D8B5C] bg-[#3D8B5C]/10' : 'text-[#ACACAC]'
        }`}
        style={{
          backgroundColor: currentType !== 'normal' ? typeConfig.bg : undefined,
          WebkitTapHighlightColor: 'transparent',
          ...(currentType !== 'normal' ? { color: typeConfig.color } : {}),
        }}
      >
        {currentType !== 'normal' ? typeConfig.short : (index + 1)}
      </button>

      {/* Set type popup */}
      {showTypeMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setShowTypeMenu(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 bg-white rounded-xl shadow-lg border border-[#F0F0EE] overflow-hidden min-w-[140px]">
            {(Object.entries(SET_TYPE_CONFIG) as [SetType, typeof typeConfig][]).map(([type, cfg]) => (
              <button
                key={type}
                onClick={() => handleSetTypeChange(type)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-medium transition-colors touch-manipulation ${
                  currentType === type ? 'bg-[#F8F8F6]' : 'hover:bg-[#FAFAFA]'
                }`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <span
                  className="w-[8px] h-[8px] rounded-full flex-shrink-0"
                  style={{ backgroundColor: cfg.color }}
                />
                <span style={{ color: cfg.color }}>{cfg.label}</span>
                {currentType === type && <Check size={13} strokeWidth={2.5} className="ml-auto text-[#3D8B5C]" />}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Previous */}
      <span className="flex-1 text-[11px] text-[#C0C0C0] text-center truncate tabular-nums">
        {prevLabel}
      </span>

      {/* Weight input — plain like Hevy, auto-select on focus */}
      <input
        id={`weight-${exerciseId}-${index}`}
        type="text"
        inputMode="decimal"
        value={weight}
        onChange={(e) => handleWeightChange(e.target.value)}
        onFocus={(e) => e.target.select()}
        placeholder={prefilledWeight ? toDisplay(prefilledWeight) : '—'}
        disabled={set.completed}
        className={`w-[80px] flex-shrink-0 text-center text-[14px] font-medium tabular-nums py-2 rounded-lg border-none focus:outline-none transition-colors ${
          set.completed
            ? 'bg-transparent text-[#3D8B5C]'
            : 'bg-[#F8F8F6] text-[#1A1917] focus:bg-[#F0F0EE] placeholder-[#C0C0C0]'
        }`}
      />

      {/* Reps input — plain like Hevy, auto-select on focus */}
      <input
        id={`reps-${exerciseId}-${index}`}
        type="text"
        inputMode="numeric"
        value={reps}
        onChange={(e) => handleRepsChange(e.target.value)}
        onFocus={(e) => e.target.select()}
        placeholder={set.prescribed_reps?.toString() || '—'}
        disabled={set.completed}
        className={`w-[64px] flex-shrink-0 text-center text-[14px] font-medium tabular-nums py-2 rounded-lg border-none focus:outline-none transition-colors ${
          set.completed
            ? 'bg-transparent text-[#3D8B5C]'
            : 'bg-[#F8F8F6] text-[#1A1917] focus:bg-[#F0F0EE] placeholder-[#C0C0C0]'
        }`}
      />

      {/* Check button + inline PR badge */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {set.is_pr && (
          <span className="text-[9px] font-black text-[#D46A3A] uppercase tracking-[0.05em] bg-[#D46A3A]/10 px-1.5 py-0.5 rounded-md">
            PR
          </span>
        )}
        <button
          onClick={handleCompleteClick}
          className={`w-[40px] h-[40px] flex items-center justify-center rounded-full transition-all touch-manipulation ${
            set.completed
              ? 'bg-[#3D8B5C] text-white active:scale-90 shadow-sm shadow-[#3D8B5C]/25'
              : 'border-2 border-[#E0E0DE] text-[#D5D5D5] hover:border-[#ACACAC] hover:text-[#ACACAC] active:scale-90'
          }`}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <Check size={16} strokeWidth={set.completed ? 3 : 2} />
        </button>
      </div>
    </div>
  )
}

const SetRow = memo(SetRowComponent)
