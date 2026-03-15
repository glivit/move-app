'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { PhotoSlider } from '@/components/ui/PhotoSlider'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Area, AreaChart, ComposedChart, ReferenceLine, PieChart, Pie, Cell
} from 'recharts'
import type { CheckIn } from '@/types'
import { Trophy, Camera, TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight, ChevronDown, Flame } from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────

interface Exercise {
  id: string
  name: string
  name_nl: string | null
  body_part: string
  target_muscle: string
}

interface PersonalRecord {
  id: string
  client_id: string
  exercise_id: string
  record_type: string
  value: number
  achieved_at: string
  exercise?: Exercise
}

interface WorkoutSet {
  id: string
  workout_session_id: string
  exercise_id: string
  set_number: number
  actual_reps: number | null
  weight_kg: number | null
  is_pr: boolean
  completed: boolean
  created_at: string
}

interface WorkoutSession {
  id: string
  client_id: string
  started_at: string
  completed_at: string | null
  duration_seconds: number | null
}

type TabType = 'fotos' | 'kracht' | 'volume' | 'prs' | 'lichaam'
type TimeRange = '4w' | '8w' | '12w' | 'all'

// ─── Helpers ────────────────────────────────────────────────

function getWeekNumber(date: Date): string {
  const d = new Date(date)
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `W${weekNo}`
}

function deltaColor(val: number, inverted = false) {
  if (val === 0) return '#8E8E93'
  const positive = inverted ? val < 0 : val > 0
  return positive ? '#34C759' : '#FF3B30'
}

const MUSCLE_GROUP_COLORS: { [key: string]: string } = {
  'Chest': '#FF6B6B',
  'Back': '#4ECDC4',
  'Shoulders': '#45B7D1',
  'Arms': '#96CEB4',
  'Legs': '#FFEAA7',
  'Core': '#DDA0DD',
  'Borst': '#FF6B6B',
  'Rug': '#4ECDC4',
  'Schouders': '#45B7D1',
  'Armen': '#96CEB4',
  'Benen': '#FFEAA7',
  'Buik': '#DDA0DD',
  'Overig': '#C7C7CC',
}

const FALLBACK_COLORS = ['#FF9500', '#007AFF', '#AF52DE', '#34C759', '#FF3B30', '#5856D6', '#FF2D55', '#00C7BE']

// ─── Component ──────────────────────────────────────────────

export default function ProgressPage() {
  const [activeTab, setActiveTab] = useState<TabType>('fotos')
  const [checkins, setCheckins] = useState<CheckIn[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([])
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([])
  const [workoutSets, setWorkoutSets] = useState<WorkoutSet[]>([])
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<TimeRange>('all')

  // Photo comparison state
  const [compareFrom, setCompareFrom] = useState<string>('')
  const [compareTo, setCompareTo] = useState<string>('')
  const [activeAngle, setActiveAngle] = useState<'front' | 'back' | 'left' | 'right'>('front')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: checkinsData } = await supabase
        .from('checkins')
        .select('*')
        .eq('client_id', user.id)
        .order('date', { ascending: true })

      if (checkinsData) {
        setCheckins(checkinsData)
        // Auto-select first and last for comparison
        const withPhotos = checkinsData.filter(
          (c: any) => c.photo_front_url || c.photo_back_url || c.photo_left_url || c.photo_right_url
        )
        if (withPhotos.length >= 2) {
          setCompareFrom(withPhotos[0].date)
          setCompareTo(withPhotos[withPhotos.length - 1].date)
        } else if (withPhotos.length === 1) {
          setCompareFrom(withPhotos[0].date)
          setCompareTo(withPhotos[0].date)
        }
      }

      const { data: sessionsData } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('client_id', user.id)
        .order('started_at', { ascending: true })

      if (sessionsData) setWorkoutSessions(sessionsData)

      if (sessionsData && sessionsData.length > 0) {
        const sessionIds = sessionsData.map((s: any) => s.id)
        const { data: setsData } = await supabase
          .from('workout_sets')
          .select('*')
          .in('workout_session_id', sessionIds)

        if (setsData) setWorkoutSets(setsData)

        const { data: exercisesData } = await supabase
          .from('exercises')
          .select('id, name, name_nl, body_part, target_muscle')

        if (exercisesData) setExercises(exercisesData)
      }

      const { data: prsData } = await supabase
        .from('personal_records')
        .select('*, exercises(id, name, name_nl)')
        .eq('client_id', user.id)
        .order('achieved_at', { ascending: false })

      if (prsData) setPersonalRecords(prsData as PersonalRecord[])

      setLoading(false)
    }
    load()
  }, [])

  // ─── Time range filter ───────────────────────────────────

  const cutoffDate = useMemo(() => {
    if (timeRange === 'all') return null
    const weeks = parseInt(timeRange)
    const d = new Date()
    d.setDate(d.getDate() - weeks * 7)
    return d
  }, [timeRange])

  const filterByTime = (dateStr: string) => {
    if (!cutoffDate) return true
    return new Date(dateStr) >= cutoffDate
  }

  // ─── Derived data ─────────────────────────────────────────

  const latest = useMemo(() => checkins[checkins.length - 1], [checkins])
  const first = useMemo(() => checkins[0], [checkins])

  // Check-ins with photos
  const checkinsWithPhotos = useMemo(() =>
    checkins.filter(c => c.photo_front_url || c.photo_back_url || c.photo_left_url || c.photo_right_url),
    [checkins]
  )

  const fromCheckin = useMemo(() => checkins.find(c => c.date === compareFrom), [checkins, compareFrom])
  const toCheckin = useMemo(() => checkins.find(c => c.date === compareTo), [checkins, compareTo])

  // Exercises with logged data
  const exercisesWithData = useMemo(() => {
    const exerciseIds = new Set(workoutSets.filter(s => s.completed && s.weight_kg).map(s => s.exercise_id))
    return exercises.filter(e => exerciseIds.has(e.id)).sort((a, b) =>
      (a.name_nl || a.name).localeCompare(b.name_nl || b.name, 'nl-BE')
    )
  }, [exercises, workoutSets])

  const selectedExercise = useMemo(() =>
    exercises.find(e => e.id === selectedExerciseId),
    [exercises, selectedExerciseId]
  )

  useEffect(() => {
    if (!selectedExerciseId && exercisesWithData.length > 0) {
      setSelectedExerciseId(exercisesWithData[0].id)
    }
  }, [exercisesWithData, selectedExerciseId])

  // Strength data for selected exercise
  const krachtData = useMemo(() => {
    if (!selectedExerciseId || workoutSets.length === 0) return []

    const relevantSets = workoutSets
      .filter(set => set.exercise_id === selectedExerciseId && set.completed && set.weight_kg)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    const grouped: { [key: string]: { maxWeight: number; maxReps: number; volume: number } } = {}
    relevantSets.forEach(set => {
      const date = new Date(set.created_at).toISOString().split('T')[0]
      const w = set.weight_kg || 0
      const r = set.actual_reps || 0
      if (!grouped[date]) grouped[date] = { maxWeight: 0, maxReps: 0, volume: 0 }
      grouped[date].maxWeight = Math.max(grouped[date].maxWeight, w)
      grouped[date].maxReps = Math.max(grouped[date].maxReps, r)
      grouped[date].volume += w * r
    })

    return Object.entries(grouped)
      .filter(([date]) => filterByTime(date))
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' }),
        fullDate: date,
        weight: data.maxWeight,
        reps: data.maxReps,
        volume: Math.round(data.volume),
      }))
  }, [selectedExerciseId, workoutSets, cutoffDate])

  // Volume data per week
  const volumeData = useMemo(() => {
    const weekMap: { [key: string]: { volume: number; sets: number; workouts: Set<string> } } = {}

    workoutSets
      .filter(s => s.completed && s.weight_kg && s.actual_reps && filterByTime(s.created_at))
      .forEach(set => {
        const week = getWeekNumber(new Date(set.created_at))
        if (!weekMap[week]) weekMap[week] = { volume: 0, sets: 0, workouts: new Set() }
        weekMap[week].volume += (set.weight_kg || 0) * (set.actual_reps || 0)
        weekMap[week].sets++
        weekMap[week].workouts.add(set.workout_session_id)
      })

    const maxWeeks = timeRange === 'all' ? 12 : parseInt(timeRange)
    return Object.entries(weekMap)
      .slice(-maxWeeks)
      .map(([week, data]) => ({
        week,
        volume: Math.round(data.volume),
        sets: data.sets,
        workouts: data.workouts.size,
      }))
  }, [workoutSets, cutoffDate, timeRange])

  // Muscle group volume breakdown
  const muscleGroupVolume = useMemo(() => {
    const exerciseMap = new Map(exercises.map(e => [e.id, e]))
    const groupMap: { [key: string]: { volume: number; sets: number } } = {}

    workoutSets
      .filter(s => s.completed && s.weight_kg && s.actual_reps && filterByTime(s.created_at))
      .forEach(set => {
        const exercise = exerciseMap.get(set.exercise_id)
        const group = exercise?.body_part || 'Overig'
        if (!groupMap[group]) groupMap[group] = { volume: 0, sets: 0 }
        groupMap[group].volume += (set.weight_kg || 0) * (set.actual_reps || 0)
        groupMap[group].sets++
      })

    const totalVolume = Object.values(groupMap).reduce((s, g) => s + g.volume, 0)
    return Object.entries(groupMap)
      .map(([group, data]) => ({
        name: group.charAt(0).toUpperCase() + group.slice(1),
        volume: Math.round(data.volume),
        sets: data.sets,
        percentage: totalVolume > 0 ? Math.round((data.volume / totalVolume) * 100) : 0,
      }))
      .sort((a, b) => b.volume - a.volume)
  }, [exercises, workoutSets, cutoffDate])

  // Training frequency heatmap (last 12 weeks)
  const trainingHeatmap = useMemo(() => {
    const now = new Date()
    const weeks: { weekLabel: string; days: { date: string; trained: boolean }[] }[] = []

    for (let w = 11; w >= 0; w--) {
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1 - w * 7) // Monday
      const days: { date: string; trained: boolean }[] = []

      for (let d = 0; d < 7; d++) {
        const day = new Date(weekStart)
        day.setDate(day.getDate() + d)
        const dateStr = day.toISOString().split('T')[0]
        const hasSets = workoutSets.some(s =>
          s.completed && new Date(s.created_at).toISOString().split('T')[0] === dateStr
        )
        days.push({ date: dateStr, trained: hasSets })
      }

      weeks.push({
        weekLabel: getWeekNumber(weekStart),
        days,
      })
    }
    return weeks
  }, [workoutSets])

  // Body measurement charts
  const lichaamData = useMemo(() =>
    checkins
      .filter(c => filterByTime(c.date))
      .map(c => ({
        date: c.date,
        label: new Date(c.date).toLocaleDateString('nl-BE', { month: 'short', day: 'numeric' }),
        weight: c.weight_kg,
        bodyFat: c.body_fat_pct,
        muscle: c.muscle_mass_kg,
      })),
    [checkins, cutoffDate]
  )

  // Delta calculations
  const deltas = useMemo(() => {
    if (!latest || !first) return null
    return {
      weight: latest.weight_kg && first.weight_kg ? Number(latest.weight_kg) - Number(first.weight_kg) : null,
      bodyFat: latest.body_fat_pct && first.body_fat_pct ? Number(latest.body_fat_pct) - Number(first.body_fat_pct) : null,
      muscle: latest.muscle_mass_kg && first.muscle_mass_kg ? Number(latest.muscle_mass_kg) - Number(first.muscle_mass_kg) : null,
    }
  }, [latest, first])

  // ─── Time Range Selector ─────────────────────────────────

  const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: '4w', label: '4 wkn' },
    { value: '8w', label: '8 wkn' },
    { value: '12w', label: '12 wkn' },
    { value: 'all', label: 'Alles' },
  ]

  const TimeRangeBar = () => (
    <div className="flex gap-1 p-1 bg-[#F0F0ED] rounded-xl">
      {timeRangeOptions.map(opt => (
        <button
          key={opt.value}
          onClick={() => setTimeRange(opt.value)}
          className={`flex-1 py-1.5 px-2 rounded-lg text-[12px] font-semibold transition-all ${
            timeRange === opt.value
              ? 'bg-white text-[#1A1A18] shadow-sm'
              : 'text-[#8E8E93] hover:text-[#1A1A18]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )

  // ─── Render ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[32px] font-[family-name:var(--font-display)] text-[#1A1A18] mb-2">Voortgang</h1>
          <p className="text-[#8E8E93] text-[15px]">Laden...</p>
        </div>
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-2xl h-64 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const angles = [
    { key: 'front' as const, label: 'Voor' },
    { key: 'back' as const, label: 'Achter' },
    { key: 'left' as const, label: 'Links' },
    { key: 'right' as const, label: 'Rechts' },
  ]

  const tabs: { key: TabType; label: string; color: string }[] = [
    { key: 'fotos', label: "Foto's", color: '#8B6914' },
    { key: 'kracht', label: 'Kracht', color: '#007AFF' },
    { key: 'volume', label: 'Volume', color: '#FF9500' },
    { key: 'prs', label: "PR's", color: '#AF52DE' },
    { key: 'lichaam', label: 'Lichaam', color: '#34C759' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[32px] font-[family-name:var(--font-display)] text-[#1A1A18] mb-2">Voortgang</h1>
        <p className="text-[#8E8E93] text-[15px]">Volg je voortgang in detail</p>
      </div>

      {/* Summary Cards */}
      {deltas && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Gewicht', value: deltas.weight, unit: 'kg', inverted: false },
            { label: 'Vetpercentage', value: deltas.bodyFat, unit: '%', inverted: true },
            { label: 'Spiermassa', value: deltas.muscle, unit: 'kg', inverted: false },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED]">
              <p className="text-[11px] text-[#8E8E93] uppercase font-medium tracking-wide">{stat.label}</p>
              {stat.value !== null ? (
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[20px] font-bold" style={{ color: deltaColor(stat.value, stat.inverted) }}>
                    {stat.value > 0 ? '+' : ''}{stat.value.toFixed(1)}
                  </span>
                  <span className="text-[12px] text-[#C7C7CC]">{stat.unit}</span>
                  {stat.value !== 0 && (
                    stat.value > 0 ?
                      <ArrowUpRight strokeWidth={2} className="w-4 h-4" style={{ color: deltaColor(stat.value, stat.inverted) }} /> :
                      <ArrowDownRight strokeWidth={2} className="w-4 h-4" style={{ color: deltaColor(stat.value, stat.inverted) }} />
                  )}
                </div>
              ) : (
                <p className="text-[18px] font-bold text-[#C7C7CC] mt-2">—</p>
              )}
              <p className="text-[10px] text-[#C7C7CC] mt-1">sinds start</p>
            </div>
          ))}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all whitespace-nowrap"
            style={{
              backgroundColor: activeTab === tab.key ? tab.color : 'transparent',
              color: activeTab === tab.key ? 'white' : '#8E8E93',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── FOTO'S TAB ─────────────────────────────────── */}
      {activeTab === 'fotos' && (
        <div className="space-y-4">
          {checkinsWithPhotos.length >= 2 ? (
            <>
              {/* Date Selectors */}
              <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED]">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-2">
                      Voor (start)
                    </label>
                    <select
                      value={compareFrom}
                      onChange={(e) => setCompareFrom(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-[#F0F0ED] text-[14px] text-[#1A1A18] bg-white focus:outline-none focus:border-[#8B6914]"
                    >
                      {checkinsWithPhotos.map((c) => (
                        <option key={c.date} value={c.date}>
                          {new Date(c.date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-2">
                      Na (huidig)
                    </label>
                    <select
                      value={compareTo}
                      onChange={(e) => setCompareTo(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-[#F0F0ED] text-[14px] text-[#1A1A18] bg-white focus:outline-none focus:border-[#8B6914]"
                    >
                      {checkinsWithPhotos.map((c) => (
                        <option key={c.date} value={c.date}>
                          {new Date(c.date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Quick presets */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-[#F0F0ED]">
                  <button
                    onClick={() => {
                      setCompareFrom(checkinsWithPhotos[0].date)
                      setCompareTo(checkinsWithPhotos[checkinsWithPhotos.length - 1].date)
                    }}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[#8B6914]/10 text-[#8B6914] hover:bg-[#8B6914]/20 transition-colors"
                  >
                    Eerste vs laatste
                  </button>
                  {checkinsWithPhotos.length >= 3 && (
                    <button
                      onClick={() => {
                        setCompareFrom(checkinsWithPhotos[checkinsWithPhotos.length - 2].date)
                        setCompareTo(checkinsWithPhotos[checkinsWithPhotos.length - 1].date)
                      }}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[#F5F5F3] text-[#8E8E93] hover:bg-[#E8E8E5] transition-colors"
                    >
                      Vorige vs laatste
                    </button>
                  )}
                </div>
              </div>

              {/* Angle selector */}
              <div className="flex gap-2">
                {angles.map(({ key, label }) => {
                  const hasFromPhoto = fromCheckin && (fromCheckin as any)[`photo_${key}_url`]
                  const hasToPhoto = toCheckin && (toCheckin as any)[`photo_${key}_url`]
                  const available = hasFromPhoto && hasToPhoto
                  return (
                    <button
                      key={key}
                      onClick={() => available && setActiveAngle(key)}
                      disabled={!available}
                      className="flex-1 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
                      style={{
                        backgroundColor: activeAngle === key ? '#8B6914' : available ? 'white' : '#F5F5F3',
                        color: activeAngle === key ? 'white' : available ? '#1A1A18' : '#C7C7CC',
                        border: `1px solid ${activeAngle === key ? '#8B6914' : '#F0F0ED'}`,
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              {/* Photo Slider */}
              {fromCheckin && toCheckin && (
                (() => {
                  const beforeUrl = (fromCheckin as any)[`photo_${activeAngle}_url`]
                  const afterUrl = (toCheckin as any)[`photo_${activeAngle}_url`]

                  if (!beforeUrl || !afterUrl) {
                    return (
                      <div className="bg-white rounded-2xl p-12 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] text-center">
                        <Camera strokeWidth={1.5} className="w-10 h-10 mx-auto mb-3 text-[#C7C7CC]" />
                        <p className="text-[14px] text-[#8E8E93]">Geen foto beschikbaar voor deze hoek</p>
                      </div>
                    )
                  }

                  const fromDate = new Date(compareFrom).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })
                  const toDate = new Date(compareTo).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })

                  return (
                    <PhotoSlider
                      beforeUrl={beforeUrl}
                      afterUrl={afterUrl}
                      beforeLabel={fromDate}
                      afterLabel={toDate}
                      height={500}
                    />
                  )
                })()
              )}

              {/* Weight comparison strip */}
              {fromCheckin && toCheckin && fromCheckin.weight_kg && toCheckin.weight_kg && (
                <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED]">
                  <div className="flex items-center justify-between">
                    <div className="text-center flex-1">
                      <p className="text-[11px] text-[#8E8E93] uppercase font-medium">Voor</p>
                      <p className="text-[20px] font-bold text-[#1A1A18] mt-1">{Number(fromCheckin.weight_kg).toFixed(1)} kg</p>
                    </div>
                    <div className="text-center px-4">
                      {(() => {
                        const delta = Number(toCheckin.weight_kg) - Number(fromCheckin.weight_kg)
                        return (
                          <span className="text-[15px] font-bold" style={{ color: deltaColor(delta) }}>
                            {delta > 0 ? '+' : ''}{delta.toFixed(1)} kg
                          </span>
                        )
                      })()}
                    </div>
                    <div className="text-center flex-1">
                      <p className="text-[11px] text-[#8E8E93] uppercase font-medium">Na</p>
                      <p className="text-[20px] font-bold text-[#1A1A18] mt-1">{Number(toCheckin.weight_kg).toFixed(1)} kg</p>
                    </div>
                  </div>
                </div>
              )}

              {/* All angles grid (thumbnails) */}
              <div className="grid grid-cols-4 gap-2">
                {angles.map(({ key, label }) => {
                  const url = toCheckin ? (toCheckin as any)[`photo_${key}_url`] : null
                  return (
                    <button
                      key={key}
                      onClick={() => url && setActiveAngle(key)}
                      className="rounded-xl overflow-hidden border-2 transition-all aspect-[3/4]"
                      style={{
                        borderColor: activeAngle === key ? '#8B6914' : '#F0F0ED',
                        opacity: url ? 1 : 0.4,
                      }}
                    >
                      {url ? (
                        <img src={url} alt={label} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-[#F5F5F3] flex items-center justify-center">
                          <Camera strokeWidth={1.5} className="w-5 h-5 text-[#C7C7CC]" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Photo timeline strip */}
              {checkinsWithPhotos.length >= 3 && (
                <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED]">
                  <h3 className="text-[15px] font-semibold text-[#1A1A18] mb-4">Foto tijdlijn</h3>

                  {/* Timeline scroll */}
                  <div className="overflow-x-auto -mx-2 px-2 pb-2">
                    <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
                      {checkinsWithPhotos.map((checkin, idx) => {
                        const photoUrl = (checkin as any)[`photo_${activeAngle}_url`] || (checkin as any).photo_front_url
                        const isSelected = checkin.date === compareFrom || checkin.date === compareTo
                        const isFrom = checkin.date === compareFrom
                        const isTo = checkin.date === compareTo

                        // Calculate weeks since first photo
                        const firstDate = new Date(checkinsWithPhotos[0].date)
                        const thisDate = new Date(checkin.date)
                        const weeksSinceStart = Math.round((thisDate.getTime() - firstDate.getTime()) / (7 * 24 * 60 * 60 * 1000))

                        // Show interval markers at 4, 8, 12 weeks
                        const showIntervalMarker = weeksSinceStart > 0 && weeksSinceStart % 4 === 0

                        return (
                          <div key={checkin.date} className="flex flex-col items-center gap-1.5">
                            <button
                              onClick={() => {
                                if (!compareFrom || (compareFrom && compareTo)) {
                                  setCompareFrom(checkin.date)
                                  setCompareTo('')
                                } else {
                                  if (new Date(checkin.date) > new Date(compareFrom)) {
                                    setCompareTo(checkin.date)
                                  } else {
                                    setCompareTo(compareFrom)
                                    setCompareFrom(checkin.date)
                                  }
                                }
                              }}
                              className="w-16 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0"
                              style={{
                                borderColor: isSelected ? '#8B6914' : '#F0F0ED',
                                boxShadow: isSelected ? '0 0 0 2px rgba(139,105,20,0.2)' : 'none',
                              }}
                            >
                              {photoUrl ? (
                                <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-[#F5F5F3] flex items-center justify-center">
                                  <Camera strokeWidth={1.5} className="w-4 h-4 text-[#C7C7CC]" />
                                </div>
                              )}
                            </button>
                            <span className={`text-[10px] font-medium ${isSelected ? 'text-[#8B6914]' : 'text-[#C7C7CC]'}`}>
                              {new Date(checkin.date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })}
                            </span>
                            {isFrom && <span className="text-[9px] font-bold text-[#8B6914] bg-[#8B6914]/10 px-1.5 py-0.5 rounded">VOOR</span>}
                            {isTo && <span className="text-[9px] font-bold text-[#8B6914] bg-[#8B6914]/10 px-1.5 py-0.5 rounded">NA</span>}
                            {showIntervalMarker && !isFrom && !isTo && (
                              <span className="text-[9px] font-medium text-[#FF9500] bg-[#FF9500]/10 px-1.5 py-0.5 rounded">
                                {weeksSinceStart}w
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <p className="text-[11px] text-[#C7C7CC] mt-2 text-center">
                    Tik op twee foto's om ze te vergelijken
                  </p>
                </div>
              )}
            </>
          ) : checkinsWithPhotos.length === 1 ? (
            <div className="bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] text-center">
              <Camera strokeWidth={1.5} className="w-12 h-12 mx-auto mb-4 text-[#8B6914]" />
              <p className="text-[15px] font-semibold text-[#1A1A18] mb-2">Eerste foto's opgeslagen!</p>
              <p className="text-[13px] text-[#8E8E93]">
                Na je volgende check-in kun je je foto's hier vergelijken met een interactieve slider.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] text-center">
              <Camera strokeWidth={1.5} className="w-12 h-12 mx-auto mb-4 text-[#C7C7CC]" />
              <p className="text-[15px] font-semibold text-[#1A1A18] mb-2">Nog geen foto's</p>
              <p className="text-[13px] text-[#8E8E93]">
                Upload foto's bij je volgende check-in om je voortgang visueel te volgen.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── KRACHT TAB ─────────────────────────────────── */}
      {activeTab === 'kracht' && (
        <div className="space-y-4">
          <TimeRangeBar />
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED]">
            <label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wide block mb-2">
              Oefening
            </label>
            <select
              value={selectedExerciseId}
              onChange={(e) => setSelectedExerciseId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[#F0F0ED] bg-white text-[15px] text-[#1A1A18] focus:outline-none focus:border-[#007AFF]"
            >
              {exercisesWithData.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name_nl || ex.name}</option>
              ))}
            </select>
          </div>

          {krachtData.length > 1 ? (
            <>
              {/* Strength chart */}
              <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[15px] font-semibold text-[#1A1A18]">
                    Max gewicht — {selectedExercise?.name_nl || selectedExercise?.name}
                  </h3>
                  {krachtData.length >= 2 && (
                    <span className="text-[13px] font-bold" style={{
                      color: deltaColor(krachtData[krachtData.length - 1].weight - krachtData[0].weight)
                    }}>
                      {krachtData[krachtData.length - 1].weight - krachtData[0].weight > 0 ? '+' : ''}
                      {(krachtData[krachtData.length - 1].weight - krachtData[0].weight).toFixed(1)} kg
                    </span>
                  )}
                </div>
                <div style={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={krachtData}>
                      <defs>
                        <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#007AFF" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#007AFF" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0F0ED" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8E8E93' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#8E8E93' }} domain={['dataMin - 5', 'dataMax + 5']} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #F0F0ED',
                          borderRadius: '12px',
                          fontSize: '13px',
                        }}
                        formatter={(value: any) => [`${value} kg`, 'Max gewicht']}
                      />
                      <Area type="monotone" dataKey="weight" stroke="#007AFF" strokeWidth={2.5}
                        fill="url(#blueGrad)" dot={{ fill: '#007AFF', r: 4 }} activeDot={{ r: 6 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Volume per session for this exercise */}
              <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED]">
                <h3 className="text-[15px] font-semibold text-[#1A1A18] mb-4">Volume per sessie (kg)</h3>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={krachtData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0F0ED" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8E8E93' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#8E8E93' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #F0F0ED',
                          borderRadius: '12px',
                          fontSize: '13px',
                        }}
                        formatter={(value: any) => [`${value.toLocaleString('nl-BE')} kg`, 'Volume']}
                      />
                      <Bar dataKey="volume" fill="#007AFF" radius={[6, 6, 0, 0]} opacity={0.7} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl p-12 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] text-center">
              <TrendingUp strokeWidth={1.5} className="w-10 h-10 mx-auto mb-3 text-[#C7C7CC]" />
              <p className="text-[14px] text-[#8E8E93]">
                {exercisesWithData.length === 0
                  ? 'Log je eerste workout om krachtprogressie te zien'
                  : 'Niet genoeg data voor een grafiek — log meer sessies'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── VOLUME TAB ────────────────────────────────── */}
      {activeTab === 'volume' && (
        <div className="space-y-4">
          <TimeRangeBar />
          {volumeData.length > 0 ? (
            <>
              {/* Volume stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] text-center">
                  <p className="text-[11px] text-[#8E8E93] uppercase font-medium">Deze week</p>
                  <p className="text-[20px] font-bold text-[#FF9500] mt-1">
                    {volumeData.length > 0 ? volumeData[volumeData.length - 1].volume.toLocaleString('nl-BE') : 0}
                  </p>
                  <p className="text-[11px] text-[#C7C7CC]">kg volume</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] text-center">
                  <p className="text-[11px] text-[#8E8E93] uppercase font-medium">Gem./week</p>
                  <p className="text-[20px] font-bold text-[#1A1A18] mt-1">
                    {Math.round(volumeData.reduce((s, d) => s + d.volume, 0) / volumeData.length).toLocaleString('nl-BE')}
                  </p>
                  <p className="text-[11px] text-[#C7C7CC]">kg volume</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] text-center">
                  <p className="text-[11px] text-[#8E8E93] uppercase font-medium">Totaal sets</p>
                  <p className="text-[20px] font-bold text-[#1A1A18] mt-1">
                    {volumeData.reduce((s, d) => s + d.sets, 0)}
                  </p>
                  <p className="text-[11px] text-[#C7C7CC]">afgelopen weken</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED]">
                <h3 className="text-[15px] font-semibold text-[#1A1A18] mb-4">Wekelijks totaalvolume</h3>
                <div style={{ height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={volumeData}>
                      <defs>
                        <linearGradient id="orangeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF9500" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#FF9500" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0F0ED" />
                      <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#8E8E93' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#8E8E93' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #F0F0ED',
                          borderRadius: '12px',
                          fontSize: '13px',
                        }}
                        formatter={(value: any, name: any) => [
                          `${value.toLocaleString('nl-BE')} ${name === 'volume' ? 'kg' : ''}`,
                          name === 'volume' ? 'Volume' : 'Sets'
                        ]}
                      />
                      <Bar dataKey="volume" fill="#FF9500" radius={[6, 6, 0, 0]} opacity={0.8} />
                      <Line type="monotone" dataKey="volume" stroke="#FF9500" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Muscle group volume breakdown */}
              {muscleGroupVolume.length > 0 && (
                <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED]">
                  <h3 className="text-[15px] font-semibold text-[#1A1A18] mb-4">Volume per spiergroep</h3>

                  {/* Donut chart + legend */}
                  <div className="flex items-center gap-4">
                    <div className="w-[140px] h-[140px] shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={muscleGroupVolume}
                            cx="50%"
                            cy="50%"
                            innerRadius={38}
                            outerRadius={65}
                            paddingAngle={2}
                            dataKey="volume"
                          >
                            {muscleGroupVolume.map((entry, index) => (
                              <Cell
                                key={entry.name}
                                fill={MUSCLE_GROUP_COLORS[entry.name] || FALLBACK_COLORS[index % FALLBACK_COLORS.length]}
                              />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-2">
                      {muscleGroupVolume.map((group, index) => {
                        const color = MUSCLE_GROUP_COLORS[group.name] || FALLBACK_COLORS[index % FALLBACK_COLORS.length]
                        return (
                          <div key={group.name} className="flex items-center gap-2.5">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-[13px] font-medium text-[#1A1A18] truncate">{group.name}</span>
                                <span className="text-[12px] font-semibold text-[#8E8E93] shrink-0 ml-2">{group.percentage}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-[#F0F0ED] rounded-full mt-1 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${group.percentage}%`, backgroundColor: color }}
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Sets per group */}
                  <div className="mt-4 pt-4 border-t border-[#F0F0ED] grid grid-cols-2 gap-2">
                    {muscleGroupVolume.slice(0, 6).map((group, index) => {
                      const color = MUSCLE_GROUP_COLORS[group.name] || FALLBACK_COLORS[index % FALLBACK_COLORS.length]
                      return (
                        <div key={group.name} className="flex items-center gap-2 px-3 py-2 bg-[#FAFAFA] rounded-xl">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-[12px] text-[#8E8E93] truncate">{group.name}</span>
                          <span className="text-[12px] font-bold text-[#1A1A18] ml-auto">{group.sets} sets</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Training frequency heatmap */}
              {trainingHeatmap.length > 0 && (
                <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED]">
                  <div className="flex items-center gap-2 mb-4">
                    <Flame strokeWidth={1.5} className="w-4 h-4 text-[#FF9500]" />
                    <h3 className="text-[15px] font-semibold text-[#1A1A18]">Trainingsfrequentie</h3>
                  </div>

                  {/* Day labels */}
                  <div className="flex gap-1 mb-1">
                    <div className="w-8 shrink-0" />
                    {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map(day => (
                      <div key={day} className="flex-1 text-center text-[9px] font-medium text-[#C7C7CC]">{day}</div>
                    ))}
                  </div>

                  {/* Heatmap grid */}
                  <div className="space-y-1">
                    {trainingHeatmap.map((week) => (
                      <div key={week.weekLabel} className="flex gap-1 items-center">
                        <span className="w-8 text-[9px] text-[#C7C7CC] font-medium shrink-0">{week.weekLabel}</span>
                        {week.days.map((day) => {
                          const isFuture = new Date(day.date) > new Date()
                          return (
                            <div
                              key={day.date}
                              className="flex-1 aspect-square rounded-[3px] transition-colors"
                              style={{
                                backgroundColor: isFuture
                                  ? '#FAFAFA'
                                  : day.trained
                                    ? '#FF9500'
                                    : '#F0F0ED',
                                opacity: isFuture ? 0.5 : 1,
                              }}
                              title={`${new Date(day.date).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })}${day.trained ? ' — Getraind' : ''}`}
                            />
                          )
                        })}
                      </div>
                    ))}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-end gap-2 mt-3 pt-2">
                    <span className="text-[10px] text-[#C7C7CC]">Niet getraind</span>
                    <div className="w-3 h-3 rounded-[2px] bg-[#F0F0ED]" />
                    <div className="w-3 h-3 rounded-[2px] bg-[#FF9500]" />
                    <span className="text-[10px] text-[#C7C7CC]">Getraind</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl p-12 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] text-center">
              <p className="text-[14px] text-[#8E8E93]">Log workouts om je volume te tracken</p>
            </div>
          )}
        </div>
      )}

      {/* ─── PR'S TAB ──────────────────────────────────── */}
      {activeTab === 'prs' && (
        <div className="space-y-4">
          {personalRecords.length > 0 ? (
            <>
              {/* PR count */}
              <div className="bg-[#AF52DE]/5 rounded-2xl p-4 flex items-center gap-3 border border-[#AF52DE]/10">
                <div className="w-10 h-10 rounded-full bg-[#AF52DE] flex items-center justify-center">
                  <Trophy strokeWidth={1.5} className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[17px] font-bold text-[#1A1A18]">{personalRecords.length} persoonlijke records</p>
                  <p className="text-[12px] text-[#8E8E93]">
                    Laatste PR: {new Date(personalRecords[0].achieved_at).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long' })}
                  </p>
                </div>
              </div>

              {/* PR list */}
              <div className="space-y-3">
                {personalRecords.map(pr => (
                  <div
                    key={pr.id}
                    className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#AF52DE]/10 flex items-center justify-center shrink-0">
                      <Trophy strokeWidth={1.5} className="w-5 h-5 text-[#AF52DE]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-[#1A1A18] truncate">
                        {(pr as any).exercises?.name_nl || (pr as any).exercises?.name || 'Oefening'}
                      </p>
                      <p className="text-[12px] text-[#8E8E93]">
                        {new Date(pr.achieved_at).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[20px] font-bold text-[#AF52DE]">{pr.value}</p>
                      <p className="text-[11px] text-[#C7C7CC]">
                        {pr.record_type === 'weight' ? 'kg' : pr.record_type === 'reps' ? 'reps' : 'kg vol'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl p-12 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] text-center">
              <Trophy strokeWidth={1.5} className="w-12 h-12 mx-auto mb-4 text-[#C7C7CC]" />
              <p className="text-[15px] font-semibold text-[#1A1A18] mb-2">Nog geen PR's</p>
              <p className="text-[13px] text-[#8E8E93]">Log workouts en je PR's worden automatisch bijgehouden</p>
            </div>
          )}
        </div>
      )}

      {/* ─── LICHAAM TAB ───────────────────────────────── */}
      {activeTab === 'lichaam' && (
        <div className="space-y-4">
          <TimeRangeBar />
          {lichaamData.length > 0 ? (
            <>
              {/* Weight chart */}
              <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED]">
                <h3 className="text-[15px] font-semibold text-[#1A1A18] mb-4">Gewicht</h3>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={lichaamData}>
                      <defs>
                        <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#34C759" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#34C759" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0F0ED" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8E8E93' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#8E8E93' }} domain={['dataMin - 2', 'dataMax + 2']} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'white', border: '1px solid #F0F0ED', borderRadius: '12px', fontSize: '13px' }}
                        formatter={(value: any) => [`${value} kg`, 'Gewicht']}
                      />
                      <Area type="monotone" dataKey="weight" stroke="#34C759" strokeWidth={2.5}
                        fill="url(#greenGrad)" dot={{ fill: '#34C759', r: 4 }} activeDot={{ r: 6 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Body fat chart */}
              {lichaamData.some(d => d.bodyFat) && (
                <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED]">
                  <h3 className="text-[15px] font-semibold text-[#1A1A18] mb-4">Vetpercentage</h3>
                  <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={lichaamData}>
                        <defs>
                          <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#AF52DE" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#AF52DE" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F0F0ED" />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8E8E93' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#8E8E93' }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'white', border: '1px solid #F0F0ED', borderRadius: '12px', fontSize: '13px' }}
                          formatter={(value: any) => [`${value}%`, 'Vetpercentage']}
                        />
                        <Area type="monotone" dataKey="bodyFat" stroke="#AF52DE" strokeWidth={2.5}
                          fill="url(#purpleGrad)" dot={{ fill: '#AF52DE', r: 4 }} activeDot={{ r: 6 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Current measurements */}
              {latest && (
                <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED]">
                  <h3 className="text-[15px] font-semibold text-[#1A1A18] mb-4">Huidige metingen</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Gewicht', value: latest.weight_kg, unit: 'kg' },
                      { label: 'Vetpercentage', value: latest.body_fat_pct, unit: '%' },
                      { label: 'Spiermassa', value: latest.muscle_mass_kg, unit: 'kg' },
                      { label: 'BMI', value: latest.bmi, unit: '' },
                    ].map(({ label, value, unit }) => (
                      <div key={label} className="p-3 bg-[#FAFAFA] rounded-xl">
                        <p className="text-[12px] text-[#8E8E93] font-medium">{label}</p>
                        <p className="text-[18px] font-bold text-[#1A1A18] mt-1">
                          {value !== null && value !== undefined ? Number(value).toFixed(1) : '—'} {unit}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl p-12 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] text-center">
              <p className="text-[14px] text-[#8E8E93]">Dien je eerste check-in in om lichaamsdata te zien</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
