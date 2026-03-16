'use client'

import { useEffect, useState } from 'react'
import { Dumbbell, ArrowLeft, ChevronDown, Plus, Calendar, ExternalLink, StopCircle, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { PeriodizationTimeline } from '@/components/coach/PeriodizationTimeline'
import { ProgramAssignModal } from '@/components/coach/ProgramAssignModal'
import { useParams } from 'next/navigation'

interface Profile {
  full_name: string
  package: string
}

interface ActiveProgram {
  id: string
  name: string
  template_id: string
  current_week: number
  start_date: string
  end_date: string | null
  coach_notes: string | null
}

interface TemplateDay {
  id: string
  name: string
  focus: string
  estimated_duration_min: number
  sort_order: number
}

interface TemplateExercise {
  id: string
  template_day_id: string
  name: string
  sets: number
  reps: string
  rest_seconds: number
  notes: string | null
  sort_order: number
}

interface ProgramTemplate {
  id: string
  name: string
  duration_weeks: number
  days_per_week: number
  difficulty: string
  description: string | null
}

interface PageParams {
  id: string
}

export default function ProgramPage() {
  const params = useParams() as unknown as PageParams
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [activeProgram, setActiveProgram] = useState<ActiveProgram | null>(null)
  const [templateInfo, setTemplateInfo] = useState<ProgramTemplate | null>(null)
  const [templateDays, setTemplateDays] = useState<TemplateDay[]>([])
  const [exercisesByDay, setExercisesByDay] = useState<Record<string, TemplateExercise[]>>({})
  const [loading, setLoading] = useState(true)
  const [expandedDays, setExpandedDays] = useState<string[]>([])
  const [templates, setTemplates] = useState<ProgramTemplate[]>([])
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ProgramTemplate | null>(null)
  const [showStopConfirm, setShowStopConfirm] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [showSwitchPicker, setShowSwitchPicker] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, package')
        .eq('id', params.id)
        .single()

      setProfile(profileData)

      // Load active client_program (the actual source of truth)
      const { data: cpData } = await supabase
        .from('client_programs')
        .select('*, program_templates(id, name, duration_weeks, days_per_week, difficulty, description)')
        .eq('client_id', params.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (cpData) {
        setActiveProgram({
          id: cpData.id,
          name: cpData.name,
          template_id: cpData.template_id,
          current_week: cpData.current_week || 1,
          start_date: cpData.start_date,
          end_date: cpData.end_date,
          coach_notes: cpData.coach_notes,
        })

        const tmpl = (cpData as any).program_templates
        if (tmpl) setTemplateInfo(tmpl)

        // Load template days
        const { data: daysData } = await supabase
          .from('program_template_days')
          .select('*')
          .eq('template_id', cpData.template_id)
          .order('sort_order', { ascending: true })

        if (daysData && daysData.length > 0) {
          setTemplateDays(daysData)

          // Load exercises for all days
          const dayIds = daysData.map((d: any) => d.id)
          const { data: exercisesData } = await supabase
            .from('program_template_exercises')
            .select('*')
            .in('template_day_id', dayIds)
            .order('sort_order', { ascending: true })

          if (exercisesData) {
            const grouped: Record<string, TemplateExercise[]> = {}
            exercisesData.forEach((ex: any) => {
              if (!grouped[ex.template_day_id]) grouped[ex.template_day_id] = []
              grouped[ex.template_day_id].push(ex)
            })
            setExercisesByDay(grouped)
          }
        }
      }

      // Load available templates
      const { data: templatesData } = await supabase
        .from('program_templates')
        .select('id, name, duration_weeks, days_per_week, difficulty, description')
        .eq('is_archived', false)
        .order('name', { ascending: true })

      if (templatesData) setTemplates(templatesData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function stopProgram() {
    if (!activeProgram) return
    setStopping(true)
    try {
      await supabase
        .from('client_programs')
        .update({ is_active: false })
        .eq('id', activeProgram.id)

      setActiveProgram(null)
      setTemplateInfo(null)
      setTemplateDays([])
      setExercisesByDay({})
      setShowStopConfirm(false)
    } catch (err) {
      console.error('Stop error:', err)
    } finally {
      setStopping(false)
    }
  }

  const clientName = profile?.full_name || 'Client'

  const toggleDayExpanded = (dayId: string) => {
    setExpandedDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
    )
  }

  const difficultyLabels: Record<string, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Gevorderd',
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
        {activeProgram && templateInfo && (
          <div className="mb-8">
            <PeriodizationTimeline
              clientProgramId={activeProgram.id}
              totalWeeks={templateInfo.duration_weeks}
              currentWeek={activeProgram.current_week}
            />
          </div>
        )}

        {/* Current Program or Empty State */}
        {activeProgram ? (
          <div className="space-y-6 mb-10">
            {/* Program Info Card */}
            <Card className="rounded-2xl p-8 bg-white shadow-clean border border-client-border">
              <div className="mb-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-2xl font-bold mb-2 text-text-primary">
                      {activeProgram.name}
                    </h2>
                    <div className="flex items-center gap-3 flex-wrap">
                      {templateInfo?.difficulty && (
                        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-accent-light text-accent-dark">
                          {difficultyLabels[templateInfo.difficulty] || templateInfo.difficulty}
                        </span>
                      )}
                      {templateInfo?.duration_weeks && (
                        <span className="text-[13px] text-client-text-secondary">
                          {templateInfo.duration_weeks} weken · {templateInfo.days_per_week} dagen/week
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] text-client-text-secondary uppercase font-medium">Week</p>
                    <p className="text-2xl font-bold text-accent-dark">
                      {activeProgram.current_week}
                      <span className="text-[14px] font-normal text-client-text-secondary">
                        /{templateInfo?.duration_weeks || '—'}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Date Info */}
                <div className="flex items-center gap-4 text-[13px] text-client-text-secondary pt-3 border-t border-client-border">
                  <div className="flex items-center gap-1.5">
                    <Calendar strokeWidth={1.5} className="w-3.5 h-3.5" />
                    Start: {new Date(activeProgram.start_date).toLocaleDateString('nl-BE')}
                  </div>
                  {activeProgram.end_date && (
                    <div className="flex items-center gap-1.5">
                      <Calendar strokeWidth={1.5} className="w-3.5 h-3.5" />
                      Einde: {new Date(activeProgram.end_date).toLocaleDateString('nl-BE')}
                    </div>
                  )}
                </div>

                {activeProgram.coach_notes && (
                  <p className="text-[13px] text-client-text-secondary mt-3 italic">
                    {activeProgram.coach_notes}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 flex-wrap">
                <Link
                  href={`/coach/programs/${activeProgram.template_id}`}
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-dark hover:underline"
                >
                  Template bewerken <ExternalLink strokeWidth={1.5} className="w-3.5 h-3.5" />
                </Link>

                <div className="w-px h-4 bg-client-border" />

                <button
                  onClick={() => setShowSwitchPicker(true)}
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#3068C4] hover:underline"
                >
                  <RefreshCw strokeWidth={1.5} className="w-3.5 h-3.5" />
                  Ander programma toewijzen
                </button>

                <button
                  onClick={() => setShowStopConfirm(true)}
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#D14343] hover:underline"
                >
                  <StopCircle strokeWidth={1.5} className="w-3.5 h-3.5" />
                  Programma stoppen
                </button>
              </div>

              {/* Stop Confirmation */}
              {showStopConfirm && (
                <div className="mt-4 p-4 bg-[#FFF5F5] border border-[#FFD4D4] rounded-xl">
                  <p className="text-[14px] text-[#D14343] font-medium mb-3">
                    Weet je zeker dat je het huidige programma wilt stoppen voor {clientName}?
                  </p>
                  <p className="text-[12px] text-[#8E8E93] mb-4">
                    De trainingshistorie blijft bewaard. Je kan altijd een nieuw programma toewijzen.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowStopConfirm(false)}
                      className="px-4 py-2 rounded-lg text-[13px] font-medium border border-[#E8E4DC] text-[#8E8E93] hover:bg-white transition-colors"
                    >
                      Annuleren
                    </button>
                    <button
                      onClick={stopProgram}
                      disabled={stopping}
                      className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-[#D14343] text-white hover:bg-[#B83A3A] transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {stopping ? (
                        <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Stoppen...</>
                      ) : (
                        'Ja, stop programma'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </Card>

            {/* Training Days */}
            {templateDays.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-[15px] font-bold text-text-primary">
                  Trainingsschema — {templateDays.length} dagen
                </h3>
                {templateDays.map((day) => {
                  const dayExercises = exercisesByDay[day.id] || []
                  const isExpanded = expandedDays.includes(day.id)

                  return (
                    <div
                      key={day.id}
                      className="rounded-2xl overflow-hidden transition-all bg-client-surface-muted border border-client-border"
                    >
                      <button
                        onClick={() => toggleDayExpanded(day.id)}
                        className="w-full flex items-center justify-between p-4 hover:opacity-80 transition-opacity border-l-4 border-accent-dark"
                      >
                        <div>
                          <h4 className="text-[15px] font-semibold text-text-primary">
                            {day.name}
                          </h4>
                          <p className="text-[12px] text-client-text-secondary mt-0.5">
                            {day.focus && <span>{day.focus} · </span>}
                            {dayExercises.length} oefeningen
                            {day.estimated_duration_min > 0 && <span> · ±{day.estimated_duration_min} min</span>}
                          </p>
                        </div>
                        <ChevronDown
                          strokeWidth={1.5}
                          size={20}
                          className={`text-accent-dark transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {isExpanded && dayExercises.length > 0 && (
                        <div className="px-4 pb-4 border-t border-client-border">
                          <div className="space-y-3 mt-4">
                            {dayExercises.map((exercise, exIndex) => (
                              <div
                                key={exercise.id}
                                className="p-4 rounded-2xl bg-white border border-client-border"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <h5 className="font-semibold mb-2 text-text-primary">
                                      {exIndex + 1}. {exercise.name}
                                    </h5>
                                    <div className="flex items-center gap-4 text-[13px] flex-wrap">
                                      <span className="text-client-text-secondary">
                                        <strong>Sets × Reps:</strong> {exercise.sets} × {exercise.reps}
                                      </span>
                                      {exercise.rest_seconds > 0 && (
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
                  )
                })}
              </div>
            ) : (
              <Card className="rounded-2xl p-8 text-center bg-white shadow-clean border border-client-border">
                <p className="text-client-text-secondary">
                  Dit programma heeft nog geen trainingsschema. Voeg dagen en oefeningen toe via de template editor.
                </p>
                <Link
                  href={`/coach/programs/${activeProgram.template_id}`}
                  className="inline-flex items-center gap-1.5 mt-3 text-[13px] font-semibold text-accent-dark hover:underline"
                >
                  Template bewerken <ExternalLink strokeWidth={1.5} className="w-3.5 h-3.5" />
                </Link>
              </Card>
            )}
          </div>
        ) : (
          <Card className="rounded-2xl p-12 mb-10 text-center bg-white shadow-clean border border-client-border">
            <Dumbbell
              size={48}
              strokeWidth={1.5}
              className="mx-auto mb-4 text-accent-dark"
            />
            <h2 className="text-2xl font-bold mb-2 text-text-primary">
              Geen trainingsprogramma toegewezen
            </h2>
            <p className="mb-8 text-client-text-secondary">
              Wijs een programma toe vanuit je programmabibliotheek
            </p>

            {/* Available Templates */}
            {templates.length > 0 && (
              <div className="max-w-lg mx-auto space-y-3 mb-6">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedTemplate(t)
                      setShowAssignModal(true)
                    }}
                    className="w-full flex items-center justify-between p-4 bg-client-surface-muted rounded-2xl border border-client-border hover:shadow-md transition-shadow text-left"
                  >
                    <div>
                      <h5 className="text-[15px] font-semibold text-text-primary">{t.name}</h5>
                      <p className="text-[12px] text-client-text-secondary mt-0.5">
                        {t.duration_weeks}w · {t.days_per_week}d/w · {difficultyLabels[t.difficulty] || t.difficulty}
                      </p>
                    </div>
                    <span className="text-[13px] font-semibold text-accent-dark flex items-center gap-1">
                      Toewijzen <Plus strokeWidth={1.5} className="w-4 h-4" />
                    </span>
                  </button>
                ))}
              </div>
            )}

            <Link
              href="/coach/programs/new"
              className="inline-flex items-center gap-2 text-[13px] font-medium text-accent-dark hover:underline"
            >
              <Plus strokeWidth={1.5} className="w-4 h-4" />
              Nieuw programma aanmaken
            </Link>
          </Card>
        )}
      </div>

      {/* Switch Program Picker Overlay */}
      {showSwitchPicker && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={() => setShowSwitchPicker(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden">
              <div className="p-5 border-b border-[#E8E4DC] flex items-center justify-between">
                <div>
                  <h2 className="text-[17px] font-semibold text-[#1A1A18]">Ander programma kiezen</h2>
                  <p className="text-[12px] text-[#8E8E93] mt-0.5">Het huidige programma wordt automatisch gestopt</p>
                </div>
                <button onClick={() => setShowSwitchPicker(false)} className="text-[#8E8E93] hover:text-[#1A1A18] p-1">
                  <span className="sr-only">Sluiten</span>✕
                </button>
              </div>
              <div className="p-5 overflow-y-auto max-h-[60vh] space-y-3">
                {templates.filter(t => t.id !== activeProgram?.template_id).length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-[14px] text-[#8E8E93]">Geen andere templates beschikbaar</p>
                    <Link
                      href="/coach/programs/new"
                      className="inline-flex items-center gap-1.5 mt-3 text-[13px] font-semibold text-accent-dark hover:underline"
                    >
                      <Plus strokeWidth={1.5} className="w-4 h-4" />
                      Nieuw programma aanmaken
                    </Link>
                  </div>
                ) : (
                  templates.filter(t => t.id !== activeProgram?.template_id).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedTemplate(t)
                        setShowSwitchPicker(false)
                        setShowAssignModal(true)
                      }}
                      className="w-full flex items-center justify-between p-4 bg-[#FAFAFA] rounded-xl border border-[#E8E4DC] hover:border-[#1A1917] hover:bg-[#F5F2EC] transition-all text-left"
                    >
                      <div>
                        <h5 className="text-[14px] font-semibold text-[#1A1A18]">{t.name}</h5>
                        <p className="text-[12px] text-[#8E8E93] mt-0.5">
                          {t.duration_weeks}w · {t.days_per_week}d/w · {difficultyLabels[t.difficulty] || t.difficulty}
                        </p>
                        {t.description && (
                          <p className="text-[11px] text-[#C5C2BC] mt-1 line-clamp-1">{t.description}</p>
                        )}
                      </div>
                      <span className="text-[12px] font-semibold text-[#1A1917] shrink-0 ml-3">
                        Selecteer →
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Assign Modal */}
      {selectedTemplate && (
        <ProgramAssignModal
          isOpen={showAssignModal}
          onClose={() => {
            setShowAssignModal(false)
            setSelectedTemplate(null)
            setShowSwitchPicker(false)
            loadData()
          }}
          templateId={selectedTemplate.id}
          templateName={selectedTemplate.name}
          durationWeeks={selectedTemplate.duration_weeks}
          preSelectedClientId={params.id}
        />
      )}
    </div>
  )
}
