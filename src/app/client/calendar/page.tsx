'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  ChevronLeft, ChevronRight, Dumbbell, Video,
  Clock, ArrowRight, Play
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────

interface CompletedWorkout {
  id: string
  started_at: string
  completed_at: string
  duration_seconds: number | null
  mood_rating: number | null
  template_day_id: string | null
}

interface PlannedDay {
  id: string
  name: string
  day_of_week: number
  focus_area: string
  estimated_duration: number
}

interface VideoSession {
  id: string
  scheduled_at: string
  duration_minutes: number
  status: string
}

interface DayData {
  completed: CompletedWorkout[]
  planned: PlannedDay | null
  videoSessions: VideoSession[]
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
  return day === 0 ? 6 : day - 1 // Monday = 0
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  return `${m} min`
}

// ─── Main Component ─────────────────────────────────────────

export default function CalendarPage() {
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [completedWorkouts, setCompletedWorkouts] = useState<CompletedWorkout[]>([])
  const [plannedDays, setPlannedDays] = useState<PlannedDay[]>([])
  const [videoSessions, setVideoSessions] = useState<VideoSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Completed workouts
        const { data: workouts } = await supabase
          .from('workout_sessions')
          .select('id, started_at, completed_at, duration_seconds, mood_rating, template_day_id')
          .eq('client_id', user.id)
          .not('completed_at', 'is', null)
          .order('started_at', { ascending: false })

        if (workouts) setCompletedWorkouts(workouts as CompletedWorkout[])

        // Current program planned days
        const { data: program } = await supabase
          .from('client_programs')
          .select('id, program_templates(id, template_days(id, name, day_of_week, focus_area, estimated_duration))')
          .eq('client_id', user.id)
          .eq('status', 'active')
          .single()

        if (program) {
          const template = (program as any).program_templates
          if (template?.template_days) {
            setPlannedDays(template.template_days as PlannedDay[])
          }
        }

        // Video sessions
        const { data: videos } = await supabase
          .from('video_sessions')
          .select('id, scheduled_at, duration_minutes, status')
          .eq('client_id', user.id)
          .not('status', 'eq', 'cancelled')
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
    const map: Record<string, DayData> = {}

    // Map completed workouts
    for (const w of completedWorkouts) {
      const dateKey = new Date(w.started_at).toISOString().slice(0, 10)
      if (!map[dateKey]) map[dateKey] = { completed: [], planned: null, videoSessions: [] }
      map[dateKey].completed.push(w)
    }

    // Map video sessions
    for (const v of videoSessions) {
      const dateKey = new Date(v.scheduled_at).toISOString().slice(0, 10)
      if (!map[dateKey]) map[dateKey] = { completed: [], planned: null, videoSessions: [] }
      map[dateKey].videoSessions.push(v)
    }

    return map
  }, [completedWorkouts, videoSessions])

  // Selected date data
  const selectedDateKey = selectedDate.toISOString().slice(0, 10)
  const selectedDayOfWeek = selectedDate.getDay()
  const selectedDayData = dayDataMap[selectedDateKey] || { completed: [], planned: null, videoSessions: [] }

  // Check if selected date has a planned workout (day of week match)
  const plannedForDay = plannedDays.find(d => d.day_of_week === selectedDayOfWeek)
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

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-6 h-6 border-[1.5px] border-[#CCC7BC] border-t-[#1A1917] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="pb-24">

      {/* ═══ HEADER ══════════════════════════════════════════ */}
      <div className="pt-1 mb-6">
        <p className="text-label mb-2">Overzicht</p>
        <h1
          className="text-[32px] font-semibold text-[#1A1917] tracking-[-0.03em] leading-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Kalender
        </h1>
      </div>

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
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS_NL.map(d => (
            <div key={d} className="text-center text-[10px] font-bold uppercase tracking-[0.1em] text-[#C5C2BC] py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {/* Empty cells before first day */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const date = new Date(currentYear, currentMonth, day)
            const dateKey = date.toISOString().slice(0, 10)
            const dayData = dayDataMap[dateKey]
            const hasWorkout = dayData?.completed?.length > 0
            const hasVid = dayData?.videoSessions?.length > 0
            const isSelected = isSameDay(date, selectedDate)
            const today = isToday(date)

            // Check if this day has a planned workout
            const dayOfWeek = date.getDay()
            const hasPlanned = plannedDays.some(d => d.day_of_week === dayOfWeek) && !hasWorkout && date >= new Date(new Date().toISOString().slice(0, 10))

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

                {/* Indicators */}
                <div className="flex gap-0.5 mt-0.5">
                  {hasWorkout && <div className={`w-1.5 h-1.5 ${isSelected ? 'bg-white' : 'bg-[#3D8B5C]'}`} />}
                  {hasVid && <div className={`w-1.5 h-1.5 ${isSelected ? 'bg-white/60' : 'bg-[#3068C4]'}`} />}
                  {hasPlanned && !hasWorkout && <div className={`w-1.5 h-1.5 ${isSelected ? 'bg-white/40' : 'bg-[#DDD9D0]'}`} />}
                </div>
              </button>
            )
          })}
        </div>

        {/* Legend */}
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

      {/* ═══ SELECTED DAY DETAIL ═════════════════════════════ */}
      <div className="border-t border-[#E8E4DC] pt-6">
        <p className="text-[16px] font-semibold text-[#1A1917] mb-4">
          {selectedDate.toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>

        {/* Completed workouts */}
        {selectedDayData.completed.map(w => (
          <div key={w.id} className="border border-[#E8E4DC] bg-white p-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#3D8B5C]/10 flex items-center justify-center shrink-0">
                <Dumbbell size={18} strokeWidth={1.5} className="text-[#3D8B5C]" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-[#1A1917]">Workout voltooid</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {w.duration_seconds && (
                    <span className="text-[12px] text-[#A09D96] flex items-center gap-1">
                      <Clock size={12} strokeWidth={1.5} />
                      {formatDuration(w.duration_seconds)}
                    </span>
                  )}
                  {w.mood_rating && (
                    <span className="text-[12px] text-[#A09D96]">
                      Gevoel: {['', '😫', '😐', '😊', '💪', '🔥'][w.mood_rating] || ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Video sessions */}
        {selectedDayData.videoSessions.map(v => (
          <div key={v.id} className="border border-[#E8E4DC] bg-white p-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#3068C4]/10 flex items-center justify-center shrink-0">
                <Video size={18} strokeWidth={1.5} className="text-[#3068C4]" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-[#1A1917]">Video sessie</p>
                <p className="text-[12px] text-[#A09D96] mt-0.5">
                  {new Date(v.scheduled_at).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })} · {v.duration_minutes} min
                </p>
              </div>
              {v.status === 'scheduled' && (
                <button
                  onClick={() => router.push(`/client/video/${v.id}`)}
                  className="px-3 py-1.5 bg-[#3068C4] text-white text-[11px] font-semibold uppercase tracking-[0.06em]"
                >
                  Join
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Planned workout */}
        {!hasCompleted && plannedForDay && isFutureOrToday && (
          <div className="border border-[#E8E4DC] bg-white p-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#E5E1D9] flex items-center justify-center shrink-0">
                <Dumbbell size={18} strokeWidth={1.5} className="text-[#A09D96]" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-[#1A1917]">{plannedForDay.name}</p>
                <p className="text-[12px] text-[#A09D96] mt-0.5">
                  {plannedForDay.focus_area} · ~{plannedForDay.estimated_duration} min
                </p>
              </div>
              {isToday(selectedDate) && (
                <button
                  onClick={() => router.push('/client/workout')}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#1A1917] text-white text-[11px] font-semibold uppercase tracking-[0.06em]"
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
