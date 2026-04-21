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
      <div className="overflow-hidden rounded-xl relative" style={{ maxHeight: '50vh', background: 'rgba(253,253,254,0.08)' }}>
        {hasGif ? (
          <>
            {!imgLoaded && (
              <div className="aspect-[4/3] flex items-center justify-center">
                <div className="w-8 h-8 border-[1.5px] border-[rgba(253,253,254,0.35)] border-t-[#FDFDFE] rounded-full animate-spin" />
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
            <p className="text-[12px]" style={{ color: 'rgba(253,253,254,0.62)' }}>{exerciseData.target_muscle}</p>
          </div>
        )}
      </div>

      {/* Equipment + muscle labels */}
      <div className="flex items-center gap-2">
        {exerciseData.equipment && (
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg" style={{ color: '#FDFDFE', background: 'rgba(253,253,254,0.10)' }}>
            {exerciseData.equipment}
          </span>
        )}
        {exerciseData.target_muscle && (
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg" style={{ color: '#FDFDFE', background: 'rgba(253,253,254,0.10)' }}>
            {exerciseData.target_muscle}
          </span>
        )}
      </div>

      {/* Collapsible: Coach tips */}
      {exerciseData.coach_tips && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(253,253,254,0.10)', background: 'rgba(253,253,254,0.04)' }}>
          <button
            onClick={handleTipsToggle}
            className="w-full flex items-center justify-between p-3"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#FDFDFE' }}>Coach tips</p>
            <ChevronDown size={14} className={`transition-transform ${showTips ? 'rotate-180' : ''}`} style={{ color: 'rgba(253,253,254,0.62)' }} />
          </button>
          {showTips && (
            <div className="px-3 pb-3 -mt-1">
              <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(253,253,254,0.62)' }}>{exerciseData.coach_tips}</p>
            </div>
          )}
        </div>
      )}

      {/* Collapsible: Instructions */}
      {exerciseData.instructions && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(253,253,254,0.10)', background: 'rgba(253,253,254,0.04)' }}>
          <button
            onClick={handleInstructionsToggle}
            className="w-full flex items-center justify-between p-3"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#FDFDFE' }}>Uitvoering</p>
            <ChevronDown size={14} className={`transition-transform ${showInstructions ? 'rotate-180' : ''}`} style={{ color: 'rgba(253,253,254,0.62)' }} />
          </button>
          {showInstructions && (
            <div className="px-3 pb-3 -mt-1">
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(253,253,254,0.62)' }}>{exerciseData.instructions}</p>
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
      <div className="rounded-2xl p-6 text-center mb-4" style={{ background: 'rgba(253,253,254,0.06)' }}>
        <p className="text-[48px] font-bold tabular-nums tracking-tight leading-none" style={{ color: '#FDFDFE' }}>
          {hours > 0 && `${hours}:`}{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </p>

        {/* Stats row */}
        {elapsed > 0 && (
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-1.5">
              <Flame size={14} strokeWidth={1.5} style={{ color: '#2FA65A' }} />
              <span className="text-[13px] font-semibold" style={{ color: 'rgba(253,253,254,0.62)' }}>
                ~{estimatedCals} kcal
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={14} strokeWidth={1.5} style={{ color: '#2FA65A' }} />
              <span className="text-[13px] font-semibold" style={{ color: 'rgba(253,253,254,0.62)' }}>
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
            className="flex-1 flex items-center justify-center gap-2 py-4 text-black rounded-2xl font-semibold text-[14px] uppercase tracking-[0.06em] transition-colors active:scale-[0.98]"
            style={{ background: '#C0FC01' }}
          >
            <Play size={18} strokeWidth={2} fill="currentColor" />
            Start
          </button>
        ) : running ? (
          <button
            onClick={handlePause}
            className="flex-1 flex items-center justify-center gap-2 py-4 text-black rounded-2xl font-semibold text-[14px] uppercase tracking-[0.06em] transition-colors active:scale-[0.98]"
            style={{ background: '#C0FC01' }}
          >
            <Pause size={18} strokeWidth={2} />
            Pauze
          </button>
        ) : (
          <>
            <button
              onClick={handleResume}
              className="flex-1 flex items-center justify-center gap-2 py-4 text-black rounded-2xl font-semibold text-[14px] uppercase tracking-[0.06em] transition-colors active:scale-[0.98]"
              style={{ background: '#C0FC01' }}
            >
              <Play size={18} strokeWidth={2} fill="currentColor" />
              Hervat
            </button>
            <button
              onClick={handleReset}
              className="w-14 h-14 flex items-center justify-center rounded-2xl transition-colors"
              style={{ background: 'rgba(253,253,254,0.10)', color: 'rgba(253,253,254,0.78)' }}
            >
              <RotateCcw size={18} strokeWidth={1.5} />
            </button>
          </>
        )}

        {elapsed > 30 && (
          <button
            onClick={handleFinish}
            className="w-14 h-14 flex items-center justify-center rounded-2xl transition-colors"
            style={{ background: '#474B48', color: '#FDFDFE' }}
          >
            <Check size={18} strokeWidth={2.5} />
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
          <label className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-2 block" style={{ color: 'rgba(253,253,254,0.62)' }}>
            <Zap size={12} className="inline mr-1" style={{ color: '#2FA65A' }} />
            Werk (sec)
          </label>
          <div className="flex flex-wrap gap-2">
            {WORK_PRESETS.map(s => (
              <button
                key={s}
                onClick={() => setWorkSeconds(s)}
                className="px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
                style={{
                  background: workSeconds === s ? '#C0FC01' : 'rgba(253,253,254,0.10)',
                  color: workSeconds === s ? '#000' : '#FDFDFE',
                  border: workSeconds === s ? 'none' : '1px solid rgba(253,253,254,0.10)'
                }}
              >
                {s}s
              </button>
            ))}
          </div>
        </div>

        {/* Rest time */}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-2 block" style={{ color: 'rgba(253,253,254,0.62)' }}>
            <Pause size={12} className="inline mr-1" style={{ color: '#2FA65A' }} />
            Rust (sec)
          </label>
          <div className="flex flex-wrap gap-2">
            {REST_PRESETS.map(s => (
              <button
                key={s}
                onClick={() => setRestSeconds(s)}
                className="px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
                style={{
                  background: restSeconds === s ? '#C0FC01' : 'rgba(253,253,254,0.10)',
                  color: restSeconds === s ? '#000' : '#FDFDFE',
                  border: restSeconds === s ? 'none' : '1px solid rgba(253,253,254,0.10)'
                }}
              >
                {s}s
              </button>
            ))}
          </div>
        </div>

        {/* Rounds */}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-2 block" style={{ color: 'rgba(253,253,254,0.62)' }}>
            <RotateCcw size={12} className="inline mr-1" style={{ color: '#2FA65A' }} />
            Rondes
          </label>
          <div className="flex flex-wrap gap-2">
            {ROUND_PRESETS.map(r => (
              <button
                key={r}
                onClick={() => setTotalRounds(r)}
                className="px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
                style={{
                  background: totalRounds === r ? '#C0FC01' : 'rgba(253,253,254,0.10)',
                  color: totalRounds === r ? '#000' : '#FDFDFE',
                  border: totalRounds === r ? 'none' : '1px solid rgba(253,253,254,0.10)'
                }}
              >
                {r}×
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-xl px-4 py-3 text-center" style={{ background: 'rgba(253,253,254,0.06)' }}>
          <p className="text-[12px]" style={{ color: 'rgba(253,253,254,0.62)' }}>
            Totaal: <span className="font-semibold" style={{ color: '#FDFDFE' }}>{totalRounds} rondes</span> · {Math.round((totalRounds * (workSeconds + restSeconds)) / 60)} min
          </p>
        </div>

        <button
          onClick={handleStart}
          className="w-full flex items-center justify-center gap-2 py-4 text-black rounded-2xl font-semibold text-[14px] uppercase tracking-[0.06em] transition-colors active:scale-[0.98]"
          style={{ background: '#C0FC01' }}
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
        <div className="rounded-2xl p-6 text-center" style={{ background: 'rgba(192,252,1,0.10)', border: '1px solid rgba(192,252,1,0.20)' }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: '#C0FC01', color: '#000' }}>
            <Check size={20} strokeWidth={3} />
          </div>
          <p className="text-[18px] font-semibold" style={{ color: '#FDFDFE' }}>{totalRounds} rondes klaar!</p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <span className="text-[13px]" style={{ color: 'rgba(253,253,254,0.62)' }}>{doneMinutes} min</span>
            <span className="text-[13px]" style={{ color: 'rgba(253,253,254,0.62)' }}>~{doneCals} kcal</span>
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
      <div className="rounded-2xl p-6 text-center transition-colors duration-300" style={{ background: phase === 'work' ? 'rgba(192,252,1,0.08)' : 'rgba(253,253,254,0.06)' }}>
        {/* Phase label */}
        <p className="text-[12px] font-bold uppercase tracking-[0.12em] mb-1" style={{ color: phase === 'work' ? '#C0FC01' : 'rgba(253,253,254,0.62)' }}>
          {phase === 'work' ? 'WERK' : 'RUST'}
        </p>

        {/* Big timer */}
        <p className="text-[56px] font-bold tabular-nums tracking-tight leading-none" style={{ color: '#FDFDFE' }}>
          {displayMinutes > 0 && `${displayMinutes}:`}{String(displaySeconds).padStart(2, '0')}
        </p>

        {/* Progress bar */}
        <div className="h-[4px] rounded-full mt-4 overflow-hidden" style={{ background: 'rgba(253,253,254,0.10)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%`, background: '#C0FC01' }}
          />
        </div>

        {/* Round counter */}
        <p className="text-[13px] font-semibold mt-3" style={{ color: 'rgba(253,253,254,0.62)' }}>
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
          className="flex-1 py-3.5 rounded-xl font-semibold text-[13px] transition-colors"
          style={{ background: 'rgba(253,253,254,0.10)', color: 'rgba(253,253,254,0.78)' }}
        >
          Skip →
        </button>
        <button
          onClick={handleFinish}
          className="px-6 py-3.5 rounded-xl font-semibold text-[13px] transition-colors"
          style={{ background: '#474B48', color: '#FDFDFE' }}
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
  normal:  { label: 'Normaal',  short: '',  color: 'rgba(253,253,254,0.55)', bg: 'transparent' },
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

interface AddedExerciseData {
  tempId: string
  exercise_id: string
  name: string
  body_part?: string
  equipment?: string
  gif_url?: string | null
  sets: number
  reps_min: number
  reps_max: number
  rest_seconds: number
}

interface SavedWorkoutState {
  sessionId: string
  dayId: string
  programId: string
  sets: Record<string, SetData[]>
  savedAt: number
  exerciseNotes?: Record<string, string>
  exerciseOrder?: string[]
  cardioCompleted?: Record<string, number>
  addedExercises?: AddedExerciseData[]
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
    <div className="fixed inset-0 z-[80] flex items-end" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full h-[75vh] rounded-t-2xl flex flex-col animate-slide-up" style={{ background: '#474B48' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(253,253,254,0.10)' }}>
          <h3 className="text-[18px] font-semibold" style={{ color: '#FDFDFE' }}>
            {showCreateForm ? 'Nieuwe oefening' : 'Oefening toevoegen'}
          </h3>
          <button
            onClick={showCreateForm ? () => setShowCreateForm(false) : onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
            style={{ background: 'rgba(253,253,254,0.10)' }}
          >
            <X size={18} strokeWidth={1.5} style={{ color: 'rgba(253,253,254,0.62)' }} />
          </button>
        </div>

        {showCreateForm ? (
          /* ─── Create Custom Exercise Form ─── */
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Name */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-1.5 block" style={{ color: 'rgba(253,253,254,0.62)' }}>
                Naam oefening
              </label>
              <input
                type="text"
                value={newExercise.name_nl}
                onChange={(e) => setNewExercise(prev => ({ ...prev, name_nl: e.target.value }))}
                placeholder="bv. Bulgarian Split Squat"
                autoFocus
                className="w-full rounded-xl px-4 py-3 text-[14px] border focus:outline-none"
                style={{
                  background: 'rgba(253,253,254,0.10)',
                  color: '#FDFDFE',
                  borderColor: 'rgba(253,253,254,0.10)'
                }}
              />
            </div>

            {/* Body part */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-1.5 block" style={{ color: 'rgba(253,253,254,0.62)' }}>
                Lichaamsgroep
              </label>
              <div className="flex flex-wrap gap-2">
                {BODY_PART_OPTIONS.map((bp) => (
                  <button
                    key={bp}
                    onClick={() => setNewExercise(prev => ({ ...prev, body_part: bp }))}
                    className="px-3 py-2 rounded-lg text-[12px] font-medium transition-all"
                    style={{
                      background: newExercise.body_part === bp ? '#C0FC01' : 'rgba(253,253,254,0.10)',
                      color: newExercise.body_part === bp ? '#000' : '#FDFDFE',
                      border: newExercise.body_part === bp ? 'none' : '1px solid rgba(253,253,254,0.10)'
                    }}
                  >
                    {bp}
                  </button>
                ))}
              </div>
            </div>

            {/* Target muscle */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-1.5 block" style={{ color: 'rgba(253,253,254,0.62)' }}>
                Doelspier
              </label>
              <input
                type="text"
                value={newExercise.target_muscle}
                onChange={(e) => setNewExercise(prev => ({ ...prev, target_muscle: e.target.value }))}
                placeholder="bv. quadriceps, glutes"
                className="w-full rounded-xl px-4 py-3 text-[14px] border focus:outline-none focus:ring-2"
                style={{
                  background: 'rgba(253,253,254,0.10)',
                  color: '#FDFDFE',
                  borderColor: 'rgba(253,253,254,0.10)'
                }}
              />
            </div>

            {/* Equipment */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-1.5 block" style={{ color: 'rgba(253,253,254,0.62)' }}>
                Materiaal
              </label>
              <div className="flex flex-wrap gap-2">
                {EQUIPMENT_OPTIONS.map((eq) => (
                  <button
                    key={eq}
                    onClick={() => setNewExercise(prev => ({ ...prev, equipment: eq }))}
                    className="px-3 py-2 rounded-lg text-[12px] font-medium transition-all"
                    style={{
                      background: newExercise.equipment === eq ? '#C0FC01' : 'rgba(253,253,254,0.10)',
                      color: newExercise.equipment === eq ? '#000' : '#FDFDFE',
                      border: newExercise.equipment === eq ? 'none' : '1px solid rgba(253,253,254,0.10)'
                    }}
                  >
                    {eq}
                  </button>
                ))}
              </div>
            </div>

            {createError && (
              <div className="rounded-xl px-4 py-3" style={{ background: 'rgba(196,55,42,0.10)', border: '1px solid rgba(196,55,42,0.20)' }}>
                <p className="text-[13px]" style={{ color: '#B55A4A' }}>{createError}</p>
              </div>
            )}

            {/* Create button */}
            <button
              onClick={handleCreateExercise}
              disabled={creating}
              className="w-full font-semibold text-[13px] uppercase tracking-[0.08em] rounded-2xl py-4 transition-colors active:scale-[0.98] disabled:opacity-50 mt-2"
              style={{
                background: '#C0FC01',
                color: '#000'
              }}
            >
              {creating ? (
                <div className="w-5 h-5 border-2 border-[#C0FC01]/30 border-t-[#000] rounded-full animate-spin mx-auto" />
              ) : 'Oefening aanmaken & toevoegen'}
            </button>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="px-5 py-3">
              <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 focus-within:ring-2" style={{ background: 'rgba(253,253,254,0.10)' }}>
                <Search size={16} strokeWidth={1.5} style={{ color: 'rgba(253,253,254,0.62)' }} className="flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Zoek oefening..."
                  autoFocus
                  className="flex-1 bg-transparent text-[14px] border-none focus:outline-none"
                  style={{ color: '#FDFDFE' }}
                />
              </div>
            </div>

            {/* Exercise list */}
            <div className="flex-1 overflow-y-auto px-5 pb-8">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-[1.5px] rounded-full animate-spin" style={{ borderColor: 'rgba(253,253,254,0.20)', borderTopColor: '#FDFDFE' }} />
                </div>
              ) : filteredExercises.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 min-h-[200px] space-y-4">
                  <p className="text-[14px]" style={{ color: 'rgba(253,253,254,0.62)' }}>Geen oefeningen gevonden voor &ldquo;{searchQuery}&rdquo;</p>
                  <button
                    onClick={handleShowCreateForm}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-[13px] font-semibold transition-colors active:scale-[0.98]"
                    style={{ background: '#C0FC01', color: '#000' }}
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
                      className="w-full text-left px-4 py-3.5 rounded-xl transition-colors flex items-center gap-3"
                      style={{ background: 'rgba(253,253,254,0.06)', color: '#FDFDFE' }}
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden border" style={{ background: 'rgba(253,253,254,0.06)', borderColor: 'rgba(253,253,254,0.10)' }}>
                        {ex.gif_url ? (
                          <Image src={ex.gif_url} alt="" width={40} height={40} className="w-full h-full object-cover" unoptimized loading="lazy" style={{ filter: 'saturate(0.3)' }} />
                        ) : (
                          <span className="text-[10px] uppercase" style={{ color: 'rgba(253,253,254,0.44)' }}>{ex.target_muscle?.slice(0, 3)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium truncate" style={{ color: '#FDFDFE' }}>{ex.name_nl || ex.name}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: 'rgba(253,253,254,0.44)' }}>
                          {ex.target_muscle}{ex.equipment ? ` · ${ex.equipment}` : ''}
                        </p>
                      </div>
                      <Plus size={16} strokeWidth={2} style={{ color: '#C0FC01' }} className="flex-shrink-0" />
                    </button>
                  ))}

                  {/* Always-visible create button at bottom of list */}
                  <button
                    onClick={handleShowCreateForm}
                    className="w-full text-left px-4 py-3.5 rounded-xl transition-colors flex items-center gap-3 border border-dashed mt-3"
                    style={{ borderColor: 'rgba(253,253,254,0.10)' }}
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(253,253,254,0.06)' }}>
                      <Plus size={16} strokeWidth={2} style={{ color: '#C0FC01' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium" style={{ color: '#C0FC01' }}>Maak nieuwe oefening</p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'rgba(253,253,254,0.44)' }}>Staat je oefening er niet bij?</p>
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
    <div className="fixed inset-0 z-[70] flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full max-w-lg rounded-t-2xl p-6 animate-slide-up" style={{ background: '#474B48' }}>
        <h3 className="text-[18px] font-semibold mb-1" style={{ color: '#FDFDFE' }}>
          Form Check
        </h3>
        <p className="text-[13px] mb-5" style={{ color: 'rgba(253,253,254,0.62)' }}>
          Neem een video op van je {exerciseName} en stuur deze naar je coach voor feedback.
        </p>

        {sent ? (
          <div className="text-center py-6">
            <div className="text-[32px] mb-2">✅</div>
            <p className="text-[15px] font-semibold" style={{ color: '#FDFDFE' }}>Verstuurd naar je coach!</p>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optioneel: vraag of opmerking..."
              className="w-full px-4 py-3 rounded-xl text-[14px] mb-4 focus:outline-none border"
              style={{
                background: 'rgba(253,253,254,0.10)',
                color: '#FDFDFE',
                borderColor: 'rgba(253,253,254,0.10)'
              }}
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {uploadError && (
              <p className="text-[13px] mb-3 text-center" style={{ color: '#B55A4A' }}>{uploadError}</p>
            )}
            <button
              onClick={() => { setUploadError(''); fileInputRef.current?.click() }}
              disabled={uploading}
              className="w-full py-4 rounded-2xl font-bold text-[14px] uppercase tracking-[0.08em] flex items-center justify-center gap-2 disabled:opacity-50"
              style={{
                background: '#C0FC01',
                color: '#000'
              }}
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-[1.5px] rounded-full animate-spin" style={{ borderColor: 'rgba(0,0,0,0.20)', borderTopColor: '#000' }} />
                  Uploaden...
                </>
              ) : (
                '📹 Video opnemen'
              )}
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 mt-2 text-[14px] font-medium"
              style={{ color: 'rgba(253,253,254,0.62)' }}
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
        <div className="w-6 h-6 border-[1.5px] border-[rgba(253,253,254,0.35)] border-t-[#FDFDFE] rounded-full animate-spin" />
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
  // Reorder-mode: tap op de drag-dots → compact view (alleen titels), zodat
  // je in één scherm de volgorde kan wijzigen. Long-press blijft drag — het
  // verschil is enkel dat in reorderMode de cards ingeklapt zijn.
  const [reorderMode, setReorderMode] = useState(false)
  const [closeConfirm, setCloseConfirm] = useState(false)
  const [prCelebration, setPrCelebration] = useState<string | null>(null)
  const [workoutSeconds, setWorkoutSeconds] = useState(0)
  // Inline rest bars: key = "exerciseId-setIndex", value = rest seconds
  const [activeRestBars, setActiveRestBars] = useState<Record<string, number>>({})
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
  const cardioCompletedRef = useRef(cardioCompleted)
  useEffect(() => { setsRef.current = sets }, [sets])
  useEffect(() => { sessionRef.current = session }, [session])
  useEffect(() => { cardioCompletedRef.current = cardioCompleted }, [cardioCompleted])

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

  // (v6) Rest-timer countdown effect verwijderd — timer-UI is weg, dus geen tick-loop meer.

  // --- Auto-save (includes notes + exercise order + cardio + added exercises) ---
  useEffect(() => {
    if (!session || !dayId || !programId || Object.keys(sets).length === 0) return
    // Collect added exercises data so they can be fully restored
    const addedExercises: AddedExerciseData[] = exercises
      .filter(e => e.id.startsWith('added-'))
      .map(e => ({
        tempId: e.id,
        exercise_id: e.exercise_id,
        name: e.exercises?.name || '',
        body_part: e.exercises?.body_part,
        equipment: e.exercises?.equipment,
        gif_url: e.exercises?.gif_url,
        sets: e.sets,
        reps_min: e.reps_min,
        reps_max: e.reps_max,
        rest_seconds: e.rest_seconds,
      }))
    saveWorkoutState({
      sessionId: session.id, dayId, programId, sets, savedAt: Date.now(),
      exerciseNotes,
      exerciseOrder: exercises.map(e => e.id),
      cardioCompleted,
      addedExercises,
    })
  }, [sets, session, dayId, programId, exerciseNotes, exercises, cardioCompleted])

  useEffect(() => {
    const persist = () => {
      const s = sessionRef.current
      if (!s || !dayId || !programId) return
      saveWorkoutState({ sessionId: s.id, dayId, programId, sets: setsRef.current, savedAt: Date.now(), cardioCompleted: cardioCompletedRef.current })
    }
    const handleVisibility = () => { if (document.visibilityState === 'hidden') persist() }
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('beforeunload', persist)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('beforeunload', persist)
    }
  }, [dayId, programId])

  // --- Auto-save ALL sets to database (crash protection) ---
  const dbSaveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const lastDbSaveRef = useRef<string>('')
  const dbSavingRef = useRef(false)

  // Helper: collect all sets with data for DB save
  const collectSetsForDB = useCallback(() => {
    const result: Array<{
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
      if (!exerciseRef?.exercise_id) continue

      for (const s of exerciseSets) {
        // Save sets that have ANY data (weight or reps) — not just completed ones
        if (s.weight_kg == null && s.actual_reps == null) continue
        result.push({
          exercise_id: exerciseRef.exercise_id,
          set_number: s.set_number,
          prescribed_reps: s.prescribed_reps != null ? Math.round(Number(s.prescribed_reps) || 0) : null,
          actual_reps: s.actual_reps != null ? Math.round(Number(s.actual_reps) || 0) : null,
          weight_kg: s.weight_kg != null ? Math.min(Number(s.weight_kg) || 0, 9999.99) : null,
          is_warmup: s.is_warmup || false,
          completed: s.completed || false,
          is_pr: s.is_pr || false,
        })
      }
    }
    return result
  }, [sets, exercises])

  useEffect(() => {
    if (!session) return
    clearTimeout(dbSaveTimerRef.current)

    // Debounce: save to DB 3 seconds after last set change
    dbSaveTimerRef.current = setTimeout(async () => {
      // Mutex: don't auto-save if a save is already in progress (finish or prior auto-save)
      if (dbSavingRef.current || saving) return
      dbSavingRef.current = true

      try {
        const allSets = collectSetsForDB()

        // Only save if data changed
        const hash = JSON.stringify(allSets)
        if (hash === lastDbSaveRef.current || allSets.length === 0) return
        lastDbSaveRef.current = hash

        const res = await fetch('/api/workout-save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: session.id, sets: allSets }),
        })
        if (res.ok) {
          console.log('[auto-save] Saved', allSets.length, 'sets to DB')
        } else {
          console.warn('[auto-save] Server returned', res.status)
        }
      } catch (err) {
        console.warn('[auto-save] DB save failed (will retry):', err)
      } finally {
        dbSavingRef.current = false
      }
    }, 3000)

    return () => clearTimeout(dbSaveTimerRef.current)
  }, [sets, session, exercises, saving, collectSetsForDB])

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

        const res = await fetch(`/api/client-workout?dayId=${dayId}&programId=${programId}`)
        if (!res.ok) { router.push('/client/workout'); return }
        const apiData = await res.json()
        const exercisesData = apiData.exercises as ProgramTemplateExercise[]
        const apiLastWeights = apiData.lastWeights || {}
        const apiPreviousSets = apiData.previousSets || {}
        const apiExistingSession = apiData.existingSession || null
        const apiExistingSessionSets = apiData.existingSessionSets || []

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
          // Validate session against API-returned incomplete session (no extra round-trip)
          const matchingSession = apiExistingSession && apiExistingSession.id === saved.sessionId
            ? apiExistingSession
            : null
          if (matchingSession) {
            setSession({ id: matchingSession.id, started_at: matchingSession.started_at })
            setSets(saved.sets)
            // Restore notes
            if (saved.exerciseNotes) setExerciseNotes(saved.exerciseNotes)
            // Restore cardio progress
            if (saved.cardioCompleted) setCardioCompleted(saved.cardioCompleted)
            // Restore exercise order (including added exercises)
            if (saved.exerciseOrder && saved.exerciseOrder.length > 0) {
              // Rebuild added exercises from saved data
              const addedExMap = new Map<string, AddedExerciseData>()
              for (const ae of saved.addedExercises || []) {
                addedExMap.set(ae.tempId, ae)
              }

              const orderedExercises: ProgramTemplateExercise[] = []
              for (const id of saved.exerciseOrder) {
                // Try find in DB exercises
                const dbEx = exercisesData.find(e => e.id === id)
                if (dbEx) {
                  orderedExercises.push(dbEx)
                } else if (id.startsWith('added-') && addedExMap.has(id)) {
                  // Rebuild the added exercise from saved data
                  const ae = addedExMap.get(id)!
                  orderedExercises.push({
                    id: ae.tempId,
                    exercise_id: ae.exercise_id,
                    sets: ae.sets,
                    reps_min: ae.reps_min,
                    reps_max: ae.reps_max,
                    rest_seconds: ae.rest_seconds,
                    tempo: '',
                    rpe_target: 0,
                    weight_suggestion: 0,
                    notes: '',
                    exercises: {
                      id: ae.exercise_id,
                      name: ae.name,
                      name_nl: ae.name,
                      body_part: ae.body_part || '',
                      target_muscle: '',
                      equipment: ae.equipment || '',
                      gif_url: ae.gif_url || '',
                      video_url: null,
                      instructions: '',
                      coach_tips: '',
                    } as Exercise,
                  })
                }
              }
              // Add any new DB exercises not in saved order
              for (const ex of exercisesData) {
                if (!orderedExercises.find(o => o.id === ex.id)) orderedExercises.push(ex)
              }
              setExercises(orderedExercises)
            }
            return
          }
          clearWorkoutState()
        }

        // Use pre-fetched session from API (avoids extra client-side round-trips)
        if (apiExistingSession) {
          setSession({ id: apiExistingSession.id, started_at: apiExistingSession.started_at })
          const setsMap: Record<string, SetData[]> = {}
          for (const ex of exercisesData) {
            const setsList: SetData[] = []
            for (let i = 0; i < ex.sets; i++) {
              const dbSet = apiExistingSessionSets?.find((s: any) => s.exercise_id === ex.exercise_id && s.set_number === i + 1)
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

        const { data: newSession, error: insertErr } = await supabase
          .from('workout_sessions')
          .insert({ client_id: authUser.id, client_program_id: programId, template_day_id: dayId, started_at: new Date().toISOString() })
          .select().single()
        if (insertErr || !newSession) {
          // CRITICAL: zonder session.id kan completeSet() niets bewaren —
          // sets verdwijnen stil. Toon expliciet aan de user en log naar
          // bug_reports zodat coach het ziet.
          console.error('[workout/active] session INSERT failed', {
            insertErr,
            programId,
            dayId,
            clientId: authUser.id,
          })
          try {
            await supabase.from('bug_reports').insert({
              user_id: authUser.id,
              page_url: typeof window !== 'undefined' ? window.location.href : '/client/workout/active',
              description:
                '[auto] workout_sessions INSERT failed — ' +
                (insertErr?.message || 'no row') +
                ' | program=' + String(programId) +
                ' day=' + String(dayId) +
                (insertErr?.code ? ' code=' + insertErr.code : '') +
                (insertErr?.details ? ' details=' + insertErr.details : ''),
              viewport_width: typeof window !== 'undefined' ? window.innerWidth : null,
              viewport_height: typeof window !== 'undefined' ? window.innerHeight : null,
              user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
            })
          } catch { /* best effort */ }
          alert(
            'Workout kon niet gestart worden — neem contact op met je coach.\n\n' +
              'Reden: ' +
              (insertErr?.message || 'onbekend') +
              '\nDit is gelogd zodat je sets niet verloren gaan.',
          )
          router.push('/client')
          return
        }
        setSession(newSession as WorkoutSession)
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
      if (weight && weight > 0 && exerciseRef?.exercise_id) {
        try {
          const supabase = createClient()
          const { data: previousBest } = await supabase
            .from('workout_sets').select('weight_kg')
            .eq('exercise_id', exerciseRef.exercise_id).eq('completed', true).eq('is_warmup', false)
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

      // Inline rest bar: toon een 1px groene bar onder de afgevinkte set
      const restDuration = exerciseRef?.rest_seconds || 90
      const exSets = sets[exerciseId] || []
      const isLastSet = setIndex === exSets.length - 1
      // Alleen rest bar tonen als er nog sets na deze zijn
      if (!isLastSet) {
        const key = `${exerciseId}-${setIndex}`
        setActiveRestBars(prev => ({ ...prev, [key]: restDuration }))
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
  const deleteSet = (exerciseId: string, setIndex: number) => {
    setSets(prev => {
      const updated = [...(prev[exerciseId] || [])]
      if (setIndex >= 0 && setIndex < updated.length) {
        updated.splice(setIndex, 1)
      }
      return { ...prev, [exerciseId]: updated }
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
  // v6 fix: handle heeft nu touch-action: none (CSS .ex-drag) + 32×36 hitbox.
  // PointerSensor 5px distance ipv 8px voor snellere pickup.
  // TouchSensor 120ms delay ipv 200ms → directer gevoel; tolerance 8 voorkomt dat
  // micro-jitter tijdens de tap de drag cancelt.
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } })
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
    // Cancel any pending auto-save to prevent race condition
    clearTimeout(dbSaveTimerRef.current)
    dbSavingRef.current = true // Block any new auto-saves
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
      // CRITICAL: never use templateExId as exercise_id — it may be "added-..." which is not a valid UUID
      if (!exerciseRef?.exercise_id) {
        console.warn('[handleFinish] Skipping sets for unknown exercise:', templateExId)
        continue
      }
      const actualExerciseId = exerciseRef.exercise_id

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
      if (!exerciseRef?.exercise_id) {
        console.warn('[handleFinish] Skipping cardio for unknown exercise:', exerciseId)
        continue
      }
      const actualExerciseId = exerciseRef.exercise_id
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
      dbSavingRef.current = false // Allow auto-saves again on failure
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
    const addedExercises: AddedExerciseData[] = exercises
      .filter(e => e.id.startsWith('added-'))
      .map(e => ({
        tempId: e.id,
        exercise_id: e.exercise_id,
        name: e.exercises?.name || '',
        body_part: e.exercises?.body_part,
        equipment: e.exercises?.equipment,
        gif_url: e.exercises?.gif_url,
        sets: e.sets,
        reps_min: e.reps_min,
        reps_max: e.reps_max,
        rest_seconds: e.rest_seconds,
      }))
    saveWorkoutState({
      sessionId: session.id, dayId, programId, sets, savedAt: Date.now(),
      exerciseNotes, exerciseOrder: exercises.map(e => e.id), cardioCompleted, addedExercises,
    })
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
      <div className="fixed inset-0 z-50 flex flex-col overflow-hidden pt-safe" style={{ background: '#8E9890' }}>
        {/* Skeleton header */}
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid rgba(253,253,254,0.08)' }}>
          <div className="h-5 w-5 rounded animate-pulse" style={{ background: 'rgba(253,253,254,0.08)' }} />
          <div className="h-4 w-16 rounded animate-pulse" style={{ background: 'rgba(253,253,254,0.08)' }} />
          <div className="h-5 w-5 rounded animate-pulse" style={{ background: 'rgba(253,253,254,0.08)' }} />
        </div>
        {/* Skeleton exercise blocks */}
        <div className="flex-1 overflow-hidden px-5 pt-4 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl animate-pulse" style={{ background: 'rgba(253,253,254,0.08)' }} />
                <div>
                  <div className="h-4 w-32 rounded mb-1.5 animate-pulse" style={{ background: 'rgba(253,253,254,0.08)' }} />
                  <div className="h-3 w-20 rounded animate-pulse" style={{ background: 'rgba(253,253,254,0.08)' }} />
                </div>
              </div>
              {[1, 2, 3].map(j => (
                <div key={j} className="flex items-center gap-3 py-2.5">
                  <div className="h-6 w-6 rounded-full animate-pulse" style={{ background: 'rgba(253,253,254,0.08)' }} />
                  <div className="h-4 w-16 rounded animate-pulse" style={{ background: 'rgba(253,253,254,0.08)' }} />
                  <div className="h-4 w-16 rounded animate-pulse" style={{ background: 'rgba(253,253,254,0.08)' }} />
                  <div className="h-4 w-12 rounded animate-pulse" style={{ background: 'rgba(253,253,254,0.08)' }} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden pt-safe" style={{ background: '#8E9890' }}>
      {/* PR Celebration */}
      {prCelebration && (
        <>
          <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden">
            {Array.from({ length: 40 }).map((_, i) => {
              const left = Math.random() * 100
              const delay = Math.random() * 0.6
              const dur = 1.5 + Math.random() * 1
              const size = 6 + Math.random() * 6
              const colors = ['#C0FC01', '#A6ADA7', '#474B48', '#2FA65A', '#FDFDFE']
              return (
                <div key={i} style={{ position: 'absolute', left: `${left}%`, top: '-10px', width: `${size}px`, height: `${size * 0.6}px`, backgroundColor: colors[i % colors.length], borderRadius: '2px', transform: `rotate(${Math.random() * 360}deg)`, animation: `confettiFall ${dur}s ease-in ${delay}s forwards`, opacity: 0 }} />
              )
            })}
          </div>
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[61] animate-bounce-in">
            <div className="px-6 py-3 rounded-2xl flex items-center gap-3" style={{ background: '#C0FC01', color: '#000', border: '1px solid rgba(255,255,255,0.20)' }}>
              <span className="text-2xl">🏆</span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: 'rgba(0,0,0,0.60)' }}>Nieuw PR</p>
                <p className="text-[14px] font-semibold">{prCelebration}</p>
              </div>
            </div>
          </div>
          <style dangerouslySetInnerHTML={{ __html: `@keyframes confettiFall { 0% { opacity:1; transform:translateY(0) rotate(0deg); } 100% { opacity:0; transform:translateY(100vh) rotate(720deg); } }` }} />
        </>
      )}

      {/* Close confirmation — bottom sheet */}
      {closeConfirm && (
        <div className="fixed inset-0 z-[70] flex items-end" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="w-full p-6 rounded-t-2xl shadow-xl animate-slide-up" style={{ background: '#474B48' }}>
            <h3 className="text-[20px] font-semibold tracking-[-0.02em] mb-2" style={{ color: '#FDFDFE' }}>
              Training afsluiten?
            </h3>
            <p className="text-[14px] mb-6" style={{ color: 'rgba(253,253,254,0.62)' }}>Je voortgang wordt opgeslagen.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setCloseConfirm(false)}
                className="flex-1 py-3.5 rounded-xl font-semibold text-[14px] uppercase tracking-[0.06em] transition-colors"
                style={{ background: 'rgba(253,253,254,0.10)', color: '#FDFDFE' }}
              >
                Doorgaan
              </button>
              <button
                onClick={confirmClose}
                className="flex-1 py-3.5 rounded-xl font-semibold text-[14px] uppercase tracking-[0.06em] transition-colors"
                style={{ background: '#B55A4A', color: '#FDFDFE' }}
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
      {/* Safe-area wordt al gezet op de outer container via pt-safe — hier */}
      {/* enkel de visuele spacing, zodat er geen dubbele inset ontstaat.   */}
      <div style={{ padding: '10px 5% 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <button
          type="button"
          aria-label="Minimaliseer training en ga naar home"
          onClick={handleMinimize}
          style={{ fontFamily: 'var(--font-sans, Outfit), Outfit, sans-serif', fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em', color: '#FDFDFE', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
        >MŌVE</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #646B66, #4a4f4c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: '#FDFDFE' }}>G</div>
          <button className="ico-btn" aria-label="Minimize workout" onClick={handleMinimize} style={{ WebkitTapHighlightColor: 'transparent' }}>
            <svg viewBox="0 0 24 24"><line x1="6" y1="6" x2="18" y2="18" /><line x1="6" y1="18" x2="18" y2="6" /></svg>
          </button>
        </div>
      </div>

      {/* Page-head (sticky just below top, scrolls with content) */}
      <div className="page-head workout-head" style={{ padding: '4px 5% 18px', flexShrink: 0 }}>
        <div>
          <div className="page-title">{session?.started_at ? new Date(session.started_at).toLocaleDateString('nl-NL', { weekday: 'long' }).replace(/^\w/, c => c.toUpperCase()) : 'Training'}</div>
          <div className="page-sub">{formatTimer(workoutSeconds)}</div>
          <button onClick={toggleWeightUnit} style={{ marginTop: 6, fontSize: 11, fontWeight: 500, color: 'rgba(253,253,254,0.44)', background: 'transparent', border: 'none', padding: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {weightUnit}
          </button>
        </div>
        <button className="klaar-link" onClick={handleFinish} disabled={saving}>
          {saving ? 'Opslaan...' : 'Klaar'}
        </button>
      </div>

      {/* ═══ EXERCISE LIST ═══════════════════════════ */}
      <main className="flex-1 overflow-y-auto w-full" style={{ padding: '0 5% 120px' }}>
        {reorderMode && (
          // Sticky banner zodat je in reorderMode altijd "Klaar" kan klikken
          // terwijl je scrolt. position:sticky werkt in de overflow-container
          // van main — z-index boven de cards. Lime copy signaleert "modus aan".
          <div
            className="reorder-banner"
            role="region"
            aria-label="Herschik-modus actief"
          >
            <div className="reorder-banner-text">
              <div className="reorder-banner-title">Herschikken</div>
              <div className="reorder-banner-sub">Sleep oefeningen om de volgorde te wijzigen</div>
            </div>
            <button
              className="reorder-banner-done"
              onClick={() => setReorderMode(false)}
              type="button"
            >
              Klaar
            </button>
          </div>
        )}
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
          const ssColors = ['#C0FC01', '#2FA65A', '#4A7BD4', '#9B59B6']
          const ssColor = isSuperset ? ssColors[ssIndex % ssColors.length] : ''
          const isFirstInGroup = isSuperset && (exIndex === 0 || (exercises[exIndex - 1] as any).superset_group_id !== ssGroup)
          const isLastInGroup = isSuperset && (exIndex === exercises.length - 1 || (exercises[exIndex + 1] as any).superset_group_id !== ssGroup)

          return (
            <SortableExerciseItem key={ex.id} id={ex.id}>
            {({ listeners, attributes }) => (
            <div>
              {/* Superset group header */}
              {isFirstInGroup && (
                <div style={{ padding: '0 20px 4px', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C0FC01' }}>
                  SUPERSET
                </div>
              )}
              <div className={`ex${reorderMode ? ' compact' : ''}`} style={isSuperset ? { borderLeft: '3px solid #C0FC01', marginLeft: -3 } : {}}>
              {/* Exercise header */}
              <div className="ex-head">
                {/* Drag-region: zowel de 6-dots handle als de titel triggeren
                   reorder bij long-press (120ms). Verbeterde hitbox want enkel
                   de 32×36 dots was te klein op mobiel en slecht discoverable.
                   QUICK-TAP op de dots zelf → compact reorder-mode aan/uit. We
                   onderscheppen pointerdown op .ex-drag NIET met stopPropagation
                   want dnd-kit moet de drag-trigger nog kunnen meten — quick
                   tap (<120ms) fired alleen onClick, hold start drag. */}
                <div
                  className="ex-handle"
                  {...listeners}
                  {...attributes}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    flex: 1,
                    minWidth: 0,
                    cursor: 'grab',
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                  }}
                >
                  <div
                    className={`ex-drag${reorderMode ? ' active' : ''}`}
                    aria-label={reorderMode ? 'Sluit herschik-modus' : 'Open herschik-modus'}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      // Voorkom dat klik op dots ook andere card-acties triggert.
                      e.stopPropagation()
                      setReorderMode(prev => !prev)
                      setExpandedExercise(null)
                    }}
                  >
                    <span/><span/><span/><span/><span/><span/>
                  </div>
                  <div className="ex-title">{exerciseData.name_nl || exerciseData.name}</div>
                </div>
                {!reorderMode && (
                  <button className="ex-kebab" onClick={() => setExpandedExercise(isExpanded ? null : ex.id)} aria-label="Opties" style={{ WebkitTapHighlightColor: 'transparent' }}>
                    <span/>
                  </button>
                )}
              </div>

              {/* Expanded: large GIF + collapsible tips — verborgen in reorderMode */}
              {!reorderMode && isExpanded && (
                <ExerciseInfoPanel exerciseData={exerciseData} />
              )}

              {/* Cardio or Sets — verborgen in reorderMode (compact view) */}
              {!reorderMode && (exerciseData.category === 'cardio' ? (
                // ─── Cardio exercise: show timer ───
                cardioCompleted[ex.id] ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '14px 16px',
                      borderRadius: 16,
                      background: '#2FA65A',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14)',
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.20)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Check size={14} strokeWidth={3} style={{ color: '#FFFFFF' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF', margin: 0, letterSpacing: '-0.01em' }}>Klaar!</p>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.78)', margin: 0 }}>
                        {Math.floor(cardioCompleted[ex.id] / 60)} min {cardioCompleted[ex.id] % 60}s
                        {' · '}~{Math.round((cardioCompleted[ex.id] / 60) * 9)} kcal
                      </p>
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
                // ─── Strength exercise: v6 sets table ───
                <>
                  {/* Column header */}
                  <div className="sets-head">
                    <span className="th num">Set</span>
                    <span className="th">Vorige</span>
                    <span className="th">{weightUnit.toUpperCase()}</span>
                    <span className="th">Reps</span>
                    <span className="th check" aria-hidden />
                  </div>

                  {/* Rows */}
                  <div className="sets">
                    {exSets.map((set, idx) => {
                      const prevSet = prevSetsData.find(p => p.set_number === idx + 1)
                      const prevLabel = prevSet
                        ? `${displayWeight(prevSet.weight_kg) || 0}×${prevSet.actual_reps || 0}`
                        : (prefilledWeight && idx === 0 ? `${displayWeight(prefilledWeight)} ${weightUnit}` : '—')
                      return (
                        <div key={set.id}>
                          <SetRow
                            set={set}
                            index={idx}
                            prevLabel={prevLabel}
                            prefilledWeight={prefilledWeight}
                            prevSet={prevSet}
                            onComplete={(weight: number | null) => completeSet(ex.id, idx, weight)}
                            onDelete={(setIdx: number) => deleteSet(ex.id, setIdx)}
                            exerciseId={ex.id}
                            setSets={setSets}
                            exSets={exSets}
                            weightUnit={weightUnit}
                            displayWeight={displayWeight}
                            toKg={toKg}
                          />
                          {activeRestBars[`${ex.id}-${idx}`] && (
                            <InlineRestBar
                              durationSeconds={activeRestBars[`${ex.id}-${idx}`]}
                              onDismiss={() => setActiveRestBars(prev => {
                                const { [`${ex.id}-${idx}`]: _, ...rest } = prev
                                return rest
                              })}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Footer: +Set + rust */}
                  <button
                    className="ex-foot"
                    onClick={() => addSet(ex.id)}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <span className="ex-foot-l">
                      <svg viewBox="0 0 24 24">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Set toevoegen
                    </span>
                    <span className="ex-foot-r">
                      <svg viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="9" />
                        <polyline points="12 7 12 12 16 14" />
                      </svg>
                      {ex.rest_seconds || 90}s rust
                    </span>
                  </button>
                </>
              ))}
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
          <div
            style={{
              padding: '10px 16px',
              borderRadius: 12,
              background: 'rgba(214,96,80,0.18)',
              border: '1px solid rgba(214,96,80,0.32)',
              textAlign: 'center',
              marginBottom: 14,
            }}
          >
            <p style={{ color: '#FDFDFE', fontSize: 13, fontWeight: 500, margin: 0 }}>{saveError}</p>
          </div>
        )}

        {/* Subtle discard link — sticky bottom zit boven dit via .add-ex-wrap */}
        <div style={{ textAlign: 'center', paddingTop: 4, paddingBottom: 12 }}>
          <button
            onClick={() => setShowDiscardConfirm(true)}
            style={{
              padding: '8px 14px',
              background: 'transparent',
              border: 'none',
              color: 'rgba(253,253,254,0.44)',
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.02em',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Workout verwijderen
          </button>
        </div>
      </main>

      {/* Sticky bottom: Oefening toevoegen */}
      <div className="add-ex-wrap">
        <button
          className="add-ex"
          onClick={() => setShowExercisePicker(true)}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <svg viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Oefening toevoegen
        </button>
      </div>

      {/* Modals */}
      <>

        {/* Remove exercise confirmation */}
        {confirmRemoveExercise && (
          <div className="fixed inset-0 z-[70] flex items-end" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <div className="w-full p-6 rounded-t-2xl shadow-xl animate-slide-up" style={{ background: '#474B48' }}>
              <h3 className="text-[20px] font-semibold tracking-[-0.02em] mb-2" style={{ color: '#FDFDFE' }}>
                Oefening verwijderen?
              </h3>
              <p className="text-[14px] mb-6" style={{ color: 'rgba(253,253,254,0.62)' }}>
                {exercises.find(e => e.id === confirmRemoveExercise)?.exercises?.name_nl || 'Deze oefening'} wordt uit deze workout verwijderd.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmRemoveExercise(null)}
                  className="flex-1 py-3.5 rounded-xl font-semibold text-[14px] uppercase tracking-[0.06em] transition-colors"
                  style={{ background: 'rgba(253,253,254,0.10)', color: '#FDFDFE' }}
                >
                  Annuleer
                </button>
                <button
                  onClick={() => removeExercise(confirmRemoveExercise)}
                  className="flex-1 py-3.5 rounded-xl font-semibold text-[14px] uppercase tracking-[0.06em] transition-colors"
                  style={{ background: '#B55A4A', color: '#FDFDFE' }}
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
          <div className="fixed inset-0 z-[70] flex items-end" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <div className="w-full p-6 rounded-t-2xl shadow-xl animate-slide-up" style={{ background: '#474B48' }}>
              <h3 className="text-[20px] font-semibold tracking-[-0.02em] mb-2" style={{ color: '#FDFDFE' }}>
                Je hebt aanpassingen gemaakt
              </h3>
              <p className="text-[14px] mb-6" style={{ color: 'rgba(253,253,254,0.62)' }}>
                Wil je de wijzigingen opslaan in je programma, of alleen voor deze workout?
              </p>
              <div className="space-y-3">
                <button
                  onClick={saveChangesToTemplate}
                  disabled={savingToTemplate}
                  className="w-full py-3.5 rounded-xl font-semibold text-[14px] uppercase tracking-[0.06em] transition-colors disabled:opacity-50"
                  style={{ background: '#C0FC01', color: '#000' }}
                >
                  {savingToTemplate ? (
                    <div className="w-5 h-5 border-2 rounded-full animate-spin mx-auto" style={{ borderColor: 'rgba(0,0,0,0.20)', borderTopColor: '#000' }} />
                  ) : 'Opslaan in programma'}
                </button>
                <button
                  onClick={handleFinishOnlyThisTime}
                  className="w-full py-3.5 rounded-xl font-semibold text-[14px] uppercase tracking-[0.06em] transition-colors"
                  style={{ background: 'rgba(253,253,254,0.10)', color: '#FDFDFE' }}
                >
                  Alleen deze keer
                </button>
                <button
                  onClick={() => setShowSaveChangesModal(false)}
                  className="w-full py-2.5 text-[12px] font-medium transition-colors"
                  style={{ color: 'rgba(253,253,254,0.62)' }}
                >
                  Annuleer
                </button>
              </div>
            </div>
          </div>
        )}

        {showDiscardConfirm && (
          <div className="fixed inset-0 z-[70] flex items-end" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <div className="w-full p-6 rounded-t-2xl shadow-xl animate-slide-up" style={{ background: '#474B48' }}>
              <h3 className="text-[20px] font-semibold tracking-[-0.02em] mb-2" style={{ color: '#FDFDFE' }}>
                Workout verwijderen?
              </h3>
              <p className="text-[14px] mb-6" style={{ color: 'rgba(253,253,254,0.62)' }}>Alle voortgang wordt permanent verwijderd.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDiscardConfirm(false)}
                  className="flex-1 py-3.5 rounded-xl font-semibold text-[14px] uppercase tracking-[0.06em] transition-colors"
                  style={{ background: 'rgba(253,253,254,0.10)', color: '#FDFDFE' }}
                >
                  Annuleer
                </button>
                <button
                  onClick={discardWorkout}
                  className="flex-1 py-3.5 rounded-xl font-semibold text-[14px] uppercase tracking-[0.06em] transition-colors"
                  style={{ background: '#B55A4A', color: '#FDFDFE' }}
                >
                  Verwijderen
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    </div>
  )
}

// --- Inline rest bar — 1px green fill ---
function InlineRestBarComponent({ durationSeconds, onDismiss }: { durationSeconds: number; onDismiss: () => void }) {
  const [progress, setProgress] = useState(0)
  const [finished, setFinished] = useState(false)
  const dismissRef = useRef(onDismiss)
  dismissRef.current = onDismiss

  // Single stable effect — no deps that change on every render
  useEffect(() => {
    const start = Date.now()
    const ms = durationSeconds * 1000
    let raf: number

    const tick = () => {
      const pct = Math.min(1, (Date.now() - start) / ms)
      setProgress(pct)
      if (pct >= 1) {
        setFinished(true)
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(40)
        setTimeout(() => dismissRef.current(), 1200)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [durationSeconds])

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'relative',
        height: 3,
        marginTop: 6,
        borderRadius: 2,
        cursor: 'pointer',
        overflow: 'hidden',
        background: 'rgba(253,253,254,0.06)',
        opacity: finished ? 0 : 1,
        transition: 'opacity 500ms ease',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: `${progress * 100}%`,
          borderRadius: 2,
          background: '#C0FC01',
          boxShadow: finished ? '0 0 8px rgba(192,252,1,0.5)' : 'none',
        }}
      />
    </div>
  )
}

const InlineRestBar = memo(InlineRestBarComponent)

// --- Set row component ---
function SetRowComponent({
  set, index, prevLabel, prefilledWeight, prevSet, onComplete, exerciseId, setSets, exSets, onDelete,
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
  onDelete: (index: number) => void
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

  // --- Swipe-left-to-delete (v6) ---
  // Touch start vangt X + Y; als horizontaal verplaatsen duidelijk groter is dan
  // verticaal (vermijdt scroll-conflict), tonen we de rode delete-tray. Voorbij
  // threshold trigger onDelete. Snelle flick (velocity > 0.6 px/ms) ook accepteren.
  const rowShellRef = useRef<HTMLDivElement>(null)
  const touchStart = useRef<{ x: number; y: number; time: number; locked: 'h' | 'v' | null } | null>(null)
  const [swipeX, setSwipeX] = useState(0)
  const SWIPE_THRESHOLD = 84 // px na dewelke we verwijderen
  const SWIPE_MAX = 120 // px cap zodat je niet eindeloos sleept

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY, time: Date.now(), locked: null }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return
    const t = e.touches[0]
    const dx = t.clientX - touchStart.current.x
    const dy = t.clientY - touchStart.current.y
    // Lock gesture direction op basis van eerste significante beweging
    if (!touchStart.current.locked) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
      touchStart.current.locked = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
    }
    if (touchStart.current.locked !== 'h') return
    // Alleen naar links (dx < 0). Cap op SWIPE_MAX.
    const clamped = Math.max(-SWIPE_MAX, Math.min(0, dx))
    setSwipeX(clamped)
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (!touchStart.current) {
      setSwipeX(0)
      return
    }
    const dt = Math.max(1, Date.now() - touchStart.current.time)
    const velocity = Math.abs(swipeX) / dt // px/ms
    const flick = velocity > 0.6 && swipeX < -30
    if (swipeX <= -SWIPE_THRESHOLD || flick) {
      // haptic + delete
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15)
      setSwipeX(-SWIPE_MAX)
      setTimeout(() => onDelete(index), 120)
    } else {
      setSwipeX(0)
    }
    touchStart.current = null
  }, [swipeX, onDelete, index])

  const revealPct = Math.min(1, Math.abs(swipeX) / SWIPE_THRESHOLD)

  return (
    <div
      ref={rowShellRef}
      style={{ position: 'relative', overflow: 'hidden' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Delete tray onder de set-row — opacity 0 bij rust (alleen zichtbaar als je swipet).
          Volledig verborgen als er geen swipe is, zodat de tray niet permanent door de row heen lekt. */}
      {swipeX < 0 && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0, right: 0, bottom: 0,
            width: SWIPE_MAX,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `rgba(196,55,42,${Math.min(0.9, 0.25 + revealPct * 0.6)})`,
            opacity: revealPct,
            borderRadius: 8,
            pointerEvents: 'none',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FDFDFE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
          </svg>
        </div>
      )}
      <div
        className={`set-row ${set.completed ? 'checked' : ''}`}
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: swipeX === 0 ? 'transform 220ms cubic-bezier(0.16,1,0.3,1)' : undefined,
          position: 'relative',
          zIndex: 1,
        }}
      >
      {/* Set number — long press to change type */}
      <div className="c-num">
        <button
          onPointerDown={handleSetNumberPointerDown}
          onPointerUp={handleSetNumberPointerUp}
          onPointerLeave={handleSetNumberPointerUp}
          onContextMenu={(e) => e.preventDefault()}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {currentType !== 'normal' ? typeConfig.short : (index + 1)}
        </button>
      </div>

      {/* Set type popup */}
      {showTypeMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setShowTypeMenu(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 rounded-xl shadow-lg border overflow-hidden min-w-[140px]" style={{ background: '#474B48', borderColor: 'rgba(253,253,254,0.10)' }}>
            {(Object.entries(SET_TYPE_CONFIG) as [SetType, typeof typeConfig][]).map(([type, cfg]) => (
              <button
                key={type}
                onClick={() => handleSetTypeChange(type)}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] font-medium transition-colors touch-manipulation"
                style={{
                  background: currentType === type ? 'rgba(253,253,254,0.10)' : 'transparent',
                  color: '#FDFDFE',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                <span
                  className="w-[8px] h-[8px] rounded-full flex-shrink-0"
                  style={{ backgroundColor: cfg.color }}
                />
                <span>{cfg.label}</span>
                {currentType === type && <Check size={13} strokeWidth={2.5} className="ml-auto" style={{ color: '#C0FC01' }} />}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Previous + PR badge */}
      <div className="c-prev">
        {set.is_pr && (
          <span style={{background:'#C0FC01', color:'#000', padding:'1px 5px', borderRadius:4, fontSize:9, fontWeight:700, marginLeft:4}}>PR</span>
        )}
        {!set.is_pr && prevLabel}
      </div>

      {/* Weight input */}
      <input
        id={`weight-${exerciseId}-${index}`}
        type="text"
        inputMode="decimal"
        value={weight}
        onChange={(e) => handleWeightChange(e.target.value)}
        onFocus={(e) => e.target.select()}
        placeholder={prefilledWeight ? toDisplay(prefilledWeight) : '—'}
        disabled={set.completed}
        className="c-kg"
      />

      {/* Reps input */}
      <input
        id={`reps-${exerciseId}-${index}`}
        type="text"
        inputMode="numeric"
        value={reps}
        onChange={(e) => handleRepsChange(e.target.value)}
        onFocus={(e) => e.target.select()}
        placeholder={set.prescribed_reps?.toString() || '—'}
        disabled={set.completed}
        className="c-reps"
      />

      {/* Check button */}
      <div className="c-check">
        <button
          className="check-btn"
          onClick={handleCompleteClick}
          aria-label={set.completed ? 'Zet niet-voltooid' : 'Voltooi set'}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <svg viewBox="0 0 24 24"><polyline points="6 12 10 16 18 8"/></svg>
        </button>
      </div>
      </div>
    </div>
  )
}

const SetRow = memo(SetRowComponent)
