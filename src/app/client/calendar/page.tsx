'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { SubPageHeader } from '@/components/layout/SubPageHeader'
import {
  ChevronLeft, ChevronRight, Dumbbell, Video,
  Clock, Play, X
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

type Schedule = Record<string, string>

interface VideoSession {
  id: string
  scheduled_at: string
  duration_minutes: number
  status: string
}

// ─── Helpers ────────────────────────────────────────────────

const DAYS_NL = ['M', 'D', 'W', 'D', 'V', 'Z', 'Z']
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
  return `${Math.floor(seconds / 60)} min`
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
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
              id: d.id, name: d.name, focus_area: d.focus || '',
              estimated_duration: d.estimated_duration_min || 60,
            })))
          }
          if (program.schedule) setSchedule(program.schedule as Schedule)
        }

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

  // Selected date detail
  const selectedDateKey = selectedDate?.toISOString().slice(0, 10) || ''
  const selectedDayData = selectedDate ? (dayDataMap[selectedDateKey] || { completed: [], videoSessions: [] }) : null
  const jsDay = selectedDate?.getDay() ?? 0
  const isoDay = jsDay === 0 ? 7 : jsDay
  const scheduledDayId = schedule[String(isoDay)]
  const plannedForDay = scheduledDayId ? plannedDays.find(d => d.id === scheduledDayId) : undefined
  const hasCompleted = (selectedDayData?.completed.length || 0) > 0
  const hasVideo = (selectedDayData?.videoSessions.length || 0) > 0
  const isFutureOrToday = selectedDate ? selectedDate >= new Date(new Date().toISOString().slice(0, 10)) : false

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
        <div className="w-6 h-6 border-[1.5px] border-[rgba(253,253,254,0.48)] border-t-[#FDFDFE] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="pb-24">
      <SubPageHeader overline="Overzicht" title="" backHref="/client/progress" />

      {/* ═══ MONTH NAME — Cormorant 40px ═══════════════════ */}
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <button onClick={prevMonth} className="w-10 h-10 flex items-center justify-center text-[rgba(253,253,254,0.55)] hover:text-[#FDFDFE] transition-colors">
          <ChevronLeft size={20} strokeWidth={1.5} />
        </button>
        <h1 className="text-editorial-h1">
          {MONTHS_NL[currentMonth]}
        </h1>
        <button onClick={nextMonth} className="w-10 h-10 flex items-center justify-center text-[rgba(253,253,254,0.55)] hover:text-[#FDFDFE] transition-colors">
          <ChevronRight size={20} strokeWidth={1.5} />
        </button>
      </div>

      {/* ═══ DOT GRID CALENDAR ═════════════════════════════ */}
      <div className="mb-6 animate-fade-in stagger-2">
        {/* Day labels */}
        <div className="grid grid-cols-7 mb-3">
          {DAYS_NL.map((d, i) => (
            <div key={i} className="text-center text-[11px] font-semibold uppercase tracking-wide text-[rgba(253,253,254,0.48)]">
              {d}
            </div>
          ))}
        </div>

        {/* Dot grid */}
        <div className="grid grid-cols-7 gap-y-2">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`e-${i}`} className="flex justify-center py-2" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const date = new Date(currentYear, currentMonth, day)
            const dateKey = date.toISOString().slice(0, 10)
            const dayData = dayDataMap[dateKey]
            const hasWorkout = dayData?.completed?.length > 0
            const today = isToday(date)
            const isSelected = selectedDate ? isSameDay(date, selectedDate) : false
            const dayJsWeekday = date.getDay()
            const dayIsoWeekday = dayJsWeekday === 0 ? 7 : dayJsWeekday
            const hasPlanned = !!schedule[String(dayIsoWeekday)] && !hasWorkout && date >= new Date(new Date().toISOString().slice(0, 10))

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(isSelected ? null : date)}
                className="flex justify-center py-2"
              >
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center transition-all
                  ${isSelected
                    ? 'bg-[#FDFDFE] scale-110'
                    : hasWorkout
                      ? 'bg-[#2FA65A]'
                      : today
                        ? 'bg-[#C0FC01]'
                        : hasPlanned
                          ? 'border-[1.5px] border-[rgba(253,253,254,0.48)]'
                          : 'bg-transparent'
                  }
                `}>
                  {/* Show day number only for today, selected, or completed */}
                  {(isSelected || today || hasWorkout) ? (
                    <span className={`text-[12px] font-semibold tabular-nums ${
                      isSelected || hasWorkout || today ? 'text-white' : 'text-[#FDFDFE]'
                    }`}>
                      {day}
                    </span>
                  ) : hasPlanned ? (
                    /* Outlined circle for planned — no number */
                    null
                  ) : (
                    /* Empty/rest: tiny faint dot */
                    <div className="w-[5px] h-[5px] rounded-full bg-[rgba(253,253,254,0.08)]" />
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-5 mt-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#2FA65A]" />
            <span className="text-[10px] text-[rgba(253,253,254,0.55)]">Voltooid</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#C0FC01]" />
            <span className="text-[10px] text-[rgba(253,253,254,0.55)]">Vandaag</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full border-[1.5px] border-[rgba(253,253,254,0.48)]" />
            <span className="text-[10px] text-[rgba(253,253,254,0.55)]">Gepland</span>
          </div>
        </div>
      </div>

      {/* ═══ DETAIL SLIDE-UP PANEL ═════════════════════════ */}
      {selectedDate && selectedDayData && (
        <div className="animate-slide-up">
          <div className="bg-[#A6ADA7] rounded-2xl border border-[rgba(253,253,254,0.08)] overflow-hidden">
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <p className="text-[15px] font-semibold text-[#FDFDFE]">
                {selectedDate.toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <button
                onClick={() => setSelectedDate(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[rgba(253,253,254,0.08)] transition-colors"
              >
                <X size={16} strokeWidth={1.5} className="text-[rgba(253,253,254,0.55)]" />
              </button>
            </div>

            {/* Completed workouts */}
            {selectedDayData.completed.map(w => {
              const templateName = Array.isArray(w.program_template_days)
                ? w.program_template_days[0]?.name
                : w.program_template_days?.name
              const exercises = groupExercises(w.workout_sets || [])

              return (
                <div key={w.id}>
                  <div className="flex items-center gap-3 px-6 py-3 border-t border-[rgba(253,253,254,0.08)]">
                    <div className="w-9 h-9 rounded-xl bg-[rgba(61,139,92,0.08)] flex items-center justify-center shrink-0">
                      <Dumbbell size={16} strokeWidth={1.5} className="text-[#2FA65A]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[14px] font-medium text-[#FDFDFE]">
                        {templateName || 'Workout voltooid'}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {w.duration_seconds && (
                          <span className="text-[12px] text-[rgba(253,253,254,0.55)] flex items-center gap-1">
                            <Clock size={11} strokeWidth={1.5} />
                            {formatDuration(w.duration_seconds)}
                          </span>
                        )}
                        {w.workout_sets?.length > 0 && (
                          <span className="text-[12px] text-[rgba(253,253,254,0.55)]">
                            {formatVolume(w.workout_sets)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {exercises.length > 0 && exercises.map((ex, i) => {
                    const bestSet = ex.sets.reduce((best, s) =>
                      (s.weight_kg || 0) > (best.weight_kg || 0) ? s : best
                    , ex.sets[0])

                    return (
                      <div key={i} className="flex items-center gap-3 px-6 py-2.5 border-t border-[rgba(253,253,254,0.08)]/50">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-[13px] font-medium text-[#FDFDFE] truncate">{ex.name}</p>
                            {ex.hasPr && (
                              <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#C0FC01] bg-[rgba(212,106,58,0.08)] px-1.5 py-0.5 rounded">PR</span>
                            )}
                          </div>
                        </div>
                        <span className="stat-number text-[14px] text-[#FDFDFE]">
                          {bestSet.weight_kg || 0}<span className="text-[11px] text-[rgba(253,253,254,0.55)] font-normal ml-0.5">kg</span>
                          <span className="text-[rgba(253,253,254,0.48)] mx-1 font-normal">×</span>
                          {bestSet.actual_reps || 0}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {/* Video sessions */}
            {selectedDayData.videoSessions.map(v => (
              <div key={v.id} className="flex items-center gap-3 px-6 py-3 border-t border-[rgba(253,253,254,0.08)]">
                <div className="w-9 h-9 rounded-xl bg-[rgba(48,104,196,0.08)] flex items-center justify-center shrink-0">
                  <Video size={16} strokeWidth={1.5} className="text-[#3068C4]" />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-medium text-[#FDFDFE]">Videocall</p>
                  <p className="text-[12px] text-[rgba(253,253,254,0.55)] mt-0.5">
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
            ))}

            {/* Planned workout */}
            {!hasCompleted && plannedForDay && isFutureOrToday && (
              <div className="flex items-center gap-3 px-6 py-3 border-t border-[rgba(253,253,254,0.08)]">
                <div className="w-9 h-9 rounded-xl bg-[rgba(253,253,254,0.08)] flex items-center justify-center shrink-0">
                  <Dumbbell size={16} strokeWidth={1.5} className="text-[rgba(253,253,254,0.55)]" />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-medium text-[#FDFDFE]">{plannedForDay.name}</p>
                  <p className="text-[12px] text-[rgba(253,253,254,0.55)] mt-0.5">
                    {plannedForDay.focus_area ? `${plannedForDay.focus_area} · ` : ''}~{plannedForDay.estimated_duration} min
                  </p>
                </div>
                {selectedDate && isToday(selectedDate) && (
                  <button
                    onClick={() => router.push('/client/workout')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#C0FC01] text-white text-[11px] font-semibold uppercase tracking-[0.06em] rounded-xl"
                  >
                    <Play size={12} strokeWidth={2} />
                    Start
                  </button>
                )}
              </div>
            )}

            {/* Empty */}
            {!hasCompleted && !hasVideo && (!plannedForDay || !isFutureOrToday) && (
              <div className="text-center py-6 border-t border-[rgba(253,253,254,0.08)]">
                <p className="text-[14px] text-[rgba(253,253,254,0.48)]">Geen activiteit</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state — no selected date */}
      {!selectedDate && completedWorkouts.length === 0 && (
        <div className="text-center py-10 animate-fade-in stagger-3">
          <p className="section-title mb-2">
            Je eerste workout staat klaar
          </p>
          <p className="text-[13px] text-[rgba(253,253,254,0.55)]">
            Na je workout verschijnt deze hier
          </p>
        </div>
      )}
      {!selectedDate && completedWorkouts.length > 0 && (
        <div className="text-center py-8 animate-fade-in stagger-3">
          <p className="text-[14px] text-[rgba(253,253,254,0.48)]">Tik op een dag voor details</p>
        </div>
      )}
    </div>
  )
}
