'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { ChevronLeft, ChevronRight, Calendar, TrendingUp } from 'lucide-react'

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
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) return
        setUser({ id: authUser.id })

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

  const getMoodEmoji = (rating: number | null) => {
    if (!rating) return '—'
    const emojis: Record<number, string> = { 1: '😫', 2: '😐', 3: '😊', 4: '💪', 5: '🔥' }
    return emojis[rating] || '—'
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '—'
    const minutes = Math.floor(seconds / 60)
    return `${minutes} min`
  }

  const calculateVolume = (sets: any[] | undefined | null) => {
    if (!sets || sets.length === 0) return 0
    return sets.reduce((sum, set) => sum + (set.weight_kg || 0) * (set.actual_reps || 0), 0)
  }

  if (loading) {
    return (
      <div className="pb-28">
        <div className="mb-8">
          <div className="h-4 w-32 bg-[#E5E1D9] rounded-md mb-3 animate-pulse" />
          <div className="h-10 w-56 bg-[#E5E1D9] rounded-lg animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-white rounded-2xl shadow-[var(--shadow-card)] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="pb-28">
      {/* Header */}
      <div className="mb-8">
        <span className="text-label">Overzicht</span>
        <h1 className="text-editorial-h2 text-[#1A1917] mt-3">
          Geschiedenis
        </h1>
      </div>

      {/* Calendar card */}
      <div className="bg-white rounded-2xl shadow-[var(--shadow-card)] overflow-hidden mb-6">
        {/* Month header */}
        <div className="px-5 py-4 flex items-center justify-between">
          <button
            onClick={handlePrevMonth}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#F5F2EC] transition-colors"
          >
            <ChevronLeft size={18} strokeWidth={1.5} className="text-[#6B6862]" />
          </button>
          <h3 className="text-[15px] font-semibold text-[#1A1917] capitalize">{monthName}</h3>
          <button
            onClick={handleNextMonth}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#F5F2EC] transition-colors"
          >
            <ChevronRight size={18} strokeWidth={1.5} className="text-[#6B6862]" />
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 gap-0 px-3 py-2 border-t border-[#F0EDE8]">
          {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map((day) => (
            <div key={day} className="text-[11px] font-semibold text-[#A09D96] text-center py-1 uppercase tracking-[0.06em]">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0 px-3 pb-3">
          {calendarDays.map((day, index) => {
            const isCurrentMonth = day.month === currentMonth.getMonth()
            const isToday = day.isToday

            return (
              <div
                key={index}
                className={`aspect-square flex items-center justify-center text-[13px] font-medium relative rounded-lg ${
                  !isCurrentMonth ? 'text-[#DDD9D0]' : 'text-[#1A1917]'
                } ${isToday ? 'bg-[var(--color-pop)] text-white font-semibold' : ''}`}
              >
                {day.date}
                {day.hasWorkout && !isToday && (
                  <div className="absolute bottom-1 w-1.5 h-1.5 bg-[var(--color-pop)] rounded-full" />
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
        <div>
          <p className="text-label mb-4">Recente trainingen</p>
          <div className="space-y-3">
            {recentWorkouts.map((workout, i) => {
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
                  className="bg-white rounded-2xl shadow-[var(--shadow-card)] overflow-hidden animate-gentle-rise"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <button
                    onClick={() => setExpandedWorkoutId(isExpanded ? null : workout.id)}
                    className="w-full px-5 py-4 text-left hover:bg-[#FAF8F3] transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[14px] font-semibold text-[#1A1917]">{dateStr}</p>
                          <span className="text-[11px] uppercase tracking-[0.06em] text-[#A09D96] font-medium">
                            {(Array.isArray(workout.program_template_days) ? workout.program_template_days[0]?.name : workout.program_template_days?.name) || 'Training'}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-4 text-[12px] text-[#A09D96]">
                          <span>{formatDuration(workout.duration_seconds)}</span>
                          <span>{volume.toLocaleString('nl-BE')} kg</span>
                          <span>{getMoodEmoji(workout.mood_rating)}</span>
                        </div>
                      </div>
                      <ChevronRight
                        size={16}
                        strokeWidth={1.5}
                        className={`text-[#CCC7BC] flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-[#F0EDE8] px-5 py-4 bg-[#FAF8F3] space-y-3">
                      {workout.notes && (
                        <div>
                          <p className="text-label mb-2">Notities</p>
                          <p className="text-[13px] text-[#1A1917] whitespace-pre-wrap">{workout.notes}</p>
                        </div>
                      )}
                      {workout.workout_sets && workout.workout_sets.length > 0 && (
                        <div>
                          <p className="text-label mb-2">Sets</p>
                          <div className="grid grid-cols-3 gap-2">
                            {workout.workout_sets.map((set, idx) => (
                              <div key={idx} className="bg-white rounded-xl p-3 text-center shadow-sm">
                                <p className="text-[10px] text-[#A09D96] uppercase tracking-[0.06em] mb-0.5">Set {idx + 1}</p>
                                <p className="text-[13px] font-semibold text-[#1A1917] tabular-nums">
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
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-[var(--shadow-card)] p-8 text-center">
          <div className="w-14 h-14 bg-[var(--color-pop-light)] rounded-xl flex items-center justify-center mx-auto mb-4">
            <Calendar size={24} strokeWidth={1.5} className="text-[var(--color-pop)]" />
          </div>
          <p className="text-[14px] font-medium text-[#1A1917] mb-1">
            Geen trainingen geregistreerd
          </p>
          <p className="text-[13px] text-[#A09D96]">
            Voltooi je eerste training om te beginnen
          </p>
        </div>
      )}
    </div>
  )
}
