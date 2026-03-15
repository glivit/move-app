'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import {
  ChevronRight, Dumbbell, Activity, Apple, TrendingUp, Calendar,
  CheckCircle, Circle, Flame, MessageSquare, Video, Droplets, Trophy,
  ArrowUpRight, ShieldCheck
} from 'lucide-react'
import { OnboardingChecklist } from '@/components/client/OnboardingChecklist'

// ─── Types ──────────────────────────────────────────────────

interface Profile {
  id: string
  full_name: string
  role: string
  package: string
  created_at: string
  start_date: string | null
}

interface ClientProgram {
  id: string
  name: string
  start_date: string
  is_active: boolean
  current_week: number
  template_id: string
  program_template_days?: Array<{
    id: string
    day_number: number
    name: string
    focus: string | null
    estimated_duration_min: number
  }>
}

interface NutritionPlan {
  id: string
  title: string
  calories_target: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
}

interface WorkoutSession {
  id: string
  started_at: string
  completed_at: string | null
  duration_seconds: number | null
  template_day_id: string | null
  program_template_days?: { name: string } | { name: string }[]
}

interface PersonalRecord {
  id: string
  exercise_id: string
  record_type: string
  value: number
  achieved_at: string
  exercises?: { name: string } | { name: string }[]
}

interface Habit {
  id: string
  name: string
  icon: string
  color: string
  target_value: number | null
  target_unit: string | null
}

interface HabitCompletion {
  habit_id: string
  completed: boolean
}

// ─── Helpers ────────────────────────────────────────────────

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Goedemorgen'
  if (hour < 17) return 'Goedemiddag'
  return 'Goedenavond'
}

function formatDate(date: Date) {
  return date.toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' })
}

function getTimeAgo(dateString: string) {
  const diffMs = Date.now() - new Date(dateString).getTime()
  const mins = Math.floor(diffMs / 60000)
  const hours = Math.floor(diffMs / 3600000)
  const days = Math.floor(diffMs / 86400000)
  if (mins < 1) return 'Nu'
  if (mins < 60) return `${mins}m geleden`
  if (hours < 24) return `${hours}u geleden`
  return `${days}d geleden`
}

// ─── Component ──────────────────────────────────────────────

export default function ClientDashboard() {
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [clientProgram, setClientProgram] = useState<ClientProgram | null>(null)
  const [nutritionPlan, setNutritionPlan] = useState<NutritionPlan | null>(null)
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([])
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [habitCompletions, setHabitCompletions] = useState<HabitCompletion[]>([])
  const [habitStreaks, setHabitStreaks] = useState<Record<string, number>>({})
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [nextVideoCall, setNextVideoCall] = useState<{ id: string; scheduled_at: string } | null>(null)
  const [accountabilityPending, setAccountabilityPending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [togglingHabit, setTogglingHabit] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Parallel fetches
      const [
        profileRes,
        programRes,
        nutritionRes,
        workoutsRes,
        prsRes,
        messagesRes,
        videoRes,
      ] = await Promise.all([
        supabase.from('profiles').select('id, full_name, role, package, created_at, start_date').eq('id', user.id).single(),
        supabase.from('client_programs').select(`id, name, start_date, is_active, current_week, template_id,
          program_template_days!program_template_days(id, day_number, name, focus, estimated_duration_min)
        `).eq('client_id', user.id).eq('is_active', true).single(),
        supabase.from('nutrition_plans').select('id, title, calories_target, protein_g, carbs_g, fat_g').eq('client_id', user.id).eq('is_active', true).single(),
        supabase.from('workout_sessions').select(`id, started_at, completed_at, duration_seconds, template_day_id,
          program_template_days!template_day_id(name)
        `).eq('client_id', user.id).order('started_at', { ascending: false }).limit(3),
        supabase.from('personal_records').select(`id, exercise_id, record_type, value, achieved_at,
          exercises!exercise_id(name)
        `).eq('client_id', user.id).order('achieved_at', { ascending: false }).limit(3),
        supabase.from('messages').select('id').eq('recipient_id', user.id).eq('read', false),
        supabase.from('video_sessions').select('id, scheduled_at').eq('client_id', user.id).eq('status', 'scheduled').gte('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(1),
      ])

      if (profileRes.data) setProfile(profileRes.data)
      if (programRes.data) setClientProgram(programRes.data)
      if (nutritionRes.data) setNutritionPlan(nutritionRes.data)
      if (workoutsRes.data) setWorkoutSessions(workoutsRes.data)
      if (prsRes.data) setPersonalRecords(prsRes.data as PersonalRecord[])
      if (messagesRes.data) setUnreadMessages(messagesRes.data.length)
      if (videoRes.data && videoRes.data.length > 0) setNextVideoCall(videoRes.data[0])

      // Load habits
      try {
        const habitsRes = await fetch(`/api/habits?date=${today}`)
        if (habitsRes.ok) {
          const habitsData = await habitsRes.json()
          setHabits(habitsData.habits || [])
          setHabitCompletions(habitsData.completions || [])
          setHabitStreaks(habitsData.streaks || {})
        }
      } catch {}

      // Load accountability status
      try {
        const accRes = await fetch('/api/accountability')
        if (accRes.ok) {
          const accData = await accRes.json()
          if (accData.data && !accData.data.responded) {
            setAccountabilityPending(true)
          }
        }
      } catch {}
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function toggleHabit(habitId: string) {
    const current = habitCompletions.find(c => c.habit_id === habitId)
    const newCompleted = !current?.completed

    setTogglingHabit(habitId)

    // Optimistic update
    setHabitCompletions(prev => {
      const exists = prev.find(c => c.habit_id === habitId)
      if (exists) return prev.map(c => c.habit_id === habitId ? { ...c, completed: newCompleted } : c)
      return [...prev, { habit_id: habitId, completed: true }]
    })

    try {
      await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habit_id: habitId, date: today, completed: newCompleted }),
      })
    } catch {
      // Revert on error
      setHabitCompletions(prev =>
        prev.map(c => c.habit_id === habitId ? { ...c, completed: !newCompleted } : c)
      )
    } finally {
      setTogglingHabit(null)
    }
  }

  // ─── Derived data ─────────────────────────────────────────

  const firstName = profile?.full_name?.split(' ')[0] || ''
  const todayDayOfWeek = (() => { const d = new Date().getDay(); return d === 0 ? 7 : d })()
  const todayWorkout = clientProgram?.program_template_days?.find(d => d.day_number === todayDayOfWeek)

  const daysUntilCheckIn = (() => {
    if (!profile?.start_date) return null
    const daysElapsed = Math.floor((Date.now() - new Date(profile.start_date).getTime()) / 86400000)
    const daysUntil = 30 - (daysElapsed % 30)
    return daysUntil <= 0 ? 0 : daysUntil
  })()

  // Today's workout already done?
  const todayWorkoutDone = workoutSessions.some(s => {
    const sessionDate = new Date(s.started_at).toISOString().split('T')[0]
    return sessionDate === today && s.completed_at
  })

  const completedHabits = habitCompletions.filter(c => c.completed).length
  const totalHabits = habits.length

  // ─── Render ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-[1.5px] border-[#9B7B2E] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="pb-24 space-y-5">
      {/* Greeting — editorial, generous */}
      <div className="pt-1 mb-2 animate-fade-in">
        <h1
          className="text-[36px] font-semibold text-[#1A1917] tracking-[-0.03em] leading-tight mb-1.5"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {getGreeting()}, {firstName}
        </h1>
        <p className="text-[15px] text-[#5C5A55] capitalize tracking-[-0.01em]">{formatDate(new Date())}</p>
      </div>

      {/* Quick Status Badges — premium warm tones */}
      <div className="flex gap-2.5 overflow-x-auto pb-1 animate-fade-in" style={{ animationDelay: '50ms', animationFillMode: 'both' }}>
        {unreadMessages > 0 && (
          <Link href="/client/messages" className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#3068C4]/8 border border-[#3068C4]/12 shrink-0 transition-all duration-[280ms] hover:bg-[#3068C4]/12 hover:border-[#3068C4]/20">
            <MessageSquare strokeWidth={1.5} className="w-3.5 h-3.5 text-[#3068C4]" />
            <span className="text-[12px] font-semibold text-[#3068C4]">{unreadMessages} berichten</span>
          </Link>
        )}
        {nextVideoCall && (
          <Link href={`/client/video/${nextVideoCall.id}`} className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#3D8B5C]/8 border border-[#3D8B5C]/12 shrink-0 transition-all duration-[280ms] hover:bg-[#3D8B5C]/12 hover:border-[#3D8B5C]/20">
            <Video strokeWidth={1.5} className="w-3.5 h-3.5 text-[#3D8B5C]" />
            <span className="text-[12px] font-semibold text-[#3D8B5C]">
              Video call {new Date(nextVideoCall.scheduled_at).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric' })}
            </span>
          </Link>
        )}
        {daysUntilCheckIn !== null && daysUntilCheckIn <= 5 && (
          <Link href="/client/check-in" className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#C47D15]/8 border border-[#C47D15]/12 shrink-0 transition-all duration-[280ms] hover:bg-[#C47D15]/12 hover:border-[#C47D15]/20">
            <Calendar strokeWidth={1.5} className="w-3.5 h-3.5 text-[#C47D15]" />
            <span className="text-[12px] font-semibold text-[#C47D15]">Check-in over {daysUntilCheckIn}d</span>
          </Link>
        )}
      </div>

      {/* ─── ONBOARDING CHECKLIST ─────────────────────── */}
      <OnboardingChecklist />

      {/* ─── ACCOUNTABILITY PROMPT ────────────────────── */}
      {accountabilityPending && (
        <Link
          href="/client/accountability"
          className="block rounded-2xl p-5 border transition-all duration-[280ms] animate-slide-up"
          style={{
            animationDelay: '70ms',
            animationFillMode: 'both',
            background: 'linear-gradient(135deg, rgba(196,125,21,0.08) 0%, rgba(196,125,21,0.02) 100%)',
            borderColor: 'rgba(196,125,21,0.2)',
          }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#C47D15] flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(196,125,21,0.3)]">
              <ShieldCheck strokeWidth={1.5} className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-[16px] font-semibold text-[#1A1917] tracking-[-0.01em]">Dagelijkse check</p>
              <p className="text-[14px] text-[#C47D15] mt-0.5">Laat even weten hoe je dag was</p>
            </div>
            <ArrowUpRight strokeWidth={1.5} className="w-5 h-5 text-[#C47D15] shrink-0" />
          </div>
        </Link>
      )}

      {/* ─── VANDAAG'S TRAINING ───────────────────────── */}
      <Link
        href="/client/workout"
        className="card-elevated block p-6 group animate-slide-up"
        style={{ animationDelay: '80ms', animationFillMode: 'both' }}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{
                background: todayWorkoutDone
                  ? 'linear-gradient(135deg, rgba(61,139,92,0.12) 0%, rgba(61,139,92,0.05) 100%)'
                  : 'linear-gradient(135deg, rgba(48,104,196,0.12) 0%, rgba(48,104,196,0.05) 100%)'
              }}>
                {todayWorkoutDone ? (
                  <CheckCircle strokeWidth={2} className="w-[18px] h-[18px] text-[#3D8B5C]" />
                ) : (
                  <Dumbbell strokeWidth={1.5} className="w-[18px] h-[18px] text-[#3068C4]" />
                )}
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#BAB8B3]">Training</span>
            </div>
            {todayWorkout ? (
              <>
                <h3 className="text-[18px] font-semibold text-[#1A1917] tracking-[-0.02em]">
                  {todayWorkoutDone ? '✓ ' : ''}{todayWorkout.name}
                </h3>
                <p className="text-[14px] text-[#5C5A55] mt-1">
                  {todayWorkout.focus && `${todayWorkout.focus} · `}
                  {todayWorkout.estimated_duration_min} min
                </p>
              </>
            ) : (
              <h3 className="text-[18px] font-semibold text-[#9C9A95] tracking-[-0.02em]">Rustdag vandaag</h3>
            )}
          </div>
          {todayWorkout && !todayWorkoutDone && (
            <span className="px-5 py-2.5 rounded-xl bg-[#1A1917] text-white text-[13px] font-semibold group-hover:bg-[#2A2A28] transition-colors duration-[280ms] shrink-0 tracking-[-0.01em] shadow-[0_2px_8px_rgba(26,25,23,0.2)]">
              Start
            </span>
          )}
        </div>
      </Link>

      {/* ─── VOEDING SNAPSHOT ─────────────────────────── */}
      {nutritionPlan && (
        <Link
          href="/client/nutrition"
          className="card-tactile block p-6 animate-slide-up"
          style={{ animationDelay: '140ms', animationFillMode: 'both' }}
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, rgba(196,125,21,0.12) 0%, rgba(196,125,21,0.05) 100%)'
            }}>
              <Apple strokeWidth={1.5} className="w-[18px] h-[18px] text-[#C47D15]" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#BAB8B3]">Voeding</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-[17px] font-bold text-[#3068C4] tracking-[-0.01em]">{nutritionPlan.protein_g || 0}g</p>
                <p className="text-[11px] font-medium text-[#9C9A95] mt-0.5">eiwit</p>
              </div>
              <div className="text-center">
                <p className="text-[17px] font-bold text-[#3D8B5C] tracking-[-0.01em]">{nutritionPlan.carbs_g || 0}g</p>
                <p className="text-[11px] font-medium text-[#9C9A95] mt-0.5">koolh</p>
              </div>
              <div className="text-center">
                <p className="text-[17px] font-bold text-[#7B5EA7] tracking-[-0.01em]">{nutritionPlan.fat_g || 0}g</p>
                <p className="text-[11px] font-medium text-[#9C9A95] mt-0.5">vet</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[22px] font-bold text-[#C47D15] tracking-[-0.01em]">{nutritionPlan.calories_target || 0}</p>
              <p className="text-[11px] font-medium text-[#9C9A95] mt-0.5">kcal doel</p>
            </div>
          </div>
        </Link>
      )}

      {/* ─── GEWOONTES ────────────────────────────────── */}
      {habits.length > 0 && (
        <div
          className="card-tactile overflow-hidden animate-slide-up"
          style={{ animationDelay: '200ms', animationFillMode: 'both' }}
        >
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{
                background: 'linear-gradient(135deg, rgba(155,123,46,0.12) 0%, rgba(155,123,46,0.05) 100%)'
              }}>
                <Flame strokeWidth={1.5} className="w-[18px] h-[18px] text-[#9B7B2E]" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#BAB8B3]">Gewoontes</span>
            </div>
            <span className="text-[14px] font-bold tracking-[-0.01em]" style={{
              color: completedHabits === totalHabits && totalHabits > 0 ? '#3D8B5C' : '#9C9A95'
            }}>
              {completedHabits}/{totalHabits}
            </span>
          </div>

          {/* Progress bar */}
          <div className="px-6 pb-3">
            <div className="w-full h-1 bg-[#E6E2DC] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{
                  width: `${totalHabits > 0 ? (completedHabits / totalHabits) * 100 : 0}%`,
                  backgroundColor: completedHabits === totalHabits ? '#3D8B5C' : '#9B7B2E',
                }}
              />
            </div>
          </div>

          {/* Habit list */}
          <div className="divide-y divide-[#EEEBE6]">
            {habits.map((habit) => {
              const completion = habitCompletions.find(c => c.habit_id === habit.id)
              const isCompleted = completion?.completed || false
              const streak = habitStreaks[habit.id] || 0

              return (
                <button
                  key={habit.id}
                  onClick={() => toggleHabit(habit.id)}
                  disabled={togglingHabit === habit.id}
                  className="w-full px-6 py-3.5 flex items-center gap-3.5 hover:bg-[#F0EDE8] transition-all duration-[280ms] text-left"
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-[280ms]"
                    style={{
                      backgroundColor: isCompleted ? '#3D8B5C' : 'transparent',
                      border: isCompleted ? 'none' : '1.5px solid #9C9A95',
                    }}
                  >
                    {isCompleted && <CheckCircle strokeWidth={2.5} className="w-4 h-4 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[14px] font-medium transition-all duration-[280ms] tracking-[-0.01em]"
                      style={{
                        color: isCompleted ? '#9C9A95' : '#1A1917',
                        textDecoration: isCompleted ? 'line-through' : 'none',
                      }}
                    >
                      <span className="mr-1.5">{habit.icon}</span>
                      {habit.name}
                    </p>
                  </div>
                  {streak > 0 && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Flame strokeWidth={1.5} className="w-3.5 h-3.5 text-[#C47D15]" />
                      <span className="text-[12px] font-bold text-[#C47D15]">{streak}</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── CHECK-IN CARD ───────────────────────────── */}
      {daysUntilCheckIn !== null && daysUntilCheckIn <= 3 && (
        <Link
          href="/client/check-in"
          className="block rounded-2xl p-6 border transition-all duration-[280ms] animate-slide-up"
          style={{
            animationDelay: '260ms',
            animationFillMode: 'both',
            background: 'linear-gradient(135deg, rgba(61,139,92,0.06) 0%, rgba(61,139,92,0.02) 100%)',
            borderColor: 'rgba(61,139,92,0.12)',
          }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#3D8B5C] flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(61,139,92,0.3)]">
              <Calendar strokeWidth={1.5} className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[16px] font-semibold text-[#1A1917] tracking-[-0.01em]">Check-in beschikbaar</p>
              <p className="text-[14px] text-[#3D8B5C] mt-0.5">
                {daysUntilCheckIn === 0 ? 'Vandaag is het zover!' : `Nog ${daysUntilCheckIn} ${daysUntilCheckIn === 1 ? 'dag' : 'dagen'}`}
              </p>
            </div>
            <ArrowUpRight strokeWidth={1.5} className="w-5 h-5 text-[#3D8B5C] ml-auto shrink-0" />
          </div>
        </Link>
      )}

      {/* ─── RECENTE ACTIVITEIT ──────────────────────── */}
      {workoutSessions.length > 0 && (
        <div className="animate-slide-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-[16px] font-semibold text-[#1A1917] tracking-[-0.01em]">Recente workouts</h2>
            <Link href="/client/workout/history" className="text-[13px] font-semibold text-[#9B7B2E] flex items-center gap-0.5 hover:text-[#B08E35] transition-colors duration-[280ms] group">
              Alle <ChevronRight strokeWidth={1.5} className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-[280ms]" />
            </Link>
          </div>
          <div className="space-y-2.5">
            {workoutSessions.map((session, i) => (
              <div
                key={session.id}
                className="card-tactile p-4 flex items-center gap-3.5"
                style={{ animationDelay: `${320 + i * 60}ms`, animationFillMode: 'both' }}
              >
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{
                  background: 'linear-gradient(135deg, rgba(48,104,196,0.12) 0%, rgba(48,104,196,0.05) 100%)'
                }}>
                  <Activity strokeWidth={1.5} className="w-[18px] h-[18px] text-[#3068C4]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-[#1A1917] truncate tracking-[-0.01em]">
                    {(Array.isArray(session.program_template_days) ? session.program_template_days[0]?.name : session.program_template_days?.name) || 'Workout'}
                  </p>
                  <p className="text-[12px] text-[#9C9A95] mt-0.5">
                    {getTimeAgo(session.started_at)} · {session.duration_seconds ? Math.round(session.duration_seconds / 60) : '—'} min
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── PR'S ──────────────────────────────────────── */}
      {personalRecords.length > 0 && (
        <div className="animate-slide-up" style={{ animationDelay: '360ms', animationFillMode: 'both' }}>
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-[16px] font-semibold text-[#1A1917] tracking-[-0.01em]">Recente PR's</h2>
            <Link href="/client/progress" className="text-[13px] font-semibold text-[#9B7B2E] flex items-center gap-0.5 hover:text-[#B08E35] transition-colors duration-[280ms] group">
              Alle <ChevronRight strokeWidth={1.5} className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-[280ms]" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {personalRecords.map((pr) => (
              <div key={pr.id} className="card-tactile p-4 min-w-[150px] shrink-0">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Trophy strokeWidth={1.5} className="w-3.5 h-3.5 text-[#7B5EA7]" />
                  <span className="text-[11px] text-[#9C9A95]">{getTimeAgo(pr.achieved_at)}</span>
                </div>
                <p className="text-[13px] font-medium text-[#1A1917] truncate mb-1.5 tracking-[-0.01em]">
                  {(Array.isArray(pr.exercises) ? pr.exercises[0]?.name : pr.exercises?.name) || 'Oefening'}
                </p>
                <p className="text-[18px] font-bold text-[#7B5EA7] tracking-[-0.01em]">
                  {pr.value} {pr.record_type === 'weight' ? 'kg' : pr.record_type === 'reps' ? 'reps' : 'kg'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
