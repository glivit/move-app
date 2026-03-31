'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle, ChevronRight, ArrowRight,
  MessageSquare, Video, Calendar, ShieldCheck,
} from 'lucide-react'
import { NotificationCenter } from '@/components/client/NotificationCenter'
import { cachedFetch } from '@/lib/fetcher'

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

function getWeekDots(scheduleDays: Array<{ dayNumber: number }>, completedDates: string[]) {
  const today = new Date()
  const todayDow = today.getDay() === 0 ? 7 : today.getDay()
  const todayStr = today.toISOString().split('T')[0]
  const labels = ['M', 'D', 'W', 'D', 'V', 'Z', 'Z']

  // Start from Monday of current week
  const monday = new Date(today)
  monday.setDate(today.getDate() - (todayDow - 1))

  return labels.map((label, i) => {
    const dow = i + 1 // 1=Monday
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const isToday = dateStr === todayStr
    const isPast = d < today && !isToday
    const hasTraining = scheduleDays.some(s => s.dayNumber === dow)
    const completed = completedDates.includes(dateStr)

    return { label, dow, dateStr, isToday, isPast, hasTraining, completed }
  })
}

function getCaloriesConsumed(nutrition: DashboardData['nutrition']) {
  if (!nutrition) return 0
  return nutrition.meals
    .filter(m => m.completed)
    .reduce((sum, m) => sum + m.items.reduce((s, i) => s + i.calories, 0), 0)
}

// ─── Component ──────────────────────────────────────────────

export default function ClientDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      const d = await cachedFetch<DashboardData>('/api/dashboard', { maxAge: 30_000 })
      setData(d)
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }

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
  const showOnboarding = onboarding && !onboarding.complete
  const weekDots = getWeekDots(training.scheduleDays || [], training.completedDates || [])

  // Determine if this is day 1 (no workouts completed ever, no streak)
  const isDay1 = momentum.streakDays === 0 && momentum.workoutsThisWeek === 0 && !training.completedDates?.length

  // Calories for compact bar
  const caloriesConsumed = getCaloriesConsumed(nutrition)
  const caloriesTarget = nutrition?.targets?.calories || 0

  // Smart today: determine the ONE primary action
  const getPrimaryAction = () => {
    if (showOnboarding) return 'onboarding' as const
    if (training.today && !training.today.completed) return 'training' as const
    if (training.today?.completed) return 'done' as const
    if (actions.checkInDue?.overdue) return 'checkin' as const
    return 'rest' as const
  }
  const primaryAction = getPrimaryAction()

  // ─── Render ─────────────────────────────────────────────

  return (
    <div className="pb-28">

      {/* ═══ HERO — Name with period, one truth ════════════ */}
      <div className="animate-fade-in mb-2">
        <div className="flex items-start justify-between">
          <div>
            <h1
              className="text-[48px] leading-[1.05] tracking-[-0.035em] text-[#1A1917]"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
            >
              {firstName}.
            </h1>
          </div>
          <div className="mt-2">
            <NotificationCenter />
          </div>
        </div>
      </div>

      {/* ═══ WEEK DOTS — M D W D V Z Z ════════════════════ */}
      <div
        className="flex items-center justify-between px-1 mb-10 animate-fade-in"
        style={{ animationDelay: '60ms' }}
      >
        {weekDots.map((dot, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <span className="text-[11px] font-semibold text-[#A09D96] uppercase tracking-wide">
              {dot.label}
            </span>
            <div className="relative flex items-center justify-center w-7 h-7">
              {dot.completed ? (
                /* Completed: filled green dot with check */
                <div className="w-7 h-7 rounded-full bg-[#3D8B5C] flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              ) : dot.isToday ? (
                /* Today: terracotta filled dot */
                <div className="w-7 h-7 rounded-full bg-[#D46A3A] flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              ) : dot.hasTraining ? (
                /* Scheduled training: outlined dot */
                <div className="w-7 h-7 rounded-full border-[1.5px] border-[#CCC7BC]" />
              ) : (
                /* Rest / no activity: tiny faint dot */
                <div className="w-[6px] h-[6px] rounded-full bg-[#E5E1D9]" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ═══ ONBOARDING CTA ══════════════════════════════ */}
      {showOnboarding && (
        <Link
          href="/onboarding"
          className="block card-v2-interactive p-7 mb-6 animate-slide-up group"
          style={{ animationDelay: '100ms' }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-label">Profiel voltooien</span>
            <ArrowRight strokeWidth={1.5} className="w-4 h-4 text-[#CCC7BC] group-hover:translate-x-1 group-hover:text-[#1A1917] transition-all" />
          </div>
          <p className="text-[16px] font-semibold text-[#1A1917] mb-5">
            Vul je intake formulier in zodat je coach je programma kan opstellen
          </p>
          <div className="w-full h-[3px] bg-[#E5E1D9] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1A1917] rounded-full animate-progress-fill"
              style={{ width: `${(onboarding.currentStep / onboarding.totalSteps) * 100}%` }}
            />
          </div>
          <span className="text-[12px] text-[#A09D96] mt-2.5 block">
            {onboarding.currentStep} van {onboarding.totalSteps}
          </span>
        </Link>
      )}

      {/* ═══ EMPTY STATE — Day 1 warm welcome ════════════ */}
      {isDay1 && !showOnboarding && (
        <div className="card-v2 p-8 mb-6 animate-slide-up text-center" style={{ animationDelay: '120ms' }}>
          <p
            className="text-[28px] leading-[1.15] tracking-[-0.02em] text-[#1A1917] mb-3"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            Welkom bij MŌVE
          </p>
          <p className="text-[15px] text-[#6B6862] mb-6 max-w-[280px] mx-auto">
            Je coach bereidt je programma voor. Binnenkort verschijnt hier je eerste training.
          </p>
          <Link href="/client/messages" className="btn-pop inline-flex text-[13px]">
            Stuur je coach een bericht
          </Link>
        </div>
      )}

      {/* ═══ SMART TODAY CARD — the ONE action ═══════════ */}
      {!isDay1 && !showOnboarding && (
        <div className="animate-slide-up" style={{ animationDelay: '120ms' }}>

          {/* Training today — not yet done */}
          {primaryAction === 'training' && training.today && (
            <Link
              href="/client/workout"
              className="block card-v2-interactive p-7 mb-3 group"
            >
              <div className="flex items-center justify-between mb-5">
                <span className="text-label">Training vandaag</span>
                <ArrowRight strokeWidth={1.5} className="w-4 h-4 text-[#CCC7BC] group-hover:translate-x-1 group-hover:text-[#1A1917] transition-all" />
              </div>

              <h2
                className="text-[25px] leading-[1.2] tracking-[-0.02em] text-[#1A1917] mb-3"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
              >
                {training.today.name}
              </h2>

              <p className="text-[14px] text-[#6B6862]">
                {training.today.focus && <>{training.today.focus} · </>}
                ±{training.today.durationMin} min
                {training.today.exerciseCount && <> · {training.today.exerciseCount} oefeningen</>}
              </p>

              <div className="mt-7">
                <span className="btn-pop inline-flex text-[13px]">
                  Start workout
                </span>
              </div>
            </Link>
          )}

          {/* Training done — show completion */}
          {primaryAction === 'done' && training.today && (
            <div className="card-v2 p-7 mb-3">
              <div className="flex items-center justify-between mb-4">
                <span className="text-label">Training voltooid</span>
                <CheckCircle strokeWidth={1.5} className="w-5 h-5 text-[#3D8B5C]" />
              </div>

              <h2
                className="text-[25px] leading-[1.2] tracking-[-0.02em] text-[#1A1917] mb-1"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
              >
                {training.today.name}
              </h2>

              {momentum.streakDays > 1 && (
                <p className="text-[14px] text-[#6B6862] mt-2">
                  <span className="stat-number text-[18px] text-[#D46A3A]">{momentum.streakDays}</span>
                  {' '}dagen op rij
                </p>
              )}
            </div>
          )}

          {/* Rest day */}
          {primaryAction === 'rest' && (
            <div className="card-v2 p-7 mb-3">
              <div className="flex items-center justify-between mb-4">
                <span className="text-label">Vandaag</span>
              </div>
              <h2
                className="text-[25px] leading-[1.2] tracking-[-0.02em] text-[#A09D96]"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
              >
                Rustdag
              </h2>
              {training.next && (
                <p className="text-[14px] text-[#6B6862] mt-3">
                  Volgende: {training.next.name} {training.next.label}
                </p>
              )}
            </div>
          )}

          {/* Check-in overdue */}
          {primaryAction === 'checkin' && (
            <Link
              href="/client/check-in"
              className="block card-v2-interactive p-7 mb-3 group"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-label">Check-in</span>
                <ArrowRight strokeWidth={1.5} className="w-4 h-4 text-[#CCC7BC] group-hover:translate-x-1 group-hover:text-[#1A1917] transition-all" />
              </div>
              <h2
                className="text-[25px] leading-[1.2] tracking-[-0.02em] text-[#1A1917]"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
              >
                Tijd voor je maandelijkse meting
              </h2>
              <p className="text-[14px] text-[#6B6862] mt-2">
                Gewicht, foto, en hoe je je voelt
              </p>
            </Link>
          )}

          {/* ═══ "MORGEN" PREVIEW ═══════════════════════ */}
          {training.next && primaryAction !== 'rest' && (
            <Link
              href="/client/workout"
              className="flex items-center justify-between px-7 py-4 card-v2-interactive mb-3 group"
            >
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-medium text-[#A09D96]">Morgen</span>
                <span className="text-[14px] font-medium text-[#1A1917]">
                  {training.next.name}
                </span>
              </div>
              <ChevronRight strokeWidth={1.5} className="w-4 h-4 text-[#CCC7BC] group-hover:text-[#1A1917] transition-colors" />
            </Link>
          )}
        </div>
      )}

      {/* ═══ VOEDING COMPACT — one line + thin bar ═══════ */}
      {nutrition && nutrition.mealsTotal > 0 && (
        <Link
          href="/client/nutrition"
          className="block card-v2-interactive px-7 py-5 mb-3 animate-slide-up group"
          style={{ animationDelay: '180ms' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-label">Voeding</span>
              {caloriesTarget > 0 && (
                <span className="text-[14px] text-[#6B6862]">
                  <span className="stat-number text-[16px] text-[#1A1917]">{caloriesConsumed}</span>
                  {' '}/ {caloriesTarget} kcal
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-[#A09D96]">
                {nutrition.mealsCompleted}/{nutrition.mealsTotal}
              </span>
              <ChevronRight strokeWidth={1.5} className="w-4 h-4 text-[#CCC7BC] group-hover:text-[#1A1917] transition-colors" />
            </div>
          </div>

          {/* Thin progress bar */}
          <div className="w-full h-[3px] bg-[#E5E1D9] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full animate-progress-fill"
              style={{
                width: `${nutrition.mealsTotal > 0 ? (nutrition.mealsCompleted / nutrition.mealsTotal) * 100 : 0}%`,
                backgroundColor: nutrition.mealsCompleted === nutrition.mealsTotal && nutrition.mealsTotal > 0
                  ? '#3D8B5C'
                  : '#D46A3A',
              }}
            />
          </div>
        </Link>
      )}

      {/* ═══ CONTEXTUAL NUDGES — only when relevant ══════ */}
      <div className="space-y-3 animate-slide-up" style={{ animationDelay: '240ms' }}>
        {/* Unread messages */}
        {actions.unreadMessages > 0 && (
          <Link
            href="/client/messages"
            className="flex items-center gap-4 card-v2-interactive px-7 py-5 group"
          >
            <div className="w-9 h-9 rounded-xl bg-[rgba(212,106,58,0.08)] flex items-center justify-center shrink-0">
              <MessageSquare strokeWidth={1.5} className="w-[18px] h-[18px] text-[#D46A3A]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium text-[#1A1917]">
                {actions.unreadMessages} {actions.unreadMessages === 1 ? 'nieuw bericht' : 'nieuwe berichten'}
              </p>
            </div>
            <ChevronRight strokeWidth={1.5} className="w-4 h-4 text-[#CCC7BC] group-hover:text-[#1A1917] transition-colors shrink-0" />
          </Link>
        )}

        {/* Video call */}
        {actions.nextVideoCall && (
          <Link
            href={`/client/video/${actions.nextVideoCall.id}`}
            className="flex items-center gap-4 card-v2-interactive px-7 py-5 group"
          >
            <div className="w-9 h-9 rounded-xl bg-[rgba(212,106,58,0.08)] flex items-center justify-center shrink-0">
              <Video strokeWidth={1.5} className="w-[18px] h-[18px] text-[#D46A3A]" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-medium text-[#1A1917]">
                Videocall {new Date(actions.nextVideoCall.scheduled_at).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
            </div>
            <ChevronRight strokeWidth={1.5} className="w-4 h-4 text-[#CCC7BC] group-hover:text-[#1A1917] transition-colors shrink-0" />
          </Link>
        )}

        {/* Pending prompt */}
        {actions.pendingPrompt && (
          <Link
            href="/client/prompts"
            className="flex items-center gap-4 card-v2-interactive px-7 py-5 group"
          >
            <div className="w-9 h-9 rounded-xl bg-[rgba(212,106,58,0.08)] flex items-center justify-center shrink-0">
              <MessageSquare strokeWidth={1.5} className="w-[18px] h-[18px] text-[#D46A3A]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium text-[#1A1917]">Wekelijkse reflectie</p>
              {actions.pendingPrompt.question && (
                <p className="text-[12px] text-[#A09D96] mt-0.5 truncate">{actions.pendingPrompt.question}</p>
              )}
            </div>
            <ChevronRight strokeWidth={1.5} className="w-4 h-4 text-[#CCC7BC] group-hover:text-[#1A1917] transition-colors shrink-0" />
          </Link>
        )}

        {/* Accountability */}
        {actions.accountabilityPending && (
          <Link
            href="/client/accountability"
            className="flex items-center gap-4 card-v2-interactive px-7 py-5 group"
          >
            <div className="w-9 h-9 rounded-xl bg-[rgba(212,106,58,0.08)] flex items-center justify-center shrink-0">
              <ShieldCheck strokeWidth={1.5} className="w-[18px] h-[18px] text-[#D46A3A]" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-medium text-[#1A1917]">Dagelijkse check</p>
              <p className="text-[12px] text-[#A09D96] mt-0.5">Laat weten hoe je dag was</p>
            </div>
            <ChevronRight strokeWidth={1.5} className="w-4 h-4 text-[#CCC7BC] group-hover:text-[#1A1917] transition-colors shrink-0" />
          </Link>
        )}

        {/* Check-in due (non-overdue — overdue is primary card) */}
        {actions.checkInDue !== null && !actions.checkInDue.overdue && (
          <Link
            href="/client/check-in"
            className="flex items-center gap-4 card-v2-interactive px-7 py-5 group"
          >
            <div className="w-9 h-9 rounded-xl bg-[rgba(212,106,58,0.08)] flex items-center justify-center shrink-0">
              <Calendar strokeWidth={1.5} className="w-[18px] h-[18px] text-[#D46A3A]" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-medium text-[#1A1917]">Maandelijkse meting</p>
              <p className="text-[12px] text-[#A09D96] mt-0.5">
                {actions.checkInDue.daysUntil === 0
                  ? 'Vandaag'
                  : `Nog ${actions.checkInDue.daysUntil} ${actions.checkInDue.daysUntil === 1 ? 'dag' : 'dagen'}`}
              </p>
            </div>
            <ChevronRight strokeWidth={1.5} className="w-4 h-4 text-[#CCC7BC] group-hover:text-[#1A1917] transition-colors shrink-0" />
          </Link>
        )}
      </div>

    </div>
  )
}
