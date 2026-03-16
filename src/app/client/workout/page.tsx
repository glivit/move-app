'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dumbbell, ChevronRight, Calendar } from 'lucide-react'

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
        // Use API route to bypass RLS issues on client_programs
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
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text-primary">Training</h1>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-client-surface-muted rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  if (!program) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text-primary">Training</h1>
        </div>
        <div className="bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC] text-center">
          <Dumbbell
            size={48}
            strokeWidth={1.5}
            className="text-client-text-secondary opacity-30 mx-auto mb-3"
          />
          <p className="font-medium text-text-primary">
            Je coach heeft nog geen programma toegewezen
          </p>
          <p className="text-[14px] text-client-text-secondary mt-2">
            Je coach zal binnenkort een trainingsplan voor je opstellen.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header — editorial */}
      <div>
        <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-[#A09D96] mb-2">
          Week {program.current_week}
        </p>
        <h1
          className="text-[32px] font-semibold text-text-primary tracking-[-0.02em] leading-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {program.name}
        </h1>
      </div>

      {/* Week progress — minimal */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1 bg-[#E5E1D9] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1A1917] rounded-full transition-all duration-500"
            style={{ width: `${days.length > 0 ? (workoutsThisWeek / days.length) * 100 : 0}%` }}
          />
        </div>
        <span className="text-[13px] font-semibold text-[#6B6862] shrink-0">
          {workoutsThisWeek}/{days.length}
        </span>
      </div>

      {/* Training days */}
      <div className="space-y-3">
        {days.map((day) => (
          <button
            key={day.id}
            onClick={() => handleStartWorkout(day)}
            className="w-full bg-white rounded-xl p-5 border border-[#E8E4DC] text-left hover:border-[#CCC7BC] transition-all duration-300"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-baseline gap-2.5">
                  <h3 className="font-semibold text-text-primary tracking-[-0.01em]">
                    {day.name}
                  </h3>
                  {day.focus && (
                    <span className="text-[11px] uppercase tracking-[0.06em] text-[#A09D96] font-medium">
                      {day.focus}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-[13px] text-client-text-secondary">
                  <span>{day.exercise_count} oefeningen</span>
                  <span className="text-[#CCC7BC]">·</span>
                  <span>±{day.estimated_duration_min} min</span>
                </div>
              </div>
              <ChevronRight size={18} strokeWidth={1.5} className="text-[#CCC7BC] flex-shrink-0 mt-1" />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
