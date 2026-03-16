'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import {
  CheckCircle2, Clock, ExternalLink, MessageSquare, TrendingUp,
  Apple, Dumbbell, Heart, ChevronDown, ChevronRight, Send,
  Calendar, Scale, Ruler, Plus, ArrowUpRight
} from 'lucide-react'
import { ClientHealthSummary } from '@/components/coach/ClientHealthSummary'
import { ProgramAssignModal } from '@/components/coach/ProgramAssignModal'
import type { CheckIn, IntakeForm, Profile } from '@/types'
import { sendPushToClient } from '@/lib/push-notifications'

// ─── Types ──────────────────────────────────────────────────

interface Props {
  profile: Profile
  latestCheckin: CheckIn | null
  checkinCount: number
  intakeForm: IntakeForm | null
}

interface TemplateDay {
  id: string
  template_id: string
  day_number: number
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

interface ActiveProgram {
  id: string
  name: string
  template_id: string
  current_week: number
  start_date: string
  end_date: string | null
  coach_notes: string | null
  is_active: boolean
  template?: {
    name: string
    duration_weeks: number
    days_per_week: number
    difficulty: string
    description: string | null
  }
}

interface NutritionPlan {
  id: string
  title: string
  calories_target: number
  protein_g: number
  carbs_g: number
  fat_g: number
  meals: any[]
  guidelines: string | null
  is_active: boolean
  created_at: string
}

interface ProgramTemplate {
  id: string
  name: string
  duration_weeks: number
  days_per_week: number
  difficulty: string
}

interface ConversationMessage {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  message_type: string
  created_at: string
  read_at: string | null
}

// ─── Tabs ──────────────────────────────────────────────────

const tabs = [
  { id: 'overview', label: 'Overzicht' },
  { id: 'program', label: 'Programma' },
  { id: 'nutrition', label: 'Voeding' },
  { id: 'progress', label: 'Voortgang' },
  { id: 'checkins', label: 'Check-ins' },
  { id: 'messages', label: 'Berichten' },
  { id: 'health', label: 'Gezondheid' },
]

// ─── Component ──────────────────────────────────────────────

export function ClientProfileTabs({
  profile,
  latestCheckin,
  checkinCount,
  intakeForm,
}: Props) {
  const [activeTab, setActiveTab] = useState('overview')

  // Check-ins state
  const [checkins, setCheckins] = useState<CheckIn[]>([])
  const [loadingCheckins, setLoadingCheckins] = useState(false)

  // Program state
  const [activeProgram, setActiveProgram] = useState<ActiveProgram | null>(null)
  const [templateDays, setTemplateDays] = useState<TemplateDay[]>([])
  const [exercisesByDay, setExercisesByDay] = useState<Record<string, TemplateExercise[]>>({})
  const [expandedDays, setExpandedDays] = useState<string[]>([])
  const [loadingProgram, setLoadingProgram] = useState(false)
  const [programLoaded, setProgramLoaded] = useState(false)
  const [templates, setTemplates] = useState<ProgramTemplate[]>([])
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [selectedTemplateName, setSelectedTemplateName] = useState('')
  const [selectedTemplateDuration, setSelectedTemplateDuration] = useState(8)

  // Nutrition state
  const [nutritionPlan, setNutritionPlan] = useState<NutritionPlan | null>(null)
  const [loadingNutrition, setLoadingNutrition] = useState(false)
  const [nutritionLoaded, setNutritionLoaded] = useState(false)

  // Progress state
  const [progressCheckins, setProgressCheckins] = useState<any[]>([])
  const [loadingProgress, setLoadingProgress] = useState(false)
  const [progressLoaded, setProgressLoaded] = useState(false)

  // Messages state
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [messagesLoaded, setMessagesLoaded] = useState(false)
  const [coachId, setCoachId] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()

  const startDate = profile.start_date ? new Date(profile.start_date) : null
  const today = new Date()
  const daysActive = startDate ? Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 0

  // ─── Load Program Data ──────────────────────────────────────

  const loadProgramData = useCallback(async () => {
    if (programLoaded) return
    setLoadingProgram(true)
    try {
      // Get active program from client_programs
      const { data: cpData } = await supabase
        .from('client_programs')
        .select('*, program_templates(name, duration_weeks, days_per_week, difficulty, description)')
        .eq('client_id', profile.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (cpData) {
        const ap: ActiveProgram = {
          id: cpData.id,
          name: cpData.name,
          template_id: cpData.template_id,
          current_week: cpData.current_week || 1,
          start_date: cpData.start_date,
          end_date: cpData.end_date,
          coach_notes: cpData.coach_notes,
          is_active: cpData.is_active,
          template: (cpData as any).program_templates || undefined,
        }
        setActiveProgram(ap)

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

      // Load available templates for assignment
      const { data: templatesData } = await supabase
        .from('program_templates')
        .select('id, name, duration_weeks, days_per_week, difficulty')
        .eq('is_archived', false)
        .order('name', { ascending: true })

      if (templatesData) setTemplates(templatesData)
    } catch (error) {
      console.error('Error loading program:', error)
    } finally {
      setLoadingProgram(false)
      setProgramLoaded(true)
    }
  }, [profile.id, programLoaded, supabase])

  // ─── Load Nutrition Data ──────────────────────────────────────

  const loadNutritionData = useCallback(async () => {
    if (nutritionLoaded) return
    setLoadingNutrition(true)
    try {
      const { data } = await supabase
        .from('nutrition_plans')
        .select('*')
        .eq('client_id', profile.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (data) setNutritionPlan(data)
    } catch (error) {
      console.error('Error loading nutrition:', error)
    } finally {
      setLoadingNutrition(false)
      setNutritionLoaded(true)
    }
  }, [profile.id, nutritionLoaded, supabase])

  // ─── Load Progress Data ──────────────────────────────────────

  const loadProgressData = useCallback(async () => {
    if (progressLoaded) return
    setLoadingProgress(true)
    try {
      const { data } = await supabase
        .from('checkins')
        .select('id, date, weight_kg, body_fat_pct, muscle_mass_kg, bmi, chest_cm, waist_cm, hips_cm')
        .eq('client_id', profile.id)
        .order('date', { ascending: true })
        .limit(20)

      if (data) setProgressCheckins(data)
    } catch (error) {
      console.error('Error loading progress:', error)
    } finally {
      setLoadingProgress(false)
      setProgressLoaded(true)
    }
  }, [profile.id, progressLoaded, supabase])

  // ─── Load Messages Data ──────────────────────────────────────

  const loadMessagesData = useCallback(async () => {
    if (messagesLoaded) return
    setLoadingMessages(true)
    try {
      // Get coach (current user)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCoachId(user.id)

      // Load messages between coach and this client
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${profile.id}),and(sender_id.eq.${profile.id},receiver_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true })
        .limit(50)

      if (data) setMessages(data)

      // Mark unread messages as read
      if (data && data.length > 0) {
        const unreadIds = data
          .filter((m: any) => m.sender_id === profile.id && !m.read_at)
          .map((m: any) => m.id)

        if (unreadIds.length > 0) {
          await supabase
            .from('messages')
            .update({ read_at: new Date().toISOString() })
            .in('id', unreadIds)
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoadingMessages(false)
      setMessagesLoaded(true)
    }
  }, [profile.id, messagesLoaded, supabase])

  // ─── Tab Change Handler ──────────────────────────────────────

  useEffect(() => {
    if (activeTab === 'program') loadProgramData()
    if (activeTab === 'nutrition') loadNutritionData()
    if (activeTab === 'progress') loadProgressData()
    if (activeTab === 'messages') loadMessagesData()
    if (activeTab === 'checkins' && checkins.length === 0) {
      setLoadingCheckins(true)
      supabase
        .from('checkins')
        .select('id, date, weight_kg, body_fat_pct, muscle_mass_kg, coach_reviewed_at')
        .eq('client_id', profile.id)
        .order('date', { ascending: false })
        .limit(10)
        .then(({ data }) => {
          if (data) setCheckins(data as unknown as CheckIn[])
          setLoadingCheckins(false)
        })
    }
  }, [activeTab, profile.id, checkins.length, loadProgramData, loadNutritionData, loadProgressData, loadMessagesData, supabase])

  // Scroll messages to bottom
  useEffect(() => {
    if (activeTab === 'messages' && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, activeTab])

  // ─── Handlers ──────────────────────────────────────────────

  const toggleDay = (dayId: string) => {
    setExpandedDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
    )
  }

  const handleAssignTemplate = (template: ProgramTemplate) => {
    setSelectedTemplateId(template.id)
    setSelectedTemplateName(template.name)
    setSelectedTemplateDuration(template.duration_weeks)
    setShowAssignModal(true)
  }

  const handleSendMessage = async () => {
    if (!coachId || !newMessage.trim()) return
    setSendingMessage(true)

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: coachId,
          receiver_id: profile.id,
          content: newMessage.trim(),
          message_type: 'text',
        })
        .select()
        .single()

      if (!error && data) {
        setMessages((prev) => [...prev, data])
        setNewMessage('')
        // Push notification (fire & forget)
        sendPushToClient(profile.id, 'Nieuw bericht', newMessage.trim().substring(0, 100), '/client/messages')
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSendingMessage(false)
    }
  }

  // ─── Render Helpers ──────────────────────────────────────────

  const difficultyLabels: Record<string, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Gevorderd',
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })

  // ─── Skeleton ──────────────────────────────────────────────

  const Skeleton = ({ rows = 3 }: { rows?: number }) => (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-2xl p-4 animate-pulse bg-[#FAFAFA]">
          <div className="h-4 rounded w-1/3 mb-3 bg-[#E8E4DC]" />
          <div className="h-3 rounded w-2/3 bg-[#E8E4DC]" />
        </div>
      ))}
    </div>
  )

  return (
    <div>
      {/* Tab Navigation */}
      <div className="border-b border-[#E8E4DC] overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-[14px] font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#1A1917] text-text-primary'
                  : 'border-transparent text-client-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">

        {/* ═══ OVERZICHT TAB ═══ */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {latestCheckin ? (
              <div>
                <h3 className="text-[13px] text-client-text-secondary uppercase font-medium tracking-wide mb-3">
                  Laatste meting — {new Date(latestCheckin.date).toLocaleDateString('nl-BE')}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {latestCheckin.weight_kg && (
                    <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC]">
                      <p className="text-[12px] text-client-text-secondary uppercase font-medium tracking-wide">Gewicht</p>
                      <p className="text-2xl font-bold text-text-primary mt-2">
                        {latestCheckin.weight_kg}<span className="text-[12px] text-client-text-secondary ml-1 font-normal">kg</span>
                      </p>
                    </div>
                  )}
                  {latestCheckin.body_fat_pct && (
                    <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC]">
                      <p className="text-[12px] text-client-text-secondary uppercase font-medium tracking-wide">Vetpercentage</p>
                      <p className="text-2xl font-bold text-text-primary mt-2">
                        {latestCheckin.body_fat_pct}<span className="text-[12px] text-client-text-secondary ml-1 font-normal">%</span>
                      </p>
                    </div>
                  )}
                  {latestCheckin.muscle_mass_kg && (
                    <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC]">
                      <p className="text-[12px] text-client-text-secondary uppercase font-medium tracking-wide">Spiermassa</p>
                      <p className="text-2xl font-bold text-text-primary mt-2">
                        {latestCheckin.muscle_mass_kg}<span className="text-[12px] text-client-text-secondary ml-1 font-normal">kg</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC] text-center">
                <p className="text-[14px] text-client-text-secondary">Nog geen check-in data beschikbaar.</p>
              </div>
            )}

            {intakeForm && intakeForm.completed && (
              <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[15px] font-semibold text-text-primary">Intake informatie</h3>
                  <Link
                    href={`/coach/clients/${profile.id}/intake`}
                    className="text-[13px] font-medium flex items-center gap-1 hover:opacity-70 transition-opacity"
                    style={{ color: '#1A1917' }}
                  >
                    Volledig formulier
                    <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2} />
                  </Link>
                </div>
                <div className="space-y-4 text-[14px]">
                  {intakeForm.primary_goal && (
                    <div>
                      <p className="text-[12px] text-client-text-secondary uppercase font-medium tracking-wide">Hoofddoel</p>
                      <p className="mt-1 text-text-primary">{intakeForm.primary_goal}</p>
                    </div>
                  )}
                  {intakeForm.training_experience && (
                    <div>
                      <p className="text-[12px] text-client-text-secondary uppercase font-medium tracking-wide">Trainersondervinding</p>
                      <p className="mt-1 text-text-primary">{intakeForm.training_experience}</p>
                    </div>
                  )}
                  {intakeForm.injuries_limitations && (
                    <div>
                      <p className="text-[12px] text-client-text-secondary uppercase font-medium tracking-wide">Blessures / beperkingen</p>
                      <p className="mt-1 text-text-primary">{intakeForm.injuries_limitations}</p>
                    </div>
                  )}
                  {(intakeForm as any).weight_kg && (
                    <div className="flex gap-6">
                      <div>
                        <p className="text-[12px] text-client-text-secondary uppercase font-medium tracking-wide">Gewicht</p>
                        <p className="mt-1 text-text-primary">{(intakeForm as any).weight_kg} kg</p>
                      </div>
                      {(intakeForm as any).height_cm && (
                        <div>
                          <p className="text-[12px] text-client-text-secondary uppercase font-medium tracking-wide">Lengte</p>
                          <p className="mt-1 text-text-primary">{(intakeForm as any).height_cm} cm</p>
                        </div>
                      )}
                      {(intakeForm as any).age && (
                        <div>
                          <p className="text-[12px] text-client-text-secondary uppercase font-medium tracking-wide">Leeftijd</p>
                          <p className="mt-1 text-text-primary">{(intakeForm as any).age} jaar</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[12px] text-client-text-secondary uppercase font-medium tracking-wide">Dagen actief</p>
                  <p className="text-2xl font-bold text-text-primary mt-2">{daysActive}</p>
                </div>
                <div>
                  <p className="text-[12px] text-client-text-secondary uppercase font-medium tracking-wide">Totaal check-ins</p>
                  <p className="text-2xl font-bold text-text-primary mt-2">{checkinCount}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ PROGRAMMA TAB ═══ */}
        {activeTab === 'program' && (
          <div className="space-y-5">
            {loadingProgram ? (
              <Skeleton rows={4} />
            ) : activeProgram ? (
              <>
                {/* Active Program Header */}
                <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC]">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-[17px] font-semibold text-text-primary">{activeProgram.name}</h3>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {activeProgram.template?.difficulty && (
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#EDEAE4] text-[#1A1917]">
                            {difficultyLabels[activeProgram.template.difficulty] || activeProgram.template.difficulty}
                          </span>
                        )}
                        {activeProgram.template?.duration_weeks && (
                          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#E8E4DC] text-[#8E8E93]">
                            {activeProgram.template.duration_weeks} weken
                          </span>
                        )}
                        {activeProgram.template?.days_per_week && (
                          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#E8E4DC] text-[#8E8E93]">
                            {activeProgram.template.days_per_week} dagen/week
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[12px] text-client-text-secondary uppercase font-medium tracking-wide">Week</p>
                      <p className="text-2xl font-bold text-[#1A1917]">
                        {activeProgram.current_week}
                        <span className="text-[14px] font-normal text-client-text-secondary">
                          /{activeProgram.template?.duration_weeks || '—'}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Date Info */}
                  <div className="flex items-center gap-4 text-[13px] text-client-text-secondary pt-3 border-t border-[#E8E4DC]">
                    <div className="flex items-center gap-1.5">
                      <Calendar strokeWidth={1.5} className="w-3.5 h-3.5" />
                      <span>Start: {formatDate(activeProgram.start_date)}</span>
                    </div>
                    {activeProgram.end_date && (
                      <div className="flex items-center gap-1.5">
                        <Calendar strokeWidth={1.5} className="w-3.5 h-3.5" />
                        <span>Einde: {formatDate(activeProgram.end_date)}</span>
                      </div>
                    )}
                  </div>

                  {activeProgram.coach_notes && (
                    <p className="text-[13px] text-client-text-secondary mt-3 italic">
                      {activeProgram.coach_notes}
                    </p>
                  )}
                </div>

                {/* Training Days */}
                {templateDays.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="text-[13px] text-client-text-secondary uppercase font-medium tracking-wide">
                      Trainingsschema — {templateDays.length} dagen
                    </h4>
                    {templateDays.map((day) => {
                      const dayExercises = exercisesByDay[day.id] || []
                      const isExpanded = expandedDays.includes(day.id)

                      return (
                        <div
                          key={day.id}
                          className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC] overflow-hidden"
                        >
                          <button
                            onClick={() => toggleDay(day.id)}
                            className="w-full flex items-center justify-between p-4 hover:bg-[#FAFAFA] transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#EDEAE4] flex items-center justify-center flex-shrink-0">
                                <Dumbbell strokeWidth={1.5} className="w-4 h-4 text-[#1A1917]" />
                              </div>
                              <div className="text-left">
                                <h5 className="text-[15px] font-semibold text-text-primary">{day.name}</h5>
                                <p className="text-[12px] text-client-text-secondary">
                                  {day.focus && <span>{day.focus} · </span>}
                                  {dayExercises.length} oefeningen
                                  {day.estimated_duration_min > 0 && <span> · ±{day.estimated_duration_min} min</span>}
                                </p>
                              </div>
                            </div>
                            <ChevronDown
                              strokeWidth={1.5}
                              className={`w-5 h-5 text-[#8E8E93] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </button>

                          {isExpanded && dayExercises.length > 0 && (
                            <div className="px-4 pb-4 space-y-2 border-t border-[#E8E4DC]">
                              {dayExercises.map((ex, i) => (
                                <div
                                  key={ex.id}
                                  className="flex items-start gap-3 py-3 border-b border-[#E8E4DC] last:border-b-0"
                                >
                                  <span className="text-[12px] font-semibold text-[#8E8E93] w-6 flex-shrink-0 pt-0.5">
                                    {i + 1}.
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[14px] font-medium text-text-primary">{ex.name}</p>
                                    <div className="flex items-center gap-3 mt-1 text-[12px] text-client-text-secondary">
                                      <span>{ex.sets} sets × {ex.reps} reps</span>
                                      {ex.rest_seconds > 0 && (
                                        <span>Rust: {ex.rest_seconds}s</span>
                                      )}
                                    </div>
                                    {ex.notes && (
                                      <p className="text-[12px] text-client-text-secondary italic mt-1">{ex.notes}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="bg-[#FAFAFA] rounded-2xl p-6 text-center">
                    <p className="text-[14px] text-client-text-secondary">
                      Dit programma heeft nog geen trainingsschema. Voeg dagen en oefeningen toe via de programma-editor.
                    </p>
                    <Link
                      href={`/coach/programs/${activeProgram.template_id}`}
                      className="inline-flex items-center gap-1.5 mt-3 text-[13px] font-semibold text-[#1A1917] hover:underline"
                    >
                      Template bewerken <ArrowUpRight strokeWidth={1.5} className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}

                {/* Change Program Button */}
                <div className="pt-2">
                  <p className="text-[12px] text-client-text-secondary mb-2">Ander programma toewijzen?</p>
                  <div className="flex flex-wrap gap-2">
                    {templates
                      .filter((t) => t.id !== activeProgram.template_id)
                      .slice(0, 4)
                      .map((t) => (
                        <button
                          key={t.id}
                          onClick={() => handleAssignTemplate(t)}
                          className="text-[13px] px-3 py-1.5 rounded-xl bg-[#FAFAFA] border border-[#E8E4DC] text-text-primary hover:bg-[#EDEAE4] hover:border-[#ECEAE3] transition-colors"
                        >
                          {t.name}
                        </button>
                      ))}
                    <Link
                      href="/coach/programs"
                      className="text-[13px] px-3 py-1.5 rounded-xl text-[#1A1917] hover:underline inline-flex items-center gap-1"
                    >
                      Alle programma's <ChevronRight strokeWidth={1.5} className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              /* No Active Program */
              <div className="space-y-5">
                <div className="bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC] text-center">
                  <Dumbbell strokeWidth={1.5} className="w-10 h-10 mx-auto mb-3 text-[#8E8E93] opacity-40" />
                  <h3 className="text-[17px] font-semibold text-text-primary mb-1">
                    Geen actief programma
                  </h3>
                  <p className="text-[14px] text-client-text-secondary mb-5">
                    Wijs een trainingsprogramma toe aan {profile.full_name?.split(' ')[0] || 'deze cliënt'}
                  </p>
                </div>

                {/* Template Picker */}
                {templates.length > 0 && (
                  <div>
                    <h4 className="text-[13px] text-client-text-secondary uppercase font-medium tracking-wide mb-3">
                      Beschikbare programma's
                    </h4>
                    <div className="space-y-2">
                      {templates.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => handleAssignTemplate(t)}
                          className="w-full flex items-center justify-between p-4 bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-shadow text-left"
                        >
                          <div>
                            <h5 className="text-[15px] font-semibold text-text-primary">{t.name}</h5>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#EDEAE4] text-[#1A1917]">
                                {t.duration_weeks}w · {t.days_per_week}d/w
                              </span>
                              <span className="text-[11px] text-[#8E8E93]">
                                {difficultyLabels[t.difficulty] || t.difficulty}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#1A1917] flex-shrink-0">
                            Toewijzen
                            <Plus strokeWidth={1.5} className="w-4 h-4" />
                          </div>
                        </button>
                      ))}
                    </div>
                    <Link
                      href="/coach/programs/new"
                      className="inline-flex items-center gap-1.5 mt-3 text-[13px] font-medium text-[#1A1917] hover:underline"
                    >
                      <Plus strokeWidth={1.5} className="w-3.5 h-3.5" />
                      Nieuw programma aanmaken
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ VOEDING TAB ═══ */}
        {activeTab === 'nutrition' && (
          <div className="space-y-4">
            {loadingNutrition ? (
              <Skeleton rows={3} />
            ) : nutritionPlan ? (
              <>
                {/* Macro Summary */}
                <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[15px] font-semibold text-text-primary">{nutritionPlan.title}</h3>
                    <Link
                      href={`/coach/clients/${profile.id}/nutrition`}
                      className="text-[12px] font-medium text-[#1A1917] hover:underline inline-flex items-center gap-1"
                    >
                      Bewerken <ExternalLink strokeWidth={1.5} className="w-3 h-3" />
                    </Link>
                  </div>

                  {/* Calorie Target */}
                  <div className="bg-[#EDEAE4] rounded-xl p-4 mb-4 text-center">
                    <p className="text-[12px] text-[#1A1917] uppercase font-medium tracking-wide">Dagelijks doel</p>
                    <p className="text-3xl font-bold text-[#1A1917] mt-1">{nutritionPlan.calories_target}</p>
                    <p className="text-[12px] text-[#1A1917]">calorieën</p>
                  </div>

                  {/* Macros Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#FAFAFA] rounded-xl p-3 text-center">
                      <p className="text-[11px] text-client-text-secondary uppercase font-medium">Eiwitten</p>
                      <p className="text-xl font-bold text-text-primary mt-1">{nutritionPlan.protein_g}<span className="text-[11px] font-normal">g</span></p>
                    </div>
                    <div className="bg-[#FAFAFA] rounded-xl p-3 text-center">
                      <p className="text-[11px] text-client-text-secondary uppercase font-medium">Koolhydraten</p>
                      <p className="text-xl font-bold text-text-primary mt-1">{nutritionPlan.carbs_g}<span className="text-[11px] font-normal">g</span></p>
                    </div>
                    <div className="bg-[#FAFAFA] rounded-xl p-3 text-center">
                      <p className="text-[11px] text-client-text-secondary uppercase font-medium">Vetten</p>
                      <p className="text-xl font-bold text-text-primary mt-1">{nutritionPlan.fat_g}<span className="text-[11px] font-normal">g</span></p>
                    </div>
                  </div>
                </div>

                {/* Meal Moments */}
                {nutritionPlan.meals && nutritionPlan.meals.length > 0 && (
                  <div>
                    <h4 className="text-[13px] text-client-text-secondary uppercase font-medium tracking-wide mb-3">
                      Maaltijdmomenten — {nutritionPlan.meals.length}
                    </h4>
                    <div className="space-y-2">
                      {nutritionPlan.meals.map((meal: any, i: number) => (
                        <div
                          key={meal.id || i}
                          className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#E8E4DC]"
                        >
                          <div className="w-8 h-8 rounded-lg bg-[#EDEAE4] flex items-center justify-center flex-shrink-0">
                            <Apple strokeWidth={1.5} className="w-4 h-4 text-[#1A1917]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-medium text-text-primary">{meal.name}</p>
                            {meal.time && (
                              <p className="text-[12px] text-client-text-secondary">{meal.time}</p>
                            )}
                          </div>
                          {meal.foods && (
                            <span className="text-[12px] text-client-text-secondary flex-shrink-0">
                              {meal.foods.length} items
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {nutritionPlan.guidelines && (
                  <div className="bg-[#FAFAFA] rounded-2xl p-4">
                    <p className="text-[12px] text-client-text-secondary uppercase font-medium tracking-wide mb-2">Richtlijnen</p>
                    <p className="text-[14px] text-text-primary whitespace-pre-line">{nutritionPlan.guidelines}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC] text-center">
                <Apple strokeWidth={1.5} className="w-10 h-10 mx-auto mb-3 text-[#8E8E93] opacity-40" />
                <h3 className="text-[17px] font-semibold text-text-primary mb-1">Geen voedingsplan</h3>
                <p className="text-[14px] text-client-text-secondary mb-4">
                  Stel een voedingsplan op voor {profile.full_name?.split(' ')[0] || 'deze cliënt'}
                </p>
                <Link
                  href={`/coach/clients/${profile.id}/nutrition`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1A1917] text-white rounded-xl text-[14px] font-semibold hover:bg-[#6F5612] transition-colors"
                >
                  Voedingsplan aanmaken
                  <Plus strokeWidth={1.5} className="w-4 h-4" />
                </Link>
              </div>
            )}

            {/* Full page link */}
            {nutritionPlan && (
              <div className="flex gap-3">
                <Link
                  href={`/coach/clients/${profile.id}/nutrition`}
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#1A1917] hover:underline"
                >
                  Volledig voedingsplan bewerken <ArrowUpRight strokeWidth={1.5} className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ═══ VOORTGANG TAB ═══ */}
        {activeTab === 'progress' && (
          <div className="space-y-4">
            {loadingProgress ? (
              <Skeleton rows={3} />
            ) : progressCheckins.length > 0 ? (
              <>
                {/* Latest vs First comparison */}
                {(() => {
                  const first = progressCheckins[0]
                  const latest = progressCheckins[progressCheckins.length - 1]
                  const weightDiff = first.weight_kg && latest.weight_kg
                    ? (latest.weight_kg - first.weight_kg).toFixed(1)
                    : null
                  const fatDiff = first.body_fat_pct && latest.body_fat_pct
                    ? (latest.body_fat_pct - first.body_fat_pct).toFixed(1)
                    : null
                  const muscleDiff = first.muscle_mass_kg && latest.muscle_mass_kg
                    ? (latest.muscle_mass_kg - first.muscle_mass_kg).toFixed(1)
                    : null

                  return (
                    <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC]">
                      <h3 className="text-[13px] text-client-text-secondary uppercase font-medium tracking-wide mb-4">
                        Evolutie ({progressCheckins.length} metingen)
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {latest.weight_kg && (
                          <div>
                            <p className="text-[12px] text-client-text-secondary">Gewicht</p>
                            <p className="text-xl font-bold text-text-primary mt-1">
                              {latest.weight_kg} <span className="text-[12px] font-normal">kg</span>
                            </p>
                            {weightDiff && (
                              <p className={`text-[12px] mt-0.5 font-medium ${Number(weightDiff) <= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                {Number(weightDiff) > 0 ? '+' : ''}{weightDiff} kg
                              </p>
                            )}
                          </div>
                        )}
                        {latest.body_fat_pct && (
                          <div>
                            <p className="text-[12px] text-client-text-secondary">Vetpercentage</p>
                            <p className="text-xl font-bold text-text-primary mt-1">
                              {latest.body_fat_pct} <span className="text-[12px] font-normal">%</span>
                            </p>
                            {fatDiff && (
                              <p className={`text-[12px] mt-0.5 font-medium ${Number(fatDiff) <= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                {Number(fatDiff) > 0 ? '+' : ''}{fatDiff}%
                              </p>
                            )}
                          </div>
                        )}
                        {latest.muscle_mass_kg && (
                          <div>
                            <p className="text-[12px] text-client-text-secondary">Spiermassa</p>
                            <p className="text-xl font-bold text-text-primary mt-1">
                              {latest.muscle_mass_kg} <span className="text-[12px] font-normal">kg</span>
                            </p>
                            {muscleDiff && (
                              <p className={`text-[12px] mt-0.5 font-medium ${Number(muscleDiff) >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                {Number(muscleDiff) > 0 ? '+' : ''}{muscleDiff} kg
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}

                {/* Check-in History Table */}
                <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC] overflow-hidden">
                  <div className="p-4 border-b border-[#E8E4DC]">
                    <h4 className="text-[13px] text-client-text-secondary uppercase font-medium tracking-wide">
                      Meetgeschiedenis
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="bg-[#FAFAFA]">
                          <th className="text-left px-4 py-2.5 font-medium text-client-text-secondary">Datum</th>
                          <th className="text-right px-4 py-2.5 font-medium text-client-text-secondary">Gewicht</th>
                          <th className="text-right px-4 py-2.5 font-medium text-client-text-secondary">Vet%</th>
                          <th className="text-right px-4 py-2.5 font-medium text-client-text-secondary">Spier</th>
                          <th className="text-right px-4 py-2.5 font-medium text-client-text-secondary">Taille</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...progressCheckins].reverse().map((c, i) => (
                          <tr key={c.id} className={i % 2 === 0 ? '' : 'bg-[#FAFAFA]'}>
                            <td className="px-4 py-2.5 text-text-primary font-medium">
                              {new Date(c.date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })}
                            </td>
                            <td className="px-4 py-2.5 text-right text-text-primary">{c.weight_kg || '—'}</td>
                            <td className="px-4 py-2.5 text-right text-text-primary">{c.body_fat_pct || '—'}</td>
                            <td className="px-4 py-2.5 text-right text-text-primary">{c.muscle_mass_kg || '—'}</td>
                            <td className="px-4 py-2.5 text-right text-text-primary">{c.waist_cm || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <Link
                  href={`/coach/clients/${profile.id}/progress`}
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#1A1917] hover:underline"
                >
                  Uitgebreide grafieken en PR&apos;s bekijken <ArrowUpRight strokeWidth={1.5} className="w-3.5 h-3.5" />
                </Link>
              </>
            ) : (
              <div className="bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC] text-center">
                <TrendingUp strokeWidth={1.5} className="w-10 h-10 mx-auto mb-3 text-[#8E8E93] opacity-40" />
                <h3 className="text-[17px] font-semibold text-text-primary mb-1">Nog geen voortgangsdata</h3>
                <p className="text-[14px] text-client-text-secondary">
                  Data verschijnt hier zodra er check-ins zijn ingediend.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ═══ CHECK-INS TAB ═══ */}
        {activeTab === 'checkins' && (
          <div>
            {loadingCheckins ? (
              <Skeleton rows={3} />
            ) : checkins.length > 0 ? (
              <div className="space-y-3">
                {checkins.map((checkin) => {
                  const isReviewed = checkin.coach_reviewed
                  return (
                    <Link
                      key={checkin.id}
                      href={`/coach/check-ins/${checkin.id}`}
                      className="block p-4 rounded-2xl border border-[#E8E4DC] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:bg-[#FAFAFA] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-[14px] font-semibold text-text-primary">
                            {new Date(checkin.date).toLocaleDateString('nl-BE')}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-[13px] text-client-text-secondary">
                            {checkin.weight_kg && <span>Gewicht: {checkin.weight_kg} kg</span>}
                            {checkin.body_fat_pct && <span>Vetpercentage: {checkin.body_fat_pct}%</span>}
                          </div>
                        </div>
                        {isReviewed ? (
                          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#34C759]/10">
                            <CheckCircle2 strokeWidth={1.5} className="w-4 h-4 text-[#34C759]" />
                            <span className="text-[12px] font-medium text-[#34C759]">Bekeken</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FF9500]/10">
                            <Clock strokeWidth={1.5} className="w-4 h-4 text-[#FF9500]" />
                            <span className="text-[12px] font-medium text-[#FF9500]">Te reviewen</span>
                          </div>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC] text-center">
                <p className="text-[14px] text-client-text-secondary">Geen check-ins beschikbaar.</p>
              </div>
            )}
          </div>
        )}

        {/* ═══ BERICHTEN TAB ═══ */}
        {activeTab === 'messages' && (
          <div className="space-y-4">
            {loadingMessages ? (
              <Skeleton rows={4} />
            ) : (
              <>
                {/* Messages Container */}
                <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC] overflow-hidden">
                  <div className="max-h-[400px] overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare strokeWidth={1.5} className="w-10 h-10 mx-auto mb-3 text-[#8E8E93] opacity-40" />
                        <p className="text-[14px] text-client-text-secondary">Nog geen berichten</p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isCoach = msg.sender_id === coachId
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isCoach ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                                isCoach
                                  ? 'bg-[#1A1917] text-white'
                                  : 'bg-[#E8E4DC] text-text-primary'
                              }`}
                            >
                              <p className="text-[14px] whitespace-pre-wrap">{msg.content}</p>
                              <p className={`text-[11px] mt-1 ${isCoach ? 'text-white/60' : 'text-client-text-secondary'}`}>
                                {formatTime(msg.created_at)}
                              </p>
                            </div>
                          </div>
                        )
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="p-3 border-t border-[#E8E4DC] flex items-center gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                      placeholder="Typ een bericht..."
                      className="flex-1 px-4 py-2.5 bg-[#FAFAFA] border border-[#E8E4DC] rounded-xl text-[14px] text-text-primary placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#1A1917] focus:bg-white transition-colors"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={sendingMessage || !newMessage.trim()}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#1A1917] text-white hover:bg-[#6F5612] transition-colors disabled:opacity-40"
                    >
                      <Send strokeWidth={1.5} className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ GEZONDHEID TAB ═══ */}
        {activeTab === 'health' && (
          <ClientHealthSummary clientId={profile.id} />
        )}
      </div>

      {/* Program Assign Modal */}
      {selectedTemplateId && (
        <ProgramAssignModal
          isOpen={showAssignModal}
          onClose={() => {
            setShowAssignModal(false)
            setSelectedTemplateId(null)
            // Reload program data after assignment
            setProgramLoaded(false)
            loadProgramData()
          }}
          templateId={selectedTemplateId}
          templateName={selectedTemplateName}
          durationWeeks={selectedTemplateDuration}
        />
      )}
    </div>
  )
}
