'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { PhotoComparison } from '@/components/client/PhotoComparison'
import { ChevronRight } from 'lucide-react'

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

type ChartMode = 'duration' | 'volume' | 'sets'

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
  const [chartMode, setChartMode] = useState<ChartMode>('duration')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/progress')
        if (res.ok) setData(await res.json())

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Weekly chart data (last 12 weeks)
        const twelveWeeksAgo = new Date()
        twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 12 * 7)

        const { data: sessions } = await supabase
          .from('workout_sessions')
          .select('id, started_at, completed_at, duration_seconds, workout_sets(weight_kg, actual_reps)')
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

          for (const s of sessions as any[]) {
            const date = new Date(s.started_at)
            const weekStart = new Date(date)
            weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
            const key = weekStart.toISOString().slice(0, 10)

            if (weeks[key]) {
              weeks[key].duration += Math.round((s.duration_seconds || 0) / 60)
              const sets = s.workout_sets || []
              weeks[key].sets += sets.length
              for (const set of sets) {
                weeks[key].volume += (set.weight_kg || 0) * (set.actual_reps || 0)
              }
            }
          }

          setWeeklyStats(Object.values(weeks))
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
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-6 h-6 border-[1.5px] border-[#C0C0C0] border-t-[#1A1917] rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <p
            className="text-[28px] leading-[1.15] tracking-[-0.02em] text-[#1A1917] mb-3"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            Nog geen data
          </p>
          <p className="text-[15px] text-[#ACACAC] max-w-[260px] mx-auto">
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

  return (
    <div className="pb-28">

      {/* ═══ HERO — ONE dynamic number ═════════════════════ */}
      <div className="mb-3 animate-fade-in">
        <p className="text-label mb-4">Voortgang</p>
        <p className="stat-number-hero text-[#1A1917] animate-count-up">
          <AnimatedNumber
            value={hero.value}
            prefix={'prefix' in hero ? hero.prefix : ''}
            suffix={hero.suffix}
          />
        </p>
        <p className="text-[16px] text-[#ACACAC] mt-2">{hero.label}</p>
      </div>

      {/* Supporting stats as text */}
      {supportingText && (
        <p className="text-[14px] text-[#ACACAC] mb-10 animate-fade-in" style={{ animationDelay: '60ms' }}>
          {supportingText}
        </p>
      )}

      {/* ═══ 12 WEEK CHART — full-width, clean ════════════ */}
      {weeklyStats.length > 0 && (
        <div className="card-v2 p-7 mb-6 animate-slide-up" style={{ animationDelay: '120ms' }}>
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <span className="stat-number text-[32px] text-[#1A1917]">{thisWeekVal}</span>
              <span className="text-[14px] text-[#ACACAC] ml-2">{chartLabel} deze week</span>
            </div>
            <span className="text-[12px] text-[#C0C0C0]">12 weken</span>
          </div>

          {/* Bars */}
          <div className="flex items-end gap-[3px] h-[90px] mb-3">
            {chartData.map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                <div
                  className={`w-full rounded-t-md transition-all ${
                    i === chartData.length - 1 ? 'bg-[#D46A3A]' : 'bg-[#F0F0EE]'
                  }`}
                  style={{ height: `${Math.max((val / maxVal) * 100, 3)}%` }}
                />
              </div>
            ))}
          </div>

          {/* Week labels */}
          <div className="flex gap-[3px] mb-6">
            {weeklyStats.map((w, i) => (
              <div key={i} className="flex-1 text-center">
                {i % 4 === 0 && <span className="text-[9px] text-[#C0C0C0]">{w.week}</span>}
              </div>
            ))}
          </div>

          {/* Mode tabs */}
          <div className="flex gap-1">
            {(['duration', 'volume', 'sets'] as ChartMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setChartMode(mode)}
                className={`px-4 py-2.5 rounded-lg text-[12px] font-semibold uppercase tracking-[0.06em] transition-all ${
                  chartMode === mode
                    ? 'bg-[#1A1917] text-white'
                    : 'text-[#ACACAC] hover:text-[#1A1917]'
                }`}
              >
                {mode === 'duration' ? 'Duur' : mode === 'volume' ? 'Volume' : 'Sets'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ GEWICHT — sparkline card ═════════════════════ */}
      {body.weightData.length >= 2 && (
        <Link
          href="/client/measurements"
          className="block card-v2-interactive p-7 mb-6 group animate-slide-up"
          style={{ animationDelay: '180ms' }}
        >
          <div className="flex items-center justify-between mb-5">
            <span className="text-label">Gewicht</span>
            <ChevronRight size={16} strokeWidth={1.5} className="text-[#C0C0C0] group-hover:text-[#1A1917] transition-colors" />
          </div>

          <div className="flex items-end justify-between">
            <div>
              <p className="leading-none">
                <span className="stat-number text-[32px] text-[#1A1917]">{body.weightCurrent}</span>
                <span className="text-[14px] font-medium text-[#ACACAC] ml-1">kg</span>
              </p>
              {body.weightChange !== null && (
                <p className="text-[13px] mt-2 font-semibold" style={{
                  color: body.weightChange <= 0 ? '#3D8B5C' : '#C47D15'
                }}>
                  {body.weightChange > 0 ? '+' : ''}{body.weightChange} kg
                  <span className="font-normal text-[#ACACAC] ml-1">totaal</span>
                </p>
              )}
            </div>
            <Sparkline
              data={body.weightData.map(w => w.weight)}
              color={body.weightChange !== null && body.weightChange <= 0 ? '#3D8B5C' : '#C47D15'}
            />
          </div>
        </Link>
      )}

      {/* ═══ RECORDS — top 3 inline ══════════════════════ */}
      {strength.recentPrs.length > 0 && (
        <div className="card-v2 overflow-hidden mb-6 animate-slide-up" style={{ animationDelay: '240ms' }}>
          <div className="flex items-center justify-between px-7 pt-6 pb-4">
            <span className="text-label">Recente records</span>
            {strength.totalPrs > 3 && (
              <Link
                href="/client/stats"
                className="text-[13px] font-medium text-[#D46A3A] hover:opacity-70 transition-opacity"
              >
                Bekijk alles
              </Link>
            )}
          </div>
          {strength.recentPrs.slice(0, 3).map((pr) => (
            <div key={pr.id} className="flex items-center gap-4 px-7 py-4 border-t border-[#F0F0EE]">
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-[#1A1917] truncate">{pr.exercise}</p>
                <p className="text-[11px] text-[#ACACAC] mt-0.5">
                  {new Date(pr.date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <span className="stat-number text-[18px] text-[#1A1917]">
                {pr.value}
                <span className="text-[12px] font-medium text-[#ACACAC] ml-1">
                  {pr.type === 'weight' ? 'kg' : pr.type === 'reps' ? 'reps' : 'kg'}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ═══ PHOTO COMPARISON — prominent CTA ════════════ */}
      {body.hasPhotos && (
        <div className="mb-6 animate-slide-up" style={{ animationDelay: '300ms' }}>
          <PhotoComparison />
          <Link
            href="/client/progress/photos"
            className="flex items-center justify-center gap-2 mt-3 py-2 text-[13px] font-medium text-[#D46A3A] hover:opacity-70 transition-opacity"
          >
            Foto vergelijking bekijken
            <ChevronRight size={14} />
          </Link>
        </div>
      )}

    </div>
  )
}
