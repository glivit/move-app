'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dumbbell, ArrowRight, Clock, Flame, Play, CheckCircle2, Calendar, MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase'

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
  '1': 'Maandag',
  '2': 'Dinsdag',
  '3': 'Woensdag',
  '4': 'Donderdag',
  '5': 'Vrijdag',
  '6': 'Zaterdag',
  '7': 'Zondag',
}

const WEEKDAY_SHORT: Record<string, string> = {
  '1': 'Ma',
  '2': 'Di',
  '3': 'Wo',
  '4': 'Do',
  '5': 'Vr',
  '6': 'Za',
  '7': 'Zo',
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
  const [coachFeedback, setCoachFeedback] = useState<{ content: string; created_at: string } | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch('/api/client-program')
        if (!res.ok) {
          if (res.status === 401) {
            router.push('/auth/login')
            return
          }
          setLoading(false)
          return
        }

        const data = await res.json()

        if (data.program) {
          setProgram(data.program)
          setDays(data.days || [])
          setWorkoutsThisWeek(data.workoutsThisWeek || 0)
          setSchedule(data.schedule || {})
          setTodayDay(data.todayDay || null)
          setTodayCompleted(data.todayCompleted || false)
        }

        // Load recent coach feedback (messages from coach within last 48h)
        try {
          const supabase = createClient()
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const twoDaysAgo = new Date()
            twoDaysAgo.setHours(twoDaysAgo.getHours() - 48)

            const { data: msgs } = await supabase
              .from('messages')
              .select('content, created_at, sender_id')
              .eq('receiver_id', user.id)
              .neq('sender_id', user.id)
              .eq('message_type', 'text')
              .gte('created_at', twoDaysAgo.toISOString())
              .order('created_at', { ascending: false })
              .limit(1)

            if (msgs && msgs.length > 0) {
              setCoachFeedback(msgs[0])
            }
          }
        } catch (e) {
          // Silent - feedback is optional
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

  // Helper: find weekday label for a template day
  const getWeekdayForDay = (dayId: string): string | null => {
    for (const [weekday, templateDayId] of Object.entries(schedule)) {
      if (templateDayId === dayId) return weekday
    }
    return null
  }

  if (loading) {
    return (
      <div className="pb-28">
        <div className="mb-8">
          <div className="h-4 w-24 bg-[#E5E1D9] rounded-md mb-3 animate-pulse" />
          <div className="h-10 w-56 bg-[#E5E1D9] rounded-lg animate-pulse" />
        </div>
        <div className="h-32 bg-white rounded-2xl shadow-[var(--shadow-card)] animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-white rounded-2xl shadow-[var(--shadow-card)] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!program) {
    return (
      <div className="pb-28">
        <div className="mb-8">
          <span className="text-label">Training</span>
          <h1 className="text-editorial-h2 text-[#1A1917] mt-3">Geen programma</h1>
        </div>
        <div className="bg-white rounded-2xl shadow-[var(--shadow-card)] p-8 text-center">
          <div className="w-14 h-14 bg-[var(--color-pop-light)] rounded-xl flex items-center justify-center mx-auto mb-4">
            <Dumbbell size={24} strokeWidth={1.5} className="text-[var(--color-pop)]" />
          </div>
          <p className="text-[15px] font-medium text-[#1A1917] mb-1">Nog geen programma toegewezen</p>
          <p className="text-[13px] text-[#A09D96]">Je coach zal binnenkort een trainingsplan voor je opstellen.</p>
        </div>
      </div>
    )
  }

  const hasSchedule = Object.keys(schedule).length > 0
  const progressPct = days.length > 0 ? (workoutsThisWeek / days.length) * 100 : 0

  return (
    <div className="pb-28">
      {/* Editorial header */}
      <div className="mb-6">
        <span className="text-label">Week {program.current_week}</span>
        <h1 className="text-editorial-h2 text-[#1A1917] mt-3">{program.name}</h1>
      </div>

      {/* ══════ TODAY'S WORKOUT — Hero Card ══════ */}
      {todayDay && !todayCompleted && (
        <button
          onClick={() => handleStartWorkout(todayDay)}
          className="w-full text-left mb-5 group"
        >
          <div className="bg-[#1A1917] rounded-2xl p-5 relative overflow-hidden">
            {/* Subtle gradient accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-pop)] opacity-[0.08] rounded-full -translate-y-8 translate-x-8" />

            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--color-pop)]">
                  Vandaag
                </span>
                <span className="text-[11px] text-[#6B6862]">·</span>
                <span className="text-[11px] text-[#6B6862] uppercase tracking-[0.06em]">
                  {WEEKDAY_LABELS[String(new Date().getDay() === 0 ? 7 : new Date().getDay())] || ''}
                </span>
              </div>

              <h2 className="text-[20px] font-bold text-white mb-1">{todayDay.name}</h2>
              {todayDay.focus && (
                <p className="text-[13px] text-[#A09D96] mb-4">{todayDay.focus}</p>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-[12px] text-[#6B6862] flex items-center gap-1.5">
                    <Dumbbell size={12} strokeWidth={2} className="text-[#6B6862]" />
                    {todayDay.exercise_count} oefeningen
                  </span>
                  <span className="text-[12px] text-[#6B6862] flex items-center gap-1.5">
                    <Clock size={12} strokeWidth={2} className="text-[#6B6862]" />
                    ±{todayDay.estimated_duration_min} min
                  </span>
                </div>

                <div className="flex items-center gap-2 bg-[var(--color-pop)] px-4 py-2 rounded-xl group-hover:bg-[#E07A4A] transition-colors">
                  <Play size={14} strokeWidth={2.5} className="text-white" />
                  <span className="text-[12px] font-bold text-white uppercase tracking-[0.06em]">Start</span>
                </div>
              </div>
            </div>
          </div>
        </button>
      )}

      {/* Today completed state */}
      {todayDay && todayCompleted && (
        <div className="bg-white rounded-2xl shadow-[var(--shadow-card)] p-5 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#3D8B5C]/10 rounded-xl flex items-center justify-center">
              <CheckCircle2 size={20} strokeWidth={1.5} className="text-[#3D8B5C]" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-[#1A1917]">Training voltooid</p>
              <p className="text-[12px] text-[#A09D96]">{todayDay.name} — goed gedaan!</p>
            </div>
          </div>
        </div>
      )}

      {/* Coach Feedback */}
      {coachFeedback && (
        <div className="bg-white rounded-2xl shadow-[var(--shadow-card)] p-5 mb-5 border-l-4 border-[var(--color-pop)]">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-[var(--color-pop-light)] rounded-xl flex items-center justify-center flex-shrink-0">
              <MessageSquare size={16} strokeWidth={1.5} className="text-[var(--color-pop)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[12px] font-bold text-[var(--color-pop)] uppercase tracking-[0.06em]">Glenn</p>
                <span className="text-[11px] text-[#CCC7BC]">
                  {(() => {
                    const diff = Date.now() - new Date(coachFeedback.created_at).getTime()
                    const hours = Math.floor(diff / 3600000)
                    if (hours < 1) return 'zojuist'
                    if (hours < 24) return `${hours}u geleden`
                    return `${Math.floor(hours / 24)}d geleden`
                  })()}
                </span>
              </div>
              <p className="text-[14px] text-[#1A1917] leading-relaxed">{coachFeedback.content}</p>
            </div>
          </div>
        </div>
      )}

      {/* No workout today */}
      {!todayDay && hasSchedule && (
        <div className="bg-white rounded-2xl shadow-[var(--shadow-card)] p-5 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#F5F2EC] rounded-xl flex items-center justify-center">
              <Calendar size={18} strokeWidth={1.5} className="text-[#A09D96]" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-[#1A1917]">Rustdag</p>
              <p className="text-[12px] text-[#A09D96]">Geen training ingepland voor vandaag</p>
            </div>
          </div>
        </div>
      )}

      {/* Week progress */}
      <div className="bg-white rounded-2xl shadow-[var(--shadow-card)] p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[var(--color-pop-light)] rounded-lg flex items-center justify-center">
              <Flame size={16} strokeWidth={2} className="text-[var(--color-pop)]" />
            </div>
            <span className="text-[13px] font-semibold text-[#6B6862]">Weekvoortgang</span>
          </div>
          <span className="text-[15px] font-bold text-[var(--color-pop)] tabular-nums">
            {workoutsThisWeek}/{days.length}
          </span>
        </div>
        <div className="h-2 bg-[#F0EDE8] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--color-pop)] rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Mini week schedule indicator */}
        {hasSchedule && (
          <div className="flex gap-1.5 mt-3">
            {['1', '2', '3', '4', '5', '6', '7'].map(wd => {
              const isScheduled = !!schedule[wd]
              const jsDay = new Date().getDay()
              const isoToday = jsDay === 0 ? 7 : jsDay
              const isToday = wd === String(isoToday)

              return (
                <div
                  key={wd}
                  className={`flex-1 text-center py-1 rounded-md text-[10px] font-bold uppercase tracking-[0.06em] ${
                    isToday && isScheduled
                      ? 'bg-[var(--color-pop)] text-white'
                      : isToday
                        ? 'bg-[#1A1917] text-white'
                        : isScheduled
                          ? 'bg-[#F5F2EC] text-[#6B6862]'
                          : 'text-[#DDD9D0]'
                  }`}
                >
                  {WEEKDAY_SHORT[wd]}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* All training days */}
      <div className="mb-3">
        <span className="text-label">Alle trainingsdagen</span>
      </div>
      <div className="space-y-3">
        {days.map((day, i) => {
          const weekday = getWeekdayForDay(day.id)
          const isToday = todayDay?.id === day.id

          return (
            <button
              key={day.id}
              onClick={() => handleStartWorkout(day)}
              className={`w-full text-left bg-white rounded-2xl shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] px-5 py-4 flex items-center gap-4 group transition-all animate-gentle-rise ${
                isToday ? 'ring-2 ring-[var(--color-pop)]/20' : ''
              }`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Day number pill */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                isToday
                  ? 'bg-[var(--color-pop-light)]'
                  : 'bg-[#F5F2EC] group-hover:bg-[var(--color-pop-light)]'
              }`}>
                <span className={`text-[14px] font-bold transition-colors ${
                  isToday
                    ? 'text-[var(--color-pop)]'
                    : 'text-[#6B6862] group-hover:text-[var(--color-pop)]'
                }`}>
                  D{day.day_number}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-semibold text-[#1A1917] tracking-[-0.01em]">
                    {day.name}
                  </h3>
                  {weekday && (
                    <span className="text-[10px] uppercase tracking-[0.08em] text-[var(--color-pop)] font-bold bg-[var(--color-pop-light)] px-1.5 py-0.5 rounded-md">
                      {WEEKDAY_SHORT[weekday]}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  {day.focus && (
                    <span className="text-[12px] text-[#A09D96]">{day.focus}</span>
                  )}
                  <span className="text-[12px] text-[#A09D96] flex items-center gap-1">
                    <Dumbbell size={11} strokeWidth={2} />
                    {day.exercise_count}
                  </span>
                  <span className="text-[12px] text-[#A09D96] flex items-center gap-1">
                    <Clock size={11} strokeWidth={2} />
                    ±{day.estimated_duration_min}m
                  </span>
                </div>
              </div>

              <ArrowRight strokeWidth={1.5} className="w-4 h-4 text-[#CCC7BC] group-hover:translate-x-1 group-hover:text-[var(--color-pop)] transition-all shrink-0" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
