'use client'

import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  X,
  Check,
  Plus,
  Clock,
  Info,
  ChevronDown,
  Search,
} from 'lucide-react'
import { ExerciseMedia } from '@/components/ExerciseMedia'
import { notifyWorkoutBarChanged } from '@/components/workout/ActiveWorkoutBar'

// ─── Exercise Info Panel — large GIF + collapsible text ────

function ExerciseInfoPanel({ exerciseData }: { exerciseData: Exercise }) {
  const [showTips, setShowTips] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)

  const hasGif = exerciseData.gif_url && !imgError

  return (
    <div className="px-5 pb-3 space-y-3">
      {/* Large GIF display */}
      <div className="overflow-hidden bg-[#F5F2EC] rounded-xl relative" style={{ maxHeight: '50vh' }}>
        {hasGif ? (
          <>
            {!imgLoaded && (
              <div className="aspect-[4/3] flex items-center justify-center">
                <div className="w-8 h-8 border-[1.5px] border-[#DDD9D0] border-t-[#1A1917] rounded-full animate-spin" />
              </div>
            )}
            <img
              src={exerciseData.gif_url!}
              alt={exerciseData.name_nl || exerciseData.name}
              loading="eager"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
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
            <p className="text-[12px] text-[#CCC7BC]">{exerciseData.target_muscle}</p>
          </div>
        )}
      </div>

      {/* Equipment + muscle labels */}
      <div className="flex items-center gap-2">
        {exerciseData.equipment && (
          <span className="text-[11px] font-semibold text-[#6B6862] bg-[#F0EDE8] px-2.5 py-1 rounded-lg">
            {exerciseData.equipment}
          </span>
        )}
        {exerciseData.target_muscle && (
          <span className="text-[11px] font-semibold text-[#6B6862] bg-[#F0EDE8] px-2.5 py-1 rounded-lg">
            {exerciseData.target_muscle}
          </span>
        )}
      </div>

      {/* Collapsible: Coach tips */}
      {exerciseData.coach_tips && (
        <div className="border border-[#F0EDE8] rounded-xl overflow-hidden">
          <button
            onClick={() => setShowTips(!showTips)}
            className="w-full flex items-center justify-between p-3"
          >
            <p className="text-[11px] font-semibold text-[#A09D96] uppercase tracking-[0.08em]">Coach tips</p>
            <ChevronDown size={14} className={`text-[#A09D96] transition-transform ${showTips ? 'rotate-180' : ''}`} />
          </button>
          {showTips && (
            <div className="px-3 pb-3 -mt-1">
              <p className="text-[13px] text-[#6B6862] leading-relaxed">{exerciseData.coach_tips}</p>
            </div>
          )}
        </div>
      )}

      {/* Collapsible: Instructions */}
      {exerciseData.instructions && (
        <div className="border border-[#F0EDE8] rounded-xl overflow-hidden">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="w-full flex items-center justify-between p-3"
          >
            <p className="text-[11px] font-semibold text-[#A09D96] uppercase tracking-[0.08em]">Uitvoering</p>
            <ChevronDown size={14} className={`text-[#A09D96] transition-transform ${showInstructions ? 'rotate-180' : ''}`} />
          </button>
          {showInstructions && (
            <div className="px-3 pb-3 -mt-1">
              <p className="text-[13px] text-[#6B6862] leading-relaxed whitespace-pre-wrap">{exerciseData.instructions}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

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

// ─── Exercise Picker Modal ────────────────────────────────

function ExercisePickerModal({
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

  useEffect(() => {
    const loadExercises = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('exercises')
          .select('id, name, name_nl, body_part, target_muscle, equipment, gif_url, video_url, instructions, coach_tips')
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

  return (
    <div className="fixed inset-0 bg-black/30 z-[80] flex items-end">
      <div className="w-full max-h-[85vh] bg-[#EEEBE3] rounded-t-2xl flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E1D9]">
          <h3 className="text-[18px] font-semibold text-[#1A1917]" style={{ fontFamily: 'var(--font-display)' }}>
            Oefening toevoegen
          </h3>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#E5E1D9] transition-colors"
          >
            <X size={18} strokeWidth={1.5} className="text-[#6B6862]" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3">
          <div className="flex items-center gap-2 bg-white rounded-xl px-3.5 py-2.5 shadow-[var(--shadow-card)] focus-within:ring-2 focus-within:ring-[var(--color-pop)]/30">
            <Search size={16} strokeWidth={1.5} className="text-[#A09D96] flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Zoek oefening..."
              autoFocus
              className="flex-1 bg-transparent text-[14px] text-[#1A1917] placeholder-[#CCC7BC] border-none focus:outline-none"
            />
          </div>
        </div>

        {/* Exercise list */}
        <div className="flex-1 overflow-y-auto px-5 pb-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-[1.5px] border-[#DDD9D0] border-t-[#1A1917] rounded-full animate-spin" />
            </div>
          ) : filteredExercises.length === 0 ? (
            <p className="text-center text-[14px] text-[#A09D96] py-12">Geen oefeningen gevonden</p>
          ) : (
            <div className="space-y-1">
              {filteredExercises.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => onSelect(ex)}
                  className="w-full text-left px-4 py-3.5 rounded-xl hover:bg-white transition-colors flex items-center gap-3"
                >
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
                    {ex.gif_url ? (
                      <img src={ex.gif_url} alt="" className="w-full h-full object-cover" style={{ filter: 'saturate(0.3)' }} />
                    ) : (
                      <span className="text-[10px] text-[#A09D96] uppercase">{ex.target_muscle?.slice(0, 3)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-[#1A1917] truncate">{ex.name_nl || ex.name}</p>
                    <p className="text-[11px] text-[#A09D96] mt-0.5">
                      {ex.target_muscle}{ex.equipment ? ` · ${ex.equipment}` : ''}
                    </p>
                  </div>
                  <Plus size={16} strokeWidth={2} className="text-[var(--color-pop)] flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Wrapper ──────────────────────────────────────────

export default function ActiveWorkoutPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#EEEBE3] flex items-center justify-center">
        <div className="w-6 h-6 border-[1.5px] border-[#DDD9D0] border-t-[#1A1917] rounded-full animate-spin" />
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
  const [activeRestTimer, setActiveRestTimer] = useState<{ exerciseId: string; setIndex: number; seconds: number; total: number } | null>(null)
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>({})
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [showExercisePicker, setShowExercisePicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

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

  // --- Complete a set: PR check + rest timer (state is already updated by SetRow) ---
  const completeSet = useCallback(async (exerciseId: string, setIndex: number, weight: number | null) => {
    if (!session) return

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
        setActiveRestTimer({ exerciseId, setIndex, seconds: exerciseRef.rest_seconds, total: exerciseRef.rest_seconds })
      }
    } catch (error) { console.error('Error completing set:', error) }
  }, [session, exercises])

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

  const handleFinish = async () => {
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

        allSetsToSave.push({
          exercise_id: actualExerciseId,
          set_number: s.set_number,
          prescribed_reps: s.prescribed_reps,
          actual_reps: s.actual_reps,
          weight_kg: s.weight_kg,
          is_warmup: s.is_warmup,
          completed: true,
          is_pr: s.is_pr,
        })
      }
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

  // Compute totals
  const totalSets = Object.values(sets).flat().length
  const completedTotal = Object.values(sets).flat().filter(s => s.completed).length
  const allDone = totalSets > 0 && completedTotal === totalSets

  if (loading) {
    return (
      <div className="min-h-screen bg-[#EEEBE3] flex items-center justify-center">
        <div className="w-6 h-6 border-[1.5px] border-[#DDD9D0] border-t-[#1A1917] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-[#EEEBE3] z-50 overflow-y-auto pt-safe">
      {/* PR Celebration */}
      {prCelebration && (
        <>
          <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden">
            {Array.from({ length: 40 }).map((_, i) => {
              const left = Math.random() * 100
              const delay = Math.random() * 0.6
              const dur = 1.5 + Math.random() * 1
              const size = 6 + Math.random() * 6
              const colors = ['#D46A3A', '#1A1917', '#3D8B5C', '#FF3B30', '#007AFF', '#FFD700']
              return (
                <div key={i} style={{ position: 'absolute', left: `${left}%`, top: '-10px', width: `${size}px`, height: `${size * 0.6}px`, backgroundColor: colors[i % colors.length], borderRadius: '2px', transform: `rotate(${Math.random() * 360}deg)`, animation: `confettiFall ${dur}s ease-in ${delay}s forwards`, opacity: 0 }} />
              )
            })}
          </div>
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[61] animate-bounce-in">
            <div className="bg-[var(--color-pop)] text-white px-6 py-3 rounded-2xl flex items-center gap-3 shadow-lg">
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
          <div className="w-full bg-white p-6 rounded-t-2xl shadow-[var(--shadow-elevated)] animate-slide-up">
            <h3
              className="text-[20px] font-semibold text-[#1A1917] tracking-[-0.02em] mb-2"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Training afsluiten?
            </h3>
            <p className="text-[14px] text-[#A09D96] mb-6">Je voortgang wordt opgeslagen.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setCloseConfirm(false)}
                className="flex-1 bg-[#F5F2EC] text-[#1A1917] py-3.5 rounded-xl font-semibold text-[14px] uppercase tracking-[0.06em] transition-colors hover:bg-[#EEEBE3]"
              >
                Doorgaan
              </button>
              <button
                onClick={confirmClose}
                className="flex-1 bg-[#FF3B30] text-white py-3.5 rounded-xl font-semibold text-[14px] uppercase tracking-[0.06em] transition-colors hover:bg-[#E5352B]"
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

      {/* ═══ TOP BAR ═══════════════════════════════ */}
      <header className="sticky top-0 bg-[#EEEBE3]/95 backdrop-blur-xl z-40 border-b border-[#E5E1D9]">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={handleMinimize}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#E5E1D9] transition-colors touch-manipulation"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <X size={20} strokeWidth={1.5} className="text-[#6B6862]" />
          </button>

          <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl shadow-sm">
            <Clock size={14} strokeWidth={1.5} className="text-[var(--color-pop)]" />
            <span className="text-[15px] font-semibold text-[#1A1917] tabular-nums tracking-[-0.02em]">
              {formatTimer(workoutSeconds)}
            </span>
          </div>

          <button
            onClick={handleFinish}
            disabled={saving}
            className={`px-5 h-10 rounded-xl font-semibold text-[12px] uppercase tracking-[0.08em] transition-all ${
              saving
                ? 'bg-[#CCC7BC] text-[#A09D96] cursor-wait'
                : allDone
                  ? 'bg-[#34C759] text-white shadow-lg shadow-[#34C759]/30'
                  : 'bg-[#34C759] text-white shadow-md shadow-[#34C759]/20'
            }`}
          >
            {saving ? 'Opslaan...' : 'Klaar'}
          </button>
        </div>

        {/* Progress line */}
        <div className="h-[2px] bg-[#E5E1D9]">
          <div
            className="h-full bg-[var(--color-pop)] transition-all duration-500"
            style={{ width: `${totalSets > 0 ? (completedTotal / totalSets) * 100 : 0}%` }}
          />
        </div>
      </header>

      {/* ═══ EXERCISE LIST ═══════════════════════════ */}
      <main className="max-w-lg mx-auto px-4 py-6 pb-24 space-y-3">
        {exercises.map((ex) => {
          const exSets = sets[ex.id] || []
          const exDone = exSets.length > 0 && exSets.every(s => s.completed)
          const exCompleted = exSets.filter(s => s.completed).length
          const exerciseData = ex.exercises
          const isExpanded = expandedExercise === ex.id
          const prevSetsData = previousSets[ex.id] || []
          const prefilledWeight = lastWorkoutWeights[ex.id]

          return (
            <div
              key={ex.id}
              className={`rounded-2xl transition-all ${
                exDone
                  ? 'bg-white/60 shadow-sm'
                  : 'bg-white shadow-[var(--shadow-card)]'
              }`}
            >
              {/* Exercise header */}
              <div className="px-5 pt-4 pb-2">
                <div className="flex items-center justify-between mb-1">
                  <button
                    onClick={() => setExpandedExercise(isExpanded ? null : ex.id)}
                    className="flex items-center gap-2 flex-1 text-left touch-manipulation"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <h3
                      className={`text-[16px] font-semibold leading-tight tracking-[-0.01em] ${
                        exDone ? 'text-[#A09D96]' : 'text-[#1A1917]'
                      }`}
                    >
                      {exerciseData.name_nl || exerciseData.name}
                    </h3>
                    <Info size={13} strokeWidth={1.5} className="text-[#CCC7BC] flex-shrink-0" />
                  </button>
                  <span className={`text-[12px] font-medium tabular-nums ml-2 px-2 py-0.5 rounded-lg ${
                    exDone ? 'bg-[var(--color-pop-light)] text-[var(--color-pop)]' : 'text-[#A09D96]'
                  }`}>
                    {exCompleted}/{exSets.length}
                  </span>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-2 text-[11px] text-[#A09D96] uppercase tracking-[0.06em]">
                  <span>{ex.sets}×{ex.reps_min}{ex.reps_max !== ex.reps_min ? `-${ex.reps_max}` : ''}</span>
                  {ex.rest_seconds > 0 && <><span>·</span><span>{ex.rest_seconds}s rust</span></>}
                  {ex.tempo && <><span>·</span><span>{ex.tempo}</span></>}
                  {ex.rpe_target > 0 && <><span>·</span><span>RPE {ex.rpe_target}</span></>}
                </div>
              </div>

              {/* Expanded: large GIF + collapsible tips */}
              {isExpanded && (
                <ExerciseInfoPanel exerciseData={exerciseData} />
              )}

              {/* Notes */}
              <div className="px-5 pb-2">
                <input
                  type="text"
                  value={exerciseNotes[ex.id] || ''}
                  onChange={(e) => setExerciseNotes(prev => ({ ...prev, [ex.id]: e.target.value }))}
                  placeholder="Notities..."
                  className="w-full px-0 py-1 bg-transparent text-[12px] text-[#6B6862] placeholder-[#CCC7BC] border-none focus:outline-none"
                />
              </div>

              {/* Sets table */}
              <div className="px-5 pb-4">
                {/* Header */}
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-[10px] font-bold text-[#A09D96] uppercase tracking-[0.1em] w-[32px]">Set</span>
                  <span className="text-[10px] font-bold text-[#A09D96] uppercase tracking-[0.1em] flex-1 text-center">Vorige</span>
                  <span className="text-[10px] font-bold text-[#A09D96] uppercase tracking-[0.1em] w-[72px] text-center">KG</span>
                  <span className="text-[10px] font-bold text-[#A09D96] uppercase tracking-[0.1em] w-[64px] text-center">Reps</span>
                  <span className="w-[36px]" />
                </div>

                {/* Rows */}
                <div className="space-y-1">
                  {exSets.map((set, idx) => {
                    const prevSet = prevSetsData.find(p => p.set_number === idx + 1)
                    const prevLabel = prevSet
                      ? `${prevSet.weight_kg || 0}×${prevSet.actual_reps || 0}`
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
                          onComplete={(weight: number | null) => completeSet(ex.id, idx, weight)}
                          exerciseId={ex.id}
                          setSets={setSets}
                          exSets={exSets}
                        />
                        {/* Inline rest timer */}
                        {isRestActive && activeRestTimer && (
                          <div className="flex items-center gap-2 px-1 py-1.5">
                            <div className="flex-1 h-[3px] bg-[#E5E1D9] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[var(--color-pop)] rounded-full transition-all duration-1000 ease-linear"
                                style={{ width: `${((activeRestTimer.total - activeRestTimer.seconds) / activeRestTimer.total) * 100}%` }}
                              />
                            </div>
                            <button
                              onClick={() => setActiveRestTimer(null)}
                              className="text-[12px] font-semibold text-[var(--color-pop)] tabular-nums min-w-[44px] text-right"
                            >
                              {formatTimer(activeRestTimer.seconds)}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Add set */}
                <button
                  onClick={() => addSet(ex.id)}
                  className="w-full mt-3 py-2.5 flex items-center justify-center gap-1.5 text-[12px] font-semibold text-[#A09D96] uppercase tracking-[0.06em] rounded-xl hover:bg-[#F5F2EC] transition-colors touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <Plus size={13} strokeWidth={2} />
                  Set toevoegen
                </button>
              </div>
            </div>
          )
        })}

        {/* Save error message */}
        {saveError && (
          <div className="w-full px-4 py-3 bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-xl text-center">
            <p className="text-[#FF3B30] text-[13px] font-medium">{saveError}</p>
          </div>
        )}

        {/* Finish CTA */}
        {allDone && (
          <button
            onClick={handleFinish}
            disabled={saving}
            className={`w-full py-4 rounded-2xl font-bold text-[14px] uppercase tracking-[0.08em] flex items-center justify-center gap-2 transition-all ${
              saving
                ? 'bg-[#CCC7BC] text-[#A09D96] cursor-wait'
                : 'bg-[#34C759] text-white shadow-lg shadow-[#34C759]/30 hover:shadow-[#34C759]/40'
            }`}
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
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
        <div className="mt-2 space-y-2">
          <button
            onClick={() => setShowExercisePicker(true)}
            className="w-full py-3.5 bg-white text-[#1A1917] rounded-xl font-semibold text-[13px] uppercase tracking-[0.06em] flex items-center justify-center gap-2 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-all"
          >
            <Plus size={14} strokeWidth={2} />
            Oefening toevoegen
          </button>

          <button
            onClick={() => setShowDiscardConfirm(true)}
            className="w-full py-3 rounded-xl text-[#FF3B30] text-[13px] font-medium hover:bg-[#FF3B30]/5 transition-colors"
          >
            Workout verwijderen
          </button>
        </div>

        {/* Discard confirmation */}
        {showDiscardConfirm && (
          <div className="fixed inset-0 bg-black/30 z-[70] flex items-end">
            <div className="w-full bg-white p-6 rounded-t-2xl shadow-[var(--shadow-elevated)] animate-slide-up">
              <h3
                className="text-[20px] font-semibold text-[#1A1917] tracking-[-0.02em] mb-2"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Workout verwijderen?
              </h3>
              <p className="text-[14px] text-[#A09D96] mb-6">Alle voortgang wordt permanent verwijderd.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDiscardConfirm(false)}
                  className="flex-1 bg-[#F5F2EC] text-[#1A1917] py-3.5 rounded-xl font-semibold text-[14px] uppercase tracking-[0.06em] hover:bg-[#EEEBE3] transition-colors"
                >
                  Annuleer
                </button>
                <button
                  onClick={discardWorkout}
                  className="flex-1 bg-[#FF3B30] text-white py-3.5 rounded-xl font-semibold text-[14px] uppercase tracking-[0.06em] hover:bg-[#E5352B] transition-colors"
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
function SetRow({
  set, index, prevLabel, prefilledWeight, prevSet, onComplete, exerciseId, setSets, exSets,
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
}) {
  const defaultWeight = set.weight_kg?.toString() || prefilledWeight?.toString() || ''
  const [weight, setWeight] = useState(defaultWeight)
  const [reps, setReps] = useState(set.actual_reps?.toString() || set.prescribed_reps?.toString() || '')

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
    if (set.completed) {
      // Uncheck: toggle back to incomplete
      const updatedSets = [...exSets]
      updatedSets[index] = { ...set, completed: false, is_pr: false }
      setSets((prev: Record<string, SetData[]>) => ({ ...prev, [exerciseId]: updatedSets }))
      return
    }
    const finalWeight = weight ? parseFloat(weight) : null
    const finalReps = reps ? parseInt(reps) : set.prescribed_reps
    const updatedSets = [...exSets]
    updatedSets[index] = { ...set, weight_kg: finalWeight, actual_reps: finalReps, completed: true }
    if (finalWeight && index + 1 < updatedSets.length && !updatedSets[index + 1].completed && !updatedSets[index + 1].weight_kg) {
      updatedSets[index + 1] = { ...updatedSets[index + 1], weight_kg: finalWeight }
    }
    setSets((prev: Record<string, SetData[]>) => ({ ...prev, [exerciseId]: updatedSets }))
    onComplete(finalWeight)
  }

  return (
    <div className={`flex items-center gap-2 px-1 py-1.5 transition-all ${set.completed ? 'opacity-40' : ''}`}>
      {/* Set number */}
      <span className={`text-[13px] font-bold tabular-nums w-[32px] ${
        set.completed ? 'text-[#1A1917]' : 'text-[#A09D96]'
      }`}>
        {index + 1}
      </span>

      {/* Previous */}
      <span className="flex-1 text-[12px] text-[#CCC7BC] text-center truncate tabular-nums">
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
        className="w-[72px] px-2 py-2.5 bg-[#F5F2EC] border border-[#E5E1D9] rounded-lg text-[14px] text-center font-semibold text-[#1A1917] tabular-nums disabled:opacity-40 focus:border-[var(--color-pop)] focus:outline-none transition-all placeholder:text-[#CCC7BC] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
        className="w-[64px] px-2 py-2.5 bg-[#F5F2EC] border border-[#E5E1D9] rounded-lg text-[14px] text-center font-semibold text-[#1A1917] tabular-nums disabled:opacity-40 focus:border-[var(--color-pop)] focus:outline-none transition-all placeholder:text-[#CCC7BC] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />

      {/* Check button — tap again to undo */}
      <button
        onClick={handleCompleteClick}
        className={`w-[36px] h-[36px] flex items-center justify-center flex-shrink-0 rounded-lg transition-all touch-manipulation ${
          set.completed
            ? 'bg-[var(--color-pop)] text-white active:scale-95'
            : 'bg-[#F5F2EC] text-[#CCC7BC] hover:bg-[#E5E1D9] active:scale-95'
        }`}
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <Check size={14} strokeWidth={set.completed ? 3 : 2} />
      </button>
    </div>
  )
}
