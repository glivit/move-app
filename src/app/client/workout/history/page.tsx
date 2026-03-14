'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { ChevronLeft, ChevronRight } from 'lucide-react'

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

export default function WorkoutHistoryPage() {
  const [user, setUser] = useState<any>(null)
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createClient()

        // Get current user
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
          return
        }

        setUser({ id: authUser.id })

        // Get all completed workouts for this user
        const { data: sessionsData } = await supabase
          .from('workout_sessions')
          .select('*, workout_sets(*), program_template_days(name)')
          .eq('client_id', authUser.id)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(100)

        if (sessionsData) {
          setWorkouts(sessionsData as WorkoutSession[])
        }
      } catch (error) {
        console.error('Error loading workouts:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
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
        const wDate = new Date(w.completed_at).toISOString().split('T')[0]
        return wDate === dateStr
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

  const monthName = currentMonth.toLocaleDateString('nl-BE', {
    month: 'long',
    year: 'numeric',
  })

  const recentWorkouts = workouts.slice(0, 10)

  const getMoodEmoji = (rating: number | null) => {
    if (!rating) return '—'
    const emojis: Record<number, string> = {
      1: '😫',
      2: '😐',
      3: '😊',
      4: '💪',
      5: '🔥',
    }
    return emojis[rating] || '—'
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '—'
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}m ${secs}s`
  }

  const calculateVolume = (sets: any[] | undefined | null) => {
    if (!sets || sets.length === 0) return 0
    return sets.reduce((sum, set) => {
      const weight = set.weight_kg || 0
      const reps = set.actual_reps || 0
      return sum + weight * reps
    }, 0)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text-primary">
            Trainingsgeschiedenis
          </h1>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-client-surface-muted rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-semibold text-text-primary">
          Trainingsgeschiedenis
        </h1>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] overflow-hidden">
        {/* Month header */}
        <div className="px-4 py-4 border-b border-[#F0F0ED] flex items-center justify-between">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-client-surface-muted rounded-lg transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft size={20} strokeWidth={1.5} className="text-text-primary" />
          </button>

          <h3 className="text-[15px] font-semibold text-text-primary capitalize">
            {monthName}
          </h3>

          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-client-surface-muted rounded-lg transition-colors"
            aria-label="Next month"
          >
            <ChevronRight size={20} strokeWidth={1.5} className="text-text-primary" />
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 gap-0 px-2 py-2 text-center border-b border-[#F0F0ED]">
          {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map((day) => (
            <div key={day} className="text-[12px] font-semibold text-client-text-secondary py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0 p-2">
          {calendarDays.map((day, index) => {
            const isCurrentMonth = day.month === currentMonth.getMonth()
            const isToday = day.isToday

            return (
              <div
                key={index}
                className={`aspect-square flex items-center justify-center text-[13px] font-medium rounded-lg relative ${
                  !isCurrentMonth ? 'text-client-text-muted' : 'text-text-primary'
                } ${isToday ? 'bg-[#8B6914] text-white font-semibold' : ''}`}
              >
                {day.date}

                {/* Workout indicator */}
                {day.hasWorkout && !isToday && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-[#34C759] rounded-full absolute bottom-1" />
                  </div>
                )}
                {day.hasWorkout && isToday && (
                  <div className="absolute bottom-1 w-1.5 h-1.5 bg-white rounded-full" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent workouts */}
      {recentWorkouts.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-[15px] font-semibold text-text-primary px-1">
            Recente trainingen
          </h3>

          {recentWorkouts.map((workout) => {
            const isExpanded = expandedWorkoutId === workout.id
            const volume = calculateVolume(workout.workout_sets)
            const workoutDate = new Date(workout.completed_at || '')
            const dateStr = workoutDate.toLocaleDateString('nl-BE', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })

            return (
              <div
                key={workout.id}
                className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] overflow-hidden"
              >
                {/* Summary */}
                <button
                  onClick={() =>
                    setExpandedWorkoutId(isExpanded ? null : workout.id)
                  }
                  className="w-full px-5 py-4 text-left hover:bg-client-surface-muted transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-semibold text-text-primary">
                          {dateStr}
                        </p>
                        <span className="text-xs text-client-text-secondary">
                          {(Array.isArray(workout.program_template_days) ? workout.program_template_days[0]?.name : workout.program_template_days?.name) || 'Training'}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center gap-4 text-[13px] text-client-text-secondary">
                        <span>⏱ {formatDuration(workout.duration_seconds)}</span>
                        <span>📊 {volume.toLocaleString('nl-BE')} kg</span>
                        <span>{getMoodEmoji(workout.mood_rating)}</span>
                      </div>
                    </div>

                    <ChevronRight
                      size={20}
                      strokeWidth={1.5}
                      className={`text-client-text-secondary flex-shrink-0 mt-0.5 transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                </button>

                {/* Details (expanded) */}
                {isExpanded && (
                  <div className="border-t border-[#F0F0ED] px-5 py-4 bg-client-surface-muted space-y-3">
                    {/* Notes */}
                    {workout.notes && (
                      <div>
                        <p className="text-[12px] text-client-text-secondary font-medium uppercase tracking-wide mb-2">
                          Notities
                        </p>
                        <p className="text-[13px] text-text-primary whitespace-pre-wrap">
                          {workout.notes}
                        </p>
                      </div>
                    )}

                    {/* Set breakdown */}
                    {workout.workout_sets && workout.workout_sets.length > 0 && (
                      <div>
                        <p className="text-[12px] text-client-text-secondary font-medium uppercase tracking-wide mb-2">
                          Sets
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {workout.workout_sets.map((set, idx) => (
                            <div
                              key={idx}
                              className="bg-white rounded-lg p-3 text-center border border-[#F0F0ED]"
                            >
                              <p className="text-[11px] text-client-text-secondary mb-1">
                                Set {idx + 1}
                              </p>
                              <p className="text-[13px] font-semibold text-text-primary">
                                {set.weight_kg || '—'} ×{' '}
                                {set.actual_reps || '—'}
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
        <div className="bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] text-center">
          <p className="text-[14px] text-client-text-secondary">
            Geen trainingen geregistreerd
          </p>
          <p className="text-[13px] text-client-text-muted mt-1">
            Voltooi je eerste training om te beginnen
          </p>
        </div>
      )}
    </div>
  )
}
