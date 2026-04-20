'use client'

import { useEffect, useState, useCallback, useRef, memo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  Play,
  Pause,
  Check,
  RotateCcw,
  Flame,
  Clock,
  Zap,
  Footprints,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface CardioExercise {
  id: string
  name: string
  name_nl: string
  body_part: string
  target_muscle: string
  equipment: string
}

type CardioMode = 'select' | 'steady' | 'interval' | 'done'

const WORK_PRESETS = [20, 30, 45, 60, 90]
const REST_PRESETS = [10, 15, 20, 30, 45, 60]
const ROUND_PRESETS = [4, 6, 8, 10, 12]

export default function CardioSessionPage() {
  const router = useRouter()
  const [mode, setMode] = useState<CardioMode>('select')
  const [exercises, setExercises] = useState<CardioExercise[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedExercise, setSelectedExercise] = useState<CardioExercise | null>(null)
  const [isInterval, setIsInterval] = useState(false)

  // Steady state timer
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [pausedAt, setPausedAt] = useState(0)

  // Interval timer
  const [workSeconds, setWorkSeconds] = useState(30)
  const [restSeconds, setRestSeconds] = useState(30)
  const [totalRounds, setTotalRounds] = useState(8)
  const [currentRound, setCurrentRound] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'work' | 'rest' | 'done'>('idle')
  const [timeLeft, setTimeLeft] = useState(0)
  const [endTime, setEndTime] = useState<number | null>(null)
  const [totalElapsed, setTotalElapsed] = useState(0)
  const startTimeRef = useRef<number>(0)

  // Saving
  const [saving, setSaving] = useState(false)

  // Load cardio exercises
  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('exercises')
        .select('id, name, name_nl, body_part, target_muscle, equipment')
        .eq('category', 'cardio')
        .eq('is_visible', true)
        .order('name_nl', { ascending: true })
      setExercises(data || [])
      setLoading(false)
    }
    load()
  }, [])

  // Steady state timer effect
  useEffect(() => {
    if (!running || !startTime) return
    const tick = () => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000) + pausedAt)
    }
    tick()
    const interval = setInterval(tick, 250)
    return () => clearInterval(interval)
  }, [running, startTime, pausedAt])

  // Interval timer effect
  useEffect(() => {
    if (phase === 'idle' || phase === 'done' || !endTime) return
    const tick = () => {
      const remaining = Math.ceil((endTime - Date.now()) / 1000)
      if (remaining <= 0) {
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

  const selectExercise = (ex: CardioExercise, interval: boolean) => {
    setSelectedExercise(ex)
    setIsInterval(interval)
    setMode(interval ? 'interval' : 'steady')
  }

  // Steady state controls
  const handleStart = () => { setStartTime(Date.now()); setRunning(true) }
  const handlePause = () => { setPausedAt(elapsed); setStartTime(null); setRunning(false) }
  const handleResume = () => { setStartTime(Date.now()); setRunning(true) }

  // Interval controls
  const handleIntervalStart = () => {
    startTimeRef.current = Date.now()
    setCurrentRound(1)
    setPhase('work')
    setTimeLeft(workSeconds)
    setEndTime(Date.now() + workSeconds * 1000)
  }

  // Save and finish
  const handleFinish = async (durationSec: number) => {
    if (!selectedExercise || saving) return
    setSaving(true)
    setMode('done')

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Create a standalone workout session for the cardio
      const { data: session } = await supabase
        .from('workout_sessions')
        .insert({
          client_id: user.id,
          started_at: new Date(Date.now() - durationSec * 1000).toISOString(),
          completed_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (session) {
        await supabase.from('workout_sets').insert({
          workout_session_id: session.id,
          exercise_id: selectedExercise.id,
          set_number: 1,
          actual_reps: durationSec,
          completed: true,
        })
      }
    } catch (err) {
      console.error('Error saving cardio session:', err)
    } finally {
      setSaving(false)
    }
  }

  const hours = Math.floor(elapsed / 3600)
  const minutes = Math.floor((elapsed % 3600) / 60)
  const seconds = elapsed % 60
  const estimatedCals = Math.round((elapsed / 60) * 9)

  // ─── Exercise selection ───
  if (mode === 'select') {
    return (
      <div className="min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-10 px-5 py-4 flex items-center gap-3 border-b border-[rgba(253,253,254,0.08)]">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[rgba(253,253,254,0.08)] transition-colors"
          >
            <ChevronLeft size={20} strokeWidth={1.5} className="text-[rgba(253,253,254,0.55)]" />
          </button>
          <h1 className="text-[18px] font-semibold text-[#FDFDFE] page-title">Cardio sessie</h1>
        </header>

        <main className="max-w-lg mx-auto px-5 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-[1.5px] border-[rgba(253,253,254,0.35)] border-t-[#FDFDFE] rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {exercises.map(ex => {
                const nameHasInterval = (ex.name_nl || ex.name || '').toLowerCase().includes('interval')
                return (
                  <div key={ex.id} className="bg-[rgba(253,253,254,0.08)] rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-4 p-4">
                      <div className="w-11 h-11 bg-[rgba(253,253,254,0.12)] rounded-xl flex items-center justify-center flex-shrink-0 border border-[rgba(253,253,254,0.08)]">
                        <Footprints size={18} strokeWidth={1.5} className="text-[#C0FC01]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-[#FDFDFE] truncate">{ex.name_nl || ex.name}</p>
                        <p className="text-[11px] text-[rgba(253,253,254,0.55)] mt-0.5">{ex.equipment}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 px-4 pb-4">
                      <button
                        onClick={() => selectExercise(ex, false)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#2FA65A] text-white rounded-xl font-semibold text-[12px] uppercase tracking-[0.06em] hover:bg-[#288F4D] transition-colors active:scale-[0.98]"
                      >
                        <Clock size={14} strokeWidth={2} />
                        Steady state
                      </button>
                      {(nameHasInterval || true) && (
                        <button
                          onClick={() => selectExercise(ex, true)}
                          className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#C0FC01] text-white rounded-xl font-semibold text-[12px] uppercase tracking-[0.06em] hover:bg-[#A8DD01] transition-colors active:scale-[0.98]"
                        >
                          <Zap size={14} strokeWidth={2} />
                          Interval
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>
    )
  }

  // ─── Steady state timer ───
  if (mode === 'steady') {
    return (
      <div className="min-h-screen">
        <header className="sticky top-0 z-10 px-5 py-4 flex items-center gap-3 border-b border-[rgba(253,253,254,0.08)]">
          <button
            onClick={() => { setRunning(false); setMode('select') }}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[rgba(253,253,254,0.08)] transition-colors"
          >
            <ChevronLeft size={20} strokeWidth={1.5} className="text-[rgba(253,253,254,0.55)]" />
          </button>
          <h1 className="text-[18px] font-semibold text-[#FDFDFE] page-title truncate">
            {selectedExercise?.name_nl || selectedExercise?.name}
          </h1>
        </header>

        <main className="max-w-lg mx-auto px-5 py-8 flex flex-col items-center">
          {/* Big timer */}
          <div className="w-full bg-[rgba(253,253,254,0.08)] rounded-3xl p-10 text-center mb-8">
            <p className="text-[64px] font-bold text-[#FDFDFE] tabular-nums tracking-tight leading-none">
              {hours > 0 && `${hours}:`}{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </p>
            {elapsed > 0 && (
              <div className="flex items-center justify-center gap-8 mt-6">
                <div className="flex items-center gap-2">
                  <Flame size={16} strokeWidth={1.5} className="text-[#C0FC01]" />
                  <span className="text-[15px] font-semibold text-[rgba(253,253,254,0.55)]">~{estimatedCals} kcal</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} strokeWidth={1.5} className="text-[#C0FC01]" />
                  <span className="text-[15px] font-semibold text-[rgba(253,253,254,0.55)]">{minutes} min</span>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="w-full flex items-center gap-3">
            {!running && elapsed === 0 ? (
              <button
                onClick={handleStart}
                className="flex-1 flex items-center justify-center gap-3 py-5 bg-[#2FA65A] text-white rounded-2xl font-bold text-[16px] uppercase tracking-[0.06em] hover:bg-[#288F4D] transition-colors active:scale-[0.98]"
              >
                <Play size={22} strokeWidth={2} fill="currentColor" />
                Start
              </button>
            ) : running ? (
              <button
                onClick={handlePause}
                className="flex-1 flex items-center justify-center gap-3 py-5 bg-[#E8B948] text-white rounded-2xl font-bold text-[16px] uppercase tracking-[0.06em] hover:bg-[#C9A03D] transition-colors active:scale-[0.98]"
              >
                <Pause size={22} strokeWidth={2} />
                Pauze
              </button>
            ) : (
              <>
                <button
                  onClick={handleResume}
                  className="flex-1 flex items-center justify-center gap-3 py-5 bg-[#2FA65A] text-white rounded-2xl font-bold text-[16px] uppercase tracking-[0.06em] hover:bg-[#288F4D] transition-colors active:scale-[0.98]"
                >
                  <Play size={22} strokeWidth={2} fill="currentColor" />
                  Hervat
                </button>
                <button
                  onClick={() => { setElapsed(0); setPausedAt(0); setStartTime(null) }}
                  className="w-16 h-16 flex items-center justify-center bg-[rgba(253,253,254,0.08)] rounded-2xl hover:bg-[rgba(253,253,254,0.14)] transition-colors"
                >
                  <RotateCcw size={20} strokeWidth={1.5} className="text-[rgba(253,253,254,0.55)]" />
                </button>
              </>
            )}
            {elapsed > 30 && (
              <button
                onClick={() => handleFinish(elapsed)}
                className="w-16 h-16 flex items-center justify-center bg-[#FDFDFE] rounded-2xl hover:bg-[#3A3E3B] transition-colors"
              >
                <Check size={22} strokeWidth={2.5} className="text-white" />
              </button>
            )}
          </div>
        </main>
      </div>
    )
  }

  // ─── Interval timer ───
  if (mode === 'interval') {
    const displayMin = Math.floor(timeLeft / 60)
    const displaySec = timeLeft % 60

    if (phase === 'idle') {
      return (
        <div className="min-h-screen">
          <header className="sticky top-0 z-10 px-5 py-4 flex items-center gap-3 border-b border-[rgba(253,253,254,0.08)]">
            <button
              onClick={() => setMode('select')}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[rgba(253,253,254,0.08)] transition-colors"
            >
              <ChevronLeft size={20} strokeWidth={1.5} className="text-[rgba(253,253,254,0.55)]" />
            </button>
            <h1 className="text-[18px] font-semibold text-[#FDFDFE] page-title truncate">
              {selectedExercise?.name_nl || selectedExercise?.name}
            </h1>
          </header>

          <main className="max-w-lg mx-auto px-5 py-6 space-y-6">
            {/* Work time */}
            <div>
              <label className="text-[11px] font-semibold text-[rgba(253,253,254,0.55)] uppercase tracking-[0.08em] mb-2.5 block">
                <Zap size={12} className="inline mr-1 text-[#2FA65A]" />
                Werk (seconden)
              </label>
              <div className="flex flex-wrap gap-2">
                {WORK_PRESETS.map(s => (
                  <button
                    key={s}
                    onClick={() => setWorkSeconds(s)}
                    className={`px-5 py-3 rounded-xl text-[14px] font-semibold transition-all ${
                      workSeconds === s ? 'bg-[#2FA65A] text-white' : 'bg-[rgba(253,253,254,0.08)] text-[rgba(253,253,254,0.55)] border border-[rgba(253,253,254,0.08)]'
                    }`}
                  >
                    {s}s
                  </button>
                ))}
              </div>
            </div>

            {/* Rest time */}
            <div>
              <label className="text-[11px] font-semibold text-[rgba(253,253,254,0.55)] uppercase tracking-[0.08em] mb-2.5 block">
                <Pause size={12} className="inline mr-1 text-[#E8B948]" />
                Rust (seconden)
              </label>
              <div className="flex flex-wrap gap-2">
                {REST_PRESETS.map(s => (
                  <button
                    key={s}
                    onClick={() => setRestSeconds(s)}
                    className={`px-5 py-3 rounded-xl text-[14px] font-semibold transition-all ${
                      restSeconds === s ? 'bg-[#E8B948] text-white' : 'bg-[rgba(253,253,254,0.08)] text-[rgba(253,253,254,0.55)] border border-[rgba(253,253,254,0.08)]'
                    }`}
                  >
                    {s}s
                  </button>
                ))}
              </div>
            </div>

            {/* Rounds */}
            <div>
              <label className="text-[11px] font-semibold text-[rgba(253,253,254,0.55)] uppercase tracking-[0.08em] mb-2.5 block">
                <RotateCcw size={12} className="inline mr-1 text-[#C0FC01]" />
                Rondes
              </label>
              <div className="flex flex-wrap gap-2">
                {ROUND_PRESETS.map(r => (
                  <button
                    key={r}
                    onClick={() => setTotalRounds(r)}
                    className={`px-5 py-3 rounded-xl text-[14px] font-semibold transition-all ${
                      totalRounds === r ? 'bg-[#C0FC01] text-white' : 'bg-[rgba(253,253,254,0.08)] text-[rgba(253,253,254,0.55)] border border-[rgba(253,253,254,0.08)]'
                    }`}
                  >
                    {r}×
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-[rgba(253,253,254,0.08)] rounded-xl px-5 py-4 text-center">
              <p className="text-[14px] text-[rgba(253,253,254,0.55)]">
                Totaal: <span className="font-bold text-[#FDFDFE]">{totalRounds} rondes</span> · ±{Math.round((totalRounds * (workSeconds + restSeconds)) / 60)} min
              </p>
            </div>

            <button
              onClick={handleIntervalStart}
              className="w-full flex items-center justify-center gap-3 py-5 bg-[#2FA65A] text-white rounded-2xl font-bold text-[16px] uppercase tracking-[0.06em] hover:bg-[#288F4D] transition-colors active:scale-[0.98]"
            >
              <Play size={22} strokeWidth={2} fill="currentColor" />
              Start interval timer
            </button>
          </main>
        </div>
      )
    }

    // Active interval or done
    if (phase === 'done') {
      const doneMinutes = Math.floor(totalElapsed / 60)
      const doneCals = Math.round((totalElapsed / 60) * 11)

      return (
        <div className="min-h-screen">
          <main className="max-w-lg mx-auto px-5 py-12 flex flex-col items-center">
            <div className="w-full bg-[rgba(47,166,90,0.10)] border border-[#2FA65A]/15 rounded-3xl p-10 text-center mb-8">
              <div className="w-16 h-16 bg-[#2FA65A] rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={28} strokeWidth={3} className="text-white" />
              </div>
              <p className="text-[24px] font-bold text-[#FDFDFE]">{totalRounds} rondes klaar!</p>
              <p className="text-[15px] font-medium text-[#FDFDFE] mt-1">{selectedExercise?.name_nl}</p>
              <div className="flex items-center justify-center gap-6 mt-4">
                <span className="text-[14px] font-semibold text-[rgba(253,253,254,0.55)]">{doneMinutes} min</span>
                <span className="text-[14px] font-semibold text-[rgba(253,253,254,0.55)]">~{doneCals} kcal</span>
              </div>
            </div>
            <button
              onClick={() => { handleFinish(totalElapsed); router.push('/client/workout') }}
              className="w-full py-5 bg-[#474B48] text-white rounded-2xl font-bold text-[15px] uppercase tracking-[0.06em] hover:bg-[#3A3E3B] transition-colors active:scale-[0.98]"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
              ) : 'Klaar'}
            </button>
          </main>
        </div>
      )
    }

    // Active work/rest
    const progressPct = phase === 'work'
      ? ((workSeconds - timeLeft) / workSeconds) * 100
      : ((restSeconds - timeLeft) / restSeconds) * 100

    return (
      <div className={`min-h-screen transition-colors duration-500 ${
        phase === 'work' ? 'bg-[rgba(47,166,90,0.14)]' : 'bg-[rgba(232,185,72,0.14)]'
      }`}>
        <main className="max-w-lg mx-auto px-5 py-12 flex flex-col items-center">
          {/* Phase label */}
          <p className={`text-[14px] font-black uppercase tracking-[0.2em] mb-2 ${
            phase === 'work' ? 'text-[#2FA65A]' : 'text-[#E8B948]'
          }`}>
            {phase === 'work' ? 'WERK' : 'RUST'}
          </p>

          {/* Big timer */}
          <p className="text-[80px] font-bold text-[#FDFDFE] tabular-nums tracking-tight leading-none mb-4">
            {displayMin > 0 && `${displayMin}:`}{String(displaySec).padStart(2, '0')}
          </p>

          {/* Progress bar */}
          <div className="w-full h-[6px] bg-[rgba(255,255,255,0.14)] rounded-full overflow-hidden mb-6">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                phase === 'work' ? 'bg-[#2FA65A]' : 'bg-[#E8B948]'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Round counter */}
          <p className="text-[16px] font-bold text-[rgba(253,253,254,0.55)] mb-2">
            Ronde {currentRound} / {totalRounds}
          </p>
          <p className="text-[14px] text-[rgba(253,253,254,0.48)] mb-10">
            {selectedExercise?.name_nl}
          </p>

          {/* Controls */}
          <div className="w-full flex items-center gap-3">
            <button
              onClick={() => {
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
              className="flex-1 py-4 bg-[rgba(253,253,254,0.08)] text-[rgba(253,253,254,0.55)] rounded-2xl font-semibold text-[14px] hover:bg-[rgba(253,253,254,0.08)] transition-colors"
            >
              Skip →
            </button>
            <button
              onClick={() => {
                setTotalElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
                setPhase('done')
              }}
              className="px-8 py-4 bg-[#474B48] text-white rounded-2xl font-semibold text-[14px] hover:bg-[#3A3E3B] transition-colors"
            >
              Stop
            </button>
          </div>
        </main>
      </div>
    )
  }

  // ─── Done screen (steady state) ───
  const doneMinutes = Math.floor(elapsed / 60)
  return (
    <div className="min-h-screen">
      <main className="max-w-lg mx-auto px-5 py-12 flex flex-col items-center">
        <div className="w-full bg-[rgba(47,166,90,0.10)] border border-[#2FA65A]/15 rounded-3xl p-10 text-center mb-8">
          <div className="w-16 h-16 bg-[#2FA65A] rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={28} strokeWidth={3} className="text-white" />
          </div>
          <p className="text-[24px] font-bold text-[#FDFDFE]">Cardio klaar!</p>
          <p className="text-[15px] font-medium text-[#FDFDFE] mt-1">{selectedExercise?.name_nl}</p>
          <div className="flex items-center justify-center gap-6 mt-4">
            <span className="text-[14px] font-semibold text-[rgba(253,253,254,0.55)]">{doneMinutes} min</span>
            <span className="text-[14px] font-semibold text-[rgba(253,253,254,0.55)]">~{estimatedCals} kcal</span>
          </div>
        </div>
        <button
          onClick={() => router.push('/client/workout')}
          className="w-full py-5 bg-[#474B48] text-white rounded-2xl font-bold text-[15px] uppercase tracking-[0.06em] hover:bg-[#3A3E3B] transition-colors active:scale-[0.98]"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
          ) : 'Klaar'}
        </button>
      </main>
    </div>
  )
}
