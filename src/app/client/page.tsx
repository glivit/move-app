'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle, ArrowRight, ChevronRight } from 'lucide-react'
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

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 6) return 'Goedenacht'
  if (h < 12) return 'Goedemorgen'
  if (h < 18) return 'Goedemiddag'
  return 'Goedenavond'
}

function getWeekDots(scheduleDays: Array<{ dayNumber: number }>, completedDates: string[]) {
  const today = new Date()
  const todayDow = today.getDay() === 0 ? 7 : today.getDay()
  const todayStr = today.toISOString().split('T')[0]
  const labels = ['M', 'D', 'W', 'D', 'V', 'Z', 'Z']

  const monday = new Date(today)
  monday.setDate(today.getDate() - (todayDow - 1))

  return labels.map((label, i) => {
    const dow = i + 1
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-[1.5px] border-[#1A1917] border-t-transparent" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-[#A09D96]">
        Er ging iets mis bij het laden.
      </div>
    )
  }

  const { training, nutrition, actions, momentum, onboarding } = data
  const firstName = data.profile?.firstName || ''
  const showOnboarding = onboarding && !onboarding.complete
  const weekDots = getWeekDots(training.scheduleDays || [], training.completedDates || [])
  const isDay1 = momentum.streakDays === 0 && momentum.workoutsThisWeek === 0 && !training.completedDates?.length
  const caloriesConsumed = getCaloriesConsumed(nutrition)
  const caloriesTarget = nutrition?.targets?.calories || 0

  const getPrimaryAction = () => {
    if (showOnboarding) return 'onboarding' as const
    if (training.today && !training.today.completed) return 'training' as const
    if (training.today?.completed) return 'done' as const
    if (actions.checkInDue?.overdue) return 'checkin' as const
    return 'rest' as const
  }
  const primaryAction = getPrimaryAction()

  // Count active nudges
  const nudges: Array<{ text: string; sub?: string; href: string }> = []
  if (actions.unreadMessages > 0) {
    nudges.push({
      text: `${actions.unreadMessages} ${actions.unreadMessages === 1 ? 'nieuw bericht' : 'nieuwe berichten'}`,
      href: '/client/messages',
    })
  }
  if (actions.nextVideoCall) {
    nudges.push({
      text: `Videocall ${new Date(actions.nextVideoCall.scheduled_at).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' })}`,
      href: `/client/video/${actions.nextVideoCall.id}`,
    })
  }
  if (actions.pendingPrompt) {
    nudges.push({
      text: 'Wekelijkse reflectie',
      sub: actions.pendingPrompt.question || undefined,
      href: '/client/prompts',
    })
  }
  if (actions.accountabilityPending) {
    nudges.push({
      text: 'Dagelijkse check',
      sub: 'Laat weten hoe je dag was',
      href: '/client/accountability',
    })
  }
  if (actions.checkInDue !== null && !actions.checkInDue.overdue) {
    nudges.push({
      text: 'Maandelijkse meting',
      sub: actions.checkInDue.daysUntil === 0 ? 'Vandaag' : `Nog ${actions.checkInDue.daysUntil} ${actions.checkInDue.daysUntil === 1 ? 'dag' : 'dagen'}`,
      href: '/client/check-in',
    })
  }

  // ─── Render ─────────────────────────────────────────────

  return (
    <div className="pb-28">

      {/* ═══ HERO — Greeting + Name ═══════════════════════ */}
      <div className="animate-fade-in pt-2 mb-1">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[14px] text-[#A09D96] mb-1" style={{ fontFamily: 'var(--font-body)' }}>
              {getGreeting()}
            </p>
            <h1 className="text-[46px] leading-[1.0] tracking-[-0.04em] text-[#1A1917]" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
              {firstName}
            </h1>
          </div>
          <div className="mt-1">
            <NotificationCenter />
          </div>
        </div>
      </div>

      {/* ═══ WEEK DOTS ════════════════════════════════════ */}
      <div className="flex items-center justify-between px-1 mt-8 mb-12 animate-fade-in" style={{ animationDelay: '60ms' }}>
        {weekDots.map((dot, i) => (
          <div key={i} className="flex flex-col items-center gap-2.5">
            <span className="text-[10px] font-medium tracking-widest text-[#B5B1A9] uppercase">{dot.label}</span>
            <div className="relative flex items-center justify-center">
              {dot.completed ? (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1A1917]">
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              ) : dot.isToday ? (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#D46A3A]">
                  <div className="h-[6px] w-[6px] rounded-full bg-white" />
                </div>
              ) : dot.hasTraining ? (
                <div className="h-7 w-7 rounded-full border-[1.5px] border-[#D5D1C9]" />
              ) : (
                <div className="h-[5px] w-[5px] rounded-full bg-[#E5E1D9]" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ═══ ONBOARDING ═══════════════════════════════════ */}
      {showOnboarding && (
        <Link href="/onboarding" className="block mb-10 animate-slide-up group" style={{ animationDelay: '100ms' }}>
          <p className="text-[11px] font-medium uppercase tracking-[1.5px] text-[#A09D96] mb-3">Profiel voltooien</p>
          <p className="text-[20px] leading-[1.3] text-[#1A1917] mb-6" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
            Vul je intake formulier in zodat je coach je programma kan opstellen
          </p>
          <div className="w-full h-[2px] bg-[#E5E1D9] rounded-full overflow-hidden mb-2">
            <div className="h-full rounded-full bg-[#1A1917] animate-progress-fill" style={{ width: `${(onboarding.currentStep / onboarding.totalSteps) * 100}%` }} />
          </div>
          <span className="text-[12px] text-[#A09D96]">{onboarding.currentStep} van {onboarding.totalSteps}</span>
        </Link>
      )}

      {/* ═══ DAY 1 EMPTY STATE ════════════════════════════ */}
      {isDay1 && !showOnboarding && (
        <div className="mb-10 animate-slide-up text-center py-8" style={{ animationDelay: '120ms' }}>
          <p className="text-[28px] leading-[1.15] tracking-[-0.02em] text-[#1A1917] mb-3" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
            Welkom bij MŌVE
          </p>
          <p className="text-[15px] text-[#A09D96] mb-8 mx-auto max-w-[260px]">
            Je coach bereidt je programma voor. Binnenkort verschijnt hier je eerste training.
          </p>
          <Link href="/client/messages" className="inline-flex items-center gap-2 text-[14px] font-medium text-[#D46A3A] transition-opacity hover:opacity-70">
            Stuur je coach een bericht
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        </div>
      )}

      {/* ═══ THE ONE CARD — primary action ════════════════ */}
      {!isDay1 && !showOnboarding && (
        <div className="mb-10 animate-slide-up" style={{ animationDelay: '120ms' }}>

          {/* Training today */}
          {primaryAction === 'training' && training.today && (
            <Link href="/client/workout" className="block group">
              <p className="text-[11px] font-medium uppercase tracking-[1.5px] text-[#A09D96] mb-3">Training vandaag</p>
              <h2 className="text-[34px] leading-[1.1] tracking-[-0.03em] text-[#1A1917] mb-2" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                {training.today.name}
              </h2>
              <p className="text-[14px] text-[#A09D96] mb-8">
                {training.today.focus && <>{training.today.focus} · </>}
                {training.today.exerciseCount && <>{training.today.exerciseCount} oefeningen · </>}
                ±{training.today.durationMin} min
              </p>
              <span className="inline-flex items-center gap-2.5 rounded-2xl bg-[#1A1917] px-7 py-[16px] text-[14px] font-medium text-[#EEEBE3] transition-all duration-200 group-hover:bg-[#333330] group-hover:shadow-[0_8px_24px_rgba(26,25,23,0.12)] group-active:scale-[0.98]">
                Start workout
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2} />
              </span>
            </Link>
          )}

          {/* Training done */}
          {primaryAction === 'done' && training.today && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <p className="text-[11px] font-medium uppercase tracking-[1.5px] text-[#3D8B5C]">Voltooid</p>
                <CheckCircle strokeWidth={1.5} className="h-4 w-4 text-[#3D8B5C]" />
              </div>
              <h2 className="text-[34px] leading-[1.1] tracking-[-0.03em] text-[#1A1917] mb-2" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                {training.today.name}
              </h2>
              {momentum.streakDays > 1 && (
                <p className="text-[14px] text-[#A09D96] mt-4">
                  <span className="text-[32px] leading-none tracking-tight text-[#D46A3A]" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>{momentum.streakDays}</span>
                  <span className="ml-2">dagen op rij</span>
                </p>
              )}
            </div>
          )}

          {/* Rest day */}
          {primaryAction === 'rest' && (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[1.5px] text-[#A09D96] mb-3">Vandaag</p>
              <h2 className="text-[34px] leading-[1.1] tracking-[-0.03em] text-[#CCC7BC]" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                Rustdag
              </h2>
              {training.next && (
                <p className="text-[14px] text-[#A09D96] mt-4">
                  Volgende: <span className="text-[#1A1917] font-medium">{training.next.name}</span> {training.next.label}
                </p>
              )}
            </div>
          )}

          {/* Check-in overdue */}
          {primaryAction === 'checkin' && (
            <Link href="/client/check-in" className="block group">
              <p className="text-[11px] font-medium uppercase tracking-[1.5px] text-[#A09D96] mb-3">Check-in</p>
              <h2 className="text-[28px] leading-[1.15] tracking-[-0.02em] text-[#1A1917] mb-2" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                Tijd voor je meting
              </h2>
              <p className="text-[14px] text-[#A09D96]">
                Gewicht, foto, en hoe je je voelt
              </p>
              <ArrowRight className="mt-6 h-5 w-5 text-[#CCC7BC] transition-all group-hover:translate-x-1 group-hover:text-[#1A1917]" strokeWidth={1.5} />
            </Link>
          )}
        </div>
      )}

      {/* ═══ TOMORROW PREVIEW ═════════════════════════════ */}
      {!isDay1 && !showOnboarding && training.next && primaryAction !== 'rest' && (
        <Link href="/client/workout" className="flex items-center justify-between py-4 mb-8 group animate-slide-up border-b border-[#E8E4DC]" style={{ animationDelay: '180ms' }}>
          <div className="flex items-baseline gap-3">
            <span className="text-[12px] font-medium text-[#B5B1A9]">Morgen</span>
            <span className="text-[15px] font-medium text-[#1A1917]">{training.next.name}</span>
          </div>
          <ChevronRight strokeWidth={1.5} className="h-4 w-4 text-[#CCC7BC] transition-colors group-hover:text-[#1A1917]" />
        </Link>
      )}

      {/* ═══ NUTRITION — minimal line ═════════════════════ */}
      {nutrition && nutrition.mealsTotal > 0 && (
        <Link href="/client/nutrition" className="block py-4 mb-8 group animate-slide-up border-b border-[#E8E4DC]" style={{ animationDelay: '240ms' }}>
          <div className="flex items-baseline justify-between mb-3">
            <div className="flex items-baseline gap-2">
              {caloriesTarget > 0 ? (
                <>
                  <span className="text-[22px] tracking-tight text-[#1A1917]" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>{caloriesConsumed}</span>
                  <span className="text-[13px] text-[#A09D96]">/ {caloriesTarget} kcal</span>
                </>
              ) : (
                <span className="text-[13px] text-[#A09D96]">{nutrition.mealsCompleted} van {nutrition.mealsTotal} maaltijden</span>
              )}
            </div>
            <ChevronRight strokeWidth={1.5} className="h-4 w-4 text-[#CCC7BC] transition-colors group-hover:text-[#1A1917]" />
          </div>
          <div className="h-[2px] w-full overflow-hidden rounded-full bg-[#E5E1D9]">
            <div
              className="h-full rounded-full animate-progress-fill"
              style={{
                width: `${nutrition.mealsTotal > 0 ? (nutrition.mealsCompleted / nutrition.mealsTotal) * 100 : 0}%`,
                backgroundColor: nutrition.mealsCompleted === nutrition.mealsTotal && nutrition.mealsTotal > 0 ? '#3D8B5C' : '#D46A3A',
              }}
            />
          </div>
        </Link>
      )}

      {/* ═══ NUDGES — quiet text links ════════════════════ */}
      {nudges.length > 0 && (
        <div className="space-y-0 animate-slide-up" style={{ animationDelay: '300ms' }}>
          {nudges.map((nudge, i) => (
            <Link key={i} href={nudge.href} className="flex items-center justify-between py-4 group border-b border-[#E8E4DC] last:border-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-[6px] w-[6px] shrink-0 rounded-full bg-[#D46A3A]" />
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-[#1A1917]">{nudge.text}</p>
                  {nudge.sub && <p className="mt-0.5 truncate text-[12px] text-[#A09D96]">{nudge.sub}</p>}
                </div>
              </div>
              <ChevronRight strokeWidth={1.5} className="h-4 w-4 shrink-0 text-[#CCC7BC] transition-colors group-hover:text-[#1A1917]" />
            </Link>
          ))}
        </div>
      )}

    </div>
  )
}
