'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  CheckCircle, ChevronRight, Video,
  MessageSquare, Calendar, ArrowRight, ShieldCheck,
  Flame, TrendingDown, TrendingUp, Activity,
} from 'lucide-react'
import { NotificationCenter } from '@/components/client/NotificationCenter'

// ─── Types ──────────────────────────────────────────────────

interface DashboardData {
  profile: {
    firstName: string
    startDate: string | null
  } | null
  onboarding: {
    complete: boolean
    currentStep: number
    totalSteps: number
  }
  training: {
    today: {
      id: string
      name: string
      focus: string | null
      durationMin: number
      exerciseCount: number | null
      completed: boolean
    } | null
    next: {
      name: string
      label: string
    } | null
    isRestDay: boolean
    scheduleDays: Array<{ dayNumber: number; name: string; focus: string | null }>
    completedDates: string[]
  }
  nutrition: {
    meals: Array<{
      id: string
      name: string
      time: string | null
      completed: boolean
      items: Array<{
        name: string
        grams: number | null
        calories: number
        protein: number
      }>
      clientNotes: string | null
    }>
    mealsCompleted: number
    mealsTotal: number
    targets: {
      calories: number | null
      protein: number | null
      carbs: number | null
      fat: number | null
    }
    planId: string
  } | null
  actions: {
    accountabilityPending: boolean
    pendingPrompt: { id: string; question: string } | null
    unreadMessages: number
    nextVideoCall: { id: string; scheduled_at: string } | null
    checkInDue: { daysUntil: number; overdue: boolean } | null
  }
  momentum: {
    streakDays: number
    workoutsThisWeek: number
    weightChangeMonth: number | null
  }
  notificationCount: number
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

// ─── Week Calendar — clean dot style ────────────────────────

function WeekCalendar({ scheduleDays, completedDates }: {
  scheduleDays: Array<{ dayNumber: number; name: string; focus: string | null }>
  completedDates: string[]
}) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const today = new Date()
  const dayLabels = ['M', 'D', 'W', 'D', 'V', 'Z', 'Z']

  // Build 7 days from today (current week view)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const dow = d.getDay() === 0 ? 7 : d.getDay()
    const dateStr = d.toISOString().split('T')[0]
    const scheduled = scheduleDays.find(s => s.dayNumber === dow)
    const completed = completedDates.includes(dateStr)
    return {
      date: d,
      dateStr,
      dayOfMonth: d.getDate(),
      dayLabel: dayLabels[dow - 1],
      dow,
      scheduled,
      completed,
      isToday: i === 0,
    }
  })

  const selectedInfo = selectedDay !== null ? days[selectedDay] : null

  return (
    <div className="animate-slide-up mb-10" style={{ animationDelay: '120ms' }}>
      {/* Day circles row */}
      <div className="flex justify-between items-center px-2 mb-3">
        {days.map((day, i) => {
          const isSelected = selectedDay === i
          const hasTraining = !!day.scheduled
          return (
            <button
              key={day.dateStr}
              onClick={() => setSelectedDay(isSelected ? null : i)}
              className="flex flex-col items-center gap-1.5"
            >
              <span className="text-[11px] font-semibold text-[#A09D96] uppercase">
                {day.dayLabel}
              </span>
              <div className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${
                isSelected
                  ? 'bg-[var(--color-pop)] shadow-[0_2px_8px_rgba(212,106,58,0.3)]'
                  : day.isToday
                    ? 'bg-white shadow-[var(--shadow-card)]'
                    : ''
              }`}>
                <span className={`text-[15px] font-bold ${
                  isSelected ? 'text-white' : 'text-[#1A1917]'
                }`}>
                  {day.dayOfMonth}
                </span>
              </div>
              {/* Status dot */}
              <div className="h-[6px]">
                {day.completed ? (
                  <div className="w-[6px] h-[6px] rounded-full bg-[#3D8B5C]" />
                ) : hasTraining ? (
                  <div className="w-[6px] h-[6px] rounded-full bg-[var(--color-pop)]" />
                ) : null}
              </div>
            </button>
          )
        })}
      </div>

      {/* Selected day detail — slides in */}
      {selectedInfo && (
        <div className="bg-white rounded-2xl p-5 mt-2 shadow-[var(--shadow-card)] animate-fade-in">
          {selectedInfo.scheduled ? (
            <Link
              href="/client/workout"
              className="flex items-center justify-between group"
            >
              <div>
                <p className="text-[15px] font-semibold text-[#1A1917]">
                  {selectedInfo.scheduled.name}
                </p>
                {selectedInfo.scheduled.focus && (
                  <p className="text-[13px] text-[#A09D96] mt-1">
                    {selectedInfo.scheduled.focus}
                  </p>
                )}
              </div>
              {selectedInfo.completed ? (
                <CheckCircle strokeWidth={1.5} className="w-5 h-5 text-[#3D8B5C] shrink-0" />
              ) : (
                <ChevronRight strokeWidth={1.5} className="w-4 h-4 text-[#CCC7BC] group-hover:text-[#1A1917] transition-colors shrink-0" />
              )}
            </Link>
          ) : (
            <p className="text-[15px] text-[#A09D96]">Rustdag</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Component ──────────────────────────────────────────────

export default function ClientDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [togglingMeal, setTogglingMeal] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      const res = await fetch('/api/dashboard')
      if (res.ok) {
        const d = await res.json()
        setData(d)
      }
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleMeal = useCallback(async (mealId: string, mealName: string, currentCompleted: boolean) => {
    if (!data?.nutrition) return
    setTogglingMeal(mealId)

    setData(prev => {
      if (!prev?.nutrition) return prev
      return {
        ...prev,
        nutrition: {
          ...prev.nutrition,
          meals: prev.nutrition.meals.map(m =>
            m.id === mealId ? { ...m, completed: !currentCompleted } : m
          ),
          mealsCompleted: currentCompleted
            ? prev.nutrition.mealsCompleted - 1
            : prev.nutrition.mealsCompleted + 1,
        },
      }
    })

    try {
      await fetch('/api/nutrition-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: data.nutrition.planId,
          date: today,
          meal_id: mealId,
          meal_name: mealName,
          completed: !currentCompleted,
        }),
      })
    } catch {
      setData(prev => {
        if (!prev?.nutrition) return prev
        return {
          ...prev,
          nutrition: {
            ...prev.nutrition,
            meals: prev.nutrition.meals.map(m =>
              m.id === mealId ? { ...m, completed: currentCompleted } : m
            ),
            mealsCompleted: currentCompleted
              ? prev.nutrition.mealsCompleted + 1
              : prev.nutrition.mealsCompleted - 1,
          },
        }
      })
    } finally {
      setTogglingMeal(null)
    }
  }, [data, today])

  // ─── Loading ─────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-[1.5px] border-[#1A1917] border-t-transparent" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-[#A09D96]">
        Er ging iets mis bij het laden.
      </div>
    )
  }

  const { training, nutrition, actions, momentum, onboarding } = data
  const firstName = data.profile?.firstName || ''
  const hasActions = actions.accountabilityPending || actions.pendingPrompt || actions.checkInDue !== null
  const showOnboarding = onboarding && !onboarding.complete

  // ─── Render ─────────────────────────────────────────────

  return (
    <div className="pb-28">

      {/* ═══ EDITORIAL HEADER ═══════════════════════════════ */}
      <div className="animate-fade-in mb-12">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-label">{formatDate(new Date())}</span>
            <h1 className="text-editorial-h1 text-[#1A1917] mt-4">
              {getGreeting()},
            </h1>
            <h1 className="text-editorial-h1 text-[#1A1917]">
              {firstName}.
            </h1>
          </div>
          <div className="mt-5">
            <NotificationCenter />
          </div>
        </div>
      </div>

      {/* ═══ MOMENTUM — playful stat pills ═════════════════ */}
      <div className="flex gap-3 mb-12 animate-fade-in" style={{ animationDelay: '60ms' }}>
        <div className="flex-1 bg-white rounded-2xl p-5 shadow-[var(--shadow-card)]">
          <p className="text-[32px] font-bold text-[var(--color-pop)] leading-none tracking-tight">
            {momentum.streakDays}
          </p>
          <p className="text-[12px] text-[#A09D96] mt-2 font-medium">dagen streak</p>
        </div>
        <div className="flex-1 bg-white rounded-2xl p-5 shadow-[var(--shadow-card)]">
          <p className="text-[32px] font-bold text-[#1A1917] leading-none tracking-tight">
            {momentum.workoutsThisWeek}
          </p>
          <p className="text-[12px] text-[#A09D96] mt-2 font-medium">deze week</p>
        </div>
        {momentum.weightChangeMonth !== null && (
          <div className="flex-1 bg-white rounded-2xl p-5 shadow-[var(--shadow-card)]">
            <p className="text-[32px] font-bold leading-none tracking-tight" style={{
              color: momentum.weightChangeMonth <= 0 ? '#3D8B5C' : '#C47D15'
            }}>
              {momentum.weightChangeMonth > 0 ? '+' : ''}{momentum.weightChangeMonth}
            </p>
            <p className="text-[12px] text-[#A09D96] mt-2 font-medium">kg deze maand</p>
          </div>
        )}
      </div>

      {/* ═══ URGENTE BADGES ═════════════════════════════════ */}
      {(actions.unreadMessages > 0 || actions.nextVideoCall) && (
        <div className="flex gap-3 mb-10 animate-fade-in" style={{ animationDelay: '90ms' }}>
          {actions.unreadMessages > 0 && (
            <Link href="/client/messages" className="flex items-center gap-2.5 px-5 py-3 bg-white rounded-xl shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow">
              <MessageSquare strokeWidth={1.5} className="w-4 h-4 text-[var(--color-pop)]" />
              <span className="text-[13px] font-semibold text-[#1A1917]">{actions.unreadMessages} {actions.unreadMessages === 1 ? 'bericht' : 'berichten'}</span>
            </Link>
          )}
          {actions.nextVideoCall && (
            <Link href={`/client/video/${actions.nextVideoCall.id}`} className="flex items-center gap-2.5 px-5 py-3 bg-white rounded-xl shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow">
              <Video strokeWidth={1.5} className="w-4 h-4 text-[var(--color-pop)]" />
              <span className="text-[13px] font-semibold text-[#1A1917]">
                Videocall {new Date(actions.nextVideoCall.scheduled_at).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric' })}
              </span>
            </Link>
          )}
        </div>
      )}

      {/* ═══ ONBOARDING ════════════════════════════════════ */}
      {showOnboarding && (
        <Link
          href="/onboarding"
          className="block bg-[#1A1917] rounded-2xl p-7 mb-10 animate-slide-up group"
          style={{ animationDelay: '100ms' }}
        >
          <div className="flex items-center justify-between mb-5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#A09D96]">
              Profiel voltooien
            </span>
            <ArrowRight strokeWidth={1.5} className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
          </div>
          <p className="text-[17px] font-semibold text-white mb-5">
            Vul je intake formulier in zodat je coach je programma kan opstellen
          </p>
          <div className="w-full h-[3px] bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-500"
              style={{ width: `${(onboarding.currentStep / onboarding.totalSteps) * 100}%` }}
            />
          </div>
          <span className="text-[12px] text-[#A09D96] mt-2.5 block">
            {onboarding.currentStep} van {onboarding.totalSteps}
          </span>
        </Link>
      )}

      {/* ═══ WEEKKALENDER ══════════════════════════════════ */}
      <WeekCalendar
        scheduleDays={training.scheduleDays || []}
        completedDates={training.completedDates || []}
      />

      {/* ═══ TRAINING — editorial card ═══════════════════ */}
      <Link
        href="/client/workout"
        className="block bg-white rounded-2xl p-7 mb-3 shadow-[var(--shadow-card)] group animate-slide-up hover:shadow-[var(--shadow-card-hover)] transition-shadow"
        style={{ animationDelay: '150ms' }}
      >
        {training.today ? (
          <div>
            <div className="flex items-center justify-between mb-5">
              <span className="text-label">
                {training.today.completed ? 'Voltooid' : 'Training vandaag'}
              </span>
              {training.today.completed ? (
                <CheckCircle strokeWidth={1.5} className="w-5 h-5 text-[#3D8B5C]" />
              ) : (
                <ArrowRight strokeWidth={1.5} className="w-4 h-4 text-[#CCC7BC] group-hover:translate-x-1 group-hover:text-[#1A1917] transition-all" />
              )}
            </div>

            <h2 className="text-editorial-h3 text-[#1A1917] mb-3">
              {training.today.name}
            </h2>

            <p className="text-[14px] text-[#6B6862]">
              {training.today.focus && <>{training.today.focus} · </>}
              ±{training.today.durationMin} min
              {training.today.exerciseCount && <> · {training.today.exerciseCount} oefeningen</>}
            </p>

            {!training.today.completed && (
              <div className="mt-7">
                <span className="btn-pop inline-flex">
                  Start workout
                </span>
              </div>
            )}

            {training.today.completed && training.next && (
              <p className="text-[13px] text-[#A09D96] mt-5">
                Volgende: {training.next.name} {training.next.label}
              </p>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-5">
              <span className="text-label">Training</span>
            </div>
            <h2 className="text-editorial-h3 text-[#A09D96]">
              Rustdag
            </h2>
            {training.next && (
              <p className="text-[14px] text-[#6B6862] mt-3">
                Volgende training: {training.next.name} {training.next.label}
              </p>
            )}
          </div>
        )}
      </Link>

      {/* ═══ VOEDING — editorial checklist ════════════════ */}
      {nutrition && nutrition.mealsTotal > 0 && (
        <div className="bg-white rounded-2xl shadow-[var(--shadow-card)] animate-slide-up mb-3 overflow-hidden" style={{ animationDelay: '210ms' }}>
          {/* Header */}
          <div className="px-7 pt-7 pb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-label">Voeding</span>
              <span className="text-[14px] font-semibold" style={{
                color: nutrition.mealsCompleted === nutrition.mealsTotal && nutrition.mealsTotal > 0 ? '#3D8B5C' : '#A09D96'
              }}>
                {nutrition.mealsCompleted}/{nutrition.mealsTotal}
              </span>
            </div>

            {/* Progress line */}
            <div className="w-full h-[3px] bg-[#E5E1D9] rounded-full mt-3">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${nutrition.mealsTotal > 0 ? (nutrition.mealsCompleted / nutrition.mealsTotal) * 100 : 0}%`,
                  backgroundColor: nutrition.mealsCompleted === nutrition.mealsTotal ? '#3D8B5C' : 'var(--color-pop)',
                }}
              />
            </div>
          </div>

          {/* Meals */}
          {nutrition.meals.map((meal) => (
            <div key={meal.id} className="border-t border-[#F0EDE8]">
              <button
                onClick={() => toggleMeal(meal.id, meal.name, meal.completed)}
                disabled={togglingMeal === meal.id}
                className="w-full flex items-center gap-4 px-7 py-4.5 hover:bg-[#FAF8F3] transition-colors text-left"
              >
                {/* Custom checkbox */}
                <div
                  className="w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all duration-200"
                  style={{
                    backgroundColor: meal.completed ? '#3D8B5C' : 'transparent',
                    borderColor: meal.completed ? '#3D8B5C' : '#CCC7BC',
                  }}
                >
                  {meal.completed && (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <span className={`text-[14px] font-medium transition-all ${
                    meal.completed ? 'text-[#A09D96] line-through' : 'text-[#1A1917]'
                  }`}>
                    {meal.name}
                  </span>

                  {meal.items && meal.items.length > 0 && !meal.completed && (
                    <p className="text-[12px] text-[#A09D96] mt-0.5 truncate">
                      {meal.items.map(i => i.name).join(', ')}
                    </p>
                  )}
                </div>

                {meal.time && (
                  <span className="text-[11px] text-[#C5C2BC] shrink-0">{meal.time}</span>
                )}
              </button>
            </div>
          ))}

          {/* Link */}
          <Link
            href="/client/nutrition"
            className="flex items-center justify-between px-7 py-4 border-t border-[#F0EDE8] hover:bg-[#FAF8F3] transition-colors"
          >
            <span className="text-[13px] font-medium text-[#6B6862]">Bekijk voedingsplan</span>
            <ChevronRight strokeWidth={1.5} className="w-4 h-4 text-[#CCC7BC]" />
          </Link>
        </div>
      )}

      {/* ═══ ACTIES — editorial action cards ═══════════════ */}
      {hasActions && (
        <div className="animate-slide-up mt-3" style={{ animationDelay: '270ms' }}>
          {actions.pendingPrompt && (
            <Link href="/client/prompts" className="flex items-center gap-4 bg-white rounded-2xl px-7 py-6 mb-3 shadow-[var(--shadow-card)] group hover:shadow-[var(--shadow-card-hover)] transition-shadow">
              <div className="w-10 h-10 bg-[var(--color-pop-light)] rounded-xl flex items-center justify-center shrink-0">
                <MessageSquare strokeWidth={1.5} className="w-5 h-5 text-[var(--color-pop)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-[#1A1917]">Wekelijkse reflectie</p>
                {actions.pendingPrompt.question && (
                  <p className="text-[12px] text-[#A09D96] mt-0.5 truncate">{actions.pendingPrompt.question}</p>
                )}
              </div>
              <ArrowRight strokeWidth={1.5} className="w-4 h-4 text-[#CCC7BC] group-hover:translate-x-1 group-hover:text-[#1A1917] transition-all shrink-0" />
            </Link>
          )}

          {actions.accountabilityPending && (
            <Link href="/client/accountability" className="flex items-center gap-4 bg-white rounded-2xl px-7 py-6 mb-3 shadow-[var(--shadow-card)] group hover:shadow-[var(--shadow-card-hover)] transition-shadow">
              <div className="w-10 h-10 bg-[var(--color-pop-light)] rounded-xl flex items-center justify-center shrink-0">
                <ShieldCheck strokeWidth={1.5} className="w-5 h-5 text-[var(--color-pop)]" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-[#1A1917]">Dagelijkse check</p>
                <p className="text-[12px] text-[#A09D96] mt-0.5">Laat weten hoe je dag was</p>
              </div>
              <ArrowRight strokeWidth={1.5} className="w-4 h-4 text-[#CCC7BC] group-hover:translate-x-1 group-hover:text-[#1A1917] transition-all shrink-0" />
            </Link>
          )}

          {actions.checkInDue !== null && (
            <Link href="/client/check-in" className="flex items-center gap-4 bg-white rounded-2xl px-7 py-6 shadow-[var(--shadow-card)] group hover:shadow-[var(--shadow-card-hover)] transition-shadow">
              <div className="w-10 h-10 bg-[var(--color-pop-light)] rounded-xl flex items-center justify-center shrink-0">
                <Calendar strokeWidth={1.5} className="w-5 h-5 text-[var(--color-pop)]" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-[#1A1917]">Maandelijkse meting</p>
                <p className="text-[12px] text-[#A09D96] mt-0.5">
                  {actions.checkInDue.overdue
                    ? 'Nu invullen'
                    : actions.checkInDue.daysUntil === 0
                      ? 'Vandaag'
                      : `Nog ${actions.checkInDue.daysUntil} ${actions.checkInDue.daysUntil === 1 ? 'dag' : 'dagen'}`}
                </p>
              </div>
              <ArrowRight strokeWidth={1.5} className="w-4 h-4 text-[#CCC7BC] group-hover:translate-x-1 group-hover:text-[#1A1917] transition-all shrink-0" />
            </Link>
          )}
        </div>
      )}

    </div>
  )
}
