'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dumbbell, ArrowRight, Clock, Flame } from 'lucide-react'

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

export default function WorkoutOverviewPage() {
  const router = useRouter()
  const [program, setProgram] = useState<ClientProgram | null>(null)
  const [days, setDays] = useState<TemplateDay[]>([])
  const [loading, setLoading] = useState(true)
  const [workoutsThisWeek, setWorkoutsThisWeek] = useState(0)

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

  if (loading) {
    return (
      <div className="pb-28">
        <div className="mb-8">
          <div className="h-4 w-24 bg-[#E5E1D9] rounded-md mb-3 animate-pulse" />
          <div className="h-10 w-56 bg-[#E5E1D9] rounded-lg animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-white rounded-2xl shadow-[var(--shadow-card)] animate-pulse" />
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
          <h1 className="text-editorial-h2 text-[#1A1917] mt-3">
            Geen programma
          </h1>
        </div>
        <div className="bg-white rounded-2xl shadow-[var(--shadow-card)] p-8 text-center">
          <div className="w-14 h-14 bg-[var(--color-pop-light)] rounded-xl flex items-center justify-center mx-auto mb-4">
            <Dumbbell size={24} strokeWidth={1.5} className="text-[var(--color-pop)]" />
          </div>
          <p className="text-[15px] font-medium text-[#1A1917] mb-1">
            Nog geen programma toegewezen
          </p>
          <p className="text-[13px] text-[#A09D96]">
            Je coach zal binnenkort een trainingsplan voor je opstellen.
          </p>
        </div>
      </div>
    )
  }

  const progressPct = days.length > 0 ? (workoutsThisWeek / days.length) * 100 : 0

  return (
    <div className="pb-28">
      {/* Editorial header */}
      <div className="mb-8">
        <span className="text-label">Week {program.current_week}</span>
        <h1 className="text-editorial-h2 text-[#1A1917] mt-3">
          {program.name}
        </h1>
      </div>

      {/* Week progress card */}
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
      </div>

      {/* Training days — rounded cards */}
      <div className="space-y-3">
        {days.map((day, i) => (
          <button
            key={day.id}
            onClick={() => handleStartWorkout(day)}
            className="w-full text-left bg-white rounded-2xl shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] px-5 py-4 flex items-center gap-4 group transition-all animate-gentle-rise"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {/* Day number pill */}
            <div className="w-10 h-10 bg-[#F5F2EC] rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-[var(--color-pop-light)] transition-colors">
              <span className="text-[14px] font-bold text-[#6B6862] group-hover:text-[var(--color-pop)] transition-colors">
                D{day.day_number}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <h3 className="text-[15px] font-semibold text-[#1A1917] tracking-[-0.01em]">
                  {day.name}
                </h3>
                {day.focus && (
                  <span className="text-[10px] uppercase tracking-[0.08em] text-[#A09D96] font-medium">
                    {day.focus}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[12px] text-[#A09D96] flex items-center gap-1">
                  <Dumbbell size={11} strokeWidth={2} />
                  {day.exercise_count} oefeningen
                </span>
                <span className="text-[12px] text-[#A09D96] flex items-center gap-1">
                  <Clock size={11} strokeWidth={2} />
                  ±{day.estimated_duration_min} min
                </span>
              </div>
            </div>

            <ArrowRight strokeWidth={1.5} className="w-4 h-4 text-[#CCC7BC] group-hover:translate-x-1 group-hover:text-[var(--color-pop)] transition-all shrink-0" />
          </button>
        ))}
      </div>
    </div>
  )
}
