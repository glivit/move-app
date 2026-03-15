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
        <div className="bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] text-center">
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-semibold text-text-primary">Training</h1>
        <p className="text-[14px] text-client-text-secondary mt-1">
          {program.name} • Week {program.current_week}
        </p>
      </div>

      {/* Week stats */}
      <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] flex items-center gap-3">
        <div className="bg-[#F5F0E8] rounded-full p-3">
          <Calendar size={20} strokeWidth={1.5} className="text-[#8B6914]" />
        </div>
        <div>
          <p className="text-[13px] text-client-text-secondary">Deze week</p>
          <p className="font-semibold text-text-primary">
            {workoutsThisWeek} van {days.length} trainingen voltooid
          </p>
        </div>
      </div>

      {/* Training days */}
      <div className="space-y-3">
        {days.map((day) => (
          <button
            key={day.id}
            onClick={() => handleStartWorkout(day)}
            className="w-full bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] text-left hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-shadow"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <h3 className="font-semibold text-text-primary">
                    {day.name}
                  </h3>
                  {day.focus && (
                    <span className="text-[12px] bg-[#F5F0E8] text-[#8B6914] px-2 py-0.5 rounded-full font-medium">
                      {day.focus}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2 text-[13px] text-client-text-secondary">
                  <span>{day.exercise_count} oefeningen</span>
                  <span>•</span>
                  <span>±{day.estimated_duration_min} minuten</span>
                </div>
              </div>
              <ChevronRight size={20} strokeWidth={1.5} className="text-client-text-secondary flex-shrink-0 mt-1" />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
