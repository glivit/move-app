'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Dumbbell, CheckCircle, ChevronRight, Apple, Video,
  MessageSquare, Calendar, ArrowRight, ShieldCheck,
  Flame, TrendingDown, TrendingUp, Activity,
  ClipboardList, AlertCircle, ChevronLeft
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

// ─── Week Calendar ──────────────────────────────────────────

function WeekCalendar({ scheduleDays, completedDates }: {
  scheduleDays: Array<{ dayNumber: number; name: string; focus: string | null }>
  completedDates: string[]
}) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const today = new Date()
  const todayDow = today.getDay() === 0 ? 7 : today.getDay() // 1=ma, 7=zo
  const dayLabels = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']

  // Build 14 days from today
  const days = Array.from({ length: 14 }, (_, i) => {
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
    <div className="bg-white border border-[#E8E4DC] animate-slide-up" style={{ animationDelay: '240ms' }}>
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={16} strokeWidth={1.5} className="text-[#1A1917]" />
          <span className="text-[13px] font-semibold text-[#1A1917] uppercase tracking-[0.06em]">Schema</span>
        </div>

        {/* Day pills — scrollable row */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {days.map((day, i) => {
            const isSelected = selectedDay === i
            const hasTraining = !!day.scheduled
            return (
              <button
                key={day.dateStr}
                onClick={() => setSelectedDay(isSelected ? null : i)}
                className={`flex flex-col items-center min-w-[42px] py-2 px-1 transition-all shrink-0 ${
                  isSelected
                    ? 'bg-[#1A1917] text-white'
                    : day.isToday
                      ? 'bg-[#F5F2EC]'
                      : ''
                }`}
              >
                <span className={`text-[10px] font-semibold uppercase ${
                  isSelected ? 'text-white/70' : 'text-[#A09D96]'
                }`}>
                  {day.dayLabel}
                </span>
                <span className={`text-[16px] font-bold mt-0.5 ${
                  isSelected ? 'text-white' : 'text-[#1A1917]'
                }`}>
                  {day.dayOfMonth}
                </span>
                {/* Indicator dot */}
                <div className="h-1.5 mt-1">
                  {day.completed ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#34C759]" />
                  ) : hasTraining ? (
                    <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/50' : 'bg-[#1A1917]'}`} />
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selectedInfo && (
        <div className="px-5 py-4 border-t border-[#F0EDE8]">
          {selectedInfo.scheduled ? (
            <Link
              href="/client/workout"
              className="flex items-center justify-between group"
            >
              <div>
                <p className="text-[14px] font-semibold text-[#1A1917]">
                  {selectedInfo.scheduled.name}
                </p>
                {selectedInfo.scheduled.focus && (
                  <p className="text-[12px] text-[#A09D96] mt-0.5">
                    {selectedInfo.scheduled.focus}
                  </p>
                )}
              </div>
              {selectedInfo.completed ? (
                <CheckCircle strokeWidth={1.5} className="w-5 h-5 text-[#34C759] shrink-0" />
              ) : (
                <ChevronRight strokeWidth={1.5} className="w-4 h-4 text-[#CCC7BC] group-hover:text-[#1A1917] transition-colors shrink-0" />
              )}
            </Link>
          ) : (
            <p className="text-[14px] text-[#A09D96]">Rustdag</p>
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
      <div className="animate-fade-in mb-10">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-label">{formatDate(new Date())}</span>
            <h1 className="text-editorial-h1 text-[#1A1917] mt-3">
              {getGreeting()},
            </h1>
            <h1 className="text-editorial-h1 text-[#1A1917]">
              {firstName}.
            </h1>
          </div>
          <div className="mt-4">
            <NotificationCenter />
          </div>
        </div>
      </div>

      {/* ═══ MOMENTUM — editorial stat strip ═══════════════ */}
      <div className="flex items-center gap-6 mb-10 animate-fade-in" style={{ animationDelay: '60ms' }}>
        <div className="flex items-center gap-2">
          <Flame strokeWidth={1.5} className="w-4 h-4 text-[#C47D15]" />
          <span className="text-[14px] font-semibold text-[#1A1917]">{momentum.streakDays}</span>
          <span className="text-[13px] text-[#A09D96]">dagen</span>
        </div>
        <div className="w-px h-4 bg-[#DDD9D0]" />
        <div className="flex items-center gap-2">
          <Activity strokeWidth={1.5} className="w-4 h-4 text-[#3068C4]" />
          <span className="text-[14px] font-semibold text-[#1A1917]">{momentum.workoutsThisWeek}</span>
          <span className="text-[13px] text-[#A09D96]">deze week</span>
        </div>
        {momentum.weightChangeMonth !== null && (
          <>
            <div className="w-px h-4 bg-[#DDD9D0]" />
            <div className="flex items-center gap-2">
              {momentum.weightChangeMonth <= 0 ? (
                <TrendingDown strokeWidth={1.5} className="w-4 h-4 text-[#3D8B5C]" />
              ) : (
                <TrendingUp strokeWidth={1.5} className="w-4 h-4 text-[#C47D15]" />
              )}
              <span className="text-[14px] font-semibold text-[#1A1917]">
                {momentum.weightChangeMonth > 0 ? '+' : ''}{momentum.weightChangeMonth}kg
              </span>
            </div>
          </>
        )}
      </div>

      {/* ═══ URGENTE BADGES ═════════════════════════════════ */}
      {(actions.unreadMessages > 0 || actions.nextVideoCall) && (
        <div className="flex gap-3 mb-8 animate-fade-in" style={{ animationDelay: '90ms' }}>
          {actions.unreadMessages > 0 && (
            <Link href="/client/messages" className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E8E4DC] hover:border-[#CCC7BC] transition-colors">
              <MessageSquare strokeWidth={1.5} className="w-4 h-4 text-[#3068C4]" />
              <span className="text-[13px] font-semibold text-[#1A1917]">{actions.unreadMessages} {actions.unreadMessages === 1 ? 'bericht' : 'berichten'}</span>
            </Link>
          )}
          {actions.nextVideoCall && (
            <Link href={`/client/video/${actions.nextVideoCall.id}`} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E8E4DC] hover:border-[#CCC7BC] transition-colors">
              <Video strokeWidth={1.5} className="w-4 h-4 text-[#3D8B5C]" />
              <span className="text-[13px] font-semibold text-[#1A1917]">
                Video {new Date(actions.nextVideoCall.scheduled_at).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric' })}
              </span>
            </Link>
          )}
        </div>
      )}

      {/* ═══ ONBOARDING ════════════════════════════════════ */}
      {showOnboarding && (
        <Link
          href="/onboarding"
          className="block bg-[#1A1917] p-6 mb-8 animate-slide-up group"
          style={{ animationDelay: '120ms' }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#A09D96]">
              Profiel voltooien
            </span>
            <ArrowRight strokeWidth={1.5} className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
          </div>
          <p className="text-[17px] font-semibold text-white mb-4">
            Vul je intake formulier in zodat je coach je programma kan opstellen
          </p>
          <div className="w-full h-[3px] bg-white/20 overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-500"
              style={{ width: `${(onboarding.currentStep / onboarding.totalSteps) * 100}%` }}
            />
          </div>
          <span className="text-[12px] text-[#A09D96] mt-2 block">
            {onboarding.currentStep} van {onboarding.totalSteps}
          </span>
        </Link>
      )}

      {/* ═══ TRAINING — editorial card ═══════════════════ */}
      <Link
        href="/client/workout"
        className="block bg-white p-6 mb-2 group animate-slide-up"
        style={{ animationDelay: '150ms' }}
      >
        {training.today ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-label">
                {training.today.completed ? 'Voltooid' : 'Training vandaag'}
              </span>
              {training.today.completed ? (
                <CheckCircle strokeWidth={1.5} className="w-5 h-5 text-[#3D8B5C]" />
              ) : (
                <ArrowRight strokeWidth={1.5} className="w-4 h-4 text-[#CCC7BC] group-hover:translate-x-1 group-hover:text-[#1A1917] transition-all" />
              )}
            </div>

            <h2 className="text-editorial-h3 text-[#1A1917] mb-2">
              {training.today.name}
            </h2>

            <p className="text-[14px] text-[#6B6862]">
              {training.today.focus && <>{training.today.focus} · </>}
              ±{training.today.durationMin} min
              {training.today.exerciseCount && <> · {training.today.exerciseCount} oefeningen</>}
            </p>

            {!training.today.completed && (
              <div className="mt-6">
                <span className="btn-primary inline-flex">
                  Start workout
                </span>
              </div>
            )}

            {training.today.completed && training.next && (
              <p className="text-[13px] text-[#A09D96] mt-4">
                Volgende → {training.next.name} {training.next.label}
              </p>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-label">Training</span>
            </div>
            <h2 className="text-editorial-h3 text-[#A09D96] mb-2">
              Rustdag
            </h2>
            {training.next && (
              <p className="text-[14px] text-[#6B6862]">
                Volgende training: {training.next.name} {training.next.label}
              </p>
            )}
          </div>
        )}
      </Link>

      {/* Thin divider between sections */}
      <div className="h-px bg-[#E8E4DC] mb-2" />

      {/* ═══ VOEDING — editorial checklist ════════════════ */}
      {nutrition && nutrition.mealsTotal > 0 && (
        <div className="bg-white animate-slide-up mb-2" style={{ animationDelay: '210ms' }}>
          {/* Header */}
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-label">Voeding</span>
              <span className="text-[14px] font-semibold" style={{
                color: nutrition.mealsCompleted === nutrition.mealsTotal && nutrition.mealsTotal > 0 ? '#3D8B5C' : '#A09D96'
              }}>
                {nutrition.mealsCompleted}/{nutrition.mealsTotal}
              </span>
            </div>

            {/* Thin progress line */}
            <div className="w-full h-[2px] bg-[#E5E1D9] mt-3">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${nutrition.mealsTotal > 0 ? (nutrition.mealsCompleted / nutrition.mealsTotal) * 100 : 0}%`,
                  backgroundColor: nutrition.mealsCompleted === nutrition.mealsTotal ? '#3D8B5C' : '#1A1917',
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
                className="w-full flex items-center gap-4 px-6 py-4 hover:bg-[#FAF8F3] transition-colors text-left"
              >
                {/* Custom checkbox */}
                <div
                  className="w-5 h-5 border flex items-center justify-center shrink-0 transition-all duration-200"
                  style={{
                    backgroundColor: meal.completed ? '#1A1917' : 'transparent',
                    borderColor: meal.completed ? '#1A1917' : '#CCC7BC',
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

                  {/* Food items inline */}
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
            className="flex items-center justify-between px-6 py-3.5 border-t border-[#F0EDE8] hover:bg-[#FAF8F3] transition-colors"
          >
            <span className="text-[13px] font-medium text-[#6B6862]">Bekijk voedingsplan</span>
            <ChevronRight strokeWidth={1.5} className="w-4 h-4 text-[#CCC7BC]" />
          </Link>
        </div>
      )}

      {/* ═══ WEEKKALENDER ══════════════════════════════════ */}
      {training.scheduleDays && training.scheduleDays.length > 0 && (
        <WeekCalendar
          scheduleDays={training.scheduleDays}
          completedDates={training.completedDates || []}
        />
      )}

      <div className="h-px bg-[#E8E4DC] mb-2" />

      {/* ═══ ACTIES — editorial action cards ═══════════════ */}
      {hasActions && (
        <div className="animate-slide-up" style={{ animationDelay: '270ms' }}>
          {actions.pendingPrompt && (
            <Link href="/client/prompts" className="flex items-center gap-4 bg-white px-6 py-5 border-b border-[#F0EDE8] group hover:bg-[#FAF8F3] transition-colors">
              <div className="w-10 h-10 bg-[#1A1917] flex items-center justify-center shrink-0">
                <MessageSquare strokeWidth={1.5} className="w-5 h-5 text-white" />
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
            <Link href="/client/accountability" className="flex items-center gap-4 bg-white px-6 py-5 border-b border-[#F0EDE8] group hover:bg-[#FAF8F3] transition-colors">
              <div className="w-10 h-10 bg-[#1A1917] flex items-center justify-center shrink-0">
                <ShieldCheck strokeWidth={1.5} className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-[#1A1917]">Dagelijkse check</p>
                <p className="text-[12px] text-[#A09D96] mt-0.5">Laat weten hoe je dag was</p>
              </div>
              <ArrowRight strokeWidth={1.5} className="w-4 h-4 text-[#CCC7BC] group-hover:translate-x-1 group-hover:text-[#1A1917] transition-all shrink-0" />
            </Link>
          )}

          {actions.checkInDue !== null && (
            <Link href="/client/check-in" className="flex items-center gap-4 bg-white px-6 py-5 group hover:bg-[#FAF8F3] transition-colors">
              <div className="w-10 h-10 bg-[#1A1917] flex items-center justify-center shrink-0">
                <Calendar strokeWidth={1.5} className="w-5 h-5 text-white" />
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
