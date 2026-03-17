'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { SubPageHeader } from '@/components/layout/SubPageHeader'
import {
  ChevronLeft, ChevronRight, Dumbbell, Video,
  Clock, Play, ArrowLeft, ArrowRight
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────

interface WorkoutSet {
  exercise_id: string
  weight_kg: number | null
  actual_reps: number | null
  is_pr: boolean
  exercises?: { name: string; name_nl: string | null; target_muscle: string } | null
}

interface CompletedWorkout {
  id: string
  started_at: string
  completed_at: string
  duration_seconds: number | null
  mood_rating: number | null
  template_day_id: string | null
  workout_sets: WorkoutSet[]
  program_template_days?: { name: string } | { name: string }[] | null
}

interface PlannedDay {
  id: string
  name: string
  focus_area: string
  estimated_duration: number
}

// Schedule: weekday (ISO: 1=Mon..7=Sun) -> template_day_id
type Schedule = Record<string, string>

interface VideoSession {
  id: string
  scheduled_at: string
  duration_minutes: number
  status: string
}

// ─── Helpers ────────────────────────────────────────────────

const DAYS_NL = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
const MONTHS_NL = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December']

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isToday(date: Date) {
  return isSameDay(date, new Date())
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  return `${m} min`
}

function formatVolume(sets: WorkoutSet[]) {
  const vol = sets.reduce((sum, s) => sum + (s.weight_kg || 0) * (s.actual_reps || 0), 0)
  return vol >= 1000 ? `${(vol / 1000).toFixed(1)}t` : `${Math.round(vol)} kg`
}

// ─── Main Component ─────────────────────────────────────────

export default function CalendarPage() {
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [completedWorkouts, setCompletedWorkouts] = useState<CompletedWorkout[]>([])
  const [plannedDays, setPlannedDays] = useState<PlannedDay[]>([])
  const [schedule, setSchedule] = useState<Schedule>({})
  const [videoSessions, setVideoSessions] = useState<VideoSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Completed workouts WITH exercise details — limit to last 3 months
        const threeMonthsAgo = new Date()
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

        const { data: workouts } = await supabase
          .from('workout_sessions')
          .select(`
            id, started_at, completed_at, duration_seconds, mood_rating, template_day_id,
            program_template_days(name),
            workout_sets(exercise_id, weight_kg, actual_reps, is_pr, exercises(name, name_nl, target_muscle))
          `)
          .eq('client_id', user.id)
          .not('completed_at', 'is', null)
          .gte('started_at', threeMonthsAgo.toISOString())
          .order('started_at', { ascending: false })

        if (workouts) setCompletedWorkouts(workouts as any[])

        // Current program + schedule
        const { data: program } = await supabase
          .from('client_programs')
          .select('id, schedule, program_templates(id, template_days:program_template_days(id, name, focus, estimated_duration_min))')
          .eq('client_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (program) {
          const template = (program as any).program_templates
          if (template?.template_days) {
            setPlannedDays(template.template_days.map((d: any) => ({
              id: d.id,
              name: d.name,
              focus_area: d.focus || '',
              estimated_duration: d.estimated_duration_min || 60,
            })))
          }
          if (program.schedule) {
            setSchedule(program.schedule as Schedule)
          }
        }

        // Video sessions — limit to last 3 months
        const { data: videos } = await supabase
          .from('video_sessions')
          .select('id, scheduled_at, duration_minutes, status')
          .eq('client_id', user.id)
          .not('status', 'eq', 'cancelled')
          .gte('scheduled_at', threeMonthsAgo.toISOString())
          .order('scheduled_at', { ascending: false })

        if (videos) setVideoSessions(videos as VideoSession[])
      } catch (err) {
        console.error('Calendar load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Build day data map
  const dayDataMap = useMemo(() => {
    const map: Record<string, { completed: CompletedWorkout[]; videoSessions: VideoSession[] }> = {}

    for (const w of completedWorkouts) {
      const dateKey = new Date(w.started_at).toISOString().slice(0, 10)
      if (!map[dateKey]) map[dateKey] = { completed: [], videoSessions: [] }
      map[dateKey].completed.push(w)
    }

    for (const v of videoSessions) {
      const dateKey = new Date(v.scheduled_at).toISOString().slice(0, 10)
      if (!map[dateKey]) map[dateKey] = { completed: [], videoSessions: [] }
      map[dateKey].videoSessions.push(v)
    }

    return map
  }, [completedWorkouts, videoSessions])

  // Selected date data
  const selectedDateKey = selectedDate.toISOString().slice(0, 10)
  const jsDay = selectedDate.getDay()
  const isoDay = jsDay === 0 ? 7 : jsDay // Convert JS Sun=0 to ISO Sun=7
  const selectedDayData = dayDataMap[selectedDateKey] || { completed: [], videoSessions: [] }
  const scheduledDayId = schedule[String(isoDay)]
  const plannedForDay = scheduledDayId ? plannedDays.find(d => d.id === scheduledDayId) : undefined
  const hasCompleted = selectedDayData.completed.length > 0
  const hasVideo = selectedDayData.videoSessions.length > 0
  const isFutureOrToday = selectedDate >= new Date(new Date().toISOString().slice(0, 10))

  // Calendar grid
  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1) }
    else setCurrentMonth(currentMonth - 1)
  }
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1) }
    else setCurrentMonth(currentMonth + 1)
  }

  // Day navigation
  const prevDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 1)
    setSelectedDate(d)
    // Auto-switch month if needed
    if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) {
      setCurrentMonth(d.getMonth())
      setCurrentYear(d.getFullYear())
    }
  }
  const nextDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 1)
    setSelectedDate(d)
    if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) {
      setCurrentMonth(d.getMonth())
      setCurrentYear(d.getFullYear())
    }
  }

  // Group exercises by name for a workout
  function groupExercises(sets: WorkoutSet[]) {
    const groups: Record<string, { name: string; muscle: string; sets: WorkoutSet[]; hasPr: boolean }> = {}
    for (const s of sets) {
      const name = s.exercises?.name_nl || s.exercises?.name || 'Onbekend'
      const muscle = s.exercises?.target_muscle || ''
      if (!groups[name]) groups[name] = { name, muscle, sets: [], hasPr: false }
      groups[name].sets.push(s)
      if (s.is_pr) groups[name].hasPr = true
    }
    return Object.values(groups)
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-6 h-6 border-[1.5px] border-[#CCC7BC] border-t-[#1A1917] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="pb-24">
      <SubPageHeader overline="Overzicht" title="Kalender" backHref="/client/progress" />

      {/* ═══ MONTH NAV ═══════════════════════════════════════ */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="w-10 h-10 flex items-center justify-center text-[#A09D96] hover:text-[#1A1917] transition-colors">
          <ChevronLeft size={20} strokeWidth={1.5} />
        </button>
        <p className="text-[16px] font-semibold text-[#1A1917]">
          {MONTHS_NL[currentMonth]} {currentYear}
        </p>
        <button onClick={nextMonth} className="w-10 h-10 flex items-center justify-center text-[#A09D96] hover:text-[#1A1917] transition-colors">
          <ChevronRight size={20} strokeWidth={1.5} />
        </button>
      </div>

      {/* ═══ CALENDAR GRID ═══════════════════════════════════ */}
      <div className="mb-6">
        <div className="grid grid-cols-7 mb-2">
          {DAYS_NL.map(d => (
            <div key={d} className="text-center text-[10px] font-bold uppercase tracking-[0.1em] text-[#C5C2BC] py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const date = new Date(currentYear, currentMonth, day)
            const dateKey = date.toISOString().slice(0, 10)
            const dayData = dayDataMap[dateKey]
            const hasWorkout = dayData?.completed?.length > 0
            const hasVid = dayData?.videoSessions?.length > 0
            const isSelected = isSameDay(date, selectedDate)
            const today = isToday(date)
            const dayJsWeekday = date.getDay()
            const dayIsoWeekday = dayJsWeekday === 0 ? 7 : dayJsWeekday
            const hasPlanned = !!schedule[String(dayIsoWeekday)] && !hasWorkout && date >= new Date(new Date().toISOString().slice(0, 10))

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(date)}
                className={`aspect-square flex flex-col items-center justify-center relative transition-all ${
                  isSelected
                    ? 'bg-[#1A1917] text-white'
                    : today
                      ? 'bg-[#E5E1D9]'
                      : 'hover:bg-[#F5F2EC]'
                }`}
              >
                <span className={`text-[14px] tabular-nums ${
                  isSelected ? 'font-bold text-white' : today ? 'font-bold text-[#1A1917]' : 'text-[#1A1917]'
                }`}>
                  {day}
                </span>
                <div className="flex gap-0.5 mt-0.5">
                  {hasWorkout && <div className={`w-1.5 h-1.5 ${isSelected ? 'bg-white' : 'bg-[#3D8B5C]'}`} />}
                  {hasVid && <div className={`w-1.5 h-1.5 ${isSelected ? 'bg-white/60' : 'bg-[#3068C4]'}`} />}
                  {hasPlanned && !hasWorkout && <div className={`w-1.5 h-1.5 ${isSelected ? 'bg-white/40' : 'bg-[#DDD9D0]'}`} />}
                </div>
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-center gap-5 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-[#3D8B5C]" />
            <span className="text-[10px] text-[#A09D96]">Voltooid</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-[#3068C4]" />
            <span className="text-[10px] text-[#A09D96]">Video</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-[#DDD9D0]" />
            <span className="text-[10px] text-[#A09D96]">Gepland</span>
          </div>
        </div>
      </div>

      {/* ═══ DAY NAVIGATION ════════════════════════════════════ */}
      <div className="border-t border-[#F0EDE8] pt-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevDay} className="w-9 h-9 flex items-center justify-center text-[#A09D96] hover:text-[#1A1917] transition-colors">
            <ArrowLeft size={18} strokeWidth={1.5} />
          </button>
          <div className="text-center">
            <p className="text-[15px] font-semibold text-[#1A1917]">
              {selectedDate.toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            {isToday(selectedDate) && (
              <span className="text-[11px] text-[#3D8B5C] font-semibold uppercase tracking-[0.08em]">Vandaag</span>
            )}
          </div>
          <button onClick={nextDay} className="w-9 h-9 flex items-center justify-center text-[#A09D96] hover:text-[#1A1917] transition-colors">
            <ArrowRight size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Completed workouts — with exercise details */}
        {selectedDayData.completed.map(w => {
          const templateName = Array.isArray(w.program_template_days)
            ? w.program_template_days[0]?.name
            : w.program_template_days?.name
          const exercises = groupExercises(w.workout_sets || [])

          return (
            <div key={w.id} className="bg-white rounded-2xl shadow-[var(--shadow-card)] mb-3 overflow-hidden">
              {/* Workout header */}
              <div className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 bg-[#3D8B5C]/10 flex items-center justify-center shrink-0">
                  <Dumbbell size={18} strokeWidth={1.5} className="text-[#3D8B5C]" />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-[#1A1917]">
                    {templateName || 'Workout voltooid'}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {w.duration_seconds && (
                      <span className="text-[12px] text-[#A09D96] flex items-center gap-1">
                        <Clock size={11} strokeWidth={1.5} />
                        {formatDuration(w.duration_seconds)}
                      </span>
                    )}
                    {w.workout_sets?.length > 0 && (
                      <span className="text-[12px] text-[#A09D96]">
                        {formatVolume(w.workout_sets)} volume
                      </span>
                    )}
                    {w.mood_rating && (
                      <span className="text-[12px]">
                        {['', '😫', '😐', '😊', '💪', '🔥'][w.mood_rating] || ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Exercise breakdown */}
              {exercises.length > 0 && (
                <div className="border-t border-[#F0EDE8] divide-y divide-[#F0EDE8]">
                  {exercises.map((ex, i) => {
                    const bestSet = ex.sets.reduce((best, s) =>
                      (s.weight_kg || 0) > (best.weight_kg || 0) ? s : best
                    , ex.sets[0])

                    return (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-[13px] font-medium text-[#1A1917] truncate">{ex.name}</p>
                            {ex.hasPr && (
                              <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#7B5EA7] bg-[#7B5EA7]/10 px-1.5 py-0.5">PR</span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#C5C2BC]">{ex.muscle}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[13px] font-semibold text-[#1A1917] tabular-nums">
                            {bestSet.weight_kg || 0} kg × {bestSet.actual_reps || 0}
                          </p>
                          <p className="text-[10px] text-[#C5C2BC]">{ex.sets.length} sets</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* Video sessions */}
        {selectedDayData.videoSessions.map(v => (
          <div key={v.id} className="bg-white rounded-2xl shadow-[var(--shadow-card)] p-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#3068C4]/10 flex items-center justify-center shrink-0">
                <Video size={18} strokeWidth={1.5} className="text-[#3068C4]" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-[#1A1917]">Videocall</p>
                <p className="text-[12px] text-[#A09D96] mt-0.5">
                  {new Date(v.scheduled_at).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })} · {v.duration_minutes} min
                </p>
              </div>
              {v.status === 'scheduled' && (
                <button
                  onClick={() => router.push(`/client/video/${v.id}`)}
                  className="px-3 py-1.5 bg-[#3068C4] text-white text-[11px] font-semibold uppercase tracking-[0.06em] rounded-xl"
                >
                  Join
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Planned workout */}
        {!hasCompleted && plannedForDay && isFutureOrToday && (
          <div className="bg-white rounded-2xl shadow-[var(--shadow-card)] p-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#E5E1D9] flex items-center justify-center shrink-0">
                <Dumbbell size={18} strokeWidth={1.5} className="text-[#A09D96]" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-[#1A1917]">{plannedForDay.name}</p>
                <p className="text-[12px] text-[#A09D96] mt-0.5">
                  {plannedForDay.focus_area ? `${plannedForDay.focus_area} · ` : ''}~{plannedForDay.estimated_duration} min
                </p>
              </div>
              {isToday(selectedDate) && (
                <button
                  onClick={() => router.push('/client/workout')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#1A1917] text-white text-[11px] font-semibold uppercase tracking-[0.06em] rounded-xl"
                >
                  <Play size={12} strokeWidth={2} />
                  Start
                </button>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!hasCompleted && !hasVideo && (!plannedForDay || !isFutureOrToday) && (
          <div className="text-center py-8">
            <p className="text-[14px] text-[#C5C2BC]">Geen activiteit op deze dag</p>
          </div>
        )}
      </div>
    </div>
  )
}
