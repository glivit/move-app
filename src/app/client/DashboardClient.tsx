'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { cachedFetch, invalidateCache } from '@/lib/fetcher'
import { ChatFAB } from '@/components/home/ChatFAB'
import {
  readDashboardCache,
  writeDashboardCache,
  STALE_AFTER_MS,
} from '@/lib/dashboard-cache'
import { optimisticMutate } from '@/lib/optimistic'

// ─── Types ──────────────────────────────────────────────────

export interface DashboardData {
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
    completedToday: boolean
    next: {
      name: string
      label: string
    } | null
    // Inhaal-kandidaat: gemiste workout eerder deze week, chronologisch
    // oudste eerst. Surfaced alleen als vandaag rust is (of als today
    // al completed is) — anders prioriseren we de today-workout.
    catchup: {
      id: string
      name: string
      focus: string | null
      durationMin: number
      exerciseCount: number | null
      missedOnLabel: string
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
    consumed: {
      calories: number
      protein: number
      carbs: number
      fat: number
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
  weeklyCheckIn: {
    submitted: boolean
    date: string | null
    weightKg: number | null
  } | null
  weightLog: {
    entriesThisWeek: number
    targetPerWeek: number
    lastValue: number | null
    lastDate: string | null
  }
  momentum: {
    streakDays: number
    workoutsThisWeek: number
    weightChangeMonth: number | null
  }
  pendingTodos: Array<{
    key: string
    label: string
    sub: string
    href: string
    priority: 'high' | 'medium'
  }>
  notificationCount: number
}

// ─── Helpers ────────────────────────────────────────────────

const NL_DAY_ABBR = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']

function getWeekDots(
  scheduleDays: Array<{ dayNumber: number }>,
  completedDates: string[],
) {
  const today = new Date()
  const todayDow = today.getDay() === 0 ? 7 : today.getDay()
  const todayStr = today.toISOString().split('T')[0]
  const monday = new Date(today)
  monday.setDate(today.getDate() - (todayDow - 1))

  return NL_DAY_ABBR.map((label, i) => {
    const dow = i + 1
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const isToday = dateStr === todayStr
    const isPast = d < today && !isToday
    const hasTraining = scheduleDays.some(s => s.dayNumber === dow)
    const completed = completedDates.includes(dateStr)
    const isRest = !hasTraining
    // "Recent" = laatst voltooide trainingsdag (krijgt lime-paint).
    return { label, dow, dateStr, isToday, isPast, hasTraining, completed, isRest }
  })
}

function getCaloriesConsumed(nutrition: DashboardData['nutrition']) {
  if (!nutrition) return 0
  if (nutrition.consumed?.calories) return nutrition.consumed.calories
  return nutrition.meals
    .filter(m => m.completed)
    .reduce((sum, m) => sum + m.items.reduce((s, i) => s + i.calories, 0), 0)
}

function formatNumber(n: number): string {
  return n.toLocaleString('nl-BE')
}

// ─── Component ──────────────────────────────────────────────

export default function ClientDashboard({
  initialData,
  userId,
}: {
  initialData: DashboardData | null
  userId: string | null
}) {
  const [data, setData] = useState<DashboardData | null>(initialData)
  const [loading, setLoading] = useState(!initialData)
  const [cacheAgeMs, setCacheAgeMs] = useState<number | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  // loadError wordt alleen getoond als we écht niets hebben om te renderen
  // (geen IDB-cache én fetch gefaald). Tijdens een background-refresh tonen
  // we de pill, niet de dead-end.
  const [loadError, setLoadError] = useState<string | null>(null)
  const [retryTick, setRetryTick] = useState(0)
  const [weightInput, setWeightInput] = useState('')
  const [weightSaving, setWeightSaving] = useState(false)
  const [weightSaved, setWeightSaved] = useState(false)

  // ────────────────────────────────────────────────────────────
  // Fase 1 — Offline-first read path
  //
  //   - SSR-pad (initialData aanwezig): data is fresh. Persist naar IDB
  //     zodat volgende cold-start instant kan renderen. Geen extra fetch.
  //   - Fallback-pad (geen initialData; Fase 2 steady state): probeer
  //     eerst IDB voor directe render, fire parallel een fresh fetch
  //     via /api/dashboard. Write IDB na succes.
  //
  //   cacheAgeMs wordt alleen gezet wanneer data uit IDB komt. `null`
  //   betekent "net vers van server". Stale-indicator triggert op
  //   cacheAgeMs > STALE_AFTER_MS (5 min).
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return

    // SSR delivered fresh data → cache it for next time, no extra fetch.
    if (initialData) {
      writeDashboardCache(userId, initialData).catch(() => {})
      return
    }

    // No SSR data → instant IDB render + bg fresh fetch.
    let cancelled = false
    setIsRefreshing(true)
    setLoadError(null)

    readDashboardCache<DashboardData>(userId).then((hit) => {
      if (cancelled || !hit) return
      // Only paint cache if we don't already have fresher data.
      // (fresh fetch might finish before IDB read on fast connections)
      setData((current) => current ?? hit.data)
      setCacheAgeMs((current) => current ?? hit.ageMs)
      setLoading(false)
    })

    // retryTick in de URL forceert cachedFetch om de in-memory cache over
    // te slaan bij een manuele retry.
    const fetchUrl = retryTick > 0
      ? `/api/dashboard?retry=${retryTick}`
      : '/api/dashboard'

    // Direct fetch met timeout — cachedFetch deduplicatie kan stale state
    // veroorzaken bij PWA cold start + React strict mode remounts.
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    fetch(fetchUrl, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
        return res.json() as Promise<DashboardData>
      })
      .then((fresh) => {
        if (cancelled) return
        setData(fresh)
        setCacheAgeMs(null) // fresh from server
        setLoadError(null)
        writeDashboardCache(userId, fresh).catch(() => {})
      })
      .catch((err) => {
        if (cancelled) return
        console.error('Dashboard load error:', err)
        const msg = err?.name === 'AbortError'
          ? 'Verbinding duurt te lang'
          : (err?.message || 'Laden mislukt')
        setLoadError((current) => current ?? msg)
      })
      .finally(() => {
        clearTimeout(timeoutId)
        if (cancelled) return
        setLoading(false)
        setIsRefreshing(false)
      })

    return () => {
      cancelled = true
      controller.abort()
      clearTimeout(timeoutId)
    }
  }, [initialData, userId, retryTick])

  // ────────────────────────────────────────────────────────────
  // Fase 4 — Optimistic weight-log
  //
  //   Flow:
  //     1. apply(): weightLog onmiddellijk updaten (lastValue, lastDate,
  //        entriesThisWeek+1), input clear, "Opgeslagen"-pill aan,
  //        IDB cache mee-updaten zodat refresh optimistic state toont.
  //     2. commit(): POST /api/health-metrics
  //     3. onSuccess(): refetch /api/dashboard om momentum.weightChange*
  //        te reconciliëren (server-berekend t.o.v. vorige entries).
  //     4. onError(): rollback weightLog + input, pill uit, log error.
  //
  //   We tonen bewust geen saving=true spinner — optimistic update is
  //   instant, de ronde-trip is "eventual" en mag in de achtergrond.
  // ────────────────────────────────────────────────────────────
  const submitWeight = useCallback(async () => {
    const val = parseFloat(weightInput.replace(',', '.'))
    if (!val || val < 30 || val > 300) return

    const today = new Date().toISOString().split('T')[0]
    const snapshotData = data
    const snapshotInput = weightInput
    const prevWeightLog = snapshotData?.weightLog ?? null

    const optimisticWeightLog: DashboardData['weightLog'] = {
      entriesThisWeek: (prevWeightLog?.entriesThisWeek ?? 0) + 1,
      targetPerWeek: prevWeightLog?.targetPerWeek ?? 2,
      lastValue: val,
      lastDate: today,
    }

    let savedTimer: ReturnType<typeof setTimeout> | null = null

    setWeightSaving(true)
    try {
      await optimisticMutate({
        key: 'weight-log',
        apply: () => {
          if (snapshotData) {
            const nextData: DashboardData = {
              ...snapshotData,
              weightLog: optimisticWeightLog,
            }
            setData(nextData)
            if (userId) writeDashboardCache(userId, nextData).catch(() => {})
          }
          setWeightInput('')
          setWeightSaved(true)
          savedTimer = setTimeout(() => setWeightSaved(false), 2500)
        },
        rollback: () => {
          if (savedTimer) clearTimeout(savedTimer)
          if (snapshotData) {
            setData(snapshotData)
            if (userId) writeDashboardCache(userId, snapshotData).catch(() => {})
          }
          setWeightInput(snapshotInput)
          setWeightSaved(false)
        },
        commit: async () => {
          const r = await fetch('/api/health-metrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: today, weight_kg: val }),
          })
          if (!r.ok) throw new Error(`Weight log failed: ${r.status}`)
          return r
        },
        onSuccess: () => {
          // Server reconcile: momentum.weightChangeMonth en aggregates
          // worden server-side (her)berekend. We triggeren een refresh
          // op de achtergrond — UI blijft zichtbaar ongewijzigd tot
          // de response binnen is (apart van deze herberekende velden).
          invalidateCache('/api/dashboard')
          cachedFetch<DashboardData>('/api/dashboard', { forceRefresh: true })
            .then((d) => {
              setData(d)
              setCacheAgeMs(null)
              if (userId) writeDashboardCache(userId, d).catch(() => {})
            })
            .catch(() => {})
        },
        onError: (err) => {
          console.error('[optimistic:weight-log] commit failed:', err)
        },
      })
    } catch {
      // optimisticMutate heeft al gerapporteerd + state gerollbackt.
    } finally {
      setWeightSaving(false)
    }
  }, [weightInput, data, userId])

  const training = data?.training
  const nutrition = data?.nutrition
  const actions = data?.actions
  const momentum = data?.momentum
  const onboarding = data?.onboarding
  const weeklyCheckIn = data?.weeklyCheckIn
  const weightLog = data?.weightLog
  const pendingTodos = data?.pendingTodos ?? []
  const showOnboarding = onboarding && !onboarding.complete

  const weekDots = useMemo(
    () => (training ? getWeekDots(training.scheduleDays || [], training.completedDates || []) : []),
    [training?.scheduleDays, training?.completedDates],
  )
  const workoutsDone = weekDots.filter(d => d.completed).length
  const workoutsPlanned = (training?.scheduleDays?.length) || 0
  const weekTotal = workoutsPlanned || 5
  // Laatste voltooide dag → krijgt lime-paint (recent event).
  const lastDoneIdx = (() => {
    let idx = -1
    weekDots.forEach((d, i) => { if (d.completed) idx = i })
    return idx
  })()

  const hasProgram = !!(training?.scheduleDays?.length || training?.today || !training?.isRestDay)
  const isDay1 = !hasProgram && momentum ? (momentum.streakDays === 0 && momentum.workoutsThisWeek === 0) : false

  const caloriesConsumed = useMemo(() => getCaloriesConsumed(nutrition ?? null), [nutrition])
  const caloriesTarget = nutrition?.targets?.calories || 0

  // Vandaag-hero kan één van vijf states zijn.
  // `catchup` surfaced enkel op rustdagen (geen today-workout). Als vandaag
  // voltooid of nog te doen is, blijft die primair — celebratory "Voltooid"
  // of play-CTA wint van de inhaal-nudge.
  const heroState = useMemo(() => {
    if (!data) return 'rest' as const
    if (showOnboarding) return 'onboarding' as const
    if (isDay1) return 'day1' as const
    if (training?.today?.completed || training?.completedToday) return 'done' as const
    if (training?.today && !training.today.completed) return 'training' as const
    if (training?.catchup) return 'catchup' as const
    if (actions?.checkInDue?.overdue) return 'checkin' as const
    return 'rest' as const
  }, [data, showOnboarding, isDay1, training, actions?.checkInDue])

  // Nudges — één gemerged kanaal voor kleine attention-items (todos + actions).
  const nudges = useMemo(() => {
    const result: Array<{ key: string; text: string; sub?: string; href: string; lime?: boolean }> = []

    // Pending todos (photos, maandelijkse meting) → lime voor high-priority.
    pendingTodos.forEach(todo => {
      result.push({
        key: `todo-${todo.key}`,
        text: todo.label,
        sub: todo.sub,
        href: todo.href,
        lime: todo.priority === 'high',
      })
    })

    if (actions?.unreadMessages) {
      result.push({
        key: 'msg',
        text: `${actions.unreadMessages} ${actions.unreadMessages === 1 ? 'nieuw bericht' : 'nieuwe berichten'}`,
        href: '/client/messages',
        lime: true,
      })
    }
    if (actions?.nextVideoCall) {
      result.push({
        key: 'vc',
        text: `Videocall ${new Date(actions.nextVideoCall.scheduled_at).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' })}`,
        href: `/client/video/${actions.nextVideoCall.id}`,
      })
    }
    if (actions?.pendingPrompt) {
      result.push({
        key: 'prompt',
        text: 'Wekelijkse reflectie',
        sub: actions.pendingPrompt.question || undefined,
        href: '/client/prompts',
      })
    }
    if (actions?.accountabilityPending) {
      result.push({
        key: 'accountability',
        text: 'Dagelijkse check',
        sub: 'Laat weten hoe je dag was',
        href: '/client/accountability',
      })
    }
    return result
  }, [pendingTodos, actions])

  // Stale = cached data ouder dan drempel. `cacheAgeMs === null` betekent
  // dat we net vers van de server kwamen — dan nooit stale.
  const isStale = cacheAgeMs !== null && cacheAgeMs > STALE_AFTER_MS
  const showFreshnessPill = !loading && data && (isRefreshing || isStale)

  if (!data && loadError) {
    // Dead-end: geen IDB-cache EN de fetch faalde. Meest voorkomende oorzaken
    // zijn kort netwerkverlies of verlopen auth-cookie na lang wegleggen.
    // Een retry-knop lost beide scenario's op zonder de app te moeten killen.
    return (
      <div
        className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center"
        style={{ color: 'rgba(28,30,24,0.62)' }}
      >
        <p>Geen verbinding met de server.</p>
        <button
          type="button"
          onClick={() => {
            setLoadError(null)
            setLoading(true)
            setRetryTick((t) => t + 1)
          }}
          className="px-5 py-2.5 rounded-full bg-[#474B48] text-[#1C1E18] text-[14px] font-medium"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          Opnieuw proberen
        </button>
        <p className="text-[12px]" style={{ color: 'rgba(28,30,24,0.35)' }}>
          {loadError}
        </p>
      </div>
    )
  }

  if (!data) {
    // Fetch is nog bezig of net klaar zonder data — toon skeleton met retry
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6">
        <div className="animate-pulse space-y-4 w-full max-w-sm">
          <div className="h-5 rounded w-32" style={{ background: 'rgba(28,30,24,0.14)' }} />
          <div className="h-28 rounded-2xl" style={{ background: 'rgba(28,30,24,0.14)' }} />
          <div className="h-28 rounded-2xl" style={{ background: 'rgba(28,30,24,0.14)' }} />
        </div>
        {!loading && (
          <button
            type="button"
            onClick={() => {
              setLoadError(null)
              setLoading(true)
              setRetryTick((t) => t + 1)
            }}
            className="px-5 py-2.5 rounded-full bg-[#474B48] text-[#1C1E18] text-[14px] font-medium"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            Opnieuw proberen
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="pb-28">

      {/* Freshness-pill — subtiele aanduiding dat data uit cache komt. */}
      {showFreshnessPill && (
        <div
          className="animate-fade-in"
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: 10,
            paddingRight: 2,
          }}
          aria-live="polite"
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              color: 'rgba(28,30,24,0.62)',
              letterSpacing: 0.01,
              padding: '4px 10px',
              borderRadius: 9999,
              background: 'rgba(28,30,24,0.14)',
              border: '1px solid rgba(28,30,24,0.14)',
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: 9999,
                background: isRefreshing ? '#1C1E18' : 'rgba(28,30,24,0.62)',
                animation: isRefreshing ? 'pulse 1.4s ease-in-out infinite' : undefined,
              }}
            />
            {isRefreshing ? 'Bijwerken…' : 'Verouderd'}
          </span>
        </div>
      )}

      {/* ═══ VANDAAG HERO — één vraag: wat doe ik nu? ═══════════ */}
      <section className="mb-4 animate-up-v6 stagger-3">
        <HeroCard
          state={heroState}
          training={training}
          onboarding={onboarding ?? null}
          loading={loading}
        />
      </section>

      {/* ═══ DEZE WEEK — één vraag: hoe loop ik? ═══════════════ */}
      <section className="mb-4 animate-up-v6 stagger-4">
        <WeekCard
          loading={loading}
          dots={weekDots}
          done={workoutsDone}
          total={weekTotal}
          lastDoneIdx={lastDoneIdx}
        />
      </section>

      {/* ═══ DIEET (dark) — één vraag: lig ik op schema? ═══════ */}
      <section className="mb-4 animate-up-v6 stagger-5">
        <NutritionCard
          loading={loading}
          consumed={caloriesConsumed}
          target={caloriesTarget}
          protein={nutrition?.consumed?.protein ?? 0}
          carbs={nutrition?.consumed?.carbs ?? 0}
          fat={nutrition?.consumed?.fat ?? 0}
          proteinTarget={nutrition?.targets?.protein ?? 0}
        />
      </section>

      {/* ═══ CHECK-IN + WEIGHT ═══════════════════════════════ */}
      {!loading && !isDay1 && !showOnboarding && (
        <section className="mb-4 animate-up-v6 stagger-6">
          <CheckInWeightCard
            weeklyCheckIn={weeklyCheckIn ?? null}
            weightLog={weightLog ?? null}
            weightInput={weightInput}
            setWeightInput={setWeightInput}
            weightSaving={weightSaving}
            weightSaved={weightSaved}
            onSubmit={submitWeight}
          />
        </section>
      )}

      {/* ═══ NUDGES ═══════════════════════════════════════════ */}
      {!loading && nudges.length > 0 && (
        <section className="animate-up-v6 stagger-7" style={{ paddingTop: 6 }}>
          <div className="px-1 mb-2.5" style={{ fontSize: 12, color: 'rgba(28,30,24,0.62)', letterSpacing: 0.01 }}>
            Aandacht nodig
          </div>
          <div className="space-y-0">
            {nudges.map(n => (
              <Link
                key={n.key}
                href={n.href}
                className="flex items-center gap-3 py-[14px] group transition-opacity hover:opacity-70"
                style={{ borderTop: '1px solid rgba(28,30,24,0.14)' }}
              >
                <span
                  style={{
                    width: 6, height: 6, borderRadius: 9999, flexShrink: 0,
                    background: n.lime ? '#C0FC01' : 'rgba(28,30,24,0.62)',
                    boxShadow: n.lime ? '0 0 6px rgba(192,252,1,0.5)' : 'none',
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p style={{ fontSize: 14, fontWeight: 400, color: '#1C1E18' }}>{n.text}</p>
                  {n.sub && (
                    <p className="truncate" style={{ marginTop: 2, fontSize: 12, color: 'rgba(28,30,24,0.62)' }}>
                      {n.sub}
                    </p>
                  )}
                </div>
                <Chevron />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══ CHAT FAB — alleen mobile, lime-pellet bij unread ═══ */}
      <ChatFAB unreadCount={actions?.unreadMessages ?? 0} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Card: VANDAAG (hero) — licht card met slider of state
// ═══════════════════════════════════════════════════════════════

function HeroCard({
  state,
  training,
  onboarding,
  loading,
}: {
  state: 'training' | 'done' | 'rest' | 'checkin' | 'onboarding' | 'day1' | 'catchup'
  training: DashboardData['training'] | undefined
  onboarding: DashboardData['onboarding'] | null
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="v6-card" style={{ minHeight: 180 }}>
        <div className="animate-pulse space-y-3">
          <div className="h-3 w-24 rounded" style={{ background: 'rgba(28,30,24,0.18)' }} />
          <div className="h-7 w-48 rounded" style={{ background: 'rgba(28,30,24,0.32)' }} />
          <div className="h-3 w-32 rounded mt-1" style={{ background: 'rgba(28,30,24,0.18)' }} />
        </div>
      </div>
    )
  }

  if (state === 'onboarding') {
    const step = onboarding?.currentStep ?? 0
    const total = onboarding?.totalSteps ?? 1
    return (
      <Link href="/onboarding" className="block v6-card" aria-label="Intake formulier voltooien">
        <Arr />
        <div className="eyebrow mb-3">Profiel voltooien</div>
        <h2 style={{ fontSize: 22, fontWeight: 300, letterSpacing: '-0.018em', lineHeight: 1.15, marginBottom: 18 }}>
          Vul je intake in zodat je coach je programma kan opstellen
        </h2>
        <div style={{ height: 2, borderRadius: 9999, background: 'rgba(28,30,24,0.32)', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              borderRadius: 9999,
              background: '#1C1E18',
              width: `${(step / total) * 100}%`,
              transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </div>
        <div className="cap-row" style={{ marginTop: 10 }}>
          <span className="cap">Voortgang</span>
          <span className="cap">{step} / {total}</span>
        </div>
      </Link>
    )
  }

  if (state === 'day1') {
    return (
      <Link href="/client/messages" className="block v6-card" aria-label="Stuur je coach een bericht">
        <Arr />
        <div className="eyebrow mb-3">Welkom bij MŌVE</div>
        <h2 style={{ fontSize: 22, fontWeight: 300, letterSpacing: '-0.018em', lineHeight: 1.2, marginBottom: 10 }}>
          Je coach bereidt je programma voor
        </h2>
        <p className="meta" style={{ maxWidth: 280 }}>
          Binnenkort verschijnt hier je eerste training. Tot dan — stuur je coach een bericht.
        </p>
      </Link>
    )
  }

  if (state === 'done') {
    const workoutName = training?.today?.name ?? 'Workout'
    const exCount = training?.today?.exerciseCount
    const dur = training?.today?.durationMin
    // Design-system 04-homepage-v2.html: eyebrow = "Vandaag · <dag>"
    // (geen "Voltooid" hier — de lime-bar + cap "Voltooid" eronder is het
    // voltooid-signaal; dubbel is ruis).
    return (
      <Link href="/client/workout" className="block v6-card" aria-label={`${workoutName} voltooid`}>
        <Arr />
        <div className="eyebrow mb-3">
          <span className="pulse" style={{ background: '#C0FC01' }} /> Vandaag
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 300, letterSpacing: '-0.018em', lineHeight: 1.15, marginBottom: 6 }}>
          {workoutName}
        </h2>
        <p className="meta" style={{ marginBottom: 18 }}>
          {exCount ? `${exCount} oefeningen · ` : ''}
          {dur ? `±${dur} min` : 'Voltooid'}
        </p>
        <Slider fill={1} knobRight label="Voltooid" ticksCount={34} />
      </Link>
    )
  }

  if (state === 'catchup' && training?.catchup) {
    // Inhaal-card: gemiste workout deze week die nog kan afgerond worden.
    // Zelfde lime accent als today-card — amber voelde als warning, niet als
    // invite. De "Inhalen"-eyebrow zegt al genoeg dat dit een nudge is. Tap
    // → overview-page (zelfde flow als today-card), waar de gemiste day als
    // tapbare rij verschijnt; server-side vervult de slot via template_day_id.
    const c = training.catchup
    return (
      <Link
        href="/client/workout"
        className="block v6-card"
        aria-label={`${c.name} inhalen`}
      >
        <Arr />
        <div className="eyebrow mb-3">
          <span className="pulse" /> Inhalen · {c.missedOnLabel}
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 300, letterSpacing: '-0.018em', lineHeight: 1.15, marginBottom: 6 }}>
          {c.name}
        </h2>
        <p className="meta" style={{ marginBottom: 18 }}>
          {c.exerciseCount ? `${c.exerciseCount} oefeningen · ` : ''}
          ±{c.durationMin ?? 50} min
        </p>
        <Slider fill={0} knobRight={false} label="Inhalen" ticksCount={34} />
      </Link>
    )
  }

  if (state === 'rest') {
    return (
      <div className="v6-card">
        <div className="eyebrow mb-3">Vandaag</div>
        <h2 style={{ fontSize: 38, fontWeight: 200, letterSpacing: '-0.03em', lineHeight: 1.05, color: 'rgba(28,30,24,0.58)' }}>
          Rustdag
        </h2>
        {training?.next && (
          <p className="meta" style={{ marginTop: 14 }}>
            Volgende: <span style={{ color: '#1C1E18', fontWeight: 500 }}>{training.next.name}</span> {training.next.label}
          </p>
        )}
      </div>
    )
  }

  if (state === 'checkin') {
    return (
      <Link href="/client/check-in" className="block v6-card" aria-label="Start check-in">
        <Arr />
        <div className="eyebrow mb-3">
          <span className="pulse" /> Check-in
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 300, letterSpacing: '-0.018em', lineHeight: 1.15, marginBottom: 6 }}>
          Tijd voor je meting
        </h2>
        <p className="meta">Gewicht, foto, en hoe je je voelt</p>
      </Link>
    )
  }

  // state === 'training'
  return (
    <Link href="/client/workout" className="block v6-card" aria-label={`Start ${training?.today?.name ?? 'workout'}`}>
      <Arr />
      <div className="eyebrow mb-3">
        <span className="pulse" /> Vandaag
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 300, letterSpacing: '-0.018em', lineHeight: 1.15, marginBottom: 6 }}>
        {training?.today?.name}
      </h2>
      <p className="meta" style={{ marginBottom: 18 }}>
        {training?.today?.exerciseCount ? `${training.today.exerciseCount} oefeningen · ` : ''}
        ±{training?.today?.durationMin ?? 50} min
      </p>
      <Slider fill={0} knobRight={false} label="Start workout" ticksCount={34} />
    </Link>
  )
}

// ═══════════════════════════════════════════════════════════════
// Card: DEZE WEEK — 7-dot ritme + completion count
// ═══════════════════════════════════════════════════════════════

function WeekCard({
  loading,
  dots,
  done,
  total,
  lastDoneIdx,
}: {
  loading: boolean
  dots: ReturnType<typeof getWeekDots>
  done: number
  total: number
  lastDoneIdx: number
}) {
  if (loading) {
    return (
      <div className="v6-card">
        <div className="animate-pulse">
          <div className="h-3 w-20 rounded mb-5" style={{ background: 'rgba(28,30,24,0.18)' }} />
          <div className="h-10 w-24 rounded mb-5" style={{ background: 'rgba(28,30,24,0.32)' }} />
          <div className="flex justify-between gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-9 w-9 rounded-full" style={{ background: 'rgba(28,30,24,0.18)' }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Link href="/client/workout" className="block v6-card" aria-label={`Deze week: ${done} van ${total} voltooid`}>
      <Arr />
      <div className="eyebrow mb-3">Deze Week</div>
      <div className="stat-number-lg" style={{ marginBottom: 22 }}>
        {done}
        <sup style={{ fontSize: 13, fontWeight: 300, color: 'rgba(28,30,24,0.62)', verticalAlign: 'top', position: 'relative', top: 8, marginLeft: 2, letterSpacing: 0 }}>
          /{total}
        </sup>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
        {dots.map((d, i) => (
          <div key={d.dow} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: d.isToday ? 500 : 400,
                color: d.isToday ? '#1C1E18' : 'rgba(28,30,24,0.62)',
              }}
            >
              {d.label}
            </span>
            <WeekDot dot={d} isLastDone={i === lastDoneIdx} />
          </div>
        ))}
      </div>
    </Link>
  )
}

function WeekDot({
  dot,
  isLastDone,
}: {
  dot: ReturnType<typeof getWeekDots>[number]
  isLastDone: boolean
}) {
  const size = 28
  if (dot.completed) {
    const isRecent = isLastDone
    return (
      <div
        style={{
          width: size, height: size, borderRadius: '50%',
          background: isRecent ? '#C0FC01' : 'rgba(28,30,24,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        aria-label="Voltooid"
      >
        <svg viewBox="0 0 24 24" width={isRecent ? 12 : 11} height={isRecent ? 12 : 11} fill="none">
          <polyline
            points="6 12 10 16 18 8"
            stroke={isRecent ? '#0E1500' : 'rgba(28,30,24,0.78)'}
            strokeWidth={isRecent ? 2.5 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    )
  }
  if (dot.isToday) {
    return (
      <div
        style={{
          width: size, height: size, borderRadius: '50%',
          background: 'rgba(28,30,24,0.14)',
          boxShadow: 'inset 0 0 0 1.5px #1C1E18',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        aria-label="Vandaag"
      >
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#1C1E18' }} />
      </div>
    )
  }
  if (dot.isRest) {
    return (
      <div
        style={{
          width: size, height: size, borderRadius: '50%',
          background: 'rgba(28,30,24,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: 'rgba(28,30,24,0.62)',
        }}
        aria-label="Rustdag"
      >—</div>
    )
  }
  // Ingepland, nog niet geweest
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%',
        background: 'rgba(28,30,24,0.08)',
      }}
      aria-label="Ingepland"
    />
  )
}

// ═══════════════════════════════════════════════════════════════
// Card: DIEET (dark) — kcal + macro breakdown
// ═══════════════════════════════════════════════════════════════

function NutritionCard({
  loading,
  consumed,
  target,
  protein,
  carbs,
  fat,
}: {
  loading: boolean
  consumed: number
  target: number
  protein: number
  carbs: number
  fat: number
  proteinTarget: number
}) {
  if (loading) {
    return (
      <div className="v6-card-dark">
        <div className="animate-pulse space-y-4">
          <div className="h-3 w-16 rounded" style={{ background: 'rgba(253,253,254,0.14)' }} />
          <div className="h-10 w-40 rounded" style={{ background: 'rgba(253,253,254,0.18)' }} />
          <div className="grid grid-cols-3 gap-3 pt-3" style={{ borderTop: '1px solid rgba(253,253,254,0.10)' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 rounded" style={{ background: 'rgba(253,253,254,0.12)' }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const hasTarget = target > 0
  return (
    <Link href="/client/nutrition" className="block v6-card-dark" aria-label="Dieet details">
      <Arr />
      <div className="eyebrow mb-3">Dieet</div>
      <div style={{ margin: '16px 0 22px' }}>
        <div className="stat-number-lg" style={{ fontFeatureSettings: '"tnum"' }}>
          {formatNumber(consumed)}
          {hasTarget && (
            <span style={{ display: 'block', fontSize: 12, color: 'rgba(253,253,254,0.44)', fontWeight: 400, marginTop: 6, letterSpacing: 0.01 }}>
              / {formatNumber(target)} kcal
            </span>
          )}
          {!hasTarget && (
            <span style={{ display: 'block', fontSize: 12, color: 'rgba(253,253,254,0.44)', fontWeight: 400, marginTop: 6, letterSpacing: 0.01 }}>
              kcal vandaag
            </span>
          )}
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 14,
          padding: '14px 0 0',
          borderTop: '1px solid rgba(253,253,254,0.10)',
        }}
      >
        <MacroCell label="Eiwit" value={Math.round(protein)} />
        <MacroCell label="Koolh." value={Math.round(carbs)} />
        <MacroCell label="Vet" value={Math.round(fat)} />
      </div>
    </Link>
  )
}

function MacroCell({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, color: 'rgba(253,253,254,0.44)', letterSpacing: 0 }}>{label}</span>
      <span style={{ fontSize: 18, color: '#FDFDFE', fontWeight: 300, fontFeatureSettings: '"tnum"', letterSpacing: '-0.01em' }}>
        {value}
        <i style={{ fontSize: 11, color: 'rgba(253,253,254,0.44)', fontStyle: 'normal', fontWeight: 400, marginLeft: 2 }}>g</i>
      </span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Card: CHECK-IN + inline gewicht loggen
// ═══════════════════════════════════════════════════════════════

function CheckInWeightCard({
  weeklyCheckIn,
  weightLog,
  weightInput,
  setWeightInput,
  weightSaving,
  weightSaved,
  onSubmit,
}: {
  weeklyCheckIn: DashboardData['weeklyCheckIn']
  weightLog: DashboardData['weightLog'] | null
  weightInput: string
  setWeightInput: (v: string) => void
  weightSaving: boolean
  weightSaved: boolean
  onSubmit: () => void
}) {
  const submittedThisWeek = weeklyCheckIn?.submitted === true
  const entries = weightLog?.entriesThisWeek ?? 0
  const target = weightLog?.targetPerWeek ?? 2
  const onTrack = entries >= target

  return (
    <div className="v6-card">
      <div className="cap-row" style={{ marginBottom: 16 }}>
        <span className="eyebrow">Check-in</span>
        <span className="cap" style={{ color: onTrack ? '#C0FC01' : 'rgba(28,30,24,0.62)' }}>
          {entries}/{target} gewichten
        </span>
      </div>

      {/* Wekelijkse check-in row */}
      {!submittedThisWeek ? (
        <Link
          href="/client/weekly-check-in"
          className="flex items-center justify-between group py-3"
          style={{ borderBottom: '1px solid rgba(28,30,24,0.12)' }}
        >
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: 15, fontWeight: 500, color: '#1C1E18' }}>Wekelijkse check-in</p>
            <p style={{ fontSize: 12, color: 'rgba(28,30,24,0.62)', marginTop: 2 }}>
              Gewicht, energie en reflectie
            </p>
          </div>
          <span
            style={{
              fontSize: 12, fontWeight: 500,
              padding: '6px 14px',
              borderRadius: 9999,
              background: '#1C1E18',
              color: '#1F231F',
            }}
          >
            Invullen
          </span>
        </Link>
      ) : (
        <div
          className="flex items-center justify-between py-3"
          style={{ borderBottom: '1px solid rgba(28,30,24,0.12)' }}
        >
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: 15, fontWeight: 500, color: '#1C1E18' }}>Check-in ingevuld</p>
            <p style={{ fontSize: 12, color: 'rgba(28,30,24,0.62)', marginTop: 2 }}>
              {weeklyCheckIn?.weightKg ? `${weeklyCheckIn.weightKg} kg` : 'Deze week voltooid'}
            </p>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C0FC01" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}

      {/* Weight log inline */}
      <div style={{ paddingTop: 14 }}>
        {weightSaved ? (
          <div className="flex items-center gap-2 py-2 animate-fade-in">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C0FC01" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#C0FC01' }}>Opgeslagen</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="decimal"
              placeholder={weightLog?.lastValue ? `Vorige: ${weightLog.lastValue} kg` : 'Gewicht vandaag (bv. 78,5)'}
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onSubmit() }}
              className="input-v3 flex-1"
              style={{
                background: 'rgba(28,30,24,0.14)',
                border: '1px solid rgba(28,30,24,0.32)',
                color: '#1C1E18',
              }}
            />
            <button
              onClick={onSubmit}
              disabled={weightSaving || !weightInput.trim()}
              className="shrink-0"
              style={{
                padding: '10px 18px',
                borderRadius: 14,
                background: '#1C1E18',
                color: '#1F231F',
                fontSize: 13,
                fontWeight: 500,
                border: 'none',
                cursor: (weightSaving || !weightInput.trim()) ? 'not-allowed' : 'pointer',
                opacity: (weightSaving || !weightInput.trim()) ? 0.35 : 1,
                transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
              }}
            >
              {weightSaving ? '…' : 'Log'}
            </button>
          </div>
        )}
        {weightLog?.lastValue && !weightSaved && (
          <p style={{ marginTop: 8, fontSize: 11, color: 'rgba(28,30,24,0.62)' }}>
            Laatste: {weightLog.lastValue} kg
            {weightLog.lastDate && (
              <> ({new Date(weightLog.lastDate).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })})</>
            )}
          </p>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Primitives — arrow, slider, chevron
// ═══════════════════════════════════════════════════════════════

function Arr() {
  return (
    <span className="v6-arr" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <line x1="7" y1="17" x2="17" y2="7" />
        <polyline points="7 7 17 7 17 17" />
      </svg>
    </span>
  )
}

function Chevron() {
  return (
    <svg
      width={16} height={16} viewBox="0 0 24 24" fill="none"
      stroke="rgba(28,30,24,0.62)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
      className="shrink-0 transition-colors group-hover:stroke-white"
    >
      <polyline points="9 6 15 12 9 18" />
    </svg>
  )
}

// Horizontal slider — zie design-system/04-homepage-v2.html .slider
// v6: geen random tick-hoogtes meer (leidde tot de indruk dat het "een standaard
// lijntje" was dat niets uitdrukt). In plaats daarvan uniforme 3px ticks die de
// rust van een design-systeem timeline uitstralen. Bij fill === 1 verbergen we
// de ticks helemaal zodat "Voltooid" 100% solid voelt, met de knob rechts.
function Slider({ fill, knobRight, label, ticksCount }: { fill: number; knobRight: boolean; label: string; ticksCount: number }) {
  const isComplete = fill >= 0.999
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', height: 3 }}>
        <div
          style={{
            height: 3,
            width: `${Math.max(fill, 0.08) * 100}%`,
            background: isComplete ? '#C0FC01' : 'rgba(28,30,24,0.85)',
            borderRadius: isComplete ? '1.5px' : '1.5px 0 0 1.5px',
            transition: 'width 320ms cubic-bezier(0.16,1,0.3,1), background 240ms',
            boxShadow: isComplete ? '0 0 12px rgba(192,252,1,0.32)' : undefined,
          }}
        />
        {!isComplete && (
          <div
            style={{
              width: 10, height: 10, borderRadius: '50%',
              background: '#1C1E18',
              boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
              margin: '0 -3px',
              zIndex: 2,
            }}
          />
        )}
        {!isComplete && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2, paddingLeft: 4 }}>
            {Array.from({ length: ticksCount }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 1,
                  height: 3,
                  background: 'rgba(28,30,24,0.22)',
                  borderRadius: 0.5,
                }}
              />
            ))}
          </div>
        )}
      </div>
      <div className="cap-row" style={{ marginTop: 10 }}>
        <span className="cap">{knobRight ? 'Voortgang' : 'Workout'}</span>
        <span className="cap" style={isComplete ? { color: '#C0FC01', fontWeight: 500 } : undefined}>{label}</span>
      </div>
    </div>
  )
}
