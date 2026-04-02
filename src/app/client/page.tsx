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
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
    try {
      const d = await cachedFetch<DashboardData>('/api/dashboard', { maxAge: 120_000 })
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
        <div className="h-6 w-6 animate-spin rounded-full border-[1.5px] border-[#C0C0C0] border-t-[#1A1917]" />
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
            <p className="mb-1 text-[13px] text-[#ACACAC]">
              {getGreeting()}
            </p>
            <h1 className="page-title-sm">
              {firstName}
            </h1>
          </div>
          <div className="mt-1">
            <NotificationCenter />
          </div>
        </div>
      </div>

      {/* ═══ WEEK STRIP — chunky 36px dots ════════════════ */}
      <div className="mt-9 mb-12 animate-fade-in" style={{ animationDelay: '80ms' }}>
        <div className="flex items-center justify-between">
        {weekDots.map((dot, i) => (
          <button key={i} onClick={() => setSelectedDay(selectedDay === dot.dow ? null : dot.dow)} className="flex flex-col items-center gap-2.5 transition-transform active:scale-90">
            <span className="text-[11px] font-medium uppercase tracking-[0.5px] text-[#C8C8C8]">
              {dot.label}
            </span>
            {dot.completed ? (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1A1917]">
                <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            ) : dot.isToday ? (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#D46A3A]" style={{ animation: 'pulse-today 2.5s ease-in-out infinite' }}>
                <div className="h-2 w-2 rounded-full bg-white" />
              </div>
            ) : dot.hasTraining ? (
              <div className="h-9 w-9 rounded-full border-[1.5px] border-[#E2E2E2]" />
            ) : (
              <div className="h-[6px] w-[6px] rounded-full bg-[#E5E5E5]" />
            )}
          </button>
        ))}
        </div>
        {/* Selected day info */}
        {selectedDay && (() => {
          const dayInfo = training.scheduleDays?.find(s => s.dayNumber === selectedDay)
          const dayDot = weekDots.find(d => d.dow === selectedDay)
          if (!dayDot) return null
          return (
            <div className="mt-5 rounded-xl bg-[#FAFAF8] px-4 py-3 animate-fade-in">
              {dayInfo ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[14px] font-medium text-[#1A1917]">{dayInfo.name}</p>
                    {dayInfo.focus && <p className="text-[12px] text-[#ACACAC] mt-0.5">{dayInfo.focus}</p>}
                  </div>
                  {dayDot.completed ? (
                    <span className="text-[12px] font-medium text-[#3D8B5C]">Voltooid</span>
                  ) : dayDot.isPast ? (
                    <span className="text-[12px] text-[#ACACAC]">Gemist</span>
                  ) : (
                    <span className="text-[12px] text-[#D46A3A]">Gepland</span>
                  )}
                </div>
              ) : (
                <p className="text-[13px] text-[#ACACAC]">Geen training gepland</p>
              )}
            </div>
          )
        })()}
      </div>

      {/* ═══ ONBOARDING ═══════════════════════════════════ */}
      {showOnboarding && (
        <Link href="/onboarding" className="mb-8 block animate-slide-up stagger-3">
          <p className="mb-3 eyebrow">
            Profiel voltooien
          </p>
          <p className="section-title mb-6">
            Vul je intake formulier in zodat je coach je programma kan opstellen
          </p>
          <div className="mb-2 h-[2px] w-full overflow-hidden rounded-full bg-[#F0F0EE]">
            <div className="h-full rounded-full bg-[#1A1917]" style={{ width: `${(onboarding.currentStep / onboarding.totalSteps) * 100}%`, transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }} />
          </div>
          <span className="text-[12px] text-[#ACACAC]">{onboarding.currentStep} van {onboarding.totalSteps}</span>
        </Link>
      )}

      {/* ═══ DAY 1 EMPTY STATE ════════════════════════════ */}
      {isDay1 && !showOnboarding && (
        <div className="mb-12 animate-slide-up py-8 stagger-3">
          <p className="page-title mb-3">
            Welkom bij MŌVE
          </p>
          <p className="mb-8 max-w-[280px] text-[14px] leading-[1.5] text-[#ACACAC]">
            Je coach bereidt je programma voor. Binnenkort verschijnt hier je eerste training.
          </p>
          <Link href="/client/messages" className="inline-flex items-center gap-2 text-[14px] font-medium text-[#D46A3A] transition-opacity hover:opacity-70">
            Stuur je coach een bericht
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        </div>
      )}

      {/* ═══ HERO SECTION — no card, bold typography ═══════ */}
      {!isDay1 && !showOnboarding && (
        <div className="mb-14 animate-slide-up" style={{ animationDelay: '140ms' }}>

          {/* Training today — the hero */}
          {primaryAction === 'training' && training.today && (
            <div>
              <p className="mb-3.5 eyebrow">
                Training vandaag
              </p>
              <h2 className="text-editorial-h1 mb-3">
                {training.today.name}
              </h2>
              <p className="text-[14px] text-[#ACACAC]">
                {training.today.exerciseCount && <>{training.today.exerciseCount} oefeningen · </>}
                ~{training.today.durationMin} min
              </p>
              <Link href="/client/workout" className="mt-9 inline-flex items-center gap-2.5 rounded-2xl bg-[#1A1917] px-8 py-4 text-[15px] font-medium text-white transition-all duration-250 hover:bg-[#333] hover:gap-3.5 hover:-translate-y-px active:scale-[0.97] group">
                Start workout
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-250 group-hover:translate-x-0.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </Link>
            </div>
          )}

          {/* Training done — workout name is quiet, streak is the hero */}
          {primaryAction === 'done' && training.today && (
            <div>
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#EEFBF0]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3D8B5C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <h2 className="section-title mb-1">
                {training.today.name}
              </h2>
              <p className="text-[13px] text-[#ACACAC]">
                {training.today.exerciseCount && <>{training.today.exerciseCount} oefeningen · </>}
                ~{training.today.durationMin} min
              </p>

              {momentum.streakDays > 0 && (
                <div className="mt-12 border-t border-[#F0F0EE] pt-12">
                  <span className="stat-number-hero text-[#1A1917]">
                    {momentum.streakDays}
                  </span>
                  <p className="mt-2 text-[16px] text-[#ACACAC]" style={{ fontWeight: 300 }}>
                    {momentum.streakDays === 1 ? 'week op rij' : 'weken op rij'}
                  </p>
                  {momentum.streakDays > 1 && (
                    <div className="mt-7 flex gap-2">
                      {Array.from({ length: Math.min(momentum.streakDays, 10) }).map((_, i) => (
                        <div key={i} className={`h-3.5 w-3.5 rounded-full ${i === momentum.streakDays - 1 ? 'bg-[#D46A3A]' : 'bg-[#1A1917]'}`} />
                      ))}
                    </div>
                  )}
                  <p className="mt-5 text-[14px] leading-[1.5] text-[#ACACAC]">
                    Blijf doorgaan, je record is {Math.max(momentum.streakDays + 3, 10)} weken op rij.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Rest day — a whisper */}
          {primaryAction === 'rest' && (
            <div className="py-5">
              <p className="mb-3 eyebrow">
                Vandaag
              </p>
              <h2 className="text-editorial-hero text-[#D8D8D8]" style={{ fontWeight: 200 }}>
                Rustdag
              </h2>
              {training.next && (
                <p className="mt-5 text-[14px] text-[#ACACAC]">
                  Volgende: <span className="font-medium text-[#1A1917]">{training.next.name}</span> {training.next.label}
                </p>
              )}
            </div>
          )}

          {/* Check-in overdue */}
          {primaryAction === 'checkin' && (
            <div>
              <p className="mb-3.5 eyebrow">
                Check-in
              </p>
              <h2 className="text-editorial-h1 mb-3">
                Tijd voor je meting
              </h2>
              <p className="text-[14px] text-[#ACACAC]">Gewicht, foto, en hoe je je voelt</p>
              <Link href="/client/check-in" className="mt-9 inline-flex items-center gap-2.5 rounded-2xl bg-[#1A1917] px-8 py-4 text-[15px] font-medium text-white transition-all duration-250 hover:bg-[#333] active:scale-[0.97] group">
                Start check-in
                <ArrowRight className="h-[18px] w-[18px] transition-transform duration-250 group-hover:translate-x-0.5" strokeWidth={2} />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ═══ SECONDARY — quiet rows ═══════════════════════ */}
      <div className="animate-fade-in" style={{ animationDelay: '280ms' }}>

        {/* Tomorrow */}
        {!isDay1 && !showOnboarding && training.next && primaryAction !== 'rest' && (
          <Link href="/client/workout" className="flex items-center justify-between border-t border-[#F0F0EE] py-[18px] group transition-opacity hover:opacity-60">
            <div className="flex items-center gap-3">
              <span className="text-[13px] text-[#C0C0C0]">Morgen</span>
              <span className="text-[14px] font-medium text-[#1A1917]">{training.next.name}</span>
            </div>
            <ChevronRight strokeWidth={1.5} className="h-4 w-4 text-[#D5D5D5] transition-colors group-hover:text-[#1A1917]" />
          </Link>
        )}

        {/* Nutrition */}
        {nutrition && nutrition.mealsTotal > 0 && (
          <Link href="/client/nutrition" className="block border-t border-[#F0F0EE] py-[18px] group transition-opacity hover:opacity-60">
            <div className="mb-3 flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                {caloriesTarget > 0 ? (
                  <>
                    <span className="section-title">{formatNumber(caloriesConsumed)}</span>
                    <span className="text-[13px] text-[#C0C0C0]">/ {formatNumber(caloriesTarget)} kcal</span>
                  </>
                ) : (
                  <span className="text-[14px] text-[#ACACAC]">{nutrition.mealsCompleted} van {nutrition.mealsTotal} maaltijden</span>
                )}
              </div>
              <ChevronRight strokeWidth={1.5} className="h-4 w-4 text-[#D5D5D5] transition-colors group-hover:text-[#1A1917]" />
            </div>
            <div className="h-[2px] w-full overflow-hidden rounded-full bg-[#F0F0EE]">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${nutrition.mealsTotal > 0 ? (nutrition.mealsCompleted / nutrition.mealsTotal) * 100 : 0}%`, backgroundColor: nutrition.mealsCompleted === nutrition.mealsTotal && nutrition.mealsTotal > 0 ? '#3D8B5C' : '#D46A3A' }} />
            </div>
          </Link>
        )}

        {/* Nudges */}
        {nudges.map((nudge, i) => (
          <Link key={i} href={nudge.href} className="flex items-center gap-3 border-t border-[#F0F0EE] py-4 group transition-opacity hover:opacity-60">
            <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D46A3A]" />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-[#1A1917]">{nudge.text}</p>
              {nudge.sub && <p className="mt-0.5 truncate text-[12px] text-[#ACACAC]">{nudge.sub}</p>}
            </div>
            <ChevronRight strokeWidth={1.5} className="h-4 w-4 shrink-0 text-[#D5D5D5] transition-colors group-hover:text-[#1A1917]" />
          </Link>
        ))}
      </div>

      {/* Pulse animation for today dot */}
      <style jsx global>{`
        @keyframes pulse-today {
          0%, 100% { box-shadow: 0 0 0 0 rgba(212, 106, 58, 0.25); }
          50% { box-shadow: 0 0 0 8px rgba(212, 106, 58, 0); }
        }
      `}</style>
    </div>
  )
}
