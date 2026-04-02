'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Dumbbell, Clock, Play, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { cachedFetch } from '@/lib/fetcher'

interface ClientProgram {
  id: string
  name: string
  current_week: number
  client_id: string
  template_id: string
}

interface TemplateDay {
  id: string
  template_id: string
  day_number: number
  name: string
  focus: string
  estimated_duration_min: number
  sort_order: number
  exercise_count?: number
}

const WEEKDAY_LABELS: Record<string, string> = {
  '1': 'Maandag', '2': 'Dinsdag', '3': 'Woensdag', '4': 'Donderdag',
  '5': 'Vrijdag', '6': 'Zaterdag', '7': 'Zondag',
}

const WEEKDAY_SHORT: Record<string, string> = {
  '1': 'Ma', '2': 'Di', '3': 'Wo', '4': 'Do', '5': 'Vr', '6': 'Za', '7': 'Zo',
}

export default function WorkoutOverviewPage() {
  const router = useRouter()
  const [program, setProgram] = useState<ClientProgram | null>(null)
  const [days, setDays] = useState<TemplateDay[]>([])
  const [loading, setLoading] = useState(true)
  const [workoutsThisWeek, setWorkoutsThisWeek] = useState(0)
  const [schedule, setSchedule] = useState<Record<string, string>>({})
  const [todayDay, setTodayDay] = useState<TemplateDay | null>(null)
  const [todayCompleted, setTodayCompleted] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await cachedFetch('/api/client-program', { maxAge: 30_000 })

        if (data.program) {
          setProgram(data.program)
          setDays(data.days || [])
          setWorkoutsThisWeek(data.workoutsThisWeek || 0)
          setSchedule(data.schedule || {})
          setTodayDay(data.todayDay || null)
          setTodayCompleted(data.todayCompleted || false)
        }
      } catch (error) {
        console.error('Error loading program:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  const handleStartWorkout = (day: TemplateDay) => {
    if (!program) return
    router.push(`/client/workout/active?dayId=${day.id}&programId=${program.id}`)
  }

  const getWeekdayForDay = (dayId: string): string | null => {
    for (const [weekday, templateDayId] of Object.entries(schedule)) {
      if (templateDayId === dayId) return weekday
    }
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1A1917] border-t-transparent" />
      </div>
    )
  }

  if (!program) {
    return (
      <div className="pb-28">
        <h1
          className="text-[28px] tracking-[-0.5px] leading-[1.1] text-[#1A1917] mb-6"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
        >
          Training
        </h1>
        <div className="py-16 text-center">
          <p
            className="text-[36px] tracking-[-1px] leading-[1.1] text-[#1A1917] mb-3"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
          >
            Geen programma
          </p>
          <p className="text-[14px] text-[#ACACAC]" style={{ fontFamily: 'var(--font-body)' }}>
            Je coach zal binnenkort een trainingsplan opstellen.
          </p>
        </div>
      </div>
    )
  }

  const hasSchedule = Object.keys(schedule).length > 0
  const progressPct = days.length > 0 ? (workoutsThisWeek / days.length) * 100 : 0
  const jsDay = new Date().getDay()
  const isoToday = jsDay === 0 ? 7 : jsDay

  return (
    <div className="pb-28">

      {/* ── Back ── */}
      <button
        onClick={() => router.push('/client')}
        className="flex items-center gap-1.5 mb-7 mt-2 group"
      >
        <ChevronLeft strokeWidth={1.5} className="w-[18px] h-[18px] text-[#C0C0C0] group-hover:text-[#1A1917] transition-colors" />
        <span className="text-[14px] text-[#C0C0C0] group-hover:text-[#1A1917] transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
          Home
        </span>
      </button>

      {/* ── Header ── */}
      <p
        className="text-[12px] font-medium text-[#B0B0B0] uppercase tracking-[1.5px] mb-2"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        Week {program.current_week}
      </p>
      <h1
        className="text-[28px] tracking-[-0.5px] leading-[1.1] text-[#1A1917] mb-8"
        style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
      >
        {program.name}
      </h1>

      {/* ── TODAY'S WORKOUT — Hero ── */}
      {todayDay && !todayCompleted && (
        <button
          onClick={() => handleStartWorkout(todayDay)}
          className="w-full text-left mb-10 group"
        >
          <p
            className="text-[12px] font-medium text-[#D46A3A] uppercase tracking-[1.5px] mb-3"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Vandaag · {WEEKDAY_LABELS[String(isoToday)] || ''}
          </p>
          <p
            className="text-[36px] tracking-[-1px] leading-[1.1] text-[#1A1917] mb-1"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
          >
            {todayDay.name}
          </p>
          {todayDay.focus && (
            <p className="text-[14px] text-[#ACACAC] mb-5" style={{ fontFamily: 'var(--font-body)' }}>
              {todayDay.focus}
            </p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-[13px] text-[#C0C0C0] flex items-center gap-1.5" style={{ fontFamily: 'var(--font-body)' }}>
                <Dumbbell size={13} strokeWidth={1.5} />
                {todayDay.exercise_count} oefeningen
              </span>
              <span className="text-[13px] text-[#C0C0C0] flex items-center gap-1.5" style={{ fontFamily: 'var(--font-body)' }}>
                <Clock size={13} strokeWidth={1.5} />
                ±{todayDay.estimated_duration_min} min
              </span>
            </div>

            <div className="flex items-center gap-2 bg-[#1A1917] px-5 py-2.5 rounded-xl group-hover:bg-[#333] transition-colors">
              <Play size={14} strokeWidth={2.5} className="text-white" />
              <span
                className="text-[12px] font-bold text-white uppercase tracking-[0.06em]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Start
              </span>
            </div>
          </div>
        </button>
      )}

      {/* Today completed */}
      {todayDay && todayCompleted && (
        <div className="flex items-center gap-3 py-5 border-t border-[#F0F0EE] mb-8">
          <div className="w-7 h-7 rounded-full bg-[#3D8B5C] flex items-center justify-center shrink-0">
            <Check strokeWidth={2.5} className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p
              className="text-[15px] font-medium text-[#1A1917]"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Training voltooid
            </p>
            <p className="text-[12px] text-[#C0C0C0]" style={{ fontFamily: 'var(--font-body)' }}>
              {todayDay.name} — goed gedaan
            </p>
          </div>
        </div>
      )}

      {/* No workout today (rest day) */}
      {!todayDay && hasSchedule && (
        <div className="mb-10">
          <p
            className="text-[48px] tracking-[-2px] leading-[1] text-[#1A1917]"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 200 }}
          >
            Rustdag
          </p>
          <p className="text-[14px] text-[#ACACAC] mt-2" style={{ fontFamily: 'var(--font-body)' }}>
            Geen training ingepland voor vandaag
          </p>
        </div>
      )}

      {/* ── Week progress ── */}
      <div className="border-t border-[#F0F0EE] pt-6 mb-10">
        <div className="flex items-center justify-between mb-4">
          <p
            className="text-[12px] font-medium text-[#B0B0B0] uppercase tracking-[1.5px]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Weekvoortgang
          </p>
          <p
            className="text-[20px] tracking-[-0.5px]"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
          >
            <span className="text-[#1A1917]">{workoutsThisWeek}</span>
            <span className="text-[#C0C0C0]">/{days.length}</span>
          </p>
        </div>

        {/* Thin progress bar */}
        <div className="w-full h-[3px] bg-[#F0F0EE] rounded-full overflow-hidden mb-5">
          <div
            className="h-full rounded-full bg-[#D46A3A] transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Week dots */}
        {hasSchedule && (
          <div className="flex gap-2">
            {['1', '2', '3', '4', '5', '6', '7'].map(wd => {
              const isScheduled = !!schedule[wd]
              const isToday = wd === String(isoToday)

              return (
                <div key={wd} className="flex-1 text-center">
                  <div
                    className={`w-9 h-9 mx-auto rounded-full flex items-center justify-center text-[11px] font-bold uppercase tracking-[0.04em] transition-colors ${
                      isToday && isScheduled
                        ? 'bg-[#D46A3A] text-white'
                        : isToday
                          ? 'bg-[#1A1917] text-white'
                          : isScheduled
                            ? 'bg-[#F0F0EE] text-[#1A1917]'
                            : 'text-[#D5D5D5]'
                    }`}
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {WEEKDAY_SHORT[wd]}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── All training days ── */}
      <p
        className="text-[12px] font-medium text-[#B0B0B0] uppercase tracking-[1.5px] mb-4"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        Alle trainingsdagen
      </p>

      <div>
        {days.map((day) => {
          const weekday = getWeekdayForDay(day.id)
          const isToday = todayDay?.id === day.id

          return (
            <button
              key={day.id}
              onClick={() => handleStartWorkout(day)}
              className="w-full text-left flex items-center gap-4 py-4 border-t border-[#F0F0EE] group"
            >
              {/* Day number */}
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[13px] font-bold ${
                  isToday
                    ? 'bg-[#D46A3A] text-white'
                    : 'bg-[#F0F0EE] text-[#1A1917] group-hover:bg-[#1A1917] group-hover:text-white'
                } transition-colors`}
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {day.day_number}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className="text-[15px] font-medium text-[#1A1917] truncate"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {day.name}
                  </p>
                  {weekday && (
                    <span
                      className="text-[10px] text-[#D46A3A] font-bold uppercase tracking-[0.06em]"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {WEEKDAY_SHORT[weekday]}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  {day.focus && (
                    <span className="text-[12px] text-[#C0C0C0]" style={{ fontFamily: 'var(--font-body)' }}>
                      {day.focus}
                    </span>
                  )}
                  <span className="text-[12px] text-[#C0C0C0] flex items-center gap-1" style={{ fontFamily: 'var(--font-body)' }}>
                    <Dumbbell size={11} strokeWidth={1.5} />
                    {day.exercise_count}
                  </span>
                  <span className="text-[12px] text-[#C0C0C0] flex items-center gap-1" style={{ fontFamily: 'var(--font-body)' }}>
                    <Clock size={11} strokeWidth={1.5} />
                    ±{day.estimated_duration_min}m
                  </span>
                </div>
              </div>

              <ChevronRight strokeWidth={1.5} className="w-4 h-4 text-[#D5D5D5] group-hover:text-[#1A1917] transition-colors shrink-0" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
