'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Dumbbell, CheckCircle, ChevronRight, Apple, Video,
  MessageSquare, Calendar, ArrowUpRight, ShieldCheck,
  Flame, TrendingDown, TrendingUp, Activity,
  ClipboardList, AlertCircle
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

    // Optimistic update
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
      // Revert on error
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

  // ─── Loading state ────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-[1.5px] border-[#1A1917] border-t-transparent" />
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

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="pb-24 space-y-6">

      {/* ═══ BEGROETING + DATUM + NOTIFICATION BELL ═══════════ */}
      <div className="pt-2 mb-4 animate-fade-in">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-[#A09D96] mb-2">
              {formatDate(new Date())}
            </p>
            <h1
              className="text-[42px] font-semibold text-[#1A1917] tracking-[-0.03em] leading-[1.05]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {getGreeting()},<br />{firstName}
            </h1>
          </div>
          {/* Notification bell with dropdown */}
          <div className="mt-6">
            <NotificationCenter />
          </div>
        </div>
      </div>

      {/* ═══ URGENTE BADGES (berichten, video call) ═══════════ */}
      {(actions.unreadMessages > 0 || actions.nextVideoCall) && (
        <div className="flex gap-2.5 overflow-x-auto pb-1 animate-fade-in" style={{ animationDelay: '50ms', animationFillMode: 'both' }}>
          {actions.unreadMessages > 0 && (
            <Link href="/client/messages" className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#3068C4]/8 border border-[#3068C4]/12 shrink-0 transition-all duration-200 hover:bg-[#3068C4]/12">
              <MessageSquare strokeWidth={1.5} className="w-3.5 h-3.5 text-[#3068C4]" />
              <span className="text-[12px] font-semibold text-[#3068C4]">{actions.unreadMessages} {actions.unreadMessages === 1 ? 'bericht' : 'berichten'}</span>
            </Link>
          )}
          {actions.nextVideoCall && (
            <Link href={`/client/video/${actions.nextVideoCall.id}`} className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#3D8B5C]/8 border border-[#3D8B5C]/12 shrink-0 transition-all duration-200 hover:bg-[#3D8B5C]/12">
              <Video strokeWidth={1.5} className="w-3.5 h-3.5 text-[#3D8B5C]" />
              <span className="text-[12px] font-semibold text-[#3D8B5C]">
                Video call {new Date(actions.nextVideoCall.scheduled_at).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric' })}
              </span>
            </Link>
          )}
        </div>
      )}

      {/* ═══ ONBOARDING — Intake formulier ═══════════════════ */}
      {showOnboarding && (
        <Link
          href="/onboarding"
          className="block rounded-2xl border-2 overflow-hidden animate-slide-up"
          style={{
            borderColor: '#D14343',
            background: 'linear-gradient(135deg, rgba(209,67,67,0.06) 0%, rgba(209,67,67,0.01) 100%)',
            animationDelay: '60ms',
            animationFillMode: 'both',
          }}
        >
          <div className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#D14343] flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(209,67,67,0.3)]">
                <ClipboardList strokeWidth={1.5} className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[16px] font-semibold text-[#1A1917] tracking-[-0.01em]">
                  Maak je profiel compleet
                </p>
                <p className="text-[13px] text-[#D14343] mt-0.5">
                  Vul je intake formulier in zodat je coach je programma kan opstellen
                </p>
              </div>
              <ArrowUpRight strokeWidth={1.5} className="w-5 h-5 text-[#D14343] shrink-0" />
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#C5C2BC]">
                  Voortgang
                </span>
                <span className="text-[12px] font-semibold text-[#D14343]">
                  {onboarding.currentStep}/{onboarding.totalSteps}
                </span>
              </div>
              <div className="w-full h-2 bg-[#E5E1D9] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out bg-[#D14343]"
                  style={{
                    width: `${(onboarding.currentStep / onboarding.totalSteps) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* ═══ BLOK 1 — TRAINING VAN VANDAAG ═══════════════════ */}
      <Link
        href="/client/workout"
        className="block rounded-xl border border-[#E8E4DC] bg-white p-6 hover:border-[#CCC7BC] transition-all duration-300 group animate-slide-up"
        style={{ animationDelay: '80ms', animationFillMode: 'both' }}
      >
        {training.today ? (
          /* ── Trainingsdag ── */
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{
                  background: training.today.completed
                    ? 'linear-gradient(135deg, rgba(61,139,92,0.12) 0%, rgba(61,139,92,0.05) 100%)'
                    : 'linear-gradient(135deg, rgba(48,104,196,0.12) 0%, rgba(48,104,196,0.05) 100%)'
                }}>
                  {training.today.completed ? (
                    <CheckCircle strokeWidth={2} className="w-[18px] h-[18px] text-[#3D8B5C]" />
                  ) : (
                    <Dumbbell strokeWidth={1.5} className="w-[18px] h-[18px] text-[#3068C4]" />
                  )}
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#C5C2BC]">
                  {training.today.completed ? 'Voltooid' : 'Training'}
                </span>
              </div>
              <h3 className="text-[20px] font-semibold text-[#1A1917] tracking-[-0.02em]">
                {training.today.name}
              </h3>
              <p className="text-[14px] text-[#6B6862] mt-1">
                {training.today.focus && <>{training.today.focus} · </>}
                ±{training.today.durationMin} min
              </p>
              {/* Na voltooiing: toon volgende training */}
              {training.today.completed && training.next && (
                <p className="text-[13px] text-[#A09D96] mt-2">
                  Volgende: <span className="font-medium text-[#6B6862]">{training.next.name}</span> {training.next.label}
                </p>
              )}
            </div>
            {!training.today.completed && (
              <span className="px-6 py-2.5 rounded-lg bg-[#1A1917] text-white text-[13px] font-semibold tracking-[0.02em] group-hover:bg-[#333330] transition-colors shrink-0">
                Start
              </span>
            )}
          </div>
        ) : (
          /* ── Rustdag — toon altijd volgende training ── */
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-[#EEEBE3]">
                <Dumbbell strokeWidth={1.5} className="w-[18px] h-[18px] text-[#C5C2BC]" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#C5C2BC]">Training</span>
            </div>
            <h3 className="text-[20px] font-semibold text-[#A09D96] tracking-[-0.02em]">
              Rustdag vandaag
            </h3>
            {training.next ? (
              <p className="text-[14px] text-[#6B6862] mt-1">
                Volgende training: <span className="font-medium text-[#1A1917]">{training.next.name}</span> {training.next.label}
              </p>
            ) : (
              <p className="text-[14px] text-[#A09D96] mt-1">
                Geen trainingen gepland deze week
              </p>
            )}
          </div>
        )}
      </Link>

      {/* ═══ BLOK 2 — VOEDING VANDAAG ════════════════════════ */}
      {nutrition && nutrition.mealsTotal > 0 && (
        <div
          className="rounded-xl border border-[#E8E4DC] bg-white overflow-hidden animate-slide-up"
          style={{ animationDelay: '140ms', animationFillMode: 'both' }}
        >
          {/* Header */}
          <div className="px-6 pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{
                  background: nutrition.mealsCompleted === nutrition.mealsTotal
                    ? 'linear-gradient(135deg, rgba(61,139,92,0.12) 0%, rgba(61,139,92,0.05) 100%)'
                    : 'linear-gradient(135deg, rgba(196,125,21,0.12) 0%, rgba(196,125,21,0.05) 100%)'
                }}>
                  {nutrition.mealsCompleted === nutrition.mealsTotal && nutrition.mealsTotal > 0 ? (
                    <CheckCircle strokeWidth={2} className="w-[18px] h-[18px] text-[#3D8B5C]" />
                  ) : (
                    <Apple strokeWidth={1.5} className="w-[18px] h-[18px] text-[#C47D15]" />
                  )}
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#C5C2BC]">Voeding</span>
              </div>
              <span className="text-[14px] font-bold tracking-[-0.01em]" style={{
                color: nutrition.mealsCompleted === nutrition.mealsTotal && nutrition.mealsTotal > 0 ? '#3D8B5C' : '#A09D96'
              }}>
                {nutrition.mealsCompleted}/{nutrition.mealsTotal}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-[#E5E1D9] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${nutrition.mealsTotal > 0 ? (nutrition.mealsCompleted / nutrition.mealsTotal) * 100 : 0}%`,
                  backgroundColor: nutrition.mealsCompleted === nutrition.mealsTotal ? '#3D8B5C' : '#C47D15',
                }}
              />
            </div>
          </div>

          {/* Meal checklist with food details */}
          <div className="divide-y divide-[#E8E4DC]">
            {nutrition.meals.map((meal) => (
              <div key={meal.id} className="px-6 py-4">
                {/* Meal header with checkbox */}
                <button
                  onClick={() => toggleMeal(meal.id, meal.name, meal.completed)}
                  disabled={togglingMeal === meal.id}
                  className="w-full flex items-center gap-3.5 hover:opacity-80 transition-opacity text-left"
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-200"
                    style={{
                      backgroundColor: meal.completed ? '#3D8B5C' : 'transparent',
                      border: meal.completed ? 'none' : '1.5px solid #CCC7BC',
                    }}
                  >
                    {meal.completed && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 6L5 8.5L9.5 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span
                    className="text-[13px] font-semibold uppercase tracking-[0.05em] transition-all duration-200"
                    style={{
                      color: meal.completed ? '#A09D96' : '#1A1917',
                    }}
                  >
                    {meal.name}
                  </span>
                  {meal.time && (
                    <span className="text-[11px] text-[#C5C2BC] ml-auto">{meal.time}</span>
                  )}
                </button>

                {/* Food items list */}
                {meal.items && meal.items.length > 0 && (
                  <div className="ml-[38px] mt-2 space-y-1">
                    {meal.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span
                          className="text-[13px] tracking-[-0.01em]"
                          style={{
                            color: meal.completed ? '#C5C2BC' : '#6B6862',
                            textDecoration: meal.completed ? 'line-through' : 'none',
                          }}
                        >
                          {item.name}{item.grams ? ` — ${item.grams}g` : ''}
                        </span>
                        <span className="text-[11px] text-[#C5C2BC] shrink-0 ml-2">
                          {item.calories > 0 ? `${item.calories} kcal` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Client note indicator */}
                {meal.clientNotes && (
                  <div className="ml-[38px] mt-1.5">
                    <p className="text-[11px] text-[#C47D15] italic truncate">{meal.clientNotes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Link to full nutrition page */}
          <Link
            href="/client/nutrition"
            className="flex items-center justify-center gap-1 px-6 py-3 text-[13px] font-semibold text-[#1A1917] border-t border-[#E8E4DC] hover:bg-[#FAF8F3] transition-colors"
          >
            Voedingsdetails <ChevronRight strokeWidth={1.5} className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* ═══ BLOK 3 — ACTIE VEREIST (rood tot afgerond) ═══════ */}
      {hasActions && (
        <div className="space-y-3 animate-slide-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
          {/* Coach prompt — ROOD */}
          {actions.pendingPrompt && (
            <Link
              href="/client/prompts"
              className="block rounded-2xl p-5 border-2 transition-all duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
              style={{
                background: 'linear-gradient(135deg, rgba(209,67,67,0.06) 0%, rgba(209,67,67,0.01) 100%)',
                borderColor: 'rgba(209,67,67,0.35)',
              }}
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-[#D14343] flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(209,67,67,0.25)]">
                  <MessageSquare strokeWidth={1.5} className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-[#1A1917] tracking-[-0.01em]">Wekelijkse reflectie</p>
                  {actions.pendingPrompt.question && (
                    <p className="text-[13px] text-[#D14343] mt-0.5 truncate">&ldquo;{actions.pendingPrompt.question}&rdquo;</p>
                  )}
                </div>
                <ArrowUpRight strokeWidth={1.5} className="w-5 h-5 text-[#D14343] shrink-0" />
              </div>
            </Link>
          )}

          {/* Accountability check — ROOD */}
          {actions.accountabilityPending && (
            <Link
              href="/client/accountability"
              className="block rounded-2xl p-5 border-2 transition-all duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
              style={{
                background: 'linear-gradient(135deg, rgba(209,67,67,0.06) 0%, rgba(209,67,67,0.01) 100%)',
                borderColor: 'rgba(209,67,67,0.35)',
              }}
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-[#D14343] flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(209,67,67,0.25)]">
                  <ShieldCheck strokeWidth={1.5} className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-semibold text-[#1A1917] tracking-[-0.01em]">Dagelijkse check</p>
                  <p className="text-[13px] text-[#D14343] mt-0.5">Laat even weten hoe je dag was</p>
                </div>
                <ArrowUpRight strokeWidth={1.5} className="w-5 h-5 text-[#D14343] shrink-0" />
              </div>
            </Link>
          )}

          {/* Monthly check-in — ROOD */}
          {actions.checkInDue !== null && (
            <Link
              href="/client/check-in"
              className="block rounded-2xl p-5 border-2 transition-all duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
              style={{
                background: 'linear-gradient(135deg, rgba(209,67,67,0.06) 0%, rgba(209,67,67,0.01) 100%)',
                borderColor: 'rgba(209,67,67,0.35)',
              }}
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-[#D14343] flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(209,67,67,0.25)]">
                  <Calendar strokeWidth={1.5} className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-semibold text-[#1A1917] tracking-[-0.01em]">Maandelijkse meting</p>
                  <p className="text-[13px] text-[#D14343] mt-0.5">
                    {actions.checkInDue.overdue
                      ? 'Nu invullen!'
                      : actions.checkInDue.daysUntil === 0
                        ? 'Vandaag is het zover!'
                        : `Nog ${actions.checkInDue.daysUntil} ${actions.checkInDue.daysUntil === 1 ? 'dag' : 'dagen'}`}
                  </p>
                </div>
                <ArrowUpRight strokeWidth={1.5} className="w-5 h-5 text-[#D14343] shrink-0" />
              </div>
            </Link>
          )}
        </div>
      )}

      {/* ═══ BLOK 4 — MOMENTUM STRIP (altijd zichtbaar) ═══════ */}
      <div
        className="flex items-center gap-4 px-5 py-3.5 rounded-2xl bg-[#EEEBE3]/60 border border-[#E8E4DC] animate-slide-up overflow-x-auto"
        style={{ animationDelay: '260ms', animationFillMode: 'both' }}
      >
        <div className="flex items-center gap-1.5 shrink-0">
          <Flame strokeWidth={1.5} className="w-4 h-4 text-[#C47D15]" />
          <span className="text-[13px] font-semibold text-[#6B6862]">
            {momentum.streakDays}d streak
          </span>
        </div>

        <div className="w-px h-4 bg-[#CCC7BC] shrink-0" />

        <div className="flex items-center gap-1.5 shrink-0">
          <Activity strokeWidth={1.5} className="w-4 h-4 text-[#3068C4]" />
          <span className="text-[13px] font-semibold text-[#6B6862]">
            {momentum.workoutsThisWeek} {momentum.workoutsThisWeek === 1 ? 'training' : 'trainingen'} deze week
          </span>
        </div>

        {momentum.weightChangeMonth !== null && (
          <>
            <div className="w-px h-4 bg-[#CCC7BC] shrink-0" />
            <div className="flex items-center gap-1.5 shrink-0">
              {momentum.weightChangeMonth <= 0 ? (
                <TrendingDown strokeWidth={1.5} className="w-4 h-4 text-[#3D8B5C]" />
              ) : (
                <TrendingUp strokeWidth={1.5} className="w-4 h-4 text-[#C47D15]" />
              )}
              <span className="text-[13px] font-semibold text-[#6B6862]">
                {momentum.weightChangeMonth > 0 ? '+' : ''}{momentum.weightChangeMonth}kg
              </span>
            </div>
          </>
        )}
      </div>

    </div>
  )
}
