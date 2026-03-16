'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dumbbell, ChevronRight, ArrowRight } from 'lucide-react'

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
          <div className="h-4 w-24 bg-[#E5E1D9] mb-3 animate-pulse" />
          <div className="h-10 w-56 bg-[#E5E1D9] animate-pulse" />
        </div>
        <div className="space-y-px">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-white animate-pulse" />
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
        <div className="bg-white p-8 text-center">
          <Dumbbell size={40} strokeWidth={1} className="text-[#CCC7BC] mx-auto mb-4" />
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

  return (
    <div className="pb-28">
      {/* Editorial header */}
      <div className="mb-8">
        <span className="text-label">Week {program.current_week}</span>
        <h1 className="text-editorial-h2 text-[#1A1917] mt-3">
          {program.name}
        </h1>
      </div>

      {/* Week progress — thin editorial line */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex-1 h-[2px] bg-[#E5E1D9]">
          <div
            className="h-full bg-[#1A1917] transition-all duration-500"
            style={{ width: `${days.length > 0 ? (workoutsThisWeek / days.length) * 100 : 0}%` }}
          />
        </div>
        <span className="text-[13px] font-semibold text-[#6B6862]">
          {workoutsThisWeek} van {days.length}
        </span>
      </div>

      {/* Training days — stacked, no gaps, editorial list */}
      <div className="bg-white">
        {days.map((day, i) => (
          <button
            key={day.id}
            onClick={() => handleStartWorkout(day)}
            className={`w-full text-left px-6 py-5 flex items-center justify-between gap-4 group hover:bg-[#FAF8F3] transition-colors ${
              i > 0 ? 'border-t border-[#F0EDE8]' : ''
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-3">
                <h3 className="text-[16px] font-semibold text-[#1A1917] tracking-[-0.01em]">
                  {day.name}
                </h3>
                {day.focus && (
                  <span className="text-[11px] uppercase tracking-[0.08em] text-[#A09D96] font-medium">
                    {day.focus}
                  </span>
                )}
              </div>
              <p className="text-[13px] text-[#A09D96] mt-1">
                {day.exercise_count} oefeningen · ±{day.estimated_duration_min} min
              </p>
            </div>
            <ArrowRight strokeWidth={1.5} className="w-4 h-4 text-[#CCC7BC] group-hover:translate-x-1 group-hover:text-[#1A1917] transition-all shrink-0" />
          </button>
        ))}
      </div>
    </div>
  )
}
