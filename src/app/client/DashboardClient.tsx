'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { cachedFetch, invalidateCache } from '@/lib/fetcher'

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

export default function ClientDashboard({ initialData }: { initialData: DashboardData | null }) {
  const [data, setData] = useState<DashboardData | null>(initialData)
  const [loading, setLoading] = useState(!initialData)
  const [weightInput, setWeightInput] = useState('')
  const [weightSaving, setWeightSaving] = useState(false)
  const [weightSaved, setWeightSaved] = useState(false)

  useEffect(() => {
    if (initialData) return
    cachedFetch<DashboardData>('/api/dashboard', { maxAge: 120_000 })
      .then(d => setData(d))
      .catch(err => console.error('Dashboard load error:', err))
      .finally(() => setLoading(false))
  }, [initialData])

  const submitWeight = useCallback(async () => {
    const val = parseFloat(weightInput.replace(',', '.'))
    if (!val || val < 30 || val > 300) return
    setWeightSaving(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      await fetch('/api/health-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today, weight_kg: val }),
      })
      setWeightSaved(true)
      setWeightInput('')
      setTimeout(() => setWeightSaved(false), 2500)
      invalidateCache('/api/dashboard')
      cachedFetch<DashboardData>('/api/dashboard', { forceRefresh: true })
        .then(d => setData(d))
        .catch(() => {})
    } catch (err) {
      console.error('Weight log error:', err)
    } finally {
      setWeightSaving(false)
    }
  }, [weightInput])

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

  // Vandaag-hero kan één van vier states zijn.
  const heroState = useMemo(() => {
    if (!data) return 'rest' as const
    if (showOnboarding) return 'onboarding' as const
    if (isDay1) return 'day1' as const
    if (training?.today?.completed || training?.completedToday) return 'done' as const
    if (training?.today && !training.today.completed) return 'training' as const
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

  if (!loading && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" style={{ color: 'rgba(253,253,254,0.62)' }}>
        Er ging iets mis bij het laden.
      </div>
    )
  }

  return (
    <div className="pb-28">

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
          <div className="px-1 mb-2.5" style={{ fontSize: 12, color: 'rgba(253,253,254,0.44)', letterSpacing: 0.01 }}>
            Aandacht nodig
          </div>
          <div className="space-y-0">
            {nudges.map(n => (
              <Link
                key={n.key}
                href={n.href}
                className="flex items-center gap-3 py-[14px] group transition-opacity hover:opacity-70"
                style={{ borderTop: '1px solid rgba(253,253,254,0.10)' }}
              >
                <span
                  style={{
                    width: 6, height: 6, borderRadius: 9999, flexShrink: 0,
                    background: n.lime ? '#C0FC01' : 'rgba(253,253,254,0.44)',
                    boxShadow: n.lime ? '0 0 6px rgba(192,252,1,0.5)' : 'none',
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p style={{ fontSize: 14, fontWeight: 400, color: '#FDFDFE' }}>{n.text}</p>
                  {n.sub && (
                    <p className="truncate" style={{ marginTop: 2, fontSize: 12, color: 'rgba(253,253,254,0.44)' }}>
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
  state: 'training' | 'done' | 'rest' | 'checkin' | 'onboarding' | 'day1'
  training: DashboardData['training'] | undefined
  onboarding: DashboardData['onboarding'] | null
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="v6-card" style={{ minHeight: 180 }}>
        <div className="animate-pulse space-y-3">
          <div className="h-3 w-24 rounded" style={{ background: 'rgba(253,253,254,0.14)' }} />
          <div className="h-7 w-48 rounded" style={{ background: 'rgba(253,253,254,0.18)' }} />
          <div className="h-3 w-32 rounded mt-1" style={{ background: 'rgba(253,253,254,0.14)' }} />
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
        <div style={{ height: 2, borderRadius: 9999, background: 'rgba(253,253,254,0.18)', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              borderRadius: 9999,
              background: '#FDFDFE',
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
    return (
      <Link href="/client/workout" className="block v6-card" aria-label={`${workoutName} voltooid`}>
        <Arr />
        <div className="eyebrow mb-3">
          <span className="pulse" style={{ background: '#2FA65A' }} /> Vandaag · Voltooid
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 300, letterSpacing: '-0.018em', lineHeight: 1.15, marginBottom: 6 }}>
          {workoutName}
        </h2>
        <p className="meta" style={{ marginBottom: 18 }}>
          {training?.today?.exerciseCount ? `${training.today.exerciseCount} oefeningen · ` : ''}
          ~{training?.today?.durationMin ?? 0} min
        </p>
        <Slider fill={1} knobRight label="Voltooid" ticksCount={34} />
      </Link>
    )
  }

  if (state === 'rest') {
    return (
      <div className="v6-card">
        <div className="eyebrow mb-3">Vandaag</div>
        <h2 style={{ fontSize: 38, fontWeight: 200, letterSpacing: '-0.03em', lineHeight: 1.05, color: 'rgba(253,253,254,0.58)' }}>
          Rustdag
        </h2>
        {training?.next && (
          <p className="meta" style={{ marginTop: 14 }}>
            Volgende: <span style={{ color: '#FDFDFE', fontWeight: 500 }}>{training.next.name}</span> {training.next.label}
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
        ~{training?.today?.durationMin ?? 50} min
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
          <div className="h-3 w-20 rounded mb-5" style={{ background: 'rgba(253,253,254,0.14)' }} />
          <div className="h-10 w-24 rounded mb-5" style={{ background: 'rgba(253,253,254,0.18)' }} />
          <div className="flex justify-between gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-9 w-9 rounded-full" style={{ background: 'rgba(253,253,254,0.14)' }} />
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
        <sup style={{ fontSize: 13, fontWeight: 300, color: 'rgba(253,253,254,0.44)', verticalAlign: 'top', position: 'relative', top: 8, marginLeft: 2, letterSpacing: 0 }}>
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
                color: d.isToday ? '#FDFDFE' : 'rgba(253,253,254,0.44)',
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
          background: isRecent ? '#C0FC01' : 'rgba(253,253,254,0.14)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        aria-label="Voltooid"
      >
        <svg viewBox="0 0 24 24" width={isRecent ? 12 : 11} height={isRecent ? 12 : 11} fill="none">
          <polyline
            points="6 12 10 16 18 8"
            stroke={isRecent ? '#0E1500' : 'rgba(253,253,254,0.78)'}
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
          background: 'rgba(253,253,254,0.10)',
          boxShadow: 'inset 0 0 0 1.5px #FDFDFE',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        aria-label="Vandaag"
      >
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#FDFDFE' }} />
      </div>
    )
  }
  if (dot.isRest) {
    return (
      <div
        style={{
          width: size, height: size, borderRadius: '50%',
          background: 'rgba(253,253,254,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: 'rgba(253,253,254,0.44)',
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
        background: 'rgba(253,253,254,0.08)',
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
        <span className="cap" style={{ color: onTrack ? '#C0FC01' : 'rgba(253,253,254,0.62)' }}>
          {entries}/{target} gewichten
        </span>
      </div>

      {/* Wekelijkse check-in row */}
      {!submittedThisWeek ? (
        <Link
          href="/client/weekly-check-in"
          className="flex items-center justify-between group py-3"
          style={{ borderBottom: '1px solid rgba(253,253,254,0.12)' }}
        >
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: 15, fontWeight: 500, color: '#FDFDFE' }}>Wekelijkse check-in</p>
            <p style={{ fontSize: 12, color: 'rgba(253,253,254,0.62)', marginTop: 2 }}>
              Gewicht, energie en reflectie
            </p>
          </div>
          <span
            style={{
              fontSize: 12, fontWeight: 500,
              padding: '6px 14px',
              borderRadius: 9999,
              background: '#FDFDFE',
              color: '#1F231F',
            }}
          >
            Invullen
          </span>
        </Link>
      ) : (
        <div
          className="flex items-center justify-between py-3"
          style={{ borderBottom: '1px solid rgba(253,253,254,0.12)' }}
        >
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: 15, fontWeight: 500, color: '#FDFDFE' }}>Check-in ingevuld</p>
            <p style={{ fontSize: 12, color: 'rgba(253,253,254,0.62)', marginTop: 2 }}>
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
                background: 'rgba(253,253,254,0.10)',
                border: '1px solid rgba(253,253,254,0.18)',
                color: '#FDFDFE',
              }}
            />
            <button
              onClick={onSubmit}
              disabled={weightSaving || !weightInput.trim()}
              className="shrink-0"
              style={{
                padding: '10px 18px',
                borderRadius: 14,
                background: '#FDFDFE',
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
          <p style={{ marginTop: 8, fontSize: 11, color: 'rgba(253,253,254,0.44)' }}>
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
      stroke="rgba(253,253,254,0.44)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
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
            background: isComplete ? '#2FA65A' : 'rgba(253,253,254,0.85)',
            borderRadius: isComplete ? '1.5px' : '1.5px 0 0 1.5px',
            transition: 'width 320ms cubic-bezier(0.16,1,0.3,1), background 240ms',
          }}
        />
        {!isComplete && (
          <div
            style={{
              width: 10, height: 10, borderRadius: '50%',
              background: '#FDFDFE',
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
                  background: 'rgba(253,253,254,0.22)',
                  borderRadius: 0.5,
                }}
              />
            ))}
          </div>
        )}
      </div>
      <div className="cap-row" style={{ marginTop: 10 }}>
        <span className="cap">{knobRight ? 'Voortgang' : 'Workout'}</span>
        <span className="cap" style={isComplete ? { color: '#2FA65A', fontWeight: 500 } : undefined}>{label}</span>
      </div>
    </div>
  )
}
