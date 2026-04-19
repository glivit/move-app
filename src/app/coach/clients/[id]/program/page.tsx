'use client'

import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ChevronDown,
  Plus,
  Calendar,
  ExternalLink,
  StopCircle,
  RefreshCw,
  X,
  Dumbbell,
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { PeriodizationTimeline } from '@/components/coach/PeriodizationTimeline'
import { ProgramAssignModal } from '@/components/coach/ProgramAssignModal'
import { useParams } from 'next/navigation'

// ─── Types ─────────────────────────────────────────────────

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

type ClientProgramRow = {
  id: string
  name: string
  template_id: string
  current_week: number | null
  start_date: string
  end_date: string | null
  coach_notes: string | null
  program_templates?: ProgramTemplate | null
}

// ─── Difficulty mapping (v3 Orion) ─────────────────────────

const DIFFICULTY: Record<string, { label: string; color: string }> = {
  beginner: { label: 'Beginner', color: '#C0FC01' },
  intermediate: { label: 'Intermediate', color: '#E8A93C' },
  advanced: { label: 'Gevorderd', color: '#A4C7F2' },
}

function diffKey(d: string | undefined): keyof typeof DIFFICULTY {
  if (d && d in DIFFICULTY) return d as keyof typeof DIFFICULTY
  return 'beginner'
}

export default function ProgramPage() {
  const params = useParams() as unknown as PageParams
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [activeProgram, setActiveProgram] = useState<ActiveProgram | null>(null)
  const [templateInfo, setTemplateInfo] = useState<ProgramTemplate | null>(null)
  const [templateDays, setTemplateDays] = useState<TemplateDay[]>([])
  const [exercisesByDay, setExercisesByDay] = useState<
    Record<string, TemplateExercise[]>
  >({})
  const [loading, setLoading] = useState(true)
  const [expandedDays, setExpandedDays] = useState<string[]>([])
  const [templates, setTemplates] = useState<ProgramTemplate[]>([])
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] =
    useState<ProgramTemplate | null>(null)
  const [showStopConfirm, setShowStopConfirm] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [showSwitchPicker, setShowSwitchPicker] = useState(false)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      setProfile(profileData as Profile | null)

      // Load active client_program (the actual source of truth)
      const { data: cpData } = await supabase
        .from('client_programs')
        .select(
          '*, program_templates(id, name, duration_weeks, days_per_week, difficulty, description)'
        )
        .eq('client_id', params.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (cpData) {
        const row = cpData as ClientProgramRow
        setActiveProgram({
          id: row.id,
          name: row.name,
          template_id: row.template_id,
          current_week: row.current_week || 1,
          start_date: row.start_date,
          end_date: row.end_date,
          coach_notes: row.coach_notes,
        })

        const tmpl = row.program_templates
        if (tmpl) setTemplateInfo(tmpl)

        // Load template days
        const { data: daysData } = await supabase
          .from('program_template_days')
          .select('*')
          .eq('template_id', row.template_id)
          .order('sort_order', { ascending: true })

        if (daysData && daysData.length > 0) {
          setTemplateDays(daysData as TemplateDay[])

          // Load exercises for all days
          const dayIds = (daysData as TemplateDay[]).map((d) => d.id)
          const { data: exercisesData } = await supabase
            .from('program_template_exercises')
            .select('*')
            .in('template_day_id', dayIds)
            .order('sort_order', { ascending: true })

          if (exercisesData) {
            const grouped: Record<string, TemplateExercise[]> = {}
            ;(exercisesData as TemplateExercise[]).forEach((ex) => {
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

      if (templatesData) setTemplates(templatesData as ProgramTemplate[])
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

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('nl-BE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

  // ─── Loading state ──────────────────────────────────────

  if (loading) {
    return (
      <div className="pb-32 flex items-center justify-center min-h-[60vh]">
        <div
          className="animate-spin rounded-full h-10 w-10 border-2 border-[rgba(253,253,254,0.20)] border-t-[#FDFDFE]"
          aria-label="Laden"
        />
      </div>
    )
  }

  // ─── Page ───────────────────────────────────────────────

  const diff = templateInfo ? DIFFICULTY[diffKey(templateInfo.difficulty)] : null

  return (
    <div className="pb-32">
      {/* Back link */}
      <Link
        href={`/coach/clients/${params.id}`}
        className="inline-flex items-center gap-1.5 mb-5 text-[13px] text-[rgba(253,253,254,0.62)] hover:text-[#FDFDFE] transition-colors"
      >
        <ArrowLeft strokeWidth={1.5} size={16} />
        Terug naar {clientName}
      </Link>

      {/* Header */}
      <div className="mb-7">
        <h1
          className="text-[30px] font-light tracking-[-0.025em] leading-[1.1] text-[#FDFDFE]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Trainingsprogramma
        </h1>
        <p className="mt-1.5 text-[12px] tracking-[0.04em] text-[rgba(253,253,254,0.62)]">
          {clientName} · beheer & volg
        </p>
      </div>

      {/* Periodization timeline — kept as existing component */}
      {activeProgram && templateInfo && (
        <div className="mb-6">
          <PeriodizationTimeline
            clientProgramId={activeProgram.id}
            totalWeeks={templateInfo.duration_weeks}
            currentWeek={activeProgram.current_week}
          />
        </div>
      )}

      {/* Active program or empty state */}
      {activeProgram ? (
        <>
          {/* Program info card */}
          <div className="relative rounded-[22px] px-[22px] pt-5 pb-[22px] mb-4 bg-[#474B48]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-[18px] font-medium tracking-[-0.01em] leading-[1.25] text-[#FDFDFE]">
                  {activeProgram.name}
                </h2>

                {/* Meta line: difficulty dot + plain text */}
                <div className="mt-[8px] flex items-center gap-[8px] text-[12px] text-[rgba(253,253,254,0.62)] tracking-[0.005em]">
                  {diff && (
                    <span
                      className="inline-block w-[7px] h-[7px] rounded-full shrink-0"
                      style={{ background: diff.color }}
                      aria-hidden
                    />
                  )}
                  <span className="truncate">
                    {[
                      diff?.label,
                      templateInfo?.duration_weeks
                        ? `${templateInfo.duration_weeks} weken`
                        : null,
                      templateInfo?.days_per_week
                        ? `${templateInfo.days_per_week}×/week`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>
              </div>

              {/* Week counter */}
              <div className="text-right shrink-0">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[rgba(253,253,254,0.45)]">
                  Week
                </p>
                <p className="mt-0.5 text-[22px] font-light tracking-[-0.02em] text-[#FDFDFE] leading-none">
                  {activeProgram.current_week}
                  <span className="text-[12px] text-[rgba(253,253,254,0.45)]">
                    /{templateInfo?.duration_weeks || '—'}
                  </span>
                </p>
              </div>
            </div>

            {/* Dates */}
            <div className="mt-4 pt-3 border-t border-[rgba(253,253,254,0.08)] flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-[rgba(253,253,254,0.55)]">
              <span className="inline-flex items-center gap-1.5">
                <Calendar strokeWidth={1.5} className="w-3.5 h-3.5" />
                Start {formatDate(activeProgram.start_date)}
              </span>
              {activeProgram.end_date && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar strokeWidth={1.5} className="w-3.5 h-3.5" />
                  Einde {formatDate(activeProgram.end_date)}
                </span>
              )}
            </div>

            {activeProgram.coach_notes && (
              <p className="mt-3 text-[13px] italic text-[rgba(253,253,254,0.62)] leading-[1.45]">
                {activeProgram.coach_notes}
              </p>
            )}

            {/* Action row */}
            <div className="mt-4 pt-4 border-t border-[rgba(253,253,254,0.08)] flex flex-wrap items-center gap-3">
              <Link
                href={`/coach/programs/${activeProgram.template_id}`}
                className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#FDFDFE] transition-opacity active:opacity-70"
              >
                Template bewerken
                <ExternalLink strokeWidth={1.5} className="w-3.5 h-3.5" />
              </Link>

              <span className="text-[rgba(253,253,254,0.22)]">·</span>

              <button
                type="button"
                onClick={() => setShowSwitchPicker(true)}
                className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#A4C7F2] transition-opacity active:opacity-70"
              >
                <RefreshCw strokeWidth={1.5} className="w-3.5 h-3.5" />
                Ander programma toewijzen
              </button>

              <span className="text-[rgba(253,253,254,0.22)]">·</span>

              <button
                type="button"
                onClick={() => setShowStopConfirm(true)}
                className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#E89A8F] transition-opacity active:opacity-70"
              >
                <StopCircle strokeWidth={1.5} className="w-3.5 h-3.5" />
                Programma stoppen
              </button>
            </div>

            {/* Inline stop confirmation */}
            {showStopConfirm && (
              <div className="mt-4 p-4 rounded-[14px] bg-[rgba(232,154,143,0.10)] border border-[rgba(232,154,143,0.24)]">
                <p className="text-[13.5px] font-medium text-[#E89A8F]">
                  Weet je zeker dat je het programma wilt stoppen?
                </p>
                <p className="mt-1 text-[12px] text-[rgba(253,253,254,0.55)] leading-[1.4]">
                  De trainingshistorie blijft bewaard. Je kan altijd een nieuw
                  programma toewijzen.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setShowStopConfirm(false)}
                    className="px-3.5 py-2 rounded-full text-[12.5px] font-medium bg-[rgba(253,253,254,0.08)] text-[#FDFDFE] transition-opacity active:opacity-70"
                  >
                    Annuleren
                  </button>
                  <button
                    onClick={stopProgram}
                    disabled={stopping}
                    className="px-3.5 py-2 rounded-full text-[12.5px] font-semibold bg-[#E89A8F] text-[#1f1918] transition-opacity active:opacity-70 disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {stopping ? (
                      <>
                        <span className="w-3 h-3 border-2 border-[#1f1918] border-t-transparent rounded-full animate-spin" />
                        Stoppen...
                      </>
                    ) : (
                      'Ja, stop'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Training days */}
          {templateDays.length > 0 ? (
            <div className="mt-6">
              <h3 className="px-0.5 mb-3 text-[11px] uppercase tracking-[0.14em] text-[rgba(253,253,254,0.45)]">
                Trainingsschema — {templateDays.length} dagen
              </h3>
              <div className="flex flex-col gap-2">
                {templateDays.map((day) => {
                  const dayExercises = exercisesByDay[day.id] || []
                  const isExpanded = expandedDays.includes(day.id)

                  return (
                    <div
                      key={day.id}
                      className="rounded-[18px] bg-[#474B48] overflow-hidden transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => toggleDayExpanded(day.id)}
                        className="w-full flex items-center justify-between px-[18px] py-[14px] text-left transition-opacity active:opacity-70"
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="text-[15px] font-medium tracking-[-0.005em] text-[#FDFDFE] truncate">
                            {day.name}
                          </h4>
                          <p className="mt-[4px] text-[11.5px] text-[rgba(253,253,254,0.55)] tracking-[0.005em] truncate">
                            {[
                              day.focus || null,
                              `${dayExercises.length} ${dayExercises.length === 1 ? 'oefening' : 'oefeningen'}`,
                              day.estimated_duration_min > 0
                                ? `±${day.estimated_duration_min} min`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </div>
                        <ChevronDown
                          strokeWidth={1.75}
                          className={`w-4 h-4 text-[rgba(253,253,254,0.55)] transition-transform shrink-0 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {isExpanded && (
                        <div className="px-[14px] pb-[14px]">
                          {dayExercises.length === 0 ? (
                            <div className="px-[14px] py-3 text-[12.5px] text-[rgba(253,253,254,0.45)]">
                              Geen oefeningen toegevoegd.
                            </div>
                          ) : (
                            <ul className="flex flex-col gap-1.5">
                              {dayExercises.map((ex, idx) => (
                                <li
                                  key={ex.id}
                                  className="rounded-[14px] bg-[rgba(253,253,254,0.05)] px-[14px] py-[12px]"
                                >
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-[11px] tabular-nums text-[rgba(253,253,254,0.40)] shrink-0 mt-[1px]">
                                      {idx + 1}.
                                    </span>
                                    <h5 className="text-[14px] font-medium text-[#FDFDFE] leading-[1.3]">
                                      {ex.name}
                                    </h5>
                                  </div>
                                  <div className="mt-1.5 pl-[18px] flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[rgba(253,253,254,0.62)]">
                                    <span>
                                      <span className="text-[rgba(253,253,254,0.40)]">
                                        Sets × Reps:{' '}
                                      </span>
                                      {ex.sets} × {ex.reps}
                                    </span>
                                    {ex.rest_seconds > 0 && (
                                      <span>
                                        <span className="text-[rgba(253,253,254,0.40)]">
                                          Rust:{' '}
                                        </span>
                                        {ex.rest_seconds}s
                                      </span>
                                    )}
                                  </div>
                                  {ex.notes && (
                                    <p className="mt-2 pl-[18px] text-[12px] italic text-[rgba(253,253,254,0.55)] leading-[1.4]">
                                      {ex.notes}
                                    </p>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-[18px] bg-[rgba(71,75,72,0.55)] px-6 py-8 text-center">
              <p className="text-[13.5px] text-[rgba(253,253,254,0.62)] leading-[1.45]">
                Dit programma heeft nog geen trainingsschema. Voeg dagen en
                oefeningen toe via de template editor.
              </p>
              <Link
                href={`/coach/programs/${activeProgram.template_id}`}
                className="inline-flex items-center gap-1.5 mt-4 rounded-full px-4 py-2 text-[12.5px] font-medium bg-[rgba(192,252,1,0.14)] text-[#C0FC01] transition-opacity active:opacity-70"
              >
                Template bewerken
                <ExternalLink strokeWidth={1.5} className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </>
      ) : (
        // ─── Empty state (no active program) ──────────────
        <div className="flex flex-col gap-5">
          <div className="rounded-[22px] bg-[#474B48] px-6 py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-[rgba(253,253,254,0.06)] flex items-center justify-center mx-auto mb-3">
              <Dumbbell
                strokeWidth={1.5}
                className="w-5 h-5 text-[rgba(253,253,254,0.62)]"
              />
            </div>
            <h2 className="text-[18px] font-medium tracking-[-0.01em] text-[#FDFDFE]">
              Geen programma actief
            </h2>
            <p className="mt-1.5 text-[13px] text-[rgba(253,253,254,0.62)] leading-[1.45]">
              Wijs een programma toe vanuit je bibliotheek.
            </p>
          </div>

          {templates.length > 0 && (
            <div>
              <h3 className="px-0.5 mb-3 text-[11px] uppercase tracking-[0.14em] text-[rgba(253,253,254,0.45)]">
                Beschikbare templates
              </h3>
              <div className="flex flex-col gap-2">
                {templates.map((t) => {
                  const d = DIFFICULTY[diffKey(t.difficulty)]
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedTemplate(t)
                        setShowAssignModal(true)
                      }}
                      className="w-full rounded-[18px] bg-[#474B48] px-[18px] py-[14px] text-left transition-colors active:bg-[#4d524e]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-[15px] font-medium tracking-[-0.005em] text-[#FDFDFE] truncate">
                            {t.name}
                          </h4>
                          <div className="mt-[6px] flex items-center gap-[8px] text-[11.5px] text-[rgba(253,253,254,0.55)]">
                            <span
                              className="inline-block w-[6px] h-[6px] rounded-full shrink-0"
                              style={{ background: d.color }}
                              aria-hidden
                            />
                            <span className="truncate">
                              {d.label} · {t.duration_weeks} weken ·{' '}
                              {t.days_per_week}×/week
                            </span>
                          </div>
                        </div>
                        <Plus
                          strokeWidth={1.75}
                          className="w-4 h-4 text-[rgba(253,253,254,0.62)] shrink-0"
                        />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <Link
            href="/coach/programs/new"
            className="self-center inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-medium whitespace-nowrap bg-[rgba(192,252,1,0.14)] text-[#C0FC01] transition-opacity active:opacity-70"
          >
            <Plus strokeWidth={1.75} className="w-4 h-4" />
            Nieuw programma aanmaken
          </Link>
        </div>
      )}

      {/* Switch Program Picker Overlay */}
      {showSwitchPicker && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40"
            onClick={() => setShowSwitchPicker(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center pointer-events-none">
            <div className="pointer-events-auto w-full max-w-[480px] bg-[#474B48] rounded-t-[24px] shadow-2xl max-h-[82vh] overflow-hidden animate-slide-up">
              <div className="px-5 py-4 border-b border-[rgba(253,253,254,0.08)] flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <h2 className="text-[16px] font-medium text-[#FDFDFE]">
                    Ander programma kiezen
                  </h2>
                  <p className="mt-0.5 text-[12px] text-[rgba(253,253,254,0.55)]">
                    Het huidige programma wordt automatisch gestopt
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSwitchPicker(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[rgba(253,253,254,0.62)] hover:text-[#FDFDFE] hover:bg-[rgba(253,253,254,0.06)] transition-colors"
                  aria-label="Sluiten"
                >
                  <X strokeWidth={1.75} className="w-4 h-4" />
                </button>
              </div>
              <div className="px-4 py-4 overflow-y-auto max-h-[66vh] flex flex-col gap-2">
                {templates.filter((t) => t.id !== activeProgram?.template_id)
                  .length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-[13px] text-[rgba(253,253,254,0.55)]">
                      Geen andere templates beschikbaar
                    </p>
                    <Link
                      href="/coach/programs/new"
                      className="inline-flex items-center gap-1.5 mt-3 rounded-full px-4 py-2 text-[12.5px] font-medium bg-[rgba(192,252,1,0.14)] text-[#C0FC01]"
                    >
                      <Plus strokeWidth={1.75} className="w-3.5 h-3.5" />
                      Nieuw programma
                    </Link>
                  </div>
                ) : (
                  templates
                    .filter((t) => t.id !== activeProgram?.template_id)
                    .map((t) => {
                      const d = DIFFICULTY[diffKey(t.difficulty)]
                      return (
                        <button
                          key={t.id}
                          onClick={() => {
                            setSelectedTemplate(t)
                            setShowSwitchPicker(false)
                            setShowAssignModal(true)
                          }}
                          className="w-full rounded-[16px] bg-[rgba(253,253,254,0.05)] px-[16px] py-[13px] text-left transition-colors active:bg-[rgba(253,253,254,0.10)]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <h5 className="text-[14px] font-medium text-[#FDFDFE] truncate">
                                {t.name}
                              </h5>
                              <div className="mt-1 flex items-center gap-[7px] text-[11.5px] text-[rgba(253,253,254,0.55)]">
                                <span
                                  className="inline-block w-[6px] h-[6px] rounded-full shrink-0"
                                  style={{ background: d.color }}
                                  aria-hidden
                                />
                                <span className="truncate">
                                  {d.label} · {t.duration_weeks}w ·{' '}
                                  {t.days_per_week}d/w
                                </span>
                              </div>
                              {t.description && (
                                <p className="mt-1.5 text-[11.5px] text-[rgba(253,253,254,0.45)] line-clamp-1">
                                  {t.description}
                                </p>
                              )}
                            </div>
                            <span className="text-[12px] font-medium text-[#A4C7F2] shrink-0 mt-0.5">
                              Kies →
                            </span>
                          </div>
                        </button>
                      )
                    })
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
