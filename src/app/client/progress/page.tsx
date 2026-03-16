'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  Dumbbell, Trophy, TrendingDown, TrendingUp,
  ChevronRight,
  Calendar, BarChart3, Ruler
} from 'lucide-react'

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

function AnimatedNumber({ value, duration = 1200, suffix = '' }: { value: number; duration?: number; suffix?: string }) {
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

  return <span>{display}{suffix}</span>
}

// ─── Mini Sparkline ─────────────────────────────────────────

function Sparkline({ data, color, height = 40, width = 120 }: { data: number[]; color: string; height?: number; width?: number }) {
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
        // Load journey/progress data
        const res = await fetch('/api/progress')
        if (res.ok) setData(await res.json())

        // Load weekly chart data (from profile)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: sessions } = await supabase
          .from('workout_sessions')
          .select('id, started_at, completed_at, duration_seconds, workout_sets(weight_kg, actual_reps)')
          .eq('client_id', user.id)
          .not('completed_at', 'is', null)
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
        <div className="w-6 h-6 border-[1.5px] border-[#CCC7BC] border-t-[#1A1917] rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-[#A09D96] text-[14px]">
        Er ging iets mis bij het laden.
      </div>
    )
  }

  const { headline, training, body, strength, nutrition } = data

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

      {/* ═══ HEADER ══════════════════════════════════════════ */}
      <div className="mb-10">
        <p className="text-label mb-2">Jouw traject</p>
        <h1 className="text-editorial-h2 text-[#1A1917]">Voortgang</h1>
      </div>

      {/* ═══ HEADLINE STATS ══════════════════════════════════ */}
      <div className="flex justify-between mb-12">
        <div className="text-center">
          <p className="text-[28px] font-bold text-[#1A1917] leading-none">
            <AnimatedNumber value={headline.daysOnProgram} />
          </p>
          <p className="text-[12px] text-[#A09D96] mt-2 font-medium">Dagen</p>
        </div>
        <div className="text-center">
          <p className="text-[28px] font-bold text-[#1A1917] leading-none">
            <AnimatedNumber value={headline.streak} />
          </p>
          <p className="text-[12px] text-[#A09D96] mt-2 font-medium">Streak</p>
        </div>
        <div className="text-center">
          <p className="text-[28px] font-bold text-[#1A1917] leading-none">
            <AnimatedNumber value={headline.totalWorkouts} />
          </p>
          <p className="text-[12px] text-[#A09D96] mt-2 font-medium">Workouts</p>
        </div>
        <div className="text-center">
          <p className="text-[28px] font-bold text-[#1A1917] leading-none">
            <AnimatedNumber value={headline.totalPrs} />
          </p>
          <p className="text-[12px] text-[#A09D96] mt-2 font-medium">Records</p>
        </div>
      </div>

      {/* ═══ 12 WEEK ACTIVITY CHART ══════════════════════════ */}
      {weeklyStats.length > 0 && (
        <div className="bg-white p-7 mb-10">
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <span className="text-[32px] font-bold text-[#1A1917] leading-none">{thisWeekVal}</span>
              <span className="text-[14px] text-[#A09D96] ml-2">{chartLabel} deze week</span>
            </div>
            <span className="text-[12px] text-[#C5C2BC]">12 weken</span>
          </div>

          {/* Bars */}
          <div className="flex items-end gap-[3px] h-[90px] mb-3">
            {chartData.map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                <div
                  className={`w-full transition-all ${
                    i === chartData.length - 1 ? 'bg-[#1A1917]' : 'bg-[#E5E1D9]'
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
                {i % 4 === 0 && <span className="text-[9px] text-[#C5C2BC]">{w.week}</span>}
              </div>
            ))}
          </div>

          {/* Mode toggles */}
          <div className="flex gap-1">
            {(['duration', 'volume', 'sets'] as ChartMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setChartMode(mode)}
                className={`px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.06em] transition-all ${
                  chartMode === mode
                    ? 'bg-[#1A1917] text-white'
                    : 'text-[#A09D96] hover:text-[#1A1917]'
                }`}
              >
                {mode === 'duration' ? 'Duur' : mode === 'volume' ? 'Volume' : 'Sets'}
              </button>
            ))}
          </div>
        </div>
      )}


      {/* ═══ GEWICHT SPARKLINE ════════════════════════════════ */}
      {body.weightData.length >= 2 && (
        <Link
          href="/client/measurements"
          className="block bg-white p-7 mb-3 hover:bg-[#FAF8F3] transition-colors group"
        >
          <div className="flex items-center justify-between mb-5">
            <span className="text-label">Gewicht</span>
            <ChevronRight size={16} strokeWidth={1.5} className="text-[#CCC7BC] group-hover:translate-x-0.5 transition-transform" />
          </div>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-[32px] font-bold text-[#1A1917] tracking-[-0.02em] leading-none">
                {body.weightCurrent}
                <span className="text-[14px] font-medium text-[#A09D96] ml-1">kg</span>
              </p>
              {body.weightChange !== null && (
                <p className="text-[13px] mt-2 font-semibold" style={{
                  color: body.weightChange <= 0 ? '#3D8B5C' : '#C47D15'
                }}>
                  {body.weightChange > 0 ? '+' : ''}{body.weightChange} kg
                  <span className="font-normal text-[#A09D96] ml-1">totaal</span>
                </p>
              )}
            </div>
            <Sparkline
              data={body.weightData.map(w => w.weight)}
              color={body.weightChange !== null && body.weightChange <= 0 ? '#3D8B5C' : '#C47D15'}
              width={140}
              height={50}
            />
          </div>
        </Link>
      )}

      {/* ═══ RECENTE PR'S ════════════════════════════════════ */}
      {strength.recentPrs.length > 0 && (
        <Link
          href="/client/stats"
          className="block bg-white overflow-hidden hover:bg-[#FAF8F3] transition-colors group mb-3"
        >
          <div className="flex items-center justify-between px-7 pt-7 pb-4">
            <span className="text-label">Recente records</span>
            <ChevronRight size={16} strokeWidth={1.5} className="text-[#CCC7BC] group-hover:translate-x-0.5 transition-transform" />
          </div>
          {strength.recentPrs.slice(0, 3).map((pr) => (
            <div key={pr.id} className="flex items-center gap-4 px-7 py-4 border-t border-[#F0EDE8]">
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-[#1A1917] truncate">{pr.exercise}</p>
                <p className="text-[11px] text-[#A09D96] mt-0.5">
                  {new Date(pr.date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <span className="text-[16px] font-bold text-[#7B5EA7]">
                {pr.value} {pr.type === 'weight' ? 'kg' : pr.type === 'reps' ? 'reps' : 'kg'}
              </span>
            </div>
          ))}
        </Link>
      )}


      {/* ═══ QUICK LINKS — editorial grid ═══════════════════ */}
      <div className="grid grid-cols-2 gap-3 mt-10">
        <Link
          href="/client/stats"
          className="flex flex-col items-start p-6 bg-white hover:bg-[#FAF8F3] transition-colors"
        >
          <BarChart3 size={20} strokeWidth={1.5} className="text-[#A09D96] mb-4" />
          <span className="text-[14px] font-semibold text-[#1A1917]">Statistieken</span>
        </Link>
        <Link
          href="/client/exercises"
          className="flex flex-col items-start p-6 bg-white hover:bg-[#FAF8F3] transition-colors"
        >
          <Dumbbell size={20} strokeWidth={1.5} className="text-[#A09D96] mb-4" />
          <span className="text-[14px] font-semibold text-[#1A1917]">Oefeningen</span>
        </Link>
        <Link
          href="/client/measurements"
          className="flex flex-col items-start p-6 bg-white hover:bg-[#FAF8F3] transition-colors"
        >
          <Ruler size={20} strokeWidth={1.5} className="text-[#A09D96] mb-4" />
          <span className="text-[14px] font-semibold text-[#1A1917]">Metingen</span>
        </Link>
        <Link
          href="/client/calendar"
          className="flex flex-col items-start p-6 bg-white hover:bg-[#FAF8F3] transition-colors"
        >
          <Calendar size={20} strokeWidth={1.5} className="text-[#A09D96] mb-4" />
          <span className="text-[14px] font-semibold text-[#1A1917]">Kalender</span>
        </Link>
      </div>
    </div>
  )
}
