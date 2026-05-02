'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

// ─── Types ──────────────────────────────────────────────────

interface WeekDay {
  date: string
  dayLabel: string
  trained: boolean
  isToday: boolean
  isFuture: boolean
  kcalPct: number | null
  withinBudget: boolean | null
}

interface Measurement {
  key: string
  label: string
  current: number | null
  delta: number | null
}

interface PhotoEntry {
  date: string
  frontUrl: string | null
  backUrl: string | null
}

interface MonthlyCheckIn {
  id: string
  date: string
  weightKg: number | null
  weightDelta: number | null
  waistCm: number | null
  waistDelta: number | null
  bodyFatPct: number | null
  photoFrontUrl: string | null
  photoBackUrl: string | null
  coachNotes: string | null
  workoutsInMonth: number
}

interface WeeklyCheckInHist {
  id: string
  date: string
  weightKg: number | null
  energyLevel: number | null
  sleepQuality: number | null
  nutritionAdherence: number | null
  notes: string | null
}

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
    bodyFatCurrent: number | null
    heightCm: number | null
    leanMassCurrent: number | null
    measurements: Measurement[]
    photos: PhotoEntry[]
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
  week: {
    target: number
    done: number
    days: WeekDay[]
    kcalTarget: number | null
    adherence: number | null
  }
  weeklyCheckIn: {
    pending: boolean
    weekStart: string
  }
  checkIns: {
    monthly: MonthlyCheckIn[]
    weekly: WeeklyCheckInHist[]
  }
  coach: { id: string; name: string } | null
  summary: {
    weekStreak: number
    totalWorkouts: number
    totalPrs: number
    adherence: number | null
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

interface MomentumLift {
  exercise: string
  exerciseId: string
  bodyPart: string
  weekly: number[]  // 8 weeks e1RM
  current: number
  delta: number
}

// Full per-exercise aggregation for the Kracht list
interface ExerciseAgg {
  exerciseId: string
  name: string
  bodyPart: string       // normalised group (Borst/Rug/Benen/Schouders/Armen/Core)
  rawBodyPart: string    // original db value
  count: number
  lastDate: string
  weekly: number[]       // 12-week e1RM
  current: number
  delta: number          // vs. 12w start
  valueKind: 'e1RM' | 'reps'
}

type ChartMode = 'duration' | 'volume' | 'sets'
type ProgressTab = 'overzicht' | 'kracht' | 'lichaam' | 'checkins'
type WeightRange = '1M' | '3M' | '6M' | '1J'
type MuscleFilter = 'Alle' | 'Borst' | 'Rug' | 'Benen' | 'Schouders' | 'Armen' | 'Core'

// ─── Utils ──────────────────────────────────────────────────

// Epley e1RM — capped at 12 reps for sane values
function e1RM(weight: number, reps: number): number {
  if (!weight || !reps || reps <= 0) return 0
  const r = Math.min(reps, 12)
  return weight * (1 + r / 30)
}

function weekKey(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const dow = d.getDay() // 0=Sun
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
  return d.toISOString().slice(0, 10)
}

// Normalise DB body_part → Dutch muscle-group label used in chips
function normaliseBodyPart(raw: string | null | undefined): MuscleFilter | 'Overig' {
  if (!raw) return 'Overig'
  const s = raw.toLowerCase()
  if (s.includes('chest') || s.includes('borst') || s.includes('pectoral')) return 'Borst'
  if (s.includes('back') || s.includes('rug') || s.includes('lat')) return 'Rug'
  if (s.includes('leg') || s.includes('ben') || s.includes('quad') || s.includes('ham') || s.includes('glut') || s.includes('calf') || s.includes('kuit') || s.includes('hip')) return 'Benen'
  if (s.includes('shoulder') || s.includes('schou') || s.includes('delt')) return 'Schouders'
  if (s.includes('arm') || s.includes('bicep') || s.includes('tricep') || s.includes('forearm')) return 'Armen'
  if (s.includes('core') || s.includes('waist') || s.includes('abs') || s.includes('abdom')) return 'Core'
  return 'Overig'
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-BE', { day: '2-digit', month: 'short' })
}

function formatMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-BE', { month: 'long', year: 'numeric' })
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function weekdayNl(date: Date): string {
  return ['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag'][date.getDay()]
}

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

// Minimal momentum sparkline used inside a row (120×22)
function MomentumSpark({ data, opacity = 0.92 }: { data: number[]; opacity?: number }) {
  if (data.length < 2) return <svg style={{ width: '100%', height: 22 }} />
  const w = 120, h = 22
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const lastX = w
  const lastY = h - ((data[data.length - 1] - min) / range) * (h - 4) - 2

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 22 }}>
      <polyline
        points={pts}
        fill="none"
        stroke="#FDFDFE"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={opacity}
      />
      <circle cx={lastX} cy={lastY} r="2.2" fill="#FDFDFE" opacity={opacity} />
    </svg>
  )
}

// Check-in stat row (used inside monthly dark card)
function CheckInStatRow({ label, value, unit, delta, first }: {
  label: string; value: string; unit: string; delta: string | null; first?: boolean
}) {
  return (
    <div
      className="flex justify-between items-baseline"
      style={{
        padding: first ? '0 0 6px' : '6px 0',
        borderTop: first ? 'none' : '1px solid rgba(253,253,254,0.06)',
        fontFeatureSettings: '"tnum"',
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 400,
          color: 'var(--card-text-muted)',
          letterSpacing: '0.005em',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 400,
          color: 'var(--card-text)',
          letterSpacing: '-0.005em',
        }}
      >
        {value}
        {(unit || delta) && (
          <small style={{ fontSize: 10, color: 'var(--card-text-muted)', marginLeft: 2, letterSpacing: 0 }}>
            {unit}
            {delta && unit ? ' · ' : ''}
            {delta}
          </small>
        )}
      </span>
    </div>
  )
}

// Body-summary 3-col cell (BF% / Lean mass / Lengte)
function BodySummaryCell({ value, unit, label }: { value: string; unit: string; label: string }) {
  return (
    <div style={{ padding: '0 2px' }}>
      <div
        style={{
          fontSize: 18,
          fontWeight: 300,
          letterSpacing: '-0.015em',
          color: 'var(--card-text)',
          fontFeatureSettings: '"tnum"',
          lineHeight: 1.1,
        }}
      >
        {value}
        {unit && (
          <small style={{ fontSize: 10, color: 'var(--card-text-muted)', marginLeft: 2, letterSpacing: 0 }}>
            {unit}
          </small>
        )}
      </div>
      <div
        style={{
          fontSize: 9,
          fontWeight: 500,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--card-text-muted)',
          marginTop: 3,
        }}
      >
        {label}
      </div>
    </div>
  )
}

// Weight area chart — dark card, hairline grid, gradient fill
function WeightAreaChart({ data }: { data: Array<{ date: string; weight: number }> }) {
  if (data.length < 2) return <svg style={{ width: '100%', height: 100 }} />
  const w = 300, h = 100
  const weights = data.map(d => d.weight)
  const max = Math.max(...weights)
  const min = Math.min(...weights)
  const range = max - min || 1
  const pad = 10
  const innerH = h - pad * 2
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w
    const y = pad + innerH - ((d.weight - min) / range) * innerH
    return { x, y }
  })
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L ${w} ${h} L 0 ${h} Z`
  const last = points[points.length - 1]
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 100, marginTop: 4 }}>
      <defs>
        <linearGradient id="wc-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FDFDFE" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#FDFDFE" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" y1="25" x2={w} y2="25" stroke="rgba(253,253,254,0.06)" strokeDasharray="2 4" />
      <line x1="0" y1="50" x2={w} y2="50" stroke="rgba(253,253,254,0.06)" strokeDasharray="2 4" />
      <line x1="0" y1="75" x2={w} y2="75" stroke="rgba(253,253,254,0.06)" strokeDasharray="2 4" />
      <path d={areaPath} fill="url(#wc-grad)" />
      <path d={linePath} fill="none" stroke="#FDFDFE" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.92" />
      <circle cx={last.x} cy={last.y} r="2.8" fill="#FDFDFE" />
    </svg>
  )
}

// Month labels under the chart, evenly spaced from first to last date
function monthAxisLabels(data: Array<{ date: string }>, max: number): string[] {
  if (data.length < 2) return []
  const first = new Date(data[0].date).getTime()
  const last = new Date(data[data.length - 1].date).getTime()
  const span = last - first
  if (span <= 0) return []
  const count = Math.min(max, Math.max(2, Math.round(span / (30 * 86400000))))
  const labels: string[] = []
  for (let i = 0; i < count; i++) {
    const t = first + (span * i) / (count - 1)
    labels.push(new Date(t).toLocaleDateString('nl-BE', { month: 'short' }).replace('.', ''))
  }
  return labels
}

// Lift card 12-week mini spark (140×26, end-dot)
function LiftSpark({ data, positive = true }: { data: number[]; positive?: boolean }) {
  if (data.length < 2) return <svg style={{ width: '100%', height: 26 }} />
  const w = 140, h = 26
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const lastX = w
  const lastY = h - ((data[data.length - 1] - min) / range) * (h - 4) - 2
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 26 }}>
      <polyline
        points={pts}
        fill="none"
        stroke="#FDFDFE"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={positive ? 0.92 : 0.72}
      />
      <circle cx={lastX} cy={lastY} r="2.2" fill="#FDFDFE" opacity={positive ? 1 : 0.85} />
    </svg>
  )
}

// Exercise-list row spark (100×22)
function ExSpark({ data, positive = true }: { data: number[]; positive?: boolean }) {
  if (data.length < 2) return <svg style={{ width: '100%', height: 22 }} />
  const w = 100, h = 22
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const lastX = w
  const lastY = h - ((data[data.length - 1] - min) / range) * (h - 4) - 2
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 22 }}>
      <polyline
        points={pts}
        fill="none"
        stroke="#FDFDFE"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity={positive ? 0.82 : 0.62}
      />
      <circle cx={lastX} cy={lastY} r="1.8" fill="#FDFDFE" opacity={positive ? 1 : 0.85} />
    </svg>
  )
}

// ─── Main Component ─────────────────────────────────────────

export default function ProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null)
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([])
  const [topLifts, setTopLifts] = useState<TopLift[]>([])
  const [momentum, setMomentum] = useState<MomentumLift[]>([])
  const [exerciseAgg, setExerciseAgg] = useState<ExerciseAgg[]>([])
  const [chartMode, setChartMode] = useState<ChartMode>('duration')
  const [tab, setTab] = useState<ProgressTab>('overzicht')
  const [weightRange, setWeightRange] = useState<WeightRange>('3M')
  const [search, setSearch] = useState('')
  const [muscleFilter, setMuscleFilter] = useState<MuscleFilter>('Alle')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/progress')
        if (res.ok) setData(await res.json())

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Sessions of last 12 weeks (for chart/top-lifts) + 8 weeks (for momentum)
        const twelveWeeksAgo = new Date()
        twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 12 * 7)

        const { data: sessions } = await supabase
          .from('workout_sessions')
          .select('id, started_at, completed_at, duration_seconds, workout_sets(exercise_id, weight_kg, actual_reps, is_warmup, exercises(name, name_nl, body_part))')
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

          // Top lifts: max weight per exercise_id
          const lifts: Record<string, TopLift> = {}

          // Per-exercise aggregation: name, body-part, count, last date, weekly e1RM (12w)
          interface Agg {
            name: string
            bodyPart: string
            count: number
            lastDate: string
            weekly: Record<string, number>
          }
          const agg: Record<string, Agg> = {}

          // Build 12-week keys (oldest → newest)
          const twelveWeekKeys: string[] = []
          for (let i = 11; i >= 0; i--) {
            const d = new Date(now)
            d.setDate(d.getDate() - i * 7)
            twelveWeekKeys.push(weekKey(d))
          }

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

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            for (const set of sets as any[]) {
              if (set.is_warmup) continue
              if (!set.weight_kg || set.weight_kg <= 0) continue
              if (!set.actual_reps || set.actual_reps <= 0) continue
              const exId = set.exercise_id as string
              const ex = Array.isArray(set.exercises) ? set.exercises[0] : set.exercises
              const exName = ex?.name_nl || ex?.name || 'Oefening'
              const bodyPart = ex?.body_part || ''

              // Top lifts
              const existing = lifts[exId]
              if (!existing || (set.weight_kg as number) > existing.weight) {
                lifts[exId] = {
                  exercise: exName,
                  weight: set.weight_kg,
                  reps: set.actual_reps,
                  date: s.started_at,
                }
              }

              // Per-exercise aggregation (full 12w window)
              if (!agg[exId]) {
                agg[exId] = { name: exName, bodyPart, count: 0, lastDate: s.started_at, weekly: {} }
              }
              agg[exId].count++
              if (new Date(s.started_at) > new Date(agg[exId].lastDate)) {
                agg[exId].lastDate = s.started_at
              }
              const wk = weekKey(date)
              const est = e1RM(set.weight_kg, set.actual_reps)
              if (!agg[exId].weekly[wk] || est > agg[exId].weekly[wk]) {
                agg[exId].weekly[wk] = est
              }
            }
          }

          setWeeklyStats(Object.values(weeks))
          setTopLifts(
            Object.values(lifts)
              .sort((a, b) => b.weight - a.weight)
              .slice(0, 6)
          )

          // Build full exercise list with weekly-filled e1RM series
          const allAgg: ExerciseAgg[] = Object.entries(agg).map(([exerciseId, a]) => {
            let last = 0
            const weekly = twelveWeekKeys.map((k) => {
              if (a.weekly[k]) last = a.weekly[k]
              return last
            })
            const firstNonZero = weekly.find((v) => v > 0) || 0
            const current = weekly[weekly.length - 1] || 0
            const normalisedGroup = normaliseBodyPart(a.bodyPart)
            return {
              exerciseId,
              name: a.name,
              bodyPart: normalisedGroup === 'Overig' ? 'Overig' : normalisedGroup,
              rawBodyPart: a.bodyPart,
              count: a.count,
              lastDate: a.lastDate,
              weekly,
              current: Math.round(current),
              delta: Math.round(current - firstNonZero),
              valueKind: 'e1RM' as const,
            }
          }).filter((m) => m.current > 0)

          setExerciseAgg(allAgg)

          // Top 4 by frequency — for the Compounds grid and Overzicht momentum
          const topMomentum: MomentumLift[] = [...allAgg]
            .sort((a, b) => b.count - a.count)
            .slice(0, 4)
            .map((m) => ({
              exercise: m.name,
              exerciseId: m.exerciseId,
              bodyPart: m.bodyPart,
              weekly: m.weekly.slice(-8), // keep 8-week mini-spark for Overzicht
              current: m.current,
              delta: m.delta,
            }))
          setMomentum(topMomentum)
        }
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
        <div className="flex gap-1.5 mb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-1 h-9 rounded-full" style={{ background: 'var(--card-bg-subtle)' }} />
          ))}
        </div>
        <div
          className="rounded-[24px] mb-4 animate-pulse"
          style={{
            padding: '22px 22px 24px',
            background: 'transparent',
          }}
        >
          <div className="space-y-3">
            <div className="h-3 w-24 rounded-full" style={{ background: 'var(--card-bg-tint)' }} />
            <div className="h-14 w-40 rounded-lg" style={{ background: 'rgba(253,253,254,0.22)' }} />
            <div className="h-3 w-48 rounded-full" style={{ background: 'var(--card-bg-tint)' }} />
          </div>
        </div>
        <div className="rounded-[24px] mb-2 animate-pulse dark-surface" style={{ height: 64, background: '#474B48' }} />
        <div className="rounded-[24px] mb-2 animate-pulse" style={{ height: 84, background: 'rgba(255,255,255,0.50)' }} />
        <div className="rounded-[24px] mb-2 animate-pulse dark-surface" style={{ height: 200, background: '#474B48' }} />
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
            background: 'rgba(255,255,255,0.50)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.10)',
            textAlign: 'center',
          }}
        >
          <p style={{ color: 'var(--card-text)', fontSize: 18, fontWeight: 300, letterSpacing: '-0.012em', marginBottom: 8 }}>
            Nog geen data
          </p>
          <p style={{ color: 'var(--card-text-muted)', fontSize: 14, maxWidth: 260, margin: '0 auto' }}>
            Start je eerste workout en je voortgang verschijnt hier.
          </p>
        </div>
      </div>
    )
  }

  const { body, strength, week, weeklyCheckIn, coach, summary, checkIns } = data

  const tabs: Array<{ id: ProgressTab; label: string }> = [
    { id: 'overzicht', label: 'Overzicht' },
    { id: 'kracht', label: 'Kracht' },
    { id: 'lichaam', label: 'Lichaam' },
    { id: 'checkins', label: 'Check-ins' },
  ]

  // ─── Derived memos (Kracht + Lichaam) ─────────────────

  const mainLifts = exerciseAgg.length
    ? [...exerciseAgg].sort((a, b) => b.count - a.count).slice(0, 4)
    : []

  const filteredExercises = exerciseAgg
    .filter(e => muscleFilter === 'Alle' || e.bodyPart === muscleFilter)
    .filter(e => !search.trim() || e.name.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => b.count - a.count)

  // Filter weight data by range (1M/3M/6M/1J)
  const filteredWeightData = (() => {
    if (!body.weightData.length) return [] as typeof body.weightData
    const days = weightRange === '1M' ? 30 : weightRange === '3M' ? 90 : weightRange === '6M' ? 180 : 365
    const cutoff = Date.now() - days * 86400000
    const filt = body.weightData.filter(w => new Date(w.date).getTime() >= cutoff)
    return filt.length >= 2 ? filt : body.weightData
  })()

  // ─── Overzicht helpers ────────────────────────────────

  const weekNumber = (() => {
    const d = new Date()
    const start = new Date(d.getFullYear(), 0, 1)
    const diff = (d.getTime() - start.getTime()) / 86400000
    return Math.ceil((diff + start.getDay() + 1) / 7)
  })()

  const remaining = Math.max(0, week.target - week.done)
  const latestPr = strength.recentPrs[0]

  // Chart data (Kracht tab)
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

  // Caption label style (reused a lot)
  const capStyle: React.CSSProperties = {
    padding: '14px 4px 8px',
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: 'var(--card-text-muted)',
  }

  return (
    <div className="pb-28">

      {/* ═══ SUBTABS — pill chips, horizontal scroll ═══════════════ */}
      <div
        className="flex gap-1.5 mb-4 animate-slide-up overflow-x-auto"
        style={{
          scrollbarWidth: 'none',
          paddingBottom: 2,
        }}
      >
        {tabs.map(t => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-shrink-0 transition-all"
              style={{
                padding: '8px 14px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: active ? 500 : 400,
                letterSpacing: '-0.005em',
                background: active ? '#FDFDFE' : 'transparent',
                color: active ? '#474B48' : 'rgba(253,253,254,0.78)',
                border: active ? '1px solid #FDFDFE' : '1px solid rgba(253,253,254,0.10)',
                WebkitTapHighlightColor: 'transparent',
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ═══ OVERZICHT TAB ═════════════════════════════════════════ */}
      {tab === 'overzicht' && (
        <>
          {/* ─── Week hero ─── */}
          <div className="mb-4 animate-slide-up stagger-2" style={{ padding: '4px 4px 0' }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--card-text-muted)',
                marginBottom: 10,
              }}
            >
              Week {weekNumber} · deze week
            </div>

            <div className="flex items-baseline" style={{ gap: 10 }}>
              <span
                style={{
                  fontSize: 52,
                  fontWeight: 200,
                  letterSpacing: '-0.035em',
                  color: 'var(--card-text)',
                  lineHeight: 0.95,
                  fontFeatureSettings: '"tnum"',
                }}
              >
                <AnimatedNumber value={week.done} />
              </span>
              <span style={{ fontSize: 15, fontWeight: 300, color: 'var(--card-text-muted)', letterSpacing: '-0.01em' }}>
                / {week.target} trainingen
              </span>
            </div>

            <p
              style={{
                marginTop: 10,
                fontSize: 13,
                fontWeight: 300,
                color: 'var(--card-text-soft)',
                letterSpacing: '-0.005em',
                lineHeight: 1.5,
              }}
            >
              {remaining === 0 ? (
                <>Je hebt je weekdoel gehaald. <strong style={{ color: 'var(--card-text)', fontWeight: 400 }}>Topprestatie.</strong></>
              ) : week.done === 0 ? (
                <>Nog <strong style={{ color: 'var(--card-text)', fontWeight: 400 }}>{week.target} sessies</strong> voor zondag.</>
              ) : (
                <>
                  Je ligt op koers — nog <strong style={{ color: 'var(--card-text)', fontWeight: 400 }}>
                    {remaining} {remaining === 1 ? 'sessie' : 'sessies'}
                  </strong> voor zondag.
                </>
              )}
            </p>

            {/* 7-dot week rhythm */}
            <div className="flex justify-between" style={{ marginTop: 18, gap: 4 }}>
              {week.days.map((d) => {
                const isDone = d.trained
                const isToday = d.isToday
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center" style={{ gap: 8 }}>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 500,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: isToday ? '#FDFDFE' : 'rgba(253,253,254,0.44)',
                      }}
                    >
                      {d.dayLabel}
                    </span>
                    <span
                      style={{
                        width: '100%',
                        height: 4,
                        borderRadius: 2,
                        background: isDone
                          ? 'rgba(253,253,254,0.85)'
                          : isToday
                            ? 'rgba(253,253,254,0.24)'
                            : 'rgba(253,253,254,0.10)',
                        transition: 'background 260ms cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* ─── Coach check-in banner ─── */}
          {weeklyCheckIn.pending && (
            <Link className="dark-surface flex items-center mb-3 animate-slide-up stagger-3"
              href="/client/weekly-check-in"
              
              style={{
                background: '#474B48',
                padding: '16px 18px',
                borderRadius: 20,
                gap: 14,
                textDecoration: 'none',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 6px rgba(0,0,0,0.18)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span
                style={{
                  width: 8, height: 8,
                  borderRadius: '50%',
                  background: '#C0FC01',
                  flexShrink: 0,
                  boxShadow: '0 0 12px rgba(192,252,1,0.50)',
                }}
              />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 400, color: 'var(--card-text)', letterSpacing: '-0.005em', margin: 0 }}>
                  Wekelijkse check-in staat klaar
                </p>
                <p style={{ fontSize: 11, color: 'var(--card-text-muted)', marginTop: 2 }}>
                  {coach?.name ? `${coach.name} wacht op je antwoord · 3 min` : 'Geeft je coach inzicht · 3 min'}
                </p>
              </div>
              <div
                style={{
                  width: 28, height: 28,
                  borderRadius: '50%',
                  background: 'var(--card-bg-tint)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FDFDFE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 6 15 12 9 18" />
                </svg>
              </div>
            </Link>
          )}

          {/* ─── Nieuwste PR ─── */}
          {latestPr && (
            <>
              <div style={capStyle}>Nieuwste PR</div>
              <div
                className="flex items-center mb-2 animate-slide-up stagger-3"
                style={{
                  background: 'rgba(255,255,255,0.50)',
                  padding: '18px 20px',
                  borderRadius: 24,
                  gap: 14,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.10)',
                }}
              >
                <div
                  style={{
                    width: 36, height: 36,
                    borderRadius: '50%',
                    background: 'var(--card-bg-tint)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FDFDFE" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 4h10v4a5 5 0 0 1-10 0z" />
                    <line x1="12" y1="12" x2="12" y2="17" />
                    <line x1="9" y1="20" x2="15" y2="20" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                      color: 'var(--card-text-muted)',
                      marginBottom: 3,
                    }}
                  >
                    {latestPr.exercise}
                  </div>
                  <div
                    style={{
                      fontSize: 19,
                      fontWeight: 300,
                      letterSpacing: '-0.015em',
                      color: 'var(--card-text)',
                      fontFeatureSettings: '"tnum"',
                    }}
                  >
                    {latestPr.value}
                    <small style={{ fontSize: 12, color: 'var(--card-text-muted)', marginLeft: 3, letterSpacing: 0 }}>
                      {latestPr.type === 'weight' ? 'kg' : latestPr.type === 'reps' ? 'reps' : 'kg'}
                    </small>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--card-text-muted)', marginTop: 2 }}>
                    {new Date(latestPr.date).toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'short' })}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ─── Kracht momentum ─── */}
          {momentum.length > 0 && (
            <>
              <div style={capStyle}>Kracht momentum · 8 weken</div>
              <div className="mb-2 animate-slide-up stagger-4 dark-surface"
                style={{
                  background: '#474B48',
                  padding: '18px 20px 20px',
                  borderRadius: 24,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 6px rgba(0,0,0,0.18)',
                }}
              >
                <div className="flex items-baseline justify-between" style={{ marginBottom: 14 }}>
                  <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--card-text)', letterSpacing: '-0.005em' }}>
                    Compounds e1RM
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--card-text-muted)' }}>
                    vs. 8 weken terug
                  </span>
                </div>

                {momentum.map((m, i) => (
                  <Link
                    key={m.exercise}
                    href={`/client/progress/exercise/${m.exerciseId}`}
                    className="flex items-center"
                    style={{
                      gap: 14,
                      padding: '10px 0',
                      borderTop: i > 0 ? '1px solid rgba(253,253,254,0.06)' : 'none',
                      textDecoration: 'none',
                      color: 'inherit',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 400,
                        color: 'var(--card-text-soft)',
                        letterSpacing: '-0.005em',
                        width: 78,
                        flexShrink: 0,
                      }}
                      className="truncate"
                    >
                      {m.exercise}
                    </div>
                    <div style={{ flex: 1, height: 22 }}>
                      <MomentumSpark data={m.weekly} opacity={m.delta > 0 ? 0.92 : 0.6} />
                    </div>
                    <div className="flex flex-col items-end" style={{ minWidth: 56 }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 400,
                          color: 'var(--card-text)',
                          fontFeatureSettings: '"tnum"',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {m.current}
                        <small style={{ fontSize: 10, color: 'var(--card-text-muted)', marginLeft: 2 }}>kg</small>
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 500,
                          letterSpacing: '0.04em',
                          marginTop: 1,
                          color: m.delta > 0 ? '#FDFDFE' : 'rgba(253,253,254,0.44)',
                        }}
                      >
                        {m.delta > 0 ? '+' : ''}{m.delta} kg
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}

          {/* ─── Dieet adherence ─── */}
          {week.kcalTarget && (
            <>
              <div style={capStyle}>Dieet adherence · deze week</div>
              <div
                className="mb-4 animate-slide-up stagger-5"
                style={{
                  background: 'rgba(255,255,255,0.50)',
                  padding: '18px 20px 20px',
                  borderRadius: 24,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.10)',
                }}
              >
                <div className="flex items-baseline justify-between" style={{ marginBottom: 16 }}>
                  <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--card-text)', letterSpacing: '-0.005em' }}>
                    Binnen kcal-budget
                  </span>
                  {week.adherence !== null ? (
                    <span
                      style={{
                        fontSize: 22,
                        fontWeight: 300,
                        letterSpacing: '-0.02em',
                        color: 'var(--card-text)',
                        fontFeatureSettings: '"tnum"',
                      }}
                    >
                      <AnimatedNumber value={week.adherence} />
                      <small style={{ fontSize: 10, color: 'var(--card-text-muted)', marginLeft: 2, letterSpacing: 0 }}>%</small>
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--card-text-muted)' }}>geen data</span>
                  )}
                </div>

                <div className="flex items-end justify-between" style={{ gap: 6, height: 48 }}>
                  {week.days.map((d) => {
                    const hasKcal = d.kcalPct !== null
                    const height = hasKcal ? Math.min(Math.max(d.kcalPct || 0, 8), 100) : 10
                    const skip = !hasKcal
                    return (
                      <div key={d.date} className="flex-1 flex flex-col justify-end">
                        <span
                          style={{
                            width: '100%',
                            background: skip ? 'rgba(253,253,254,0.14)' : '#FDFDFE',
                            opacity: skip ? 1 : d.withinBudget ? 0.9 : 0.5,
                            borderRadius: 2,
                            minHeight: 3,
                            height: `${height}%`,
                            transition: 'height 420ms cubic-bezier(0.16, 1, 0.3, 1)',
                          }}
                        />
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 500,
                            letterSpacing: '0.14em',
                            textTransform: 'uppercase',
                            color: d.isToday ? '#FDFDFE' : 'rgba(253,253,254,0.44)',
                            textAlign: 'center',
                            marginTop: 6,
                          }}
                        >
                          {d.dayLabel}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Streak row */}
                <div
                  className="flex justify-between items-center"
                  style={{
                    marginTop: 10,
                    padding: '16px 4px 0',
                    borderTop: '1px solid rgba(253,253,254,0.12)',
                  }}
                >
                  {[
                    { num: summary.weekStreak, lbl: 'Week streak' },
                    { num: summary.totalWorkouts, lbl: 'Workouts' },
                    { num: summary.totalPrs, lbl: 'Records' },
                    { num: summary.adherence !== null ? `${summary.adherence}%` : '—', lbl: 'Adherence' },
                  ].map((c) => (
                    <div key={c.lbl} className="flex flex-col" style={{ gap: 3 }}>
                      <span
                        style={{
                          fontSize: 18,
                          fontWeight: 300,
                          letterSpacing: '-0.015em',
                          color: 'var(--card-text)',
                          fontFeatureSettings: '"tnum"',
                        }}
                      >
                        {c.num}
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 500,
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                          color: 'var(--card-text-muted)',
                        }}
                      >
                        {c.lbl}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* If adherence not available, show a compact streak summary */}
          {!week.kcalTarget && (
            <div
              className="mb-4 animate-slide-up stagger-4"
              style={{
                background: 'rgba(255,255,255,0.50)',
                padding: '18px 20px',
                borderRadius: 24,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.10)',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              {[
                { num: summary.weekStreak, lbl: 'Week streak' },
                { num: summary.totalWorkouts, lbl: 'Workouts' },
                { num: summary.totalPrs, lbl: 'Records' },
              ].map((c) => (
                <div key={c.lbl} className="flex flex-col" style={{ gap: 3 }}>
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 300,
                      letterSpacing: '-0.015em',
                      color: 'var(--card-text)',
                      fontFeatureSettings: '"tnum"',
                    }}
                  >
                    {c.num}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 500,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'var(--card-text-muted)',
                    }}
                  >
                    {c.lbl}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══ KRACHT TAB ════════════════════════════════════════════ */}
      {tab === 'kracht' && (
        <>
          {/* Page title */}
          <div
            className="animate-slide-up stagger-2"
            style={{
              padding: '0 4px',
              marginBottom: 14,
              fontSize: 26,
              fontWeight: 250,
              letterSpacing: '-0.028em',
              color: 'var(--card-text)',
            }}
          >
            Compounds
            <small
              style={{
                fontSize: 13,
                color: 'var(--card-text-muted)',
                marginLeft: 8,
                fontWeight: 300,
                letterSpacing: '-0.005em',
              }}
            >
              estimated 1RM · 12 weken
            </small>
          </div>

          {/* Lift grid 2×2 */}
          {mainLifts.length > 0 ? (
            <div
              className="animate-slide-up stagger-3"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                marginBottom: 6,
              }}
            >
              {mainLifts.map((lift) => {
                const positive = lift.delta > 0
                return (
                  <Link
                    key={lift.exerciseId}
                    href={`/client/progress/exercise/${lift.exerciseId}`}
                    style={{
                      background: 'rgba(255,255,255,0.50)',
                      padding: '16px 16px 14px',
                      borderRadius: 24,
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.10)',
                      minHeight: 128,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      textDecoration: 'none',
                      color: 'inherit',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 500,
                          letterSpacing: '0.16em',
                          textTransform: 'uppercase',
                          color: 'var(--card-text-muted)',
                        }}
                        className="truncate"
                      >
                        {lift.name}
                      </div>
                      <div
                        style={{
                          fontSize: 26,
                          fontWeight: 250,
                          letterSpacing: '-0.025em',
                          color: 'var(--card-text)',
                          fontFeatureSettings: '"tnum"',
                          lineHeight: 1.05,
                          marginTop: 6,
                        }}
                      >
                        {lift.current}
                        <small
                          style={{
                            fontSize: 11,
                            color: 'var(--card-text-muted)',
                            marginLeft: 2,
                            letterSpacing: 0,
                            fontWeight: 300,
                          }}
                        >
                          kg
                        </small>
                      </div>
                    </div>
                    <div style={{ width: '100%', height: 26, margin: '6px 0 4px' }}>
                      <LiftSpark data={lift.weekly} positive={positive} />
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 11,
                        color: 'var(--card-text-muted)',
                        fontWeight: 400,
                      }}
                    >
                      <span>vs. 12w</span>
                      <span
                        style={{
                          color: positive ? '#FDFDFE' : 'rgba(253,253,254,0.44)',
                          fontWeight: positive ? 500 : 400,
                          letterSpacing: '-0.005em',
                        }}
                      >
                        {positive ? '+' : ''}{lift.delta} kg
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div
              className="animate-fade-in"
              style={{
                background: 'rgba(255,255,255,0.50)',
                padding: '28px 22px',
                borderRadius: 24,
                textAlign: 'center',
                marginBottom: 6,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.10)',
              }}
            >
              <p style={{ color: 'var(--card-text)', fontSize: 14, fontWeight: 400 }}>
                Nog geen kracht-data
              </p>
              <p style={{ color: 'var(--card-text-muted)', fontSize: 12, marginTop: 4 }}>
                Log je eerste set om je compounds te zien.
              </p>
            </div>
          )}

          {/* Alle oefeningen cap */}
          <div style={{ ...capStyle, padding: '22px 4px 10px' }}>Alle oefeningen</div>

          {/* Search pill */}
          <div
            className="animate-slide-up stagger-4"
            style={{
              padding: '11px 16px',
              borderRadius: 999,
              background: 'var(--card-bg-subtle)',
              border: '1px solid var(--card-divider)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 10,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(253,253,254,0.62)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="7" />
              <line x1="20" y1="20" x2="16.5" y2="16.5" />
            </svg>
            <input
              type="text"
              placeholder="Zoek een oefening…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: 'var(--card-text)',
                fontSize: 13,
                fontWeight: 400,
                letterSpacing: '-0.005em',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--card-text-muted)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label="Leeg zoekopdracht"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* Muscle chips */}
          <div
            className="animate-slide-up stagger-5 overflow-x-auto"
            style={{
              display: 'flex',
              gap: 6,
              marginBottom: 12,
              paddingBottom: 2,
              scrollbarWidth: 'none',
            }}
          >
            {(['Alle','Borst','Rug','Benen','Schouders','Armen','Core'] as MuscleFilter[]).map((m) => {
              const active = muscleFilter === m
              return (
                <button
                  key={m}
                  onClick={() => setMuscleFilter(m)}
                  style={{
                    flexShrink: 0,
                    padding: '6px 12px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 400,
                    color: active ? '#FDFDFE' : 'rgba(253,253,254,0.78)',
                    background: active ? 'rgba(253,253,254,0.12)' : 'transparent',
                    border: `1px solid ${active ? 'rgba(253,253,254,0.18)' : 'rgba(253,253,254,0.10)'}`,
                    cursor: 'pointer',
                    letterSpacing: '0.005em',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {m}
                </button>
              )
            })}
          </div>

          {/* Exercise list */}
          {filteredExercises.length > 0 ? (
            <div
              className="animate-slide-up stagger-5"
              style={{
                background: 'rgba(255,255,255,0.50)',
                borderRadius: 24,
                overflow: 'hidden',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.10)',
              }}
            >
              {filteredExercises.map((ex, i) => {
                const isPlus = ex.current > 0 && ex.rawBodyPart.toLowerCase().includes('bodyweight')
                return (
                  <Link
                    key={ex.exerciseId}
                    href={`/client/progress/exercise/${ex.exerciseId}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 64px auto',
                      alignItems: 'center',
                      gap: 12,
                      padding: '14px 18px',
                      borderTop: i > 0 ? '1px solid rgba(0,0,0,0.08)' : 'none',
                      textDecoration: 'none',
                      color: 'inherit',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 400,
                          color: 'var(--card-text)',
                          letterSpacing: '-0.005em',
                          lineHeight: 1.25,
                        }}
                        className="truncate"
                      >
                        {ex.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 400,
                          color: 'var(--card-text-muted)',
                          marginTop: 2,
                          letterSpacing: '0.005em',
                        }}
                      >
                        {ex.bodyPart} · {ex.count}× gelogd · laatst {formatShortDate(ex.lastDate)}
                      </div>
                    </div>
                    <div style={{ width: '100%', height: 22 }}>
                      <ExSpark data={ex.weekly} positive={ex.delta > 0} />
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 400,
                        color: 'var(--card-text)',
                        letterSpacing: '-0.005em',
                        fontFeatureSettings: '"tnum"',
                        textAlign: 'right',
                      }}
                    >
                      {isPlus ? '+' : ''}{ex.current}
                      <small
                        style={{
                          fontSize: 10,
                          color: 'var(--card-text-muted)',
                          marginLeft: 2,
                          letterSpacing: 0,
                        }}
                      >
                        kg
                      </small>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div
              style={{
                background: 'rgba(255,255,255,0.50)',
                padding: '28px 22px',
                borderRadius: 24,
                textAlign: 'center',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.10)',
              }}
            >
              <p style={{ color: 'var(--card-text)', fontSize: 14, fontWeight: 400 }}>
                {search ? 'Geen oefeningen gevonden' : 'Geen oefeningen in deze groep'}
              </p>
              <p style={{ color: 'var(--card-text-muted)', fontSize: 12, marginTop: 4 }}>
                {search ? 'Probeer een andere zoekterm.' : 'Kies een andere spiergroep of start een workout.'}
              </p>
            </div>
          )}
        </>
      )}

      {/* ═══ LICHAAM TAB ═══════════════════════════════════════════ */}
      {tab === 'lichaam' && (
        <>
          {/* Weight card */}
          {body.weightData.length >= 1 ? (
            <>
              <div style={capStyle}>Gewicht</div>
              <div className="animate-slide-up stagger-2 mb-2 dark-surface"
                style={{
                  background: '#474B48',
                  padding: '22px 22px 18px',
                  borderRadius: 24,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 6px rgba(0,0,0,0.18)',
                }}
              >
                <div className="flex items-baseline justify-between" style={{ marginBottom: 6 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                      color: 'var(--card-text-muted)',
                    }}
                  >
                    Dagelijks
                  </span>
                  <div className="flex" style={{ gap: 4 }}>
                    {(['1M','3M','6M','1J'] as WeightRange[]).map((r) => {
                      const active = weightRange === r
                      return (
                        <button
                          key={r}
                          onClick={() => setWeightRange(r)}
                          style={{
                            fontSize: 10,
                            fontWeight: 500,
                            padding: '3px 8px',
                            borderRadius: 999,
                            color: active ? '#FDFDFE' : 'rgba(253,253,254,0.62)',
                            background: active ? 'rgba(253,253,254,0.12)' : 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            letterSpacing: '0.02em',
                            WebkitTapHighlightColor: 'transparent',
                          }}
                        >
                          {r}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex items-baseline" style={{ gap: 10, margin: '6px 0 16px' }}>
                  <span
                    style={{
                      fontSize: 38,
                      fontWeight: 200,
                      letterSpacing: '-0.03em',
                      color: 'var(--card-text)',
                      fontFeatureSettings: '"tnum"',
                      lineHeight: 1,
                    }}
                  >
                    {body.weightCurrent?.toString().replace('.', ',')}
                    <small
                      style={{
                        fontSize: 14,
                        color: 'var(--card-text-muted)',
                        marginLeft: 3,
                        letterSpacing: 0,
                        fontWeight: 300,
                      }}
                    >
                      kg
                    </small>
                  </span>
                  {body.weightChange !== null && (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 400,
                        color: 'var(--card-text-soft)',
                        letterSpacing: '-0.005em',
                      }}
                    >
                      {body.weightChange === 0 ? '—' : body.weightChange > 0 ? '+' : '−'}{' '}
                      <strong style={{ color: 'var(--card-text)', fontWeight: 500 }}>
                        {Math.abs(body.weightChange).toString().replace('.', ',')} kg
                      </strong>
                      <span style={{ color: 'var(--card-text-muted)', marginLeft: 6 }}>
                        sinds start
                      </span>
                    </span>
                  )}
                </div>

                {body.weightData.length >= 2 ? (
                  <>
                    <WeightAreaChart data={filteredWeightData} />

                    <div
                      className="flex justify-between"
                      style={{
                        fontSize: 9,
                        fontWeight: 500,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: 'var(--card-text-muted)',
                        marginTop: 6,
                      }}
                    >
                      {monthAxisLabels(filteredWeightData, 5).map((lbl, i) => (
                        <span key={`${lbl}-${i}`}>{lbl}</span>
                      ))}
                    </div>
                  </>
                ) : (
                  <p
                    style={{
                      fontSize: 11,
                      color: 'var(--card-text-muted)',
                      marginTop: 4,
                      letterSpacing: '-0.005em',
                    }}
                  >
                    Eerste meting — log nog een keer om je trend te zien.
                  </p>
                )}
              </div>
            </>
          ) : null}

          {/* Body summary 3-col */}
          {(body.bodyFatCurrent !== null || body.leanMassCurrent !== null || body.heightCm !== null) && (
            <div
              className="animate-slide-up stagger-3"
              style={{
                padding: '14px 0 0',
                marginBottom: 20,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 10,
              }}
            >
              <BodySummaryCell
                value={body.bodyFatCurrent !== null ? body.bodyFatCurrent.toString().replace('.', ',') : '—'}
                unit={body.bodyFatCurrent !== null ? '%' : ''}
                label="Vetpercentage"
              />
              <BodySummaryCell
                value={body.leanMassCurrent !== null ? body.leanMassCurrent.toString().replace('.', ',') : '—'}
                unit={body.leanMassCurrent !== null ? 'kg' : ''}
                label="Lean mass"
              />
              <BodySummaryCell
                value={body.heightCm !== null ? (body.heightCm / 100).toFixed(2).replace('.', ',') : '—'}
                unit={body.heightCm !== null ? 'm' : ''}
                label="Lengte"
              />
            </div>
          )}

          {/* Measurements */}
          {body.measurements.some((m) => m.current !== null) && (
            <>
              <div style={{ ...capStyle, padding: '14px 4px 10px' }}>Maten · laatste meting</div>
              <div
                className="animate-slide-up stagger-4"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 6,
                }}
              >
                {body.measurements.map((m) => {
                  const hasVal = m.current !== null
                  const flat = m.delta === 0 || m.delta === null
                  const deltaSign = m.delta === null ? '' : m.delta > 0 ? '+' : m.delta < 0 ? '−' : '—'
                  const deltaVal = m.delta === null
                    ? ''
                    : Math.abs(m.delta).toString().replace('.', ',')
                  return (
                    <div
                      key={m.key}
                      style={{
                        background: 'rgba(255,255,255,0.50)',
                        padding: '14px 16px',
                        borderRadius: 18,
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.10)',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          fontWeight: 500,
                          letterSpacing: '0.16em',
                          textTransform: 'uppercase',
                          color: 'var(--card-text-muted)',
                          marginBottom: 4,
                        }}
                      >
                        {m.label}
                      </div>
                      <div className="flex items-baseline justify-between">
                        <div
                          style={{
                            fontSize: 20,
                            fontWeight: 300,
                            letterSpacing: '-0.015em',
                            color: 'var(--card-text)',
                            fontFeatureSettings: '"tnum"',
                          }}
                        >
                          {hasVal ? m.current!.toString().replace('.', ',') : '—'}
                          {hasVal && (
                            <small style={{ fontSize: 10, color: 'var(--card-text-muted)', marginLeft: 2, letterSpacing: 0 }}>
                              cm
                            </small>
                          )}
                        </div>
                        {m.delta !== null && (
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 400,
                              color: flat ? 'rgba(253,253,254,0.44)' : 'rgba(253,253,254,0.78)',
                              letterSpacing: '-0.005em',
                            }}
                          >
                            {deltaSign} {deltaVal}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Photos */}
          {body.photos.length > 0 && (
            <>
              <div style={{ ...capStyle, padding: '20px 4px 10px' }}>Voortgangsfoto&rsquo;s</div>
              <div
                className="animate-slide-up stagger-5"
                style={{
                  background: 'rgba(255,255,255,0.50)',
                  padding: '18px 18px 20px',
                  borderRadius: 24,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.10)',
                }}
              >
                <div className="flex items-baseline justify-between" style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--card-text)' }}>
                    {body.photos.length} foto&rsquo;s · {body.photos.length >= 2
                      ? `${Math.round((new Date(body.photos[0].date).getTime() - new Date(body.photos[body.photos.length - 1].date).getTime()) / (86400000 * 7))} weken`
                      : 'nu'}
                  </span>
                  <Link
                    href="/client/progress/photos"
                    style={{ fontSize: 11, fontWeight: 400, color: 'var(--card-text-muted)', textDecoration: 'none' }}
                  >
                    Alles tonen
                  </Link>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {body.photos.slice(0, 3).map((p) => {
                    const url = p.frontUrl || p.backUrl || ''
                    return (
                      <div
                        key={p.date}
                        style={{
                          aspectRatio: '3/4',
                          borderRadius: 10,
                          background: url ? `center / cover url(${url})` : 'linear-gradient(160deg, #6A6E67, #3A3D37)',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            bottom: 6, left: 7,
                            fontSize: 9,
                            fontWeight: 500,
                            letterSpacing: '0.10em',
                            textTransform: 'uppercase',
                            color: 'rgba(255,255,255,0.92)',
                            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                          }}
                        >
                          {formatShortDate(p.date)}
                        </span>
                      </div>
                    )
                  })}
                  {/* Fill with empty slots up to 3 placeholders */}
                  {Array.from({ length: Math.max(0, 3 - body.photos.length) }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      style={{
                        aspectRatio: '3/4',
                        borderRadius: 10,
                        background: 'rgba(0,0,0,0.08)',
                        border: '1px dashed rgba(253,253,254,0.16)',
                      }}
                    />
                  ))}
                  <Link
                    href="/client/check-in"
                    style={{
                      aspectRatio: '3/4',
                      borderRadius: 10,
                      background: 'rgba(0,0,0,0.10)',
                      border: '1px dashed rgba(253,253,254,0.22)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      textDecoration: 'none',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(253,253,254,0.78)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="6" x2="12" y2="18" />
                      <line x1="6" y1="12" x2="18" y2="12" />
                    </svg>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 500,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: 'var(--card-text-muted)',
                      }}
                    >
                      Nieuw
                    </span>
                  </Link>
                </div>
              </div>
            </>
          )}

          {/* Empty state */}
          {body.weightData.length < 1 && !body.measurements.some((m) => m.current !== null) && body.photos.length === 0 && (
            <div className="animate-fade-in dark-surface"
              style={{
                background: '#474B48',
                padding: '48px 22px',
                borderRadius: 24,
                textAlign: 'center',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 6px rgba(0,0,0,0.18)',
              }}
            >
              <p style={{ color: 'var(--card-text)', fontSize: 16, fontWeight: 400, marginBottom: 6 }}>
                Nog geen metingen
              </p>
              <p style={{ color: 'var(--card-text-muted)', fontSize: 13, maxWidth: 260, margin: '0 auto 18px' }}>
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
                  color: 'var(--card-text)',
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
          {/* Due banner — only when weekly check-in still pending */}
          {weeklyCheckIn.pending && (
            <Link className="dark-surface animate-slide-up stagger-2"
              href="/client/weekly-check-in"
              
              style={{
                display: 'block',
                textDecoration: 'none',
                padding: '20px 20px 22px',
                borderRadius: 24,
                background: '#474B48',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 18px rgba(0,0,0,0.22)',
                position: 'relative',
                overflow: 'hidden',
                marginBottom: 18,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {/* Lime radial glow */}
              <div
                style={{
                  position: 'absolute',
                  top: -30, right: -40,
                  width: 160, height: 160,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at center, rgba(192,252,1,0.10), transparent 60%)',
                  pointerEvents: 'none',
                }}
              />

              {/* Dot + eye */}
              <div
                className="flex items-center"
                style={{ gap: 8, marginBottom: 10, position: 'relative' }}
              >
                <span
                  style={{
                    width: 6, height: 6,
                    borderRadius: '50%',
                    background: '#C0FC01',
                    boxShadow: '0 0 10px rgba(192,252,1,0.60)',
                  }}
                />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: 'var(--card-text-muted)',
                  }}
                >
                  Staat klaar · {weekdayNl(new Date())}
                </span>
              </div>

              {/* Title + sub */}
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 250,
                  letterSpacing: '-0.025em',
                  color: 'var(--card-text)',
                  lineHeight: 1.15,
                  marginBottom: 6,
                  position: 'relative',
                }}
              >
                Wekelijkse check-in
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 300,
                  color: 'var(--card-text-soft)',
                  letterSpacing: '-0.005em',
                  lineHeight: 1.45,
                  marginBottom: 16,
                  position: 'relative',
                }}
              >
                {coach?.name
                  ? `Hoe voelde deze week? Energie, slaap, honger — jouw input bepaalt wat ${coach.name} volgende week aanpast.`
                  : 'Hoe voelde deze week? Energie, slaap en honger — je coach gebruikt je input voor de volgende week.'}
              </div>

              {/* CTA pill + meta */}
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '11px 18px 12px 20px',
                    borderRadius: 999,
                    background: '#FDFDFE',
                    color: '#474B48',
                    fontSize: 13,
                    fontWeight: 500,
                    letterSpacing: '-0.005em',
                  }}
                >
                  Start check-in
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#474B48" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 6 15 12 9 18" />
                  </svg>
                </span>
                <span
                  style={{
                    display: 'inline-block',
                    marginLeft: 12,
                    fontSize: 11,
                    fontWeight: 400,
                    color: 'var(--card-text-muted)',
                    letterSpacing: '0.005em',
                  }}
                >
                  ± 3 min
                </span>
              </div>
            </Link>
          )}

          {/* Maandelijks */}
          {checkIns.monthly.length > 0 && (
            <>
              <div style={{ ...capStyle, padding: '6px 4px 12px' }}>Maandelijks</div>
              {checkIns.monthly.map((ci, i) => {
                const weightDeltaStr = ci.weightDelta !== null
                  ? `${ci.weightDelta > 0 ? '+' : ci.weightDelta < 0 ? '−' : ''}${Math.abs(ci.weightDelta).toString().replace('.', ',')}`
                  : null
                const waistDeltaStr = ci.waistDelta !== null
                  ? `${ci.waistDelta > 0 ? '+' : ci.waistDelta < 0 ? '−' : ''}${Math.abs(ci.waistDelta).toString().replace('.', ',')}`
                  : null
                const photoUrl = ci.photoFrontUrl || ci.photoBackUrl || null
                const num = checkIns.monthly.length - i
                return (
                  <div className="dark-surface animate-slide-up"
                    key={ci.id}
                    
                    style={{
                      background: '#474B48',
                      padding: '20px 22px 22px',
                      borderRadius: 24,
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 6px rgba(0,0,0,0.18)',
                      marginBottom: 6,
                    }}
                  >
                    <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
                      <div className="flex items-center" style={{ gap: 8 }}>
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 500,
                            letterSpacing: '0.16em',
                            textTransform: 'uppercase',
                            padding: '3px 8px',
                            borderRadius: 999,
                            background: 'rgba(192,252,1,0.14)',
                            color: '#D5FF4F',
                          }}
                        >
                          Maand
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 400,
                            color: 'var(--card-text-muted)',
                            letterSpacing: '0.005em',
                          }}
                        >
                          {formatMonthYear(ci.date)}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 500,
                          letterSpacing: '0.16em',
                          textTransform: 'uppercase',
                          color: 'var(--card-text-muted)',
                        }}
                      >
                        #{num}
                      </span>
                    </div>

                    {/* Photo + stats side by side */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '92px 1fr',
                        gap: 14,
                        marginBottom: ci.coachNotes ? 16 : 0,
                      }}
                    >
                      <div
                        style={{
                          aspectRatio: '3/4',
                          borderRadius: 10,
                          background: photoUrl
                            ? `center / cover url(${photoUrl})`
                            : 'linear-gradient(160deg, #6A6E67, #3A3D37)',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      />
                      <div
                        className="flex flex-col justify-between"
                      >
                        <CheckInStatRow
                          label="Gewicht"
                          value={ci.weightKg !== null ? ci.weightKg.toString().replace('.', ',') : '—'}
                          unit="kg"
                          delta={weightDeltaStr}
                          first
                        />
                        <CheckInStatRow
                          label="Taille"
                          value={ci.waistCm !== null ? ci.waistCm.toString().replace('.', ',') : '—'}
                          unit="cm"
                          delta={waistDeltaStr}
                        />
                        <CheckInStatRow
                          label="Workouts"
                          value={ci.workoutsInMonth.toString()}
                          unit=""
                          delta={null}
                        />
                        <CheckInStatRow
                          label="Vetpercentage"
                          value={ci.bodyFatPct !== null ? ci.bodyFatPct.toString().replace('.', ',') : '—'}
                          unit={ci.bodyFatPct !== null ? '%' : ''}
                          delta={null}
                        />
                      </div>
                    </div>

                    {/* Coach reply */}
                    {ci.coachNotes && (
                      <div
                        className="flex"
                        style={{
                          gap: 10,
                          padding: '14px 14px 14px 12px',
                          background: 'var(--card-bg-subtle)',
                          borderRadius: 12,
                          border: '1px solid var(--card-divider)',
                        }}
                      >
                        <div
                          style={{
                            width: 28, height: 28,
                            borderRadius: '50%',
                            background: 'linear-gradient(140deg, #5A5E52, #474B48)',
                            color: 'rgba(244,242,235,0.94)',
                            fontSize: 10,
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14)',
                          }}
                        >
                          {coach?.name ? coach.name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase() : 'JV'}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div className="flex items-baseline" style={{ gap: 8, marginBottom: 4 }}>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 500,
                                color: 'var(--card-text)',
                                letterSpacing: '-0.005em',
                              }}
                            >
                              {coach?.name?.split(' ')[0] || 'Coach'}
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--card-text-muted)' }}>
                              feedback · {formatShortDate(ci.date)}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 300,
                              color: 'var(--card-text-soft)',
                              lineHeight: 1.55,
                              letterSpacing: '-0.005em',
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {ci.coachNotes}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}

          {/* Wekelijks */}
          {checkIns.weekly.length > 0 && (
            <>
              <div style={{ ...capStyle, padding: '20px 4px 12px' }}>Wekelijks · ingeleverd</div>
              {checkIns.weekly.map((w) => {
                const d = new Date(w.date)
                const wkNum = getWeekNumber(d)
                const title = w.notes
                  ? `Week ${wkNum} · ${w.notes.slice(0, 52)}${w.notes.length > 52 ? '…' : ''}`
                  : `Week ${wkNum} · check-in ingeleverd`
                return (
                  <div
                    key={w.id}
                    className="animate-slide-up"
                    style={{
                      background: 'rgba(255,255,255,0.50)',
                      padding: '14px 18px',
                      borderRadius: 18,
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.10)',
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr auto',
                      alignItems: 'center',
                      gap: 14,
                      marginBottom: 6,
                    }}
                  >
                    <div
                      style={{
                        width: 28, height: 28,
                        borderRadius: '50%',
                        background: 'rgba(47,166,90,0.18)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6FD598" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="5 12 10 17 20 7" />
                      </svg>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        className="truncate"
                        style={{
                          fontSize: 13,
                          fontWeight: 400,
                          color: 'var(--card-text)',
                          letterSpacing: '-0.005em',
                          lineHeight: 1.2,
                        }}
                      >
                        {title}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 400,
                          color: 'var(--card-text-muted)',
                          marginTop: 2,
                          letterSpacing: '0.005em',
                        }}
                      >
                        {w.energyLevel !== null ? `energie ${w.energyLevel}/10` : 'ingeleverd'}
                        {w.sleepQuality !== null ? ` · slaap ${w.sleepQuality}/10` : ''}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 500,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: 'var(--card-text-muted)',
                      }}
                    >
                      {formatShortDate(w.date)}
                    </span>
                  </div>
                )
              })}
            </>
          )}

          {/* Empty state */}
          {!weeklyCheckIn.pending && checkIns.monthly.length === 0 && checkIns.weekly.length === 0 && (
            <div className="animate-fade-in dark-surface"
              style={{
                background: '#474B48',
                padding: '48px 22px',
                borderRadius: 24,
                textAlign: 'center',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 6px rgba(0,0,0,0.18)',
              }}
            >
              <p style={{ color: 'var(--card-text)', fontSize: 16, fontWeight: 400, marginBottom: 6 }}>
                Nog geen check-ins
              </p>
              <p style={{ color: 'var(--card-text-muted)', fontSize: 13, maxWidth: 260, margin: '0 auto 18px' }}>
                Je eerste check-in toont je startpunt en voortgang.
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
                  color: 'var(--card-text)',
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

    </div>
  )
}
