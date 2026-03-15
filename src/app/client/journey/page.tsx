'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import {
  Flame, Dumbbell, Trophy, TrendingDown, TrendingUp,
  Camera, Apple, Timer, ChevronRight, Minus,
  Calendar, Activity
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

// ─── Animated Counter ───────────────────────────────────────

function AnimatedNumber({ value, duration = 1200, suffix = '' }: { value: number; duration?: number; suffix?: string }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (value === 0) { setDisplay(0); return }
    let start = 0
    const startTime = performance.now()
    const isDecimal = !Number.isInteger(value)

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = eased * value

      setDisplay(isDecimal ? +current.toFixed(1) : Math.round(current))

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    requestAnimationFrame(animate)
  }, [value, duration])

  return <span ref={ref}>{display}{suffix}</span>
}

// ─── Animated Bar ───────────────────────────────────────────

function AnimatedBar({ value, maxValue, delay, color }: { value: number; maxValue: number; delay: number; color: string }) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setWidth(maxValue > 0 ? (value / maxValue) * 100 : 0)
    }, delay)
    return () => clearTimeout(timer)
  }, [value, maxValue, delay])

  return (
    <div className="h-full rounded-sm transition-all duration-700 ease-out" style={{ width: `${width}%`, backgroundColor: color }} />
  )
}

// ─── Circular Progress ──────────────────────────────────────

function CircularProgress({ value, size = 80, strokeWidth = 6, color = '#3D8B5C' }: { value: number; size?: number; strokeWidth?: number; color?: string }) {
  const [progress, setProgress] = useState(0)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  useEffect(() => {
    const timer = setTimeout(() => setProgress(value), 300)
    return () => clearTimeout(timer)
  }, [value])

  const offset = circumference - (progress / 100) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#F0EDE8" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        className="transition-all duration-1000 ease-out"
      />
    </svg>
  )
}

// ─── Mini Sparkline (SVG) ───────────────────────────────────

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
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-draw"
      />
    </svg>
  )
}

// ─── Main Component ─────────────────────────────────────────

export default function JourneyPage() {
  const [data, setData] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/progress')
        if (res.ok) setData(await res.json())
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
        <div className="animate-spin rounded-full h-8 w-8 border-[1.5px] border-[#9B7B2E] border-t-transparent" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-[#9C9A95]">
        Er ging iets mis bij het laden.
      </div>
    )
  }

  const { headline, training, body, strength, nutrition } = data
  const maxWeeklyWorkout = Math.max(...training.weeklyChart.map(w => w.count), 1)

  return (
    <div className="pb-24 space-y-6">

      {/* ═══ HEADER ══════════════════════════════════════════ */}
      <div className="pt-1 mb-1">
        <h1
          className="text-[32px] font-semibold text-[#1A1917] tracking-[-0.03em] leading-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Voortgang
        </h1>
        <p className="text-[14px] text-[#9C9A95] mt-1">Je volledige traject in één oogopslag</p>
      </div>

      {/* ═══ HEADLINE STATS (animated counters) ══════════════ */}
      <div className="grid grid-cols-2 gap-3">
        {/* Days on program */}
        <div className="rounded-2xl border border-[#F0F0ED] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] animate-slide-up" style={{ animationDelay: '50ms', animationFillMode: 'both' }}>
          <div className="flex items-center gap-2 mb-2">
            <Calendar strokeWidth={1.5} className="w-4 h-4 text-[#9B7B2E]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#BAB8B3]">Traject</span>
          </div>
          <p className="text-[28px] font-bold text-[#1A1917] tracking-[-0.02em] leading-none">
            <AnimatedNumber value={headline.daysOnProgram} />
          </p>
          <p className="text-[12px] text-[#9C9A95] mt-1">dagen</p>
        </div>

        {/* Streak */}
        <div className="rounded-2xl border border-[#F0F0ED] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] animate-slide-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
          <div className="flex items-center gap-2 mb-2">
            <Flame strokeWidth={1.5} className="w-4 h-4 text-[#C47D15]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#BAB8B3]">Streak</span>
          </div>
          <p className="text-[28px] font-bold text-[#C47D15] tracking-[-0.02em] leading-none">
            <AnimatedNumber value={headline.streak} />
          </p>
          <p className="text-[12px] text-[#9C9A95] mt-1">dagen actief</p>
        </div>

        {/* Total workouts */}
        <div className="rounded-2xl border border-[#F0F0ED] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] animate-slide-up" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
          <div className="flex items-center gap-2 mb-2">
            <Dumbbell strokeWidth={1.5} className="w-4 h-4 text-[#3068C4]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#BAB8B3]">Trainingen</span>
          </div>
          <p className="text-[28px] font-bold text-[#1A1917] tracking-[-0.02em] leading-none">
            <AnimatedNumber value={headline.totalWorkouts} />
          </p>
          <p className="text-[12px] text-[#9C9A95] mt-1">totaal voltooid</p>
        </div>

        {/* Total PRs */}
        <div className="rounded-2xl border border-[#F0F0ED] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] animate-slide-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
          <div className="flex items-center gap-2 mb-2">
            <Trophy strokeWidth={1.5} className="w-4 h-4 text-[#7B5EA7]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#BAB8B3]">Records</span>
          </div>
          <p className="text-[28px] font-bold text-[#7B5EA7] tracking-[-0.02em] leading-none">
            <AnimatedNumber value={headline.totalPrs} />
          </p>
          <p className="text-[12px] text-[#9C9A95] mt-1">
            {strength.prsThisMonth > 0 ? `+${strength.prsThisMonth} deze maand` : "persoonlijke records"}
          </p>
        </div>
      </div>

      {/* ═══ TRAINING CHART (animated bars) ══════════════════ */}
      <Link
        href="/client/progress"
        className="block rounded-2xl border border-[#F0F0ED] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all duration-200 group animate-slide-up"
        style={{ animationDelay: '250ms', animationFillMode: 'both' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity strokeWidth={1.5} className="w-4 h-4 text-[#3068C4]" />
            <span className="text-[13px] font-semibold text-[#1A1917]">Trainingsfrequentie</span>
          </div>
          <div className="flex items-center gap-1 text-[12px] font-semibold text-[#9B7B2E] opacity-0 group-hover:opacity-100 transition-opacity">
            Details <ChevronRight strokeWidth={1.5} className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-5 mb-4">
          <div>
            <p className="text-[20px] font-bold text-[#1A1917] tracking-[-0.02em]">
              <AnimatedNumber value={training.workoutsPerWeek} suffix="x" duration={800} />
            </p>
            <p className="text-[11px] text-[#9C9A95]">per week</p>
          </div>
          <div className="w-px bg-[#F0F0ED]" />
          <div>
            <p className="text-[20px] font-bold text-[#1A1917] tracking-[-0.02em]">
              <AnimatedNumber value={training.avgSessionMin} suffix="'" duration={800} />
            </p>
            <p className="text-[11px] text-[#9C9A95]">gem. sessie</p>
          </div>
          <div className="w-px bg-[#F0F0ED]" />
          <div>
            <p className="text-[20px] font-bold text-[#1A1917] tracking-[-0.02em]">
              <AnimatedNumber value={Math.round(training.totalMinutes / 60)} suffix="u" duration={800} />
            </p>
            <p className="text-[11px] text-[#9C9A95]">totaal</p>
          </div>
        </div>

        {/* Bar chart — last 12 weeks */}
        <div className="flex items-end gap-1.5 h-16">
          {training.weeklyChart.map((w, i) => (
            <div key={w.week} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full h-12 bg-[#F5F2ED] rounded-sm overflow-hidden flex items-end">
                <AnimatedBar
                  value={w.count}
                  maxValue={maxWeeklyWorkout}
                  delay={300 + i * 60}
                  color={i === training.weeklyChart.length - 1 ? '#3068C4' : '#B8CBE8'}
                />
              </div>
              {(i === 0 || i === training.weeklyChart.length - 1 || i === 5) && (
                <span className="text-[9px] text-[#BAB8B3]">{w.week}</span>
              )}
            </div>
          ))}
        </div>
      </Link>

      {/* ═══ LICHAAM (weight sparkline + clickable) ══════════ */}
      {body.weightData.length >= 2 && (
        <Link
          href="/client/progress"
          className="block rounded-2xl border border-[#F0F0ED] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all duration-200 group animate-slide-up"
          style={{ animationDelay: '300ms', animationFillMode: 'both' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {body.weightChange !== null && body.weightChange <= 0 ? (
                <TrendingDown strokeWidth={1.5} className="w-4 h-4 text-[#3D8B5C]" />
              ) : (
                <TrendingUp strokeWidth={1.5} className="w-4 h-4 text-[#C47D15]" />
              )}
              <span className="text-[13px] font-semibold text-[#1A1917]">Gewicht</span>
            </div>
            <div className="flex items-center gap-1 text-[12px] font-semibold text-[#9B7B2E] opacity-0 group-hover:opacity-100 transition-opacity">
              Details <ChevronRight strokeWidth={1.5} className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-[28px] font-bold text-[#1A1917] tracking-[-0.02em] leading-none">
                {body.weightCurrent}
                <span className="text-[14px] font-medium text-[#9C9A95] ml-1">kg</span>
              </p>
              {body.weightChange !== null && (
                <p className="text-[13px] mt-1.5 font-semibold" style={{
                  color: body.weightChange <= 0 ? '#3D8B5C' : '#C47D15'
                }}>
                  {body.weightChange > 0 ? '+' : ''}{body.weightChange} kg
                  <span className="font-normal text-[#9C9A95] ml-1">totaal</span>
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
          href="/client/progress"
          className="block rounded-2xl border border-[#F0F0ED] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all duration-200 group overflow-hidden animate-slide-up"
          style={{ animationDelay: '350ms', animationFillMode: 'both' }}
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <Trophy strokeWidth={1.5} className="w-4 h-4 text-[#7B5EA7]" />
              <span className="text-[13px] font-semibold text-[#1A1917]">Recente records</span>
            </div>
            <div className="flex items-center gap-1 text-[12px] font-semibold text-[#9B7B2E] opacity-0 group-hover:opacity-100 transition-opacity">
              Alle <ChevronRight strokeWidth={1.5} className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="divide-y divide-[#F0F0ED]">
            {strength.recentPrs.slice(0, 3).map((pr, i) => (
              <div
                key={pr.id}
                className="flex items-center gap-3 px-5 py-3 animate-slide-up"
                style={{ animationDelay: `${400 + i * 80}ms`, animationFillMode: 'both' }}
              >
                <div className="w-8 h-8 rounded-xl bg-[#7B5EA7]/10 flex items-center justify-center shrink-0">
                  <Trophy strokeWidth={1.5} className="w-3.5 h-3.5 text-[#7B5EA7]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-[#1A1917] truncate">{pr.exercise}</p>
                  <p className="text-[11px] text-[#9C9A95]">
                    {new Date(pr.date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <span className="text-[16px] font-bold text-[#7B5EA7]">
                  {pr.value} {pr.type === 'weight' ? 'kg' : pr.type === 'reps' ? 'reps' : 'kg'}
                </span>
              </div>
            ))}
          </div>
        </Link>
      )}

      {/* ═══ VOEDING COMPLIANCE ══════════════════════════════ */}
      {nutrition.compliance !== null && (
        <Link
          href="/client/nutrition"
          className="block rounded-2xl border border-[#F0F0ED] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all duration-200 group animate-slide-up"
          style={{ animationDelay: '400ms', animationFillMode: 'both' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Apple strokeWidth={1.5} className="w-4 h-4 text-[#3D8B5C]" />
                <span className="text-[13px] font-semibold text-[#1A1917]">Voedingscompliance</span>
              </div>
              <p className="text-[13px] text-[#9C9A95]">
                {nutrition.daysTracked} dagen bijgehouden
              </p>
              <div className="flex items-center gap-1 mt-2 text-[12px] font-semibold text-[#9B7B2E] opacity-0 group-hover:opacity-100 transition-opacity">
                Bekijk details <ChevronRight strokeWidth={1.5} className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="relative">
              <CircularProgress value={nutrition.compliance} size={72} color={nutrition.compliance >= 80 ? '#3D8B5C' : nutrition.compliance >= 50 ? '#C47D15' : '#E85D4A'} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[16px] font-bold text-[#1A1917]">
                  <AnimatedNumber value={nutrition.compliance} suffix="%" duration={1000} />
                </span>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* ═══ FOTO'S PREVIEW ══════════════════════════════════ */}
      {body.hasPhotos && (
        <Link
          href="/client/progress"
          className="block rounded-2xl border border-[#F0F0ED] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all duration-200 group animate-slide-up"
          style={{ animationDelay: '450ms', animationFillMode: 'both' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera strokeWidth={1.5} className="w-4 h-4 text-[#9B7B2E]" />
              <span className="text-[13px] font-semibold text-[#1A1917]">Progressiefoto's</span>
            </div>
            <div className="flex items-center gap-1 text-[12px] font-semibold text-[#9B7B2E]">
              Vergelijken <ChevronRight strokeWidth={1.5} className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
          <p className="text-[13px] text-[#9C9A95] mt-2">
            {body.photoDates.length} {body.photoDates.length === 1 ? 'meting' : 'metingen'} met foto's
          </p>
        </Link>
      )}

      {/* ═══ CSS ANIMATIONS ══════════════════════════════════ */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes draw {
          from { stroke-dasharray: 1000; stroke-dashoffset: 1000; }
          to { stroke-dasharray: 1000; stroke-dashoffset: 0; }
        }
        .animate-draw {
          animation: draw 1.5s ease-out forwards;
        }
      `}} />
    </div>
  )
}
