'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import {
  ChevronRight, Dumbbell, Activity, Apple, TrendingUp, Calendar,
  CheckCircle, Circle, Flame, MessageSquare, Video, Droplets, Trophy
} from 'lucide-react'

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
        <div className="animate-spin rounded-full h-8 w-8 border-[1.5px] border-[#8B6914] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="pb-24 space-y-5">
      {/* Greeting — editorial, generous */}
      <div className="pt-1 mb-2">
        <h1
          className="text-[34px] font-semibold text-[#1A1A18] tracking-[-0.03em] leading-tight mb-1.5"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {getGreeting()}, {firstName}
        </h1>
        <p className="text-[15px] text-[#6E6E73] capitalize tracking-[-0.01em]">{formatDate(new Date())}</p>
      </div>

      {/* Quick Status Badges — subtle, refined */}
      <div className="flex gap-2.5 overflow-x-auto pb-1">
        {unreadMessages > 0 && (
          <Link href="/client/messages" className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#3478F6]/7 border border-[#3478F6]/12 shrink-0 transition-all duration-[280ms] hover:bg-[#3478F6]/10">
            <MessageSquare strokeWidth={1.5} className="w-3.5 h-3.5 text-[#3478F6]" />
            <span className="text-[12px] font-semibold text-[#3478F6]">{unreadMessages} berichten</span>
          </Link>
        )}
        {nextVideoCall && (
          <Link href={`/client/video/${nextVideoCall.id}`} className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#2D9D4E]/7 border border-[#2D9D4E]/12 shrink-0 transition-all duration-[280ms] hover:bg-[#2D9D4E]/10">
            <Video strokeWidth={1.5} className="w-3.5 h-3.5 text-[#2D9D4E]" />
            <span className="text-[12px] font-semibold text-[#2D9D4E]">
              Video call {new Date(nextVideoCall.scheduled_at).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric' })}
            </span>
          </Link>
        )}
        {daysUntilCheckIn !== null && daysUntilCheckIn <= 5 && (
          <Link href="/client/check-in" className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#E68A00]/7 border border-[#E68A00]/12 shrink-0 transition-all duration-[280ms] hover:bg-[#E68A00]/10">
            <Calendar strokeWidth={1.5} className="w-3.5 h-3.5 text-[#E68A00]" />
            <span className="text-[12px] font-semibold text-[#E68A00]">Check-in over {daysUntilCheckIn}d</span>
          </Link>
        )}
      </div>

      {/* ─── VANDAAG'S TRAINING ───────────────────────── */}
      <Link
        href="/client/workout"
        className="block bg-white rounded-2xl p-6 border border-[#ECEAE5] hover:border-[#E0DDD7] hover:shadow-[0_4px_16px_rgba(26,26,24,0.06)] transition-all duration-[280ms] group"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: todayWorkoutDone ? 'rgba(45,157,78,0.08)' : 'rgba(52,120,246,0.08)' }}>
                {todayWorkoutDone ? (
                  <CheckCircle strokeWidth={2} className="w-[18px] h-[18px] text-[#2D9D4E]" />
                ) : (
                  <Dumbbell strokeWidth={1.5} className="w-[18px] h-[18px] text-[#3478F6]" />
                )}
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#AEAEB2]">Training</span>
            </div>
            {todayWorkout ? (
              <>
                <h3 className="text-[18px] font-semibold text-[#1A1A18] tracking-[-0.02em]">
                  {todayWorkoutDone ? '✓ ' : ''}{todayWorkout.name}
                </h3>
                <p className="text-[14px] text-[#6E6E73] mt-1">
                  {todayWorkout.focus && `${todayWorkout.focus} · `}
                  {todayWorkout.estimated_duration_min} min
                </p>
              </>
            ) : (
              <h3 className="text-[18px] font-semibold text-[#AEAEB2] tracking-[-0.02em]">Rustdag vandaag</h3>
            )}
          </div>
          {todayWorkout && !todayWorkoutDone && (
            <span className="px-5 py-2.5 rounded-xl bg-[#1A1A18] text-white text-[13px] font-semibold group-hover:bg-[#2A2A28] transition-colors duration-[280ms] shrink-0 tracking-[-0.01em]">
              Start
            </span>
          )}
        </div>
      </Link>

      {/* ─── VOEDING SNAPSHOT ─────────────────────────── */}
      {nutritionPlan && (
        <Link
          href="/client/nutrition"
          className="block bg-white rounded-2xl p-6 border border-[#ECEAE5] hover:border-[#E0DDD7] hover:shadow-[0_4px_16px_rgba(26,26,24,0.06)] transition-all duration-[280ms]"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-[#E68A00]/8 flex items-center justify-center">
              <Apple strokeWidth={1.5} className="w-[18px] h-[18px] text-[#E68A00]" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#AEAEB2]">Voeding</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-5">
              <div className="text-center">
                <p className="text-[17px] font-bold text-[#3478F6] tracking-[-0.01em]">{nutritionPlan.protein_g || 0}g</p>
                <p className="text-[11px] text-[#AEAEB2] mt-0.5">eiwit</p>
              </div>
              <div className="text-center">
                <p className="text-[17px] font-bold text-[#2D9D4E] tracking-[-0.01em]">{nutritionPlan.carbs_g || 0}g</p>
                <p className="text-[11px] text-[#AEAEB2] mt-0.5">koolh</p>
              </div>
              <div className="text-center">
                <p className="text-[17px] font-bold text-[#9B59B6] tracking-[-0.01em]">{nutritionPlan.fat_g || 0}g</p>
                <p className="text-[11px] text-[#AEAEB2] mt-0.5">vet</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[20px] font-bold text-[#E68A00] tracking-[-0.01em]">{nutritionPlan.calories_target || 0}</p>
              <p className="text-[11px] text-[#AEAEB2] mt-0.5">kcal doel</p>
            </div>
          </div>
        </Link>
      )}

      {/* ─── GEWOONTES ────────────────────────────────── */}
      {habits.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#ECEAE5] overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#8B6914]/8 flex items-center justify-center">
                <Flame strokeWidth={1.5} className="w-[18px] h-[18px] text-[#8B6914]" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#AEAEB2]">Gewoontes</span>
            </div>
            <span className="text-[14px] font-bold tracking-[-0.01em]" style={{
              color: completedHabits === totalHabits && totalHabits > 0 ? '#2D9D4E' : '#AEAEB2'
            }}>
              {completedHabits}/{totalHabits}
            </span>
          </div>

          {/* Progress bar */}
          <div className="px-6 pb-3">
            <div className="w-full h-1 bg-[#ECEAE5] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{
                  width: `${totalHabits > 0 ? (completedHabits / totalHabits) * 100 : 0}%`,
                  backgroundColor: completedHabits === totalHabits ? '#2D9D4E' : '#8B6914',
                }}
              />
            </div>
          </div>

          {/* Habit list */}
          <div className="divide-y divide-[#ECEAE5]">
            {habits.map((habit) => {
              const completion = habitCompletions.find(c => c.habit_id === habit.id)
              const isCompleted = completion?.completed || false
              const streak = habitStreaks[habit.id] || 0

              return (
                <button
                  key={habit.id}
                  onClick={() => toggleHabit(habit.id)}
                  disabled={togglingHabit === habit.id}
                  className="w-full px-6 py-3.5 flex items-center gap-3.5 hover:bg-[#F9F8F5] transition-all duration-[280ms] text-left"
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-[280ms]"
                    style={{
                      backgroundColor: isCompleted ? '#2D9D4E' : 'transparent',
                      border: isCompleted ? 'none' : '1.5px solid #AEAEB2',
                    }}
                  >
                    {isCompleted && <CheckCircle strokeWidth={2.5} className="w-4 h-4 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[14px] font-medium transition-all duration-[280ms] tracking-[-0.01em]"
                      style={{
                        color: isCompleted ? '#AEAEB2' : '#1A1A18',
                        textDecoration: isCompleted ? 'line-through' : 'none',
                      }}
                    >
                      <span className="mr-1.5">{habit.icon}</span>
                      {habit.name}
                    </p>
                  </div>
                  {streak > 0 && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Flame strokeWidth={1.5} className="w-3.5 h-3.5 text-[#E68A00]" />
                      <span className="text-[12px] font-bold text-[#E68A00]">{streak}</span>
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
          className="block bg-[#2D9D4E]/4 rounded-2xl p-6 border border-[#2D9D4E]/10 hover:bg-[#2D9D4E]/7 transition-all duration-[280ms]"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#2D9D4E] flex items-center justify-center shrink-0">
              <Calendar strokeWidth={1.5} className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[16px] font-semibold text-[#1A1A18] tracking-[-0.01em]">Check-in beschikbaar</p>
              <p className="text-[14px] text-[#2D9D4E] mt-0.5">
                {daysUntilCheckIn === 0 ? 'Vandaag is het zover!' : `Nog ${daysUntilCheckIn} ${daysUntilCheckIn === 1 ? 'dag' : 'dagen'}`}
              </p>
            </div>
            <ChevronRight strokeWidth={1.5} className="w-5 h-5 text-[#2D9D4E] ml-auto shrink-0" />
          </div>
        </Link>
      )}

      {/* ─── RECENTE ACTIVITEIT ──────────────────────── */}
      {workoutSessions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-[16px] font-semibold text-[#1A1A18] tracking-[-0.01em]">Recente workouts</h2>
            <Link href="/client/workout/history" className="text-[13px] font-semibold text-[#8B6914] flex items-center gap-0.5 hover:text-[#A07B1A] transition-colors duration-[280ms]">
              Alle <ChevronRight strokeWidth={1.5} className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-2.5">
            {workoutSessions.map((session) => (
              <div key={session.id} className="bg-white rounded-xl p-4 border border-[#ECEAE5] flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#3478F6]/8 flex items-center justify-center shrink-0">
                  <Activity strokeWidth={1.5} className="w-[18px] h-[18px] text-[#3478F6]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-[#1A1A18] truncate tracking-[-0.01em]">
                    {(Array.isArray(session.program_template_days) ? session.program_template_days[0]?.name : session.program_template_days?.name) || 'Workout'}
                  </p>
                  <p className="text-[12px] text-[#AEAEB2] mt-0.5">
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
        <div>
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-[16px] font-semibold text-[#1A1A18] tracking-[-0.01em]">Recente PR's</h2>
            <Link href="/client/progress" className="text-[13px] font-semibold text-[#8B6914] flex items-center gap-0.5 hover:text-[#A07B1A] transition-colors duration-[280ms]">
              Alle <ChevronRight strokeWidth={1.5} className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {personalRecords.map((pr) => (
              <div key={pr.id} className="bg-white rounded-xl p-4 border border-[#ECEAE5] min-w-[150px] shrink-0">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Trophy strokeWidth={1.5} className="w-3.5 h-3.5 text-[#9B59B6]" />
                  <span className="text-[11px] text-[#AEAEB2]">{getTimeAgo(pr.achieved_at)}</span>
                </div>
                <p className="text-[13px] font-medium text-[#1A1A18] truncate mb-1.5 tracking-[-0.01em]">
                  {(Array.isArray(pr.exercises) ? pr.exercises[0]?.name : pr.exercises?.name) || 'Oefening'}
                </p>
                <p className="text-[18px] font-bold text-[#9B59B6] tracking-[-0.01em]">
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
