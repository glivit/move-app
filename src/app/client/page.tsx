'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Dumbbell, CheckCircle, ChevronRight, Apple, Video,
  MessageSquare, Calendar, ArrowUpRight, ShieldCheck,
  Flame, TrendingDown, TrendingUp, Activity
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────

interface DashboardData {
  profile: {
    firstName: string
    startDate: string | null
  } | null
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
    checkInDue: number | null
  }
  momentum: {
    streakDays: number
    workoutsThisWeek: number
    weightChangeMonth: number | null
  }
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
        <div className="animate-spin rounded-full h-8 w-8 border-[1.5px] border-[#9B7B2E] border-t-transparent" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-[#9C9A95]">
        Er ging iets mis bij het laden.
      </div>
    )
  }

  const { training, nutrition, actions, momentum } = data
  const firstName = data.profile?.firstName || ''
  const hasActions = actions.accountabilityPending || actions.pendingPrompt || actions.checkInDue !== null

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="pb-24 space-y-5">

      {/* ═══ BEGROETING + DATUM ═══════════════════════════════ */}
      <div className="pt-1 mb-2 animate-fade-in">
        <h1
          className="text-[36px] font-semibold text-[#1A1917] tracking-[-0.03em] leading-tight mb-1.5"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {getGreeting()}, {firstName}
        </h1>
        <p className="text-[15px] text-[#5C5A55] capitalize tracking-[-0.01em]">
          {formatDate(new Date())}
        </p>
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

      {/* ═══ BLOK 1 — TRAINING VAN VANDAAG ═══════════════════ */}
      <Link
        href="/client/workout"
        className="block rounded-2xl border border-[#F0F0ED] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all duration-200 group animate-slide-up"
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
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#BAB8B3]">
                  {training.today.completed ? 'Voltooid' : 'Training'}
                </span>
              </div>
              <h3 className="text-[20px] font-semibold text-[#1A1917] tracking-[-0.02em]">
                {training.today.name}
              </h3>
              <p className="text-[14px] text-[#5C5A55] mt-1">
                {training.today.focus && <>{training.today.focus} · </>}
                ±{training.today.durationMin} min
              </p>
            </div>
            {!training.today.completed && (
              <span className="px-5 py-2.5 rounded-xl bg-[#1A1917] text-white text-[13px] font-semibold group-hover:bg-[#2A2A28] transition-colors shrink-0 shadow-[0_2px_8px_rgba(26,25,23,0.2)]">
                Start
              </span>
            )}
          </div>
        ) : (
          /* ── Rustdag ── */
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-[#F5F2ED]">
                <Dumbbell strokeWidth={1.5} className="w-[18px] h-[18px] text-[#BAB8B3]" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#BAB8B3]">Training</span>
            </div>
            <h3 className="text-[20px] font-semibold text-[#9C9A95] tracking-[-0.02em]">
              Rustdag vandaag
            </h3>
            {training.next && (
              <p className="text-[14px] text-[#5C5A55] mt-1">
                Volgende training: <span className="font-medium text-[#1A1917]">{training.next.name}</span> {training.next.label}
              </p>
            )}
          </div>
        )}
      </Link>

      {/* ═══ BLOK 2 — VOEDING VANDAAG ════════════════════════ */}
      {nutrition && nutrition.mealsTotal > 0 && (
        <div
          className="rounded-2xl border border-[#F0F0ED] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden animate-slide-up"
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
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#BAB8B3]">Voeding</span>
              </div>
              <span className="text-[14px] font-bold tracking-[-0.01em]" style={{
                color: nutrition.mealsCompleted === nutrition.mealsTotal && nutrition.mealsTotal > 0 ? '#3D8B5C' : '#9C9A95'
              }}>
                {nutrition.mealsCompleted}/{nutrition.mealsTotal}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-[#F0EDE8] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${nutrition.mealsTotal > 0 ? (nutrition.mealsCompleted / nutrition.mealsTotal) * 100 : 0}%`,
                  backgroundColor: nutrition.mealsCompleted === nutrition.mealsTotal ? '#3D8B5C' : '#C47D15',
                }}
              />
            </div>
          </div>

          {/* Meal checklist */}
          <div className="divide-y divide-[#F0F0ED]">
            {nutrition.meals.map((meal) => (
              <button
                key={meal.id}
                onClick={() => toggleMeal(meal.id, meal.name, meal.completed)}
                disabled={togglingMeal === meal.id}
                className="w-full px-6 py-3.5 flex items-center gap-3.5 hover:bg-[#FAFAF8] transition-colors text-left"
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-200"
                  style={{
                    backgroundColor: meal.completed ? '#3D8B5C' : 'transparent',
                    border: meal.completed ? 'none' : '1.5px solid #D1CFC9',
                  }}
                >
                  {meal.completed && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span
                  className="text-[15px] transition-all duration-200 tracking-[-0.01em]"
                  style={{
                    color: meal.completed ? '#9C9A95' : '#1A1917',
                    fontWeight: meal.completed ? 400 : 500,
                  }}
                >
                  {meal.name}
                </span>
                {meal.time && (
                  <span className="text-[12px] text-[#BAB8B3] ml-auto">{meal.time}</span>
                )}
              </button>
            ))}
          </div>

          {/* Link to full nutrition page */}
          <Link
            href="/client/nutrition"
            className="flex items-center justify-center gap-1 px-6 py-3 text-[13px] font-semibold text-[#9B7B2E] border-t border-[#F0F0ED] hover:bg-[#FAFAF8] transition-colors"
          >
            Voedingsdetails <ChevronRight strokeWidth={1.5} className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* ═══ BLOK 3 — VANDAAG VAN JOU VERWACHT ═══════════════ */}
      {hasActions && (
        <div className="space-y-3 animate-slide-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
          {/* Coach prompt */}
          {actions.pendingPrompt && (
            <Link
              href="/client/prompts"
              className="block rounded-2xl p-5 border transition-all duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
              style={{
                background: 'linear-gradient(135deg, rgba(196,125,21,0.06) 0%, rgba(196,125,21,0.01) 100%)',
                borderColor: 'rgba(196,125,21,0.15)',
              }}
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-[#C47D15] flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(196,125,21,0.25)]">
                  <MessageSquare strokeWidth={1.5} className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-[#1A1917] tracking-[-0.01em]">Glenn heeft een vraag</p>
                  {actions.pendingPrompt.question && (
                    <p className="text-[13px] text-[#C47D15] mt-0.5 truncate">&ldquo;{actions.pendingPrompt.question}&rdquo;</p>
                  )}
                </div>
                <ArrowUpRight strokeWidth={1.5} className="w-5 h-5 text-[#C47D15] shrink-0" />
              </div>
            </Link>
          )}

          {/* Accountability check */}
          {actions.accountabilityPending && (
            <Link
              href="/client/accountability"
              className="block rounded-2xl p-5 border transition-all duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
              style={{
                background: 'linear-gradient(135deg, rgba(155,123,46,0.06) 0%, rgba(155,123,46,0.01) 100%)',
                borderColor: 'rgba(155,123,46,0.15)',
              }}
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-[#9B7B2E] flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(155,123,46,0.25)]">
                  <ShieldCheck strokeWidth={1.5} className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-semibold text-[#1A1917] tracking-[-0.01em]">Dagelijkse check</p>
                  <p className="text-[13px] text-[#9B7B2E] mt-0.5">Laat even weten hoe je dag was</p>
                </div>
                <ArrowUpRight strokeWidth={1.5} className="w-5 h-5 text-[#9B7B2E] shrink-0" />
              </div>
            </Link>
          )}

          {/* Monthly check-in */}
          {actions.checkInDue !== null && (
            <Link
              href="/client/check-in"
              className="block rounded-2xl p-5 border transition-all duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
              style={{
                background: 'linear-gradient(135deg, rgba(61,139,92,0.06) 0%, rgba(61,139,92,0.01) 100%)',
                borderColor: 'rgba(61,139,92,0.15)',
              }}
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-[#3D8B5C] flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(61,139,92,0.25)]">
                  <Calendar strokeWidth={1.5} className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-semibold text-[#1A1917] tracking-[-0.01em]">Maandelijkse meting</p>
                  <p className="text-[13px] text-[#3D8B5C] mt-0.5">
                    {actions.checkInDue === 0 ? 'Vandaag is het zover!' : `Nog ${actions.checkInDue} ${actions.checkInDue === 1 ? 'dag' : 'dagen'}`}
                  </p>
                </div>
                <ArrowUpRight strokeWidth={1.5} className="w-5 h-5 text-[#3D8B5C] shrink-0" />
              </div>
            </Link>
          )}
        </div>
      )}

      {/* ═══ BLOK 4 — MOMENTUM STRIP ═════════════════════════ */}
      {(momentum.streakDays > 0 || momentum.workoutsThisWeek > 0 || momentum.weightChangeMonth !== null) && (
        <div
          className="flex items-center gap-4 px-5 py-3.5 rounded-2xl bg-[#F5F2ED]/60 border border-[#E8E4DD] animate-slide-up overflow-x-auto"
          style={{ animationDelay: '260ms', animationFillMode: 'both' }}
        >
          {momentum.streakDays > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <Flame strokeWidth={1.5} className="w-4 h-4 text-[#C47D15]" />
              <span className="text-[13px] font-semibold text-[#5C5A55]">
                {momentum.streakDays}d actief
              </span>
            </div>
          )}

          {momentum.streakDays > 0 && momentum.workoutsThisWeek > 0 && (
            <div className="w-px h-4 bg-[#D1CFC9] shrink-0" />
          )}

          {momentum.workoutsThisWeek > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <Activity strokeWidth={1.5} className="w-4 h-4 text-[#3068C4]" />
              <span className="text-[13px] font-semibold text-[#5C5A55]">
                {momentum.workoutsThisWeek} {momentum.workoutsThisWeek === 1 ? 'training' : 'trainingen'}
              </span>
            </div>
          )}

          {momentum.weightChangeMonth !== null && (
            <>
              <div className="w-px h-4 bg-[#D1CFC9] shrink-0" />
              <div className="flex items-center gap-1.5 shrink-0">
                {momentum.weightChangeMonth <= 0 ? (
                  <TrendingDown strokeWidth={1.5} className="w-4 h-4 text-[#3D8B5C]" />
                ) : (
                  <TrendingUp strokeWidth={1.5} className="w-4 h-4 text-[#C47D15]" />
                )}
                <span className="text-[13px] font-semibold text-[#5C5A55]">
                  {momentum.weightChangeMonth > 0 ? '+' : ''}{momentum.weightChangeMonth}kg
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
