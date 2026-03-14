'use client'

import { useEffect, useState } from 'react'
import { Dumbbell, ArrowLeft, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { ManualProgramForm } from '@/components/coach/ManualProgramForm'
import { ProgramAssignment } from '@/components/coach/ProgramAssignment'
import { PeriodizationTimeline } from '@/components/coach/PeriodizationTimeline'
import { useParams } from 'next/navigation'

interface Program {
  id: string
  title: string
  program_type: 'HEVY' | 'Handmatig'
  created_at: string
  description: string
}

interface Profile {
  full_name: string
  package: string
}

interface ProgramDay {
  day: string
  exercises: Array<{
    name: string
    sets: number
    reps: number
    rest_seconds?: number
    notes?: string
  }>
}

interface PageParams {
  id: string
}

export default function ProgramPage() {
  const params = useParams() as unknown as PageParams
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedDays, setExpandedDays] = useState<string[]>([])
  const [clientProgram, setClientProgram] = useState<{ id: string; current_week: number; duration_weeks: number } | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, package')
        .eq('id', params.id)
        .single()

      const { data: programsData } = await supabase
        .from('programs')
        .select('*')
        .eq('client_id', params.id)
        .order('created_at', { ascending: false })

      // Load client_programs for periodization
      const { data: cpData } = await supabase
        .from('client_programs')
        .select('id, current_week, template_id, program_templates(duration_weeks)')
        .eq('client_id', params.id)
        .eq('is_active', true)
        .single()

      if (cpData) {
        setClientProgram({
          id: cpData.id,
          current_week: cpData.current_week || 1,
          duration_weeks: (cpData as any).program_templates?.duration_weeks || 8,
        })
      }

      setProfile(profileData)
      setPrograms(programsData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const clientName = profile?.full_name || 'Client'
  const currentProgram = programs?.[0] as Program | undefined

  let programSchedule: ProgramDay[] = []
  if (currentProgram?.description) {
    try {
      programSchedule = JSON.parse(currentProgram.description)
    } catch (e) {
      console.error('Error parsing program description:', e)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const toggleDayExpanded = (dayName: string) => {
    setExpandedDays((prev) =>
      prev.includes(dayName) ? prev.filter((d) => d !== dayName) : [...prev, dayName]
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-client-bg">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-accent-dark border-t-transparent" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-client-bg">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Back Link */}
        <Link
          href={`/coach/clients/${params.id}`}
          className="inline-flex items-center gap-2 mb-8 text-[13px] font-medium transition-colors hover:opacity-75 text-text-primary"
        >
          <ArrowLeft strokeWidth={1.5} size={18} />
          Terug naar {clientName}
        </Link>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-display font-semibold mb-2 text-text-primary">
            {clientName} — Trainingsprogramma
          </h1>
          <p className="text-[13px] text-client-text-secondary">
            Beheer en volg het trainingsprogramma van je client
          </p>
        </div>

        {/* Periodization Timeline */}
        {clientProgram && (
          <div className="mb-8">
            <PeriodizationTimeline
              clientProgramId={clientProgram.id}
              totalWeeks={clientProgram.duration_weeks}
              currentWeek={clientProgram.current_week}
            />
          </div>
        )}

        {/* Current Program or Empty State */}
        {currentProgram ? (
          <Card className="rounded-2xl p-8 mb-10 bg-white shadow-clean border border-client-border">
            {/* Program Header */}
            <div className="mb-8">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2 text-text-primary">
                    {currentProgram.title}
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-accent-light text-accent-dark">
                      {currentProgram.program_type}
                    </span>
                    <span className="text-[13px] text-client-text-secondary">
                      Gemaakt op {formatDate(currentProgram.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Program Description */}
              {programSchedule.length > 0 && (
                <p className="text-[13px] mb-6 text-client-text-secondary">
                  {programSchedule.length}-daags trainingsprogramma
                </p>
              )}
            </div>

            {/* Weekly Schedule */}
            {programSchedule.length > 0 ? (
              <div className="space-y-4">
                {programSchedule.map((daySchedule, dayIndex) => (
                  <div
                    key={dayIndex}
                    className="rounded-2xl overflow-hidden transition-all bg-client-surface-muted border border-client-border"
                  >
                    <button
                      onClick={() => toggleDayExpanded(daySchedule.day)}
                      className="w-full flex items-center justify-between p-4 hover:opacity-80 transition-opacity border-l-4 border-accent-dark"
                    >
                      <h3 className="text-[15px] font-semibold text-text-primary">
                        {daySchedule.day}
                      </h3>
                      <ChevronDown
                        strokeWidth={1.5}
                        size={20}
                        className="text-accent-dark transition-transform"
                        style={{
                          transform: expandedDays.includes(daySchedule.day)
                            ? 'rotate(180deg)'
                            : 'rotate(0deg)',
                        }}
                      />
                    </button>

                    {expandedDays.includes(daySchedule.day) && (
                      <div className="px-4 pb-4 border-t border-client-border">
                        <div className="space-y-3 mt-4">
                          {daySchedule.exercises.map((exercise, exIndex) => (
                            <div
                              key={exIndex}
                              className="p-4 rounded-2xl bg-white border border-client-border"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <h4 className="font-semibold mb-2 text-text-primary">
                                    {exercise.name}
                                  </h4>
                                  <div className="flex items-center gap-4 text-[13px] flex-wrap">
                                    <span className="text-client-text-secondary">
                                      <strong>Sets × Reps:</strong> {exercise.sets} × {exercise.reps}
                                    </span>
                                    {exercise.rest_seconds && (
                                      <span className="text-client-text-secondary">
                                        <strong>Rust:</strong> {exercise.rest_seconds}s
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {exercise.notes && (
                                <div className="mt-3 pt-3 border-t border-client-border">
                                  <p className="text-[13px] italic text-client-text-secondary">
                                    <strong>Notities:</strong> {exercise.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-client-text-secondary">
                  Dit programma bevat nog geen trainingsschema
                </p>
              </div>
            )}
          </Card>
        ) : (
          <Card className="rounded-2xl p-12 mb-10 text-center bg-white shadow-clean border border-client-border">
            <Dumbbell
              size={48}
              strokeWidth={1.5}
              className="mx-auto mb-4 text-accent-dark"
            />
            <h2 className="text-2xl font-bold mb-2 text-text-primary">
              Geen trainingsprogramma beschikbaar
            </h2>
            <p className="mb-8 text-client-text-secondary">
              Maak een nieuw trainingsprogramma aan of wijs er een toe
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href={`/coach/clients/${params.id}/program/new`}>
                <button className="px-6 py-3 rounded-2xl font-semibold text-white transition-all hover:opacity-90 w-full sm:w-auto bg-accent-dark">
                  Programma aanmaken
                </button>
              </Link>
              <Link href={`/coach/clients/${params.id}/program/assign`}>
                <button className="px-6 py-3 rounded-2xl font-semibold transition-all w-full sm:w-auto bg-client-surface-muted text-text-primary border border-accent-dark hover:bg-gray-200">
                  HEVY-programma toewijzen
                </button>
              </Link>
            </div>
          </Card>
        )}

        {/* Forms Section - Only show if no current program */}
        {!currentProgram && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-[15px] font-bold mb-4 text-text-primary">
                Handmatig programma aanmaken
              </h3>
              <ManualProgramForm clientId={params.id} />
            </div>

            <div>
              <h3 className="text-[15px] font-bold mb-4 text-text-primary">
                HEVY-programma toewijzen
              </h3>
              <ProgramAssignment clientId={params.id} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
