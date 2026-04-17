'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { PhotoComparison } from '@/components/client/PhotoComparison'

// ─── Types ──────────────────────────────────────────────────

interface ProgressData {
  headline: {
    daysOnProgram: number
    streak: number
    totalWorkouts: number
    totalPrs: number
  }
  training: {
    totalMinutes: number
    avgSessionMin: number
    workoutsPerWeek: number
    workoutsThisMonth: number
    weeklyChart: Array<{ week: string; count: number }>
  }
  body: {
    weightData: Array<{ date: string; weight: number; label: string }>
    weightStart: number | null
    weightCurrent: number | null
    weightChange: number | null
    bodyFatData: Array<{ date: string; value: number; label: string }>
    photoDates: Array<{ date: string; hasFront: boolean; hasBack: boolean }>
    hasPhotos: boolean
  }
  strength: {
    recentPrs: Array<{ id: string; exercise: string; value: number; type: string; date: string }>
    totalPrs: number
    prsThisMonth: number
  }
  nutrition: {
    compliance: number | null
    daysTracked: number
  }
}

interface WeeklyStats {
  week: string
  duration: number
  volume: number
  sets: number
}

interface TopLift {
  exercise: string
  weight: number
  reps: number
  date: string
}

interface CheckInRow {
  id: string
  date: string
  weight_kg: number | null
  body_fat_pct: number | null
  photo_front_url: string | null
  photo_back_url: string | null
  chest_cm: number | null
  waist_cm: number | null
}

type ChartMode = 'duration' | 'volume' | 'sets'
type ProgressTab = 'kracht' | 'lichaam' | 'checkins'

// ─── Animated Counter ───────────────────────────────────────

function AnimatedNumber({ value, duration = 1000, suffix = '', prefix = '' }: {
  value: number; duration?: number; suffix?: string; prefix?: string
}) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (value === 0) { setDisplay(0); return }
    const startTime = performance.now()
    const isDecimal = !Number.isInteger(value)

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = eased * value
      setDisplay(isDecimal ? +current.toFixed(1) : Math.round(current))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [value, duration])

  return <span>{prefix}{display}{suffix}</span>
}

// ─── Sparkline ──────────────────────────────────────────────

function Sparkline({ data, color, height = 48, width = 140 }: {
  data: number[]; color: string; height?: number; width?: number
}) {
  if (data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Main Component ─────────────────────────────────────────

export default function ProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null)
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([])
  const [topLifts, setTopLifts] = useState<TopLift[]>([])
  const [checkInRows, setCheckInRows] = useState<CheckInRow[]>([])
  const [chartMode, setChartMode] = useState<ChartMode>('duration')
  const [tab, setTab] = useState<ProgressTab>('kracht')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/progress')
        if (res.ok) setData(await res.json())

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Weekly chart data (last 12 weeks) + top lifts
        const twelveWeeksAgo = new Date()
        twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 12 * 7)

        const { data: sessions } = await supabase
          .from('workout_sessions')
          .select('id, started_at, completed_at, duration_seconds, workout_sets(exercise_id, weight_kg, actual_reps, is_warmup, exercises(name, name_nl))')
          .eq('client_id', user.id)
          .not('completed_at', 'is', null)
          .gte('started_at', twelveWeeksAgo.toISOString())
          .order('started_at', { ascending: false })

        if (sessions) {
          const weeks: Record<string, WeeklyStats> = {}
          const now = new Date()

          for (let i = 11; i >= 0; i--) {
            const d = new Date(now)
            d.setDate(d.getDate() - i * 7)
            const weekStart = new Date(d)
            weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
            const key = weekStart.toISOString().slice(0, 10)
            const label = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`
            weeks[key] = { week: label, duration: 0, volume: 0, sets: 0 }
          }

          // Top lifts aggregation: max weight per exercise_id
          const lifts: Record<string, TopLift> = {}

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const s of sessions as any[]) {
            const date = new Date(s.started_at)
            const weekStart = new Date(date)
            weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
            const key = weekStart.toISOString().slice(0, 10)

            const sets = s.workout_sets || []
            if (weeks[key]) {
              weeks[key].duration += Math.round((s.duration_seconds || 0) / 60)
              weeks[key].sets += sets.length
              for (const set of sets) {
                weeks[key].volume += (set.weight_kg || 0) * (set.actual_reps || 0)
              }
            }

            // Track max weight per exercise
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            for (const set of sets as any[]) {
              if (set.is_warmup) continue
              if (!set.weight_kg || set.weight_kg <= 0) continue
              if (!set.actual_reps || set.actual_reps <= 0) continue
              const exId = set.exercise_id as string
              const ex = Array.isArray(set.exercises) ? set.exercises[0] : set.exercises
              const exName = ex?.name_nl || ex?.name || 'Oefening'
              const existing = lifts[exId]
              if (!existing || (set.weight_kg as number) > existing.weight) {
                lifts[exId] = {
                  exercise: exName,
                  weight: set.weight_kg,
                  reps: set.actual_reps,
                  date: s.started_at,
                }
              }
            }
          }

          setWeeklyStats(Object.values(weeks))
          setTopLifts(
            Object.values(lifts)
              .sort((a, b) => b.weight - a.weight)
              .slice(0, 6)
          )
        }

        // Check-ins (monthly)
        const { data: checkins } = await supabase
          .from('checkins')
          .select('id, date, weight_kg, body_fat_pct, photo_front_url, photo_back_url, chest_cm, waist_cm')
          .eq('client_id', user.id)
          .order('date', { ascending: false })
          .limit(12)

        if (checkins) setCheckInRows(checkins as CheckInRow[])
      } catch (err) {
        console.error('Progress load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="pb-28 animate-fade-in">
        {/* Skeleton: hero card */}
        <div
          className="rounded-[24px] mb-4"
          style={{
            padding: '22px 22px 24px',
            background: '#A6ADA7',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.10)',
          }}
        >
          <div className="animate-pulse space-y-3">
            <div className="h-3 w-24 rounded-full" style={{ background: 'rgba(253,253,254,0.18)' }} />
            <div className="h-14 w-40 rounded-lg" style={{ background: 'rgba(253,253,254,0.24)' }} />
            <div className="h-3 w-32 rounded-full" style={{ background: 'rgba(253,253,254,0.14)' }} />
          </div>
        </div>
        {/* Skeleton: tabs */}
        <div className="flex gap-1.5 mb-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex-1 h-10 rounded-xl" style={{ background: 'rgba(253,253,254,0.08)' }} />
          ))}
        </div>
        {/* Skeleton: content card */}
        <div
          className="rounded-[24px] mb-4"
          style={{
            padding: '22px 22px 24px',
            background: '#474B48',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 6px rgba(0,0,0,0.22)',
          }}
        >
          <div className="animate-pulse space-y-4">
            <div className="h-3 w-20 rounded-full" style={{ background: 'rgba(253,253,254,0.14)' }} />
            <div className="flex items-end gap-[3px] h-[90px]">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="flex-1 rounded-t-md" style={{ height: `${30 + (i * 5) % 60}%`, background: 'rgba(253,253,254,0.12)' }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="pb-28 animate-fade-in">
        <div
          className="rounded-[24px]"
          style={{
            padding: '48px 22px',
            background: '#A6ADA7',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.10)',
            textAlign: 'center',
          }}
        >
          <p style={{ color: '#FDFDFE', fontSize: 18, fontWeight: 300, letterSpacing: '-0.012em', marginBottom: 8 }}>
            Nog geen data
          </p>
          <p style={{ color: 'rgba(253,253,254,0.62)', fontSize: 14, maxWidth: 260, margin: '0 auto' }}>
            Start je eerste workout en je voortgang verschijnt hier.
          </p>
        </div>
      </div>
    )
  }

  const { headline, body, strength } = data

  // Determine the hero number: most motivating metric
  const getHeroNumber = () => {
    if (headline.streak >= 3) {
      return { value: headline.streak, suffix: '', label: 'dagen streak' }
    }
    if (body.weightChange !== null && Math.abs(body.weightChange) >= 0.5) {
      return {
        value: Math.abs(body.weightChange),
        suffix: ' kg',
        prefix: body.weightChange < 0 ? '-' : '+',
        label: body.weightChange < 0 ? 'afgevallen' : 'aangekomen',
      }
    }
    if (headline.totalWorkouts > 0) {
      return { value: headline.totalWorkouts, suffix: '', label: 'workouts voltooid' }
    }
    return { value: headline.daysOnProgram, suffix: '', label: 'dagen actief' }
  }

  const hero = getHeroNumber()

  // Supporting stats text
  const supportingParts: string[] = []
  if (headline.daysOnProgram > 0) supportingParts.push(`${headline.daysOnProgram} dagen actief`)
  if (headline.totalWorkouts > 0 && hero.label !== 'workouts voltooid') {
    supportingParts.push(`${headline.totalWorkouts} workouts`)
  }
  if (headline.totalPrs > 0) supportingParts.push(`${headline.totalPrs} records`)
  const supportingText = supportingParts.join(' · ')

  // Chart data
  const chartData = weeklyStats.map(w => {
    if (chartMode === 'duration') return w.duration
    if (chartMode === 'volume') return Math.round(w.volume / 1000)
    return w.sets
  })
  const maxVal = Math.max(...chartData, 1)
  const chartLabel = chartMode === 'duration' ? 'min' : chartMode === 'volume' ? 'ton' : 'sets'
  const thisWeekVal = chartData.length > 0 ? chartData[chartData.length - 1] : 0

  const weightPositive = body.weightChange !== null && body.weightChange <= 0
  const weightColor = weightPositive ? '#2FA65A' : 'rgba(253,253,254,0.78)'

  const tabs: Array<{ id: ProgressTab; label: string }> = [
    { id: 'kracht', label: 'Kracht' },
    { id: 'lichaam', label: 'Lichaam' },
    { id: 'checkins', label: 'Check-ins' },
  ]

  return (
    <div className="pb-28">

      {/* ═══ HERO — v6-card licht met grote number ═════════════════ */}
      <div
        className="v6-card mb-4 animate-fade-in"
        style={{ paddingBottom: 24 }}
      >
        <p
          className="text-label"
          style={{ marginBottom: 16, color: '#FDFDFE', opacity: 0.62 }}
        >
          Voortgang
        </p>
        <p className="stat-number-hero animate-count-up" style={{ lineHeight: 0.95 }}>
          <AnimatedNumber
            value={hero.value}
            prefix={'prefix' in hero ? hero.prefix : ''}
            suffix={hero.suffix}
          />
        </p>
        <p style={{ fontSize: 15, color: 'rgba(253,253,254,0.78)', marginTop: 10, fontWeight: 400 }}>
          {hero.label}
        </p>
        {supportingText && (
          <p style={{ fontSize: 12, color: 'rgba(253,253,254,0.52)', marginTop: 14, letterSpacing: 0.01 }}>
            {supportingText}
          </p>
        )}
      </div>

      {/* ═══ TAB SELECTOR ══════════════════════════════════════════ */}
      <div
        className="flex gap-1 mb-4 animate-slide-up stagger-1"
        style={{
          padding: 4,
          background: 'rgba(253,253,254,0.06)',
          borderRadius: 14,
        }}
      >
        {tabs.map(t => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="transition-all"
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: '0.04em',
                background: active ? '#FDFDFE' : 'transparent',
                color: active ? '#1A1917' : 'rgba(253,253,254,0.62)',
                border: 'none',
                WebkitTapHighlightColor: 'transparent',
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ═══ KRACHT TAB ════════════════════════════════════════════ */}
      {tab === 'kracht' && (
        <>
          {/* 12 week chart */}
          {weeklyStats.length > 0 && (
            <div className="v6-card-dark mb-4 animate-slide-up stagger-2">
              <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
                <p className="text-label" style={{ color: 'rgba(253,253,254,0.44)' }}>
                  12 weken trend
                </p>
                <span style={{ fontSize: 11, color: 'rgba(253,253,254,0.44)', letterSpacing: '0.02em' }}>
                  {chartMode === 'duration' ? 'Duur' : chartMode === 'volume' ? 'Volume' : 'Sets'}
                </span>
              </div>

              <div className="flex items-baseline justify-between" style={{ marginBottom: 18 }}>
                <div>
                  <span
                    className="stat-number"
                    style={{ fontSize: 40, fontWeight: 200, color: '#FDFDFE' }}
                  >
                    {thisWeekVal}
                  </span>
                  <span style={{ fontSize: 13, color: 'rgba(253,253,254,0.52)', marginLeft: 8 }}>
                    {chartLabel} deze week
                  </span>
                </div>
              </div>

              {/* Bars */}
              <div className="flex items-end gap-[3px]" style={{ height: 90, marginBottom: 10 }}>
                {chartData.map((val, i) => {
                  const isCurrentWeek = i === chartData.length - 1
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                      <div
                        className="w-full rounded-t-md transition-all"
                        style={{
                          height: `${Math.max((val / maxVal) * 100, 3)}%`,
                          background: isCurrentWeek ? '#C0FC01' : 'rgba(253,253,254,0.22)',
                          transition: 'height 480ms cubic-bezier(0.16, 1, 0.3, 1), background 240ms',
                        }}
                      />
                    </div>
                  )
                })}
              </div>

              {/* Week labels */}
              <div className="flex gap-[3px]" style={{ marginBottom: 18 }}>
                {weeklyStats.map((w, i) => (
                  <div key={i} className="flex-1 text-center">
                    {i % 4 === 0 && (
                      <span style={{ fontSize: 9, color: 'rgba(253,253,254,0.38)', letterSpacing: '0.02em' }}>
                        {w.week}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Mode tabs */}
              <div className="flex gap-1">
                {(['duration', 'volume', 'sets'] as ChartMode[]).map(mode => {
                  const active = chartMode === mode
                  return (
                    <button
                      key={mode}
                      onClick={() => setChartMode(mode)}
                      className="transition-all"
                      style={{
                        flex: 1,
                        padding: '9px 12px',
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 500,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        background: active ? '#FDFDFE' : 'rgba(253,253,254,0.06)',
                        color: active ? '#1A1917' : 'rgba(253,253,254,0.62)',
                        border: 'none',
                        WebkitTapHighlightColor: 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      {mode === 'duration' ? 'Duur' : mode === 'volume' ? 'Volume' : 'Sets'}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Top Lifts — licht card */}
          {topLifts.length > 0 && (
            <div className="v6-card mb-4 animate-slide-up stagger-3">
              <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                <p className="text-label" style={{ color: 'rgba(253,253,254,0.62)' }}>
                  Top Lifts
                </p>
                <span style={{ fontSize: 11, color: 'rgba(253,253,254,0.44)', letterSpacing: '0.02em' }}>
                  Laatste 12 weken
                </span>
              </div>
              {topLifts.map((lift, i, arr) => (
                <div
                  key={`${lift.exercise}-${i}`}
                  className="flex items-center justify-between"
                  style={{
                    padding: '14px 0',
                    borderBottom: i < arr.length - 1 ? '1px solid rgba(253,253,254,0.10)' : 'none',
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#FDFDFE', margin: 0 }} className="truncate">
                      {lift.exercise}
                    </p>
                    <p style={{ fontSize: 11, color: 'rgba(253,253,254,0.44)', marginTop: 2 }}>
                      {lift.reps} reps · {new Date(lift.date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <span style={{ fontSize: 18, fontWeight: 300, color: '#FDFDFE', fontFeatureSettings: '"tnum"', letterSpacing: '-0.02em' }}>
                    {lift.weight}
                    <span style={{ fontSize: 12, color: 'rgba(253,253,254,0.44)', marginLeft: 4, fontWeight: 400 }}>
                      kg
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Records */}
          {strength.recentPrs.length > 0 && (
            <div className="v6-card mb-4 animate-slide-up stagger-4">
              <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                <p className="text-label" style={{ color: 'rgba(253,253,254,0.62)' }}>
                  Recente records
                </p>
                {strength.totalPrs > 3 && (
                  <Link
                    href="/client/stats"
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: '#C0FC01',
                      textDecoration: 'none',
                      letterSpacing: '0.02em',
                    }}
                  >
                    Alles bekijken
                  </Link>
                )}
              </div>
              {strength.recentPrs.slice(0, 3).map((pr, i, arr) => (
                <div
                  key={pr.id}
                  className="flex items-center justify-between"
                  style={{
                    padding: '14px 0',
                    borderBottom: i < arr.length - 1 ? '1px solid rgba(253,253,254,0.10)' : 'none',
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#FDFDFE', margin: 0 }} className="truncate">
                      {pr.exercise}
                    </p>
                    <p style={{ fontSize: 11, color: 'rgba(253,253,254,0.44)', marginTop: 2 }}>
                      {new Date(pr.date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <span style={{ fontSize: 18, fontWeight: 300, color: '#FDFDFE', fontFeatureSettings: '"tnum"', letterSpacing: '-0.02em' }}>
                    {pr.value}
                    <span style={{ fontSize: 12, color: 'rgba(253,253,254,0.44)', marginLeft: 4, fontWeight: 400 }}>
                      {pr.type === 'weight' ? 'kg' : pr.type === 'reps' ? 'reps' : 'kg'}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {topLifts.length === 0 && strength.recentPrs.length === 0 && weeklyStats.every(w => w.sets === 0) && (
            <div className="v6-card-dark text-center animate-fade-in" style={{ padding: '48px 22px' }}>
              <p style={{ color: '#FDFDFE', fontSize: 16, fontWeight: 400, marginBottom: 6 }}>
                Nog geen trainingen
              </p>
              <p style={{ color: 'rgba(253,253,254,0.62)', fontSize: 13, maxWidth: 240, margin: '0 auto' }}>
                Start je eerste workout om hier je kracht progressie te zien.
              </p>
            </div>
          )}
        </>
      )}

      {/* ═══ LICHAAM TAB ═══════════════════════════════════════════ */}
      {tab === 'lichaam' && (
        <>
          {/* Weight card */}
          {body.weightData.length >= 2 && (
            <Link
              href="/client/measurements"
              className="v6-card block mb-4 animate-slide-up stagger-2"
              style={{ textDecoration: 'none' }}
            >
              <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
                <p className="text-label" style={{ color: 'rgba(253,253,254,0.62)' }}>
                  Gewicht
                </p>
                <div
                  style={{
                    width: 32, height: 32,
                    borderRadius: '50%',
                    background: 'rgba(253,253,254,0.14)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FDFDFE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <p style={{ lineHeight: 1, margin: 0 }}>
                    <span
                      className="stat-number"
                      style={{ fontSize: 42, fontWeight: 200, color: '#FDFDFE' }}
                    >
                      {body.weightCurrent}
                    </span>
                    <span style={{ fontSize: 14, color: 'rgba(253,253,254,0.62)', marginLeft: 4, fontWeight: 400 }}>
                      kg
                    </span>
                  </p>
                  {body.weightChange !== null && (
                    <p
                      style={{
                        fontSize: 13,
                        marginTop: 10,
                        fontWeight: 500,
                        color: weightColor,
                      }}
                    >
                      {body.weightChange > 0 ? '+' : ''}{body.weightChange} kg
                      <span style={{ fontWeight: 400, color: 'rgba(253,253,254,0.44)', marginLeft: 6 }}>
                        totaal
                      </span>
                    </p>
                  )}
                </div>
                <Sparkline
                  data={body.weightData.map(w => w.weight)}
                  color={weightColor}
                />
              </div>
            </Link>
          )}

          {/* Body fat card */}
          {body.bodyFatData.length >= 2 && (
            <div className="v6-card-dark mb-4 animate-slide-up stagger-3">
              <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
                <p className="text-label" style={{ color: 'rgba(253,253,254,0.44)' }}>
                  Vetpercentage
                </p>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p style={{ lineHeight: 1, margin: 0 }}>
                    <span
                      className="stat-number"
                      style={{ fontSize: 42, fontWeight: 200, color: '#FDFDFE' }}
                    >
                      {body.bodyFatData[body.bodyFatData.length - 1].value}
                    </span>
                    <span style={{ fontSize: 14, color: 'rgba(253,253,254,0.62)', marginLeft: 4, fontWeight: 400 }}>
                      %
                    </span>
                  </p>
                  {(() => {
                    const start = body.bodyFatData[0].value
                    const current = body.bodyFatData[body.bodyFatData.length - 1].value
                    const change = +(current - start).toFixed(1)
                    const positive = change <= 0
                    return (
                      <p
                        style={{
                          fontSize: 13,
                          marginTop: 10,
                          fontWeight: 500,
                          color: positive ? '#2FA65A' : 'rgba(253,253,254,0.78)',
                        }}
                      >
                        {change > 0 ? '+' : ''}{change}%
                        <span style={{ fontWeight: 400, color: 'rgba(253,253,254,0.44)', marginLeft: 6 }}>
                          totaal
                        </span>
                      </p>
                    )
                  })()}
                </div>
                <Sparkline
                  data={body.bodyFatData.map(w => w.value)}
                  color="#C0FC01"
                />
              </div>
            </div>
          )}

          {/* Photo comparison */}
          {body.hasPhotos && (
            <div className="v6-card-dark mb-4 animate-slide-up stagger-4">
              <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
                <p className="text-label" style={{ color: 'rgba(253,253,254,0.62)' }}>
                  Foto&rsquo;s
                </p>
              </div>
              <PhotoComparison />
              <Link
                href="/client/progress/photos"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  marginTop: 14,
                  padding: '14px 0',
                  borderRadius: 14,
                  background: '#FDFDFE',
                  color: '#1A1917',
                  fontSize: 13,
                  fontWeight: 500,
                  textDecoration: 'none',
                  letterSpacing: '0.02em',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Alle foto&rsquo;s bekijken
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1A1917" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </div>
          )}

          {/* Empty state */}
          {body.weightData.length < 2 && body.bodyFatData.length < 2 && !body.hasPhotos && (
            <div className="v6-card-dark text-center animate-fade-in" style={{ padding: '48px 22px' }}>
              <p style={{ color: '#FDFDFE', fontSize: 16, fontWeight: 400, marginBottom: 6 }}>
                Nog geen metingen
              </p>
              <p style={{ color: 'rgba(253,253,254,0.62)', fontSize: 13, maxWidth: 260, margin: '0 auto 18px' }}>
                Voer je eerste check-in in om je lichaam evolutie te zien.
              </p>
              <Link
                href="/client/check-in"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 20px',
                  borderRadius: 14,
                  background: '#C0FC01',
                  color: '#1A1917',
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: 'none',
                  letterSpacing: '0.02em',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Start check-in
              </Link>
            </div>
          )}
        </>
      )}

      {/* ═══ CHECK-INS TAB ═════════════════════════════════════════ */}
      {tab === 'checkins' && (
        <>
          {/* New check-in CTA */}
          <Link
            href="/client/check-in"
            className="v6-card block mb-4 animate-slide-up stagger-2"
            style={{ textDecoration: 'none' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-label" style={{ marginBottom: 6, color: 'rgba(253,253,254,0.62)' }}>
                  Maandelijkse check-in
                </p>
                <p style={{ fontSize: 16, fontWeight: 500, color: '#FDFDFE', margin: 0 }}>
                  Nieuwe check-in starten
                </p>
                <p style={{ fontSize: 12, color: 'rgba(253,253,254,0.52)', marginTop: 4 }}>
                  Foto&rsquo;s, metingen en meer
                </p>
              </div>
              <div
                style={{
                  width: 44, height: 44,
                  borderRadius: '50%',
                  background: '#C0FC01',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1A1917" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Check-in history */}
          {checkInRows.length > 0 ? (
            <div className="v6-card-dark mb-4 animate-slide-up stagger-3">
              <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                <p className="text-label" style={{ color: 'rgba(253,253,254,0.44)' }}>
                  Geschiedenis
                </p>
                <span style={{ fontSize: 11, color: 'rgba(253,253,254,0.44)', letterSpacing: '0.02em' }}>
                  {checkInRows.length} {checkInRows.length === 1 ? 'check-in' : 'check-ins'}
                </span>
              </div>
              {checkInRows.map((ci, i, arr) => {
                const hasPhoto = !!(ci.photo_front_url || ci.photo_back_url)
                const dateStr = new Date(ci.date).toLocaleDateString('nl-BE', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
                return (
                  <div
                    key={ci.id}
                    className="flex items-center gap-3"
                    style={{
                      padding: '14px 0',
                      borderBottom: i < arr.length - 1 ? '1px solid rgba(253,253,254,0.08)' : 'none',
                    }}
                  >
                    {/* Thumbnail or placeholder */}
                    <div
                      style={{
                        width: 44, height: 44,
                        borderRadius: 12,
                        background: hasPhoto && ci.photo_front_url
                          ? `center / cover url(${ci.photo_front_url})`
                          : 'rgba(253,253,254,0.08)',
                        flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {!hasPhoto && (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(253,253,254,0.32)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                          <circle cx="12" cy="13" r="4" />
                        </svg>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 14, fontWeight: 500, color: '#FDFDFE', margin: 0 }}>
                        {dateStr}
                      </p>
                      <p style={{ fontSize: 11, color: 'rgba(253,253,254,0.52)', marginTop: 2 }}>
                        {ci.weight_kg ? `${ci.weight_kg} kg` : '—'}
                        {ci.body_fat_pct ? ` · ${ci.body_fat_pct}% vet` : ''}
                        {hasPhoto ? ' · foto' : ''}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="v6-card-dark text-center animate-fade-in" style={{ padding: '48px 22px' }}>
              <p style={{ color: '#FDFDFE', fontSize: 16, fontWeight: 400, marginBottom: 6 }}>
                Nog geen check-ins
              </p>
              <p style={{ color: 'rgba(253,253,254,0.62)', fontSize: 13, maxWidth: 260, margin: '0 auto' }}>
                Je eerste check-in toont je startpunt en voortgang.
              </p>
            </div>
          )}
        </>
      )}

    </div>
  )
}
