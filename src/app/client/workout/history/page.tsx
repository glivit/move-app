'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ChevronLeft, ChevronRight, TrendingUp, Dumbbell, Flame, Trophy, BarChart3, Target, RotateCcw } from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────

interface WorkoutSet {
  exercise_id: string
  weight_kg: number | null
  actual_reps: number | null
  is_pr: boolean
  exercises?: { id: string; name: string; name_nl: string } | null
}

interface WorkoutSession {
  id: string
  started_at: string
  completed_at: string | null
  duration_seconds: number | null
  mood_rating: number | null
  notes: string | null
  template_day_id: string | null
  program_id: string | null
  workout_sets?: WorkoutSet[]
  program_template_days?: { name: string } | { name: string }[]
}

interface CalendarDay {
  date: number
  isToday: boolean
  hasWorkout: boolean
  workoutCount: number
  volume: number
  workoutId?: string
  month: number
  year: number
  fullDate: string
}

interface ExerciseHistory {
  name: string
  exerciseId: string
  sessions: Array<{
    date: string
    bestWeight: number
    bestReps: number
    bestVolume: number
    estimated1RM: number
    sets: Array<{ weight: number; reps: number }>
  }>
}

// ─── Epley 1RM formula ──────────────────────

function estimate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30) * 10) / 10
}

// ─── Mini sparkline SVG ──────────────────────

function Sparkline({ data, color = '#C0FC01', height = 40, width = 120 }: { data: number[]; color?: string; height?: number; width?: number }) {
  if (data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const padding = 2

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2)
    const y = height - padding - ((val - min) / range) * (height - padding * 2)
    return `${x},${y}`
  }).join(' ')

  const lastX = padding + ((data.length - 1) / (data.length - 1)) * (width - padding * 2)
  const lastY = height - padding - ((data[data.length - 1] - min) / range) * (height - padding * 2)

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="3" fill={color} />
    </svg>
  )
}

// ─── Heatmap intensity — v6 lime-stacked progression ──────

function getHeatmapColor(volume: number, maxVolume: number): string {
  if (volume <= 0) return 'transparent'
  const intensity = Math.min(volume / (maxVolume || 1), 1)
  if (intensity < 0.25) return 'rgba(192,252,1,0.14)'
  if (intensity < 0.5) return 'rgba(192,252,1,0.32)'
  if (intensity < 0.75) return 'rgba(192,252,1,0.56)'
  return '#C0FC01'
}

const MOOD_LABELS: Record<number, string> = { 1: '😮‍💨', 2: '😐', 3: '🙂', 4: '💪', 5: '🔥' }

// ─── Component ──────────────────────────────────────────────

export default function WorkoutHistoryPage() {
  const router = useRouter()
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'history' | 'progress'>('history')
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) return

        const { data: sessionsData } = await supabase
          .from('workout_sessions')
          .select('*, workout_sets(*, exercises(id, name, name_nl)), program_template_days(name), template_day_id, program_id')
          .eq('client_id', authUser.id)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(200)

        if (sessionsData) setWorkouts(sessionsData as WorkoutSession[])
      } catch (error) {
        console.error('Error loading workouts:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // ── Aggregate stats ──
  const stats = useMemo(() => {
    const totalWorkouts = workouts.length
    const totalDuration = workouts.reduce((s, w) => s + (w.duration_seconds || 0), 0)
    const totalVolume = workouts.reduce((s, w) => {
      const sets = w.workout_sets || []
      return s + sets.reduce((vs, set) => vs + (set.weight_kg || 0) * (set.actual_reps || 0), 0)
    }, 0)
    const totalPRs = workouts.reduce((s, w) => {
      return s + (w.workout_sets || []).filter(set => set.is_pr).length
    }, 0)

    // Streak calculation
    const workoutDates = workouts
      .filter(w => w.completed_at)
      .map(w => new Date(w.completed_at!).toISOString().split('T')[0])
      .sort((a, b) => b.localeCompare(a))
    const uniqueDates = [...new Set(workoutDates)]

    let streak = 0
    const today = new Date()
    for (let i = 0; i < 60; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(checkDate.getDate() - i)
      const dateStr = checkDate.toISOString().split('T')[0]
      // Check if there's a workout in this week (weekly streak)
      const weekStart = new Date(checkDate)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1) // Monday
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      const hasWorkoutThisWeek = uniqueDates.some(d => d >= weekStart.toISOString().split('T')[0] && d <= weekEnd.toISOString().split('T')[0])
      if (hasWorkoutThisWeek && i % 7 === 0) {
        streak++
      } else if (i % 7 === 0 && i > 0) {
        break
      }
    }

    return { totalWorkouts, totalDuration, totalVolume, totalPRs, streak }
  }, [workouts])

  // ── Calendar data with heatmap ──
  const { calendarDays, maxDayVolume } = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    // Start from Monday
    const dayOfWeek = firstDay.getDay()
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - ((dayOfWeek + 6) % 7))

    const days: CalendarDay[] = []
    const today = new Date()
    let current = new Date(startDate)
    let maxVol = 0

    // Build workout lookup by date
    const workoutsByDate: Record<string, WorkoutSession[]> = {}
    for (const w of workouts) {
      if (!w.completed_at) continue
      const d = new Date(w.completed_at).toISOString().split('T')[0]
      if (!workoutsByDate[d]) workoutsByDate[d] = []
      workoutsByDate[d].push(w)
    }

    while (current.getMonth() <= month && current.getFullYear() <= year || days.length % 7 !== 0) {
      if (days.length >= 42) break // Max 6 weeks
      const dateStr = current.toISOString().split('T')[0]
      const dayWorkouts = workoutsByDate[dateStr] || []
      const dayVolume = dayWorkouts.reduce((s, w) => {
        return s + (w.workout_sets || []).reduce((vs, set) => vs + (set.weight_kg || 0) * (set.actual_reps || 0), 0)
      }, 0)
      if (dayVolume > maxVol) maxVol = dayVolume

      const isToday = dateStr === today.toISOString().split('T')[0]

      days.push({
        date: current.getDate(),
        isToday,
        hasWorkout: dayWorkouts.length > 0,
        workoutCount: dayWorkouts.length,
        volume: dayVolume,
        workoutId: dayWorkouts[0]?.id,
        month: current.getMonth(),
        year: current.getFullYear(),
        fullDate: dateStr,
      })
      current.setDate(current.getDate() + 1)
    }
    return { calendarDays: days, maxDayVolume: maxVol }
  }, [currentMonth, workouts])

  // ── Per-exercise history ──
  const exerciseHistories = useMemo((): ExerciseHistory[] => {
    const exerciseMap: Record<string, ExerciseHistory> = {}

    // Process workouts from oldest to newest for proper ordering
    const sortedWorkouts = [...workouts].sort((a, b) =>
      (a.completed_at || '').localeCompare(b.completed_at || '')
    )

    for (const w of sortedWorkouts) {
      if (!w.completed_at) continue
      const date = new Date(w.completed_at).toISOString().split('T')[0]

      for (const set of w.workout_sets || []) {
        if (!set.exercise_id || !set.weight_kg) continue
        const exId = set.exercise_id
        const name = set.exercises?.name_nl || set.exercises?.name || 'Oefening'

        if (!exerciseMap[exId]) {
          exerciseMap[exId] = { name, exerciseId: exId, sessions: [] }
        }

        let session = exerciseMap[exId].sessions.find(s => s.date === date)
        if (!session) {
          session = { date, bestWeight: 0, bestReps: 0, bestVolume: 0, estimated1RM: 0, sets: [] }
          exerciseMap[exId].sessions.push(session)
        }

        const weight = set.weight_kg || 0
        const reps = set.actual_reps || 0
        session.sets.push({ weight, reps })

        if (weight > session.bestWeight) {
          session.bestWeight = weight
          session.bestReps = reps
        }
        const vol = weight * reps
        if (vol > session.bestVolume) session.bestVolume = vol

        const rm = estimate1RM(weight, reps)
        if (rm > session.estimated1RM) session.estimated1RM = rm
      }
    }

    return Object.values(exerciseMap)
      .filter(e => e.sessions.length >= 2) // Only show if enough data
      .sort((a, b) => b.sessions.length - a.sessions.length) // Most trained first
  }, [workouts])

  // ── Volume over time (weekly) ──
  const weeklyVolume = useMemo(() => {
    const weeks: Record<string, number> = {}
    for (const w of workouts) {
      if (!w.completed_at) continue
      const d = new Date(w.completed_at)
      const weekStart = new Date(d)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
      const key = weekStart.toISOString().split('T')[0]
      const vol = (w.workout_sets || []).reduce((s, set) => s + (set.weight_kg || 0) * (set.actual_reps || 0), 0)
      weeks[key] = (weeks[key] || 0) + vol
    }
    return Object.entries(weeks)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12) // Last 12 weeks
      .map(([week, vol]) => ({ week, volume: vol }))
  }, [workouts])

  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  const monthName = currentMonth.toLocaleDateString('nl-BE', { month: 'long', year: 'numeric' })
  const recentWorkouts = workouts.slice(0, 15)

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '—'
    return `${Math.floor(seconds / 60)} min`
  }

  const calculateVolume = (sets: any[] | undefined | null) => {
    if (!sets || sets.length === 0) return 0
    return sets.reduce((sum: number, set: any) => sum + (set.weight_kg || 0) * (set.actual_reps || 0), 0)
  }

  const selectedExHistory = selectedExercise ? exerciseHistories.find(e => e.exerciseId === selectedExercise) : null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[rgba(253,253,254,0.48)] border-t-[#FDFDFE]" />
      </div>
    )
  }

  return (
    <div className="pb-28">

      {/* ── Back + Header ── */}
      <button
        onClick={() => window.history.back()}
        className="flex items-center gap-1.5 mb-7 mt-2 group min-h-[44px] touch-manipulation"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <ChevronLeft strokeWidth={1.5} className="w-[18px] h-[18px] text-[rgba(28,30,24,0.60)] group-hover:text-[#1C1E18] transition-colors" />
        <span className="text-[14px] text-[rgba(28,30,24,0.60)] group-hover:text-[#1C1E18] transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
          Training
        </span>
      </button>

      <h1 className="page-title mb-6">
        Geschiedenis
      </h1>

      {/* ── Summary stats row ── */}
      {workouts.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-8">
          <div className="bg-[rgba(255,255,255,0.50)] rounded-xl p-3 text-center">
            <p className="text-[18px] font-bold text-[#1C1E18] tabular-nums">{stats.totalWorkouts}</p>
            <p className="text-[9px] text-[rgba(28,30,24,0.62)] uppercase tracking-[0.06em] mt-0.5">Workouts</p>
          </div>
          <div className="bg-[rgba(255,255,255,0.50)] rounded-xl p-3 text-center">
            <p className="text-[18px] font-bold text-[#1C1E18] tabular-nums">{Math.round(stats.totalDuration / 3600)}u</p>
            <p className="text-[9px] text-[rgba(28,30,24,0.62)] uppercase tracking-[0.06em] mt-0.5">Totaal</p>
          </div>
          <div className="bg-[rgba(255,255,255,0.50)] rounded-xl p-3 text-center">
            <p className="text-[18px] font-bold text-[#C0FC01] tabular-nums">{stats.totalPRs}</p>
            <p className="text-[9px] text-[rgba(28,30,24,0.62)] uppercase tracking-[0.06em] mt-0.5">PR&apos;s</p>
          </div>
          <div className="bg-[rgba(255,255,255,0.50)] rounded-xl p-3 text-center">
            <p className="text-[18px] font-bold text-[#2FA65A] tabular-nums">{stats.streak}w</p>
            <p className="text-[9px] text-[rgba(28,30,24,0.62)] uppercase tracking-[0.06em] mt-0.5">Streak</p>
          </div>
        </div>
      )}

      {/* ── Tab switcher ── */}
      <div className="flex gap-1 bg-[rgba(255,255,255,0.50)] rounded-xl p-1 mb-8">
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2.5 text-[12px] font-semibold uppercase tracking-[0.06em] rounded-lg transition-all touch-manipulation ${
            activeTab === 'history' ? 'bg-[rgba(255,255,255,0.50)] backdrop-blur-2xl text-[#1C1E18] shadow-sm' : 'text-[rgba(28,30,24,0.62)]'
          }`}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          Overzicht
        </button>
        <button
          onClick={() => setActiveTab('progress')}
          className={`flex-1 py-2.5 text-[12px] font-semibold uppercase tracking-[0.06em] rounded-lg transition-all touch-manipulation ${
            activeTab === 'progress' ? 'bg-[rgba(255,255,255,0.50)] backdrop-blur-2xl text-[#1C1E18] shadow-sm' : 'text-[rgba(28,30,24,0.62)]'
          }`}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          Progressie
        </button>
      </div>

      {/* ════════════════════════════════════════════ */}
      {/* ──  TAB: HISTORY / OVERZICHT  ──           */}
      {/* ════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <>
          {/* ── Calendar heatmap ── */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-5">
              <button onClick={handlePrevMonth} className="w-[44px] h-[44px] flex items-center justify-center text-[rgba(253,253,254,0.42)] hover:text-[#1C1E18] transition-colors touch-manipulation" style={{ WebkitTapHighlightColor: 'transparent' }}>
                <ChevronLeft strokeWidth={1.5} className="w-5 h-5" />
              </button>
              <span className="text-[14px] font-medium text-[#1C1E18] capitalize" style={{ fontFamily: 'var(--font-body)' }}>
                {monthName}
              </span>
              <button onClick={handleNextMonth} className="w-[44px] h-[44px] flex items-center justify-center text-[rgba(253,253,254,0.42)] hover:text-[#1C1E18] transition-colors touch-manipulation" style={{ WebkitTapHighlightColor: 'transparent' }}>
                <ChevronRight strokeWidth={1.5} className="w-5 h-5" />
              </button>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 gap-0 mb-1">
              {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map((day) => (
                <div key={day} className="text-[10px] font-medium text-[rgba(28,30,24,0.60)] text-center py-1 uppercase tracking-[0.06em]">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid — heatmap */}
            <div className="grid grid-cols-7 gap-[3px]">
              {calendarDays.map((day, index) => {
                const isCurrentMonth = day.month === currentMonth.getMonth()
                const bgColor = day.hasWorkout && isCurrentMonth ? getHeatmapColor(day.volume, maxDayVolume) : 'transparent'

                return (
                  <div
                    key={index}
                    className={`aspect-square flex items-center justify-center text-[12px] font-medium rounded-lg relative transition-all ${
                      !isCurrentMonth ? 'text-[rgba(253,253,254,0.22)]' : day.hasWorkout ? 'text-[#1C1E18]' : 'text-[rgba(28,30,24,0.62)]'
                    } ${day.isToday ? 'ring-2 ring-[#FDFDFE] ring-offset-1' : ''}`}
                    style={{ backgroundColor: bgColor }}
                  >
                    {day.date}
                    {day.workoutCount > 1 && (
                      <span className="absolute -top-0.5 -right-0.5 w-[14px] h-[14px] bg-[#C0FC01] rounded-full text-[8px] font-bold text-white flex items-center justify-center">
                        {day.workoutCount}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Heatmap legend */}
            <div className="flex items-center justify-end gap-1.5 mt-3">
              <span className="text-[9px] text-[rgba(28,30,24,0.60)]">Minder</span>
              {['rgba(192,252,1,0.14)', 'rgba(192,252,1,0.32)', 'rgba(192,252,1,0.56)', '#C0FC01'].map((color) => (
                <div key={color} className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
              ))}
              <span className="text-[9px] text-[rgba(28,30,24,0.60)]">Meer volume</span>
            </div>
          </div>

          {/* ── Weekly volume chart ── */}
          {weeklyVolume.length >= 2 && (
            <div className="mb-10 bg-[rgba(255,255,255,0.50)] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={14} strokeWidth={1.5} className="text-[rgba(28,30,24,0.62)]" />
                <p className="text-[11px] font-bold text-[rgba(28,30,24,0.62)] uppercase tracking-[0.06em]">Weekvolume (kg)</p>
              </div>
              <div className="flex items-end gap-[6px] h-[80px]">
                {weeklyVolume.map((w, i) => {
                  const maxVol = Math.max(...weeklyVolume.map(wv => wv.volume))
                  const heightPct = maxVol > 0 ? (w.volume / maxVol) * 100 : 0
                  const isLast = i === weeklyVolume.length - 1
                  return (
                    <div key={w.week} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                      <div
                        className={`w-full rounded-t-md transition-all ${isLast ? 'bg-[#C0FC01]' : 'bg-[rgba(253,253,254,0.14)]'}`}
                        style={{ height: `${Math.max(heightPct, 4)}%` }}
                      />
                      {(i === 0 || isLast || i === Math.floor(weeklyVolume.length / 2)) && (
                        <span className="text-[8px] text-[rgba(28,30,24,0.60)] tabular-nums">
                          {new Date(w.week).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Recent workouts ── */}
          {recentWorkouts.length > 0 ? (
            <div>
              <p className="text-[11px] font-bold text-[rgba(28,30,24,0.62)] uppercase tracking-[1px] mb-4">
                Recente trainingen
              </p>

              {recentWorkouts.map((workout) => {
                const isExpanded = expandedWorkoutId === workout.id
                const volume = calculateVolume(workout.workout_sets)
                const prCount = (workout.workout_sets || []).filter(s => s.is_pr).length
                const workoutDate = new Date(workout.completed_at || '')
                const dateStr = workoutDate.toLocaleDateString('nl-BE', { weekday: 'short', month: 'short', day: 'numeric' })
                const dayName = (Array.isArray(workout.program_template_days)
                  ? workout.program_template_days[0]?.name
                  : workout.program_template_days?.name) || 'Training'

                return (
                  <div key={workout.id}>
                    <button
                      onClick={() => setExpandedWorkoutId(isExpanded ? null : workout.id)}
                      className="w-full text-left flex items-center gap-3 py-4 border-t border-[rgba(28,30,24,0.10)] min-h-[56px] touch-manipulation"
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[14px] font-medium text-[#1C1E18]" style={{ fontFamily: 'var(--font-body)' }}>
                            {dayName}
                          </p>
                          {prCount > 0 && (
                            <span className="text-[9px] font-black text-[#C0FC01] bg-[#C0FC01]/10 px-1.5 py-0.5 rounded-md">
                              {prCount} PR
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-3 text-[12px] text-[rgba(28,30,24,0.60)]" style={{ fontFamily: 'var(--font-body)' }}>
                          <span>{dateStr}</span>
                          <span>{formatDuration(workout.duration_seconds)}</span>
                          <span>{volume > 1000 ? `${(volume / 1000).toFixed(1)}t` : `${volume} kg`}</span>
                          {workout.mood_rating && <span>{MOOD_LABELS[workout.mood_rating]}</span>}
                        </div>
                      </div>
                      <ChevronRight
                        size={16}
                        strokeWidth={1.5}
                        className={`text-[rgba(253,253,254,0.35)] shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="pb-4 border-b border-[rgba(28,30,24,0.10)]">
                        {workout.notes && (
                          <div className="mb-3 px-3 py-2 bg-[rgba(255,255,255,0.50)] rounded-lg">
                            <p className="text-[12px] text-[#1C1E18] whitespace-pre-wrap" style={{ fontFamily: 'var(--font-body)' }}>
                              {workout.notes}
                            </p>
                          </div>
                        )}
                        {/* Group sets by exercise */}
                        {(() => {
                          const grouped: Record<string, { name: string; sets: WorkoutSet[] }> = {}
                          for (const set of workout.workout_sets || []) {
                            const exId = set.exercise_id
                            if (!grouped[exId]) {
                              grouped[exId] = { name: set.exercises?.name_nl || set.exercises?.name || 'Oefening', sets: [] }
                            }
                            grouped[exId].sets.push(set)
                          }
                          return Object.entries(grouped).map(([exId, group]) => (
                            <div key={exId} className="mb-2">
                              <p className="text-[12px] font-semibold text-[#1C1E18] mb-1">{group.name}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {group.sets.map((set, idx) => (
                                  <span key={idx} className={`text-[11px] tabular-nums px-2 py-1 rounded-md ${set.is_pr ? 'bg-[#C0FC01]/10 text-[#C0FC01] font-bold' : 'bg-[rgba(255,255,255,0.50)] text-[#1C1E18]'}`}>
                                    {set.weight_kg || '—'} × {set.actual_reps || '—'}
                                    {set.is_pr && ' 🏆'}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))
                        })()}

                        {/* Repeat workout button */}
                        {workout.template_day_id && workout.program_id && (
                          <button
                            onClick={() => router.push(`/client/workout/active?dayId=${workout.template_day_id}&programId=${workout.program_id}`)}
                            className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[#C0FC01]/20 text-[12px] font-semibold text-[#C0FC01] uppercase tracking-[0.06em] hover:bg-[#C0FC01]/5 transition-colors touch-manipulation"
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                          >
                            <RotateCcw size={14} strokeWidth={2} />
                            Herhaal training
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-16 text-center">
              <p className="text-editorial-h1 mb-3">Nog geen data</p>
              <p className="text-[14px] text-[rgba(28,30,24,0.62)]" style={{ fontFamily: 'var(--font-body)' }}>
                Voltooi je eerste training om te beginnen
              </p>
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════ */}
      {/* ──  TAB: PROGRESS / PROGRESSIE  ──         */}
      {/* ════════════════════════════════════════════ */}
      {activeTab === 'progress' && (
        <>
          {exerciseHistories.length === 0 ? (
            <div className="py-16 text-center">
              <Target size={32} strokeWidth={1} className="mx-auto text-[rgba(253,253,254,0.35)] mb-4" />
              <p className="text-[16px] font-semibold text-[#1C1E18] mb-2">Nog geen progressiedata</p>
              <p className="text-[13px] text-[rgba(28,30,24,0.62)]">Na 2+ trainingen verschijnen hier je grafieken</p>
            </div>
          ) : (
            <>
              {/* Exercise selector pills */}
              <div className="flex flex-wrap gap-2 mb-6">
                {exerciseHistories.map((ex) => (
                  <button
                    key={ex.exerciseId}
                    onClick={() => setSelectedExercise(selectedExercise === ex.exerciseId ? null : ex.exerciseId)}
                    className={`px-3 py-2 rounded-xl text-[12px] font-medium transition-all touch-manipulation ${
                      selectedExercise === ex.exerciseId
                        ? 'bg-[#474B48] text-white'
                        : 'bg-[rgba(255,255,255,0.50)] text-[#1C1E18] hover:bg-[rgba(253,253,254,0.14)]'
                    }`}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    {ex.name}
                  </button>
                ))}
              </div>

              {/* Selected exercise detail */}
              {selectedExHistory && (
                <div className="mb-8">
                  <div className="bg-[rgba(255,255,255,0.50)] backdrop-blur-2xl border border-[rgba(28,30,24,0.10)] rounded-2xl p-5">
                    <h3 className="text-[16px] font-semibold text-[#1C1E18] mb-1">{selectedExHistory.name}</h3>
                    <p className="text-[11px] text-[rgba(28,30,24,0.62)] mb-4">{selectedExHistory.sessions.length} trainingen</p>

                    {/* 1RM progression sparkline */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-[rgba(28,30,24,0.62)] uppercase tracking-[0.06em]">Geschatte 1RM (Epley)</span>
                        <span className="text-[14px] font-bold text-[#C0FC01] tabular-nums">
                          {selectedExHistory.sessions[selectedExHistory.sessions.length - 1]?.estimated1RM || '—'} kg
                        </span>
                      </div>
                      <Sparkline
                        data={selectedExHistory.sessions.map(s => s.estimated1RM)}
                        color="#C0FC01"
                        height={50}
                        width={280}
                      />
                    </div>

                    {/* Best weight progression */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-[rgba(28,30,24,0.62)] uppercase tracking-[0.06em]">Beste gewicht</span>
                        <span className="text-[14px] font-bold text-[#2FA65A] tabular-nums">
                          {selectedExHistory.sessions[selectedExHistory.sessions.length - 1]?.bestWeight || '—'} kg
                        </span>
                      </div>
                      <Sparkline
                        data={selectedExHistory.sessions.map(s => s.bestWeight)}
                        color="#2FA65A"
                        height={50}
                        width={280}
                      />
                    </div>

                    {/* Session history list */}
                    <div className="border-t border-[rgba(28,30,24,0.10)] pt-3 mt-3">
                      <p className="text-[10px] font-bold text-[rgba(28,30,24,0.62)] uppercase tracking-[0.06em] mb-2">Sessies</p>
                      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                        {[...selectedExHistory.sessions].reverse().map((s, i) => (
                          <div key={s.date} className="flex items-center justify-between py-1">
                            <span className="text-[11px] text-[rgba(28,30,24,0.62)] tabular-nums">
                              {new Date(s.date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })}
                            </span>
                            <span className="text-[11px] font-medium text-[#1C1E18] tabular-nums">
                              {s.bestWeight} kg × {s.bestReps}
                            </span>
                            <span className="text-[11px] text-[rgba(28,30,24,0.62)] tabular-nums">
                              1RM: {s.estimated1RM} kg
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* All exercises overview (when none selected) */}
              {!selectedExercise && (
                <div className="space-y-3">
                  {exerciseHistories.slice(0, 10).map((ex) => {
                    const latest = ex.sessions[ex.sessions.length - 1]
                    const first = ex.sessions[0]
                    const improvement = first && latest
                      ? Math.round(((latest.estimated1RM - first.estimated1RM) / (first.estimated1RM || 1)) * 100)
                      : 0

                    return (
                      <button
                        key={ex.exerciseId}
                        onClick={() => setSelectedExercise(ex.exerciseId)}
                        className="w-full bg-[rgba(255,255,255,0.50)] backdrop-blur-2xl border border-[rgba(28,30,24,0.10)] rounded-xl p-4 text-left flex items-center gap-4 hover:border-[rgba(253,253,254,0.35)] transition-all touch-manipulation"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-[#1C1E18] mb-0.5">{ex.name}</p>
                          <div className="flex items-center gap-3 text-[11px] text-[rgba(28,30,24,0.62)]">
                            <span>{ex.sessions.length}x getraind</span>
                            <span>Beste: {latest?.bestWeight} kg</span>
                            <span>1RM: {latest?.estimated1RM} kg</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Sparkline data={ex.sessions.map(s => s.estimated1RM)} color="#C0FC01" height={28} width={60} />
                          {improvement !== 0 && (
                            <span className={`text-[11px] font-bold tabular-nums ${improvement > 0 ? 'text-[#2FA65A]' : 'text-[rgba(28,30,24,0.62)]'}`}>
                              {improvement > 0 ? '+' : ''}{improvement}%
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
