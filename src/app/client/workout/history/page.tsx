'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

interface WorkoutSession {
  id: string
  started_at: string
  completed_at: string | null
  duration_seconds: number | null
  mood_rating: number | null
  notes: string | null
  workout_sets?: Array<{
    weight_kg: number | null
    actual_reps: number | null
  }>
  program_template_days?: {
    name: string
  } | { name: string }[]
}

interface CalendarDay {
  date: number
  isToday: boolean
  hasWorkout: boolean
  workoutId?: string
  month: number
  year: number
}

const MOOD_LABELS: Record<number, string> = { 1: 'Zwaar', 2: 'Oké', 3: 'Goed', 4: 'Sterk', 5: 'Top' }

export default function WorkoutHistoryPage() {
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) return

        const { data: sessionsData } = await supabase
          .from('workout_sessions')
          .select('*, workout_sets(*), program_template_days(name)')
          .eq('client_id', authUser.id)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(100)

        if (sessionsData) setWorkouts(sessionsData as WorkoutSession[])
      } catch (error) {
        console.error('Error loading workouts:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const days: CalendarDay[] = []
    const today = new Date()
    let current = new Date(startDate)

    while (current < new Date(year, month + 1, 1) || days.length % 7 !== 0) {
      const isToday =
        current.getDate() === today.getDate() &&
        current.getMonth() === today.getMonth() &&
        current.getFullYear() === today.getFullYear()

      const dateStr = current.toISOString().split('T')[0]
      const workoutForDay = workouts.find((w) => {
        if (!w.completed_at) return false
        return new Date(w.completed_at).toISOString().split('T')[0] === dateStr
      })

      days.push({
        date: current.getDate(),
        isToday,
        hasWorkout: !!workoutForDay,
        workoutId: workoutForDay?.id,
        month: current.getMonth(),
        year: current.getFullYear(),
      })
      current.setDate(current.getDate() + 1)
    }
    return days
  }, [currentMonth, workouts])

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }
  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const monthName = currentMonth.toLocaleDateString('nl-BE', { month: 'long', year: 'numeric' })
  const recentWorkouts = workouts.slice(0, 10)

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '—'
    return `${Math.floor(seconds / 60)} min`
  }

  const calculateVolume = (sets: any[] | undefined | null) => {
    if (!sets || sets.length === 0) return 0
    return sets.reduce((sum: number, set: any) => sum + (set.weight_kg || 0) * (set.actual_reps || 0), 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1A1917] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="pb-28">

      {/* ── Back + Header ── */}
      <button
        onClick={() => window.history.back()}
        className="flex items-center gap-1.5 mb-7 mt-2 group"
      >
        <ChevronLeft strokeWidth={1.5} className="w-[18px] h-[18px] text-[#C0C0C0] group-hover:text-[#1A1917] transition-colors" />
        <span className="text-[14px] text-[#C0C0C0] group-hover:text-[#1A1917] transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
          Training
        </span>
      </button>

      <h1
        className="text-[28px] tracking-[-0.5px] leading-[1.1] text-[#1A1917] mb-8"
        style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
      >
        Geschiedenis
      </h1>

      {/* ── Calendar ── */}
      <div className="mb-10">
        {/* Month nav */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={handlePrevMonth} className="p-1 text-[#D0D0D0] hover:text-[#1A1917] transition-colors">
            <ChevronLeft strokeWidth={1.5} className="w-4 h-4" />
          </button>
          <span
            className="text-[14px] font-medium text-[#1A1917] capitalize"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {monthName}
          </span>
          <button onClick={handleNextMonth} className="p-1 text-[#D0D0D0] hover:text-[#1A1917] transition-colors">
            <ChevronRight strokeWidth={1.5} className="w-4 h-4" />
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 gap-0 mb-2">
          {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map((day) => (
            <div
              key={day}
              className="text-[11px] font-medium text-[#C0C0C0] text-center py-1 uppercase tracking-[0.06em]"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0">
          {calendarDays.map((day, index) => {
            const isCurrentMonth = day.month === currentMonth.getMonth()
            const isToday = day.isToday

            return (
              <div
                key={index}
                className={`aspect-square flex items-center justify-center text-[13px] font-medium relative ${
                  !isCurrentMonth ? 'text-[#E0E0E0]' : 'text-[#1A1917]'
                } ${isToday ? 'text-white' : ''}`}
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {isToday && (
                  <div className="absolute inset-1 rounded-full bg-[#1A1917]" />
                )}
                <span className="relative z-10">{day.date}</span>
                {day.hasWorkout && !isToday && (
                  <div className="absolute bottom-1 w-[5px] h-[5px] bg-[#D46A3A] rounded-full" />
                )}
                {day.hasWorkout && isToday && (
                  <div className="absolute bottom-1 w-[5px] h-[5px] bg-white rounded-full" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Recent workouts ── */}
      {recentWorkouts.length > 0 ? (
        <div>
          <p
            className="text-[12px] font-medium text-[#B0B0B0] uppercase tracking-[1.5px] mb-4"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Recente trainingen
          </p>

          {recentWorkouts.map((workout) => {
            const isExpanded = expandedWorkoutId === workout.id
            const volume = calculateVolume(workout.workout_sets)
            const workoutDate = new Date(workout.completed_at || '')
            const dateStr = workoutDate.toLocaleDateString('nl-BE', {
              weekday: 'short', month: 'short', day: 'numeric',
            })
            const dayName = (Array.isArray(workout.program_template_days)
              ? workout.program_template_days[0]?.name
              : workout.program_template_days?.name) || 'Training'

            return (
              <div key={workout.id}>
                <button
                  onClick={() => setExpandedWorkoutId(isExpanded ? null : workout.id)}
                  className="w-full text-left flex items-center gap-3 py-4 border-t border-[#F0F0EE] hover:opacity-70 transition-opacity"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className="text-[14px] font-medium text-[#1A1917]"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        {dateStr}
                      </p>
                      <span className="text-[11px] text-[#C0C0C0]" style={{ fontFamily: 'var(--font-body)' }}>
                        {dayName}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-[12px] text-[#C0C0C0]" style={{ fontFamily: 'var(--font-body)' }}>
                      <span>{formatDuration(workout.duration_seconds)}</span>
                      <span>{volume.toLocaleString('nl-BE')} kg</span>
                      {workout.mood_rating && (
                        <span>{MOOD_LABELS[workout.mood_rating] || '—'}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight
                    size={16}
                    strokeWidth={1.5}
                    className={`text-[#D5D5D5] shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </button>

                {isExpanded && (
                  <div className="pl-0 pb-4 border-b border-[#F0F0EE]">
                    {workout.notes && (
                      <div className="mb-3">
                        <p className="text-[11px] text-[#C0C0C0] uppercase tracking-[1px] mb-1" style={{ fontFamily: 'var(--font-body)' }}>
                          Notities
                        </p>
                        <p className="text-[13px] text-[#1A1917] whitespace-pre-wrap" style={{ fontFamily: 'var(--font-body)' }}>
                          {workout.notes}
                        </p>
                      </div>
                    )}
                    {workout.workout_sets && workout.workout_sets.length > 0 && (
                      <div>
                        <p className="text-[11px] text-[#C0C0C0] uppercase tracking-[1px] mb-2" style={{ fontFamily: 'var(--font-body)' }}>
                          Sets
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {workout.workout_sets.map((set, idx) => (
                            <div key={idx} className="px-3 py-2 border border-[#F0F0EE] rounded-lg text-center">
                              <p className="text-[10px] text-[#C0C0C0] uppercase tracking-[0.06em] mb-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                                Set {idx + 1}
                              </p>
                              <p
                                className="text-[13px] font-medium text-[#1A1917] tabular-nums"
                                style={{ fontFamily: 'var(--font-display)' }}
                              >
                                {set.weight_kg || '—'} × {set.actual_reps || '—'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="py-16 text-center">
          <p
            className="text-[36px] tracking-[-1px] leading-[1.1] text-[#1A1917] mb-3"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
          >
            Nog geen data
          </p>
          <p className="text-[14px] text-[#ACACAC]" style={{ fontFamily: 'var(--font-body)' }}>
            Voltooi je eerste training om te beginnen
          </p>
        </div>
      )}
    </div>
  )
}
