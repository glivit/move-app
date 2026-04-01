'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronRight } from 'lucide-react'
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

function formatNumber(n: number): string {
  return n.toLocaleString('nl-BE')
}

// ─── Component ──────────────────────────────────────────────

export default function ClientDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { loadDashboard() }, [])

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

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-[1.5px] border-[#1A1917] border-t-transparent" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-[#999]">
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

  // Build nudge list
  const nudges: Array<{ text: string; sub?: string; href: string }> = []
  if (actions.unreadMessages > 0) {
    nudges.push({ text: `${actions.unreadMessages} ${actions.unreadMessages === 1 ? 'nieuw bericht' : 'nieuwe berichten'}`, href: '/client/messages' })
  }
  if (actions.nextVideoCall) {
    nudges.push({ text: `Videocall ${new Date(actions.nextVideoCall.scheduled_at).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' })}`, href: `/client/video/${actions.nextVideoCall.id}` })
  }
  if (actions.pendingPrompt) {
    nudges.push({ text: 'Wekelijkse reflectie', sub: actions.pendingPrompt.question || undefined, href: '/client/prompts' })
  }
  if (actions.accountabilityPending) {
    nudges.push({ text: 'Dagelijkse check', sub: 'Laat weten hoe je dag was', href: '/client/accountability' })
  }
  if (actions.checkInDue !== null && !actions.checkInDue.overdue) {
    nudges.push({ text: 'Maandelijkse meting', sub: actions.checkInDue.daysUntil === 0 ? 'Vandaag' : `Nog ${actions.checkInDue.daysUntil} ${actions.checkInDue.daysUntil === 1 ? 'dag' : 'dagen'}`, href: '/client/check-in' })
  }

  return (
    <div className="pb-28">

      {/* ═══ GREETING ═════════════════════════════════════ */}
      <div className="animate-fade-in">
        <div className="flex items-start justify-between">
          <div>
            <p className="mb-1.5 text-[14px] text-[#999]" style={{ fontFamily: 'var(--font-body)' }}>
              {getGreeting()}
            </p>
            <h1 className="text-[32px] leading-[1.1] tracking-[-0.5px] text-[#1A1917]" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
              {firstName}
            </h1>
          </div>
          <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F5F3]">
            <NotificationCenter />
          </div>
        </div>
      </div>

      {/* ═══ WEEK STRIP ═══════════════════════════════════ */}
      <div className="mt-8 mb-10 flex items-center justify-between px-1 animate-fade-in" style={{ animationDelay: '60ms' }}>
        {weekDots.map((dot, i) => (
          <div key={i} className="flex flex-col items-center gap-2.5">
            <span className="text-[11px] font-medium uppercase tracking-[0.5px] text-[#BCBCBC]" style={{ fontFamily: 'var(--font-body)' }}>
              {dot.label}
            </span>
            {dot.completed ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1A1917]">
                <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            ) : dot.isToday ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D46A3A]" style={{ animation: 'pulse-today 2.5s ease-in-out infinite' }}>
                <div className="h-[7px] w-[7px] rounded-full bg-white" />
              </div>
            ) : dot.hasTraining ? (
              <div className="h-8 w-8 rounded-full border-[1.5px] border-[#DCDCDC]" />
            ) : (
              <div className="h-[6px] w-[6px] rounded-full bg-[#E8E8E8]" />
            )}
          </div>
        ))}
      </div>

      {/* ═══ ONBOARDING ═══════════════════════════════════ */}
      {showOnboarding && (
        <Link href="/onboarding" className="mb-6 block animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="rounded-3xl bg-[#F8F8F6] p-8">
            <p className="mb-4 text-[12px] font-medium uppercase tracking-[1px] text-[#999]" style={{ fontFamily: 'var(--font-body)' }}>
              Profiel voltooien
            </p>
            <p className="mb-6 text-[18px] leading-[1.35] text-[#1A1917]" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
              Vul je intake formulier in zodat je coach je programma kan opstellen
            </p>
            <div className="mb-2 h-[3px] w-full overflow-hidden rounded-full bg-[#E8E8E8]">
              <div className="h-full rounded-full bg-[#1A1917] animate-progress-fill" style={{ width: `${(onboarding.currentStep / onboarding.totalSteps) * 100}%` }} />
            </div>
            <span className="text-[12px] text-[#999]">{onboarding.currentStep} van {onboarding.totalSteps}</span>
          </div>
        </Link>
      )}

      {/* ═══ DAY 1 EMPTY STATE ════════════════════════════ */}
      {isDay1 && !showOnboarding && (
        <div className="mb-10 animate-slide-up py-10 text-center" style={{ animationDelay: '120ms' }}>
          <p className="mb-3 text-[26px] leading-[1.15] tracking-[-0.3px] text-[#1A1917]" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            Welkom bij MŌVE
          </p>
          <p className="mx-auto mb-8 max-w-[260px] text-[15px] leading-[1.5] text-[#999]" style={{ fontFamily: 'var(--font-body)' }}>
            Je coach bereidt je programma voor. Binnenkort verschijnt hier je eerste training.
          </p>
          <Link href="/client/messages" className="inline-flex items-center gap-2 text-[14px] font-medium text-[#D46A3A] transition-opacity hover:opacity-70" style={{ fontFamily: 'var(--font-body)' }}>
            Stuur je coach een bericht
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        </div>
      )}

      {/* ═══ PRIMARY CARD ═════════════════════════════════ */}
      {!isDay1 && !showOnboarding && (
        <div className="mb-4 animate-slide-up" style={{ animationDelay: '120ms' }}>

          {/* Training today */}
          {primaryAction === 'training' && training.today && (
            <Link href="/client/workout" className="block rounded-3xl bg-[#F8F8F6] p-8 transition-all duration-200 hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)] active:scale-[0.98] group">
              <p className="mb-4 text-[12px] font-medium uppercase tracking-[1px] text-[#999]" style={{ fontFamily: 'var(--font-body)' }}>
                Training vandaag
              </p>
              <h2 className="mb-2 text-[28px] leading-[1.15] tracking-[-0.5px] text-[#1A1917]" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                {training.today.name}
              </h2>
              <p className="text-[14px] text-[#999]" style={{ fontFamily: 'var(--font-body)' }}>
                {training.today.exerciseCount && <>{training.today.exerciseCount} oefeningen · </>}
                ~{training.today.durationMin} min
              </p>
              <button className="mt-7 inline-flex items-center gap-2 rounded-[14px] bg-[#1A1917] px-7 py-[14px] text-[14px] font-medium text-white transition-all duration-200 group-hover:bg-[#333] group-hover:gap-3" style={{ fontFamily: 'var(--font-body)' }}>
                Start workout
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-hover:translate-x-0.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </button>
            </Link>
          )}

          {/* Training done + streak */}
          {primaryAction === 'done' && training.today && (
            <div className="rounded-3xl bg-[#F8F8F6] p-8">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F5E9]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3D8B5C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <h2 className="mb-1.5 text-[22px] leading-[1.2] tracking-[-0.3px] text-[#1A1917]" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                {training.today.name}
              </h2>
              <p className="text-[14px] text-[#999]" style={{ fontFamily: 'var(--font-body)' }}>
                {training.today.exerciseCount && <>{training.today.exerciseCount} oefeningen · </>}
                ~{training.today.durationMin} min
              </p>

              {momentum.streakDays > 0 && (
                <>
                  <div className="mt-6 flex items-baseline gap-2">
                    <span className="text-[56px] leading-none tracking-[-2px] text-[#1A1917]" style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>
                      {momentum.streakDays}
                    </span>
                    <span className="text-[16px] text-[#999]" style={{ fontFamily: 'var(--font-body)' }}>
                      {momentum.streakDays === 1 ? 'week' : 'weken'} op rij
                    </span>
                  </div>
                  {momentum.streakDays > 1 && (
                    <div className="mt-5 flex gap-2">
                      {Array.from({ length: Math.min(momentum.streakDays, 10) }).map((_, i) => (
                        <div key={i} className={`h-3 w-3 rounded-full ${i === momentum.streakDays - 1 ? 'bg-[#D46A3A]' : 'bg-[#1A1917]'}`} />
                      ))}
                    </div>
                  )}
                  <p className="mt-4 text-[14px] leading-[1.5] text-[#999]" style={{ fontFamily: 'var(--font-body)' }}>
                    Blijf doorgaan!
                  </p>
                </>
              )}
            </div>
          )}

          {/* Rest day */}
          {primaryAction === 'rest' && (
            <div className="py-6">
              <p className="mb-3 text-[12px] font-medium uppercase tracking-[1px] text-[#BCBCBC]" style={{ fontFamily: 'var(--font-body)' }}>
                Vandaag
              </p>
              <h2 className="text-[40px] leading-[1.1] tracking-[-1px] text-[#D5D5D5]" style={{ fontFamily: 'var(--font-display)', fontWeight: 300 }}>
                Rustdag
              </h2>
              {training.next && (
                <p className="mt-4 text-[14px] text-[#999]" style={{ fontFamily: 'var(--font-body)' }}>
                  Volgende: <span className="font-medium text-[#1A1917]">{training.next.name}</span> {training.next.label}
                </p>
              )}
            </div>
          )}

          {/* Check-in overdue */}
          {primaryAction === 'checkin' && (
            <Link href="/client/check-in" className="block rounded-3xl bg-[#F8F8F6] p-8 transition-all duration-200 hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)] active:scale-[0.98] group">
              <p className="mb-4 text-[12px] font-medium uppercase tracking-[1px] text-[#999]" style={{ fontFamily: 'var(--font-body)' }}>Check-in</p>
              <h2 className="mb-2 text-[24px] leading-[1.2] tracking-[-0.3px] text-[#1A1917]" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                Tijd voor je meting
              </h2>
              <p className="text-[14px] text-[#999]" style={{ fontFamily: 'var(--font-body)' }}>Gewicht, foto, en hoe je je voelt</p>
              <ArrowRight className="mt-6 h-5 w-5 text-[#D5D5D5] transition-all group-hover:translate-x-1 group-hover:text-[#1A1917]" strokeWidth={1.5} />
            </Link>
          )}
        </div>
      )}

      {/* ═══ TOMORROW ═════════════════════════════════════ */}
      {!isDay1 && !showOnboarding && training.next && primaryAction !== 'rest' && (
        <Link href="/client/workout" className="flex items-center justify-between border-t border-[#F0F0EE] py-[18px] group animate-slide-up" style={{ animationDelay: '180ms' }}>
          <div className="flex items-baseline gap-3">
            <span className="text-[13px] font-medium text-[#BCBCBC]" style={{ fontFamily: 'var(--font-body)' }}>Morgen</span>
            <span className="text-[15px] font-medium text-[#1A1917]" style={{ fontFamily: 'var(--font-body)' }}>{training.next.name}</span>
          </div>
          <ChevronRight strokeWidth={1.5} className="h-4 w-4 text-[#D5D5D5] transition-colors group-hover:text-[#1A1917]" />
        </Link>
      )}

      {/* ═══ NUTRITION ════════════════════════════════════ */}
      {nutrition && nutrition.mealsTotal > 0 && (
        <Link href="/client/nutrition" className="block border-t border-[#F0F0EE] py-5 group animate-slide-up" style={{ animationDelay: '240ms' }}>
          <div className="mb-2.5 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              {caloriesTarget > 0 ? (
                <>
                  <span className="text-[24px] tracking-[-0.5px] text-[#1A1917]" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{formatNumber(caloriesConsumed)}</span>
                  <span className="text-[14px] text-[#BCBCBC]" style={{ fontFamily: 'var(--font-body)' }}>/ {formatNumber(caloriesTarget)} kcal</span>
                </>
              ) : (
                <span className="text-[14px] text-[#999]" style={{ fontFamily: 'var(--font-body)' }}>{nutrition.mealsCompleted} van {nutrition.mealsTotal} maaltijden</span>
              )}
            </div>
            <ChevronRight strokeWidth={1.5} className="h-4 w-4 text-[#D5D5D5] transition-colors group-hover:text-[#1A1917]" />
          </div>
          <div className="h-[3px] w-full overflow-hidden rounded-full bg-[#F0F0EE]">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${nutrition.mealsTotal > 0 ? (nutrition.mealsCompleted / nutrition.mealsTotal) * 100 : 0}%`, backgroundColor: nutrition.mealsCompleted === nutrition.mealsTotal && nutrition.mealsTotal > 0 ? '#3D8B5C' : '#D46A3A' }} />
          </div>
        </Link>
      )}

      {/* ═══ NUDGES ═══════════════════════════════════════ */}
      {nudges.length > 0 && (
        <div className="animate-slide-up" style={{ animationDelay: '300ms' }}>
          {nudges.map((nudge, i) => (
            <Link key={i} href={nudge.href} className="flex items-center gap-3.5 border-t border-[#F0F0EE] py-4 group last:border-b">
              <div className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#D46A3A]" />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium text-[#1A1917]" style={{ fontFamily: 'var(--font-body)' }}>{nudge.text}</p>
                {nudge.sub && <p className="mt-0.5 truncate text-[12px] text-[#999]" style={{ fontFamily: 'var(--font-body)' }}>{nudge.sub}</p>}
              </div>
              <ChevronRight strokeWidth={1.5} className="h-4 w-4 shrink-0 text-[#D5D5D5] transition-colors group-hover:text-[#1A1917]" />
            </Link>
          ))}
        </div>
      )}

      {/* Pulse animation for today dot */}
      <style jsx global>{`
        @keyframes pulse-today {
          0%, 100% { box-shadow: 0 0 0 0 rgba(212, 106, 58, 0.3); }
          50% { box-shadow: 0 0 0 6px rgba(212, 106, 58, 0); }
        }
      `}</style>
    </div>
  )
}
