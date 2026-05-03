'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from '@/components/charts/LazyRecharts'
import { Trophy, TrendingUp, Dumbbell, Flame, ChevronDown } from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────

interface Exercise {
  id: string
  name: string
  name_nl: string | null
  body_part: string
  target_muscle: string
}

interface WorkoutSet {
  id: string
  workout_session_id: string
  exercise_id: string
  set_number: number
  actual_reps: number | null
  weight_kg: number | null
  is_pr: boolean
  created_at: string
}

interface WorkoutSession {
  id: string
  started_at: string
  completed_at: string | null
  duration_seconds: number | null
}

interface PersonalRecord {
  id: string
  exercise_id: string
  record_type: string
  value: number
  achieved_at: string
  exercise?: Exercise
}

type TabType = 'kracht' | 'volume' | 'prs'
type TimeRange = '4w' | '8w' | '12w' | 'all'
type GroupBy = 'spiergroep' | 'oefening'

// ─── Helpers ────────────────────────────────────────────────

const MUSCLE_GROUPS: Record<string, string[]> = {
  'Borst': ['chest', 'pectorals'],
  'Rug': ['back', 'lats', 'upper back', 'lower back', 'traps', 'trapezius'],
  'Schouders': ['shoulders', 'delts', 'deltoids'],
  'Armen': ['biceps', 'triceps', 'forearms'],
  'Benen': ['quads', 'quadriceps', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors'],
  'Core': ['abs', 'abdominals', 'obliques', 'core'],
}

const GROUP_COLORS: Record<string, string> = {
  'Borst': '#B55A4A',
  'Rug': '#3068C4',
  'Schouders': '#C0FC01',
  'Armen': '#2FA65A',
  'Benen': '#7B5EA7',
  'Core': '#B8447A',
  'Overig': 'rgba(253,253,254,0.55)',
}

function getMuscleGroup(target: string): string {
  const lower = target.toLowerCase()
  for (const [group, muscles] of Object.entries(MUSCLE_GROUPS)) {
    if (muscles.some(m => lower.includes(m))) return group
  }
  return 'Overig'
}

function getWeekKey(date: Date): string {
  const d = new Date(date)
  const dayNum = d.getDay() || 7
  d.setDate(d.getDate() - dayNum + 1)
  return d.toISOString().slice(0, 10)
}

function filterByRange(dateStr: string, range: TimeRange): boolean {
  if (range === 'all') return true
  const weeks = range === '4w' ? 4 : range === '8w' ? 8 : 12
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - weeks * 7)
  return new Date(dateStr) >= cutoff
}

// ─── Animated Number ────────────────────────────────────────

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (value === 0) { setDisplay(0); return }
    const startTime = performance.now()
    function animate(currentTime: number) {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / 1000, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * value))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [value])
  return <span>{display.toLocaleString('nl-BE')}{suffix}</span>
}

// ─── Custom Tooltip ─────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#474B48] text-white px-3 py-2 text-[12px] font-medium">
      <p>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-bold">{p.name}: {typeof p.value === 'number' ? Math.round(p.value).toLocaleString('nl-BE') : p.value}</p>
      ))}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────

export default function StatsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('kracht')
  const [exercises, setExercises] = useState<Record<string, Exercise>>({})
  const [workoutSets, setWorkoutSets] = useState<WorkoutSet[]>([])
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([])
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<TimeRange>('12w')
  const [groupBy, setGroupBy] = useState<GroupBy>('spiergroep')
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Sessions — limit to last 6 months for performance
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      // PRs don't depend on sessions — start in parallel
      const prsPromise = supabase
        .from('personal_records')
        .select('id, exercise_id, record_type, value, achieved_at, exercises(name, name_nl, body_part, target_muscle)')
        .eq('client_id', user.id)
        .order('achieved_at', { ascending: false })

      const { data: sessions } = await supabase
        .from('workout_sessions')
        .select('id, started_at, completed_at, duration_seconds')
        .eq('client_id', user.id)
        .not('completed_at', 'is', null)
        .gte('started_at', sixMonthsAgo.toISOString())
        .order('started_at', { ascending: true })

      if (sessions) {
        setWorkoutSessions(sessions as WorkoutSession[])

        const sessionIds = sessions.map(s => s.id)
        if (sessionIds.length > 0) {
          const { data: sets } = await supabase
            .from('workout_sets')
            .select('id, workout_session_id, exercise_id, set_number, actual_reps, weight_kg, is_pr, created_at')
            .in('workout_session_id', sessionIds)

          if (sets) setWorkoutSets(sets as WorkoutSet[])

          // Get exercise IDs
          const exerciseIds = [...new Set((sets || []).map(s => s.exercise_id))]
          if (exerciseIds.length > 0) {
            const { data: exData } = await supabase
              .from('exercises')
              .select('id, name, name_nl, body_part, target_muscle')
              .in('id', exerciseIds)

            if (exData) {
              const map: Record<string, Exercise> = {}
              for (const ex of exData) map[ex.id] = ex as Exercise
              setExercises(map)
            }
          }
        }
      }

      // Await PRs (was running in parallel with sessions chain)
      const { data: prs } = await prsPromise
      if (prs) setPersonalRecords(prs as any[])

      setLoading(false)
    }
    load()
  }, [])

  // Session map for date lookup
  const sessionMap = useMemo(() => {
    const map: Record<string, WorkoutSession> = {}
    for (const s of workoutSessions) map[s.id] = s
    return map
  }, [workoutSessions])

  // ─── TOTAL VOLUME (for hero) ───────────────────────────
  const totalVolume = useMemo(() => {
    return workoutSets
      .filter(s => {
        const session = sessionMap[s.workout_session_id]
        return session && filterByRange(session.started_at, timeRange)
      })
      .reduce((sum, s) => sum + (s.weight_kg || 0) * (s.actual_reps || 0), 0)
  }, [workoutSets, sessionMap, timeRange])

  // ─── KRACHT DATA: max weight per week, grouped ─────────
  const krachtData = useMemo(() => {
    const filtered = workoutSets.filter(s => {
      const session = sessionMap[s.workout_session_id]
      return session && filterByRange(session.started_at, timeRange)
    })

    if (groupBy === 'spiergroep') {
      // Group by muscle group → weekly max weight
      const weekMap: Record<string, Record<string, number>> = {}
      for (const s of filtered) {
        const session = sessionMap[s.workout_session_id]
        if (!session) continue
        const week = getWeekKey(new Date(session.started_at))
        const ex = exercises[s.exercise_id]
        if (!ex) continue
        const group = getMuscleGroup(ex.target_muscle)

        if (!weekMap[week]) weekMap[week] = {}
        weekMap[week][group] = Math.max(weekMap[week][group] || 0, s.weight_kg || 0)
      }

      return Object.entries(weekMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, groups]) => ({
          week: `${new Date(week).getDate()}/${new Date(week).getMonth() + 1}`,
          ...groups,
        }))
    } else {
      // Per exercise if selectedExercise
      if (!selectedExercise) return []
      const weekMap: Record<string, number> = {}
      for (const s of filtered) {
        if (s.exercise_id !== selectedExercise) continue
        const session = sessionMap[s.workout_session_id]
        if (!session) continue
        const week = getWeekKey(new Date(session.started_at))
        weekMap[week] = Math.max(weekMap[week] || 0, s.weight_kg || 0)
      }
      return Object.entries(weekMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, max]) => ({
          week: `${new Date(week).getDate()}/${new Date(week).getMonth() + 1}`,
          gewicht: max,
        }))
    }
  }, [workoutSets, sessionMap, exercises, timeRange, groupBy, selectedExercise])

  // ─── VOLUME DATA: total volume per week ────────────────
  const volumeData = useMemo(() => {
    const filtered = workoutSets.filter(s => {
      const session = sessionMap[s.workout_session_id]
      return session && filterByRange(session.started_at, timeRange)
    })

    if (groupBy === 'spiergroep') {
      const weekMap: Record<string, Record<string, number>> = {}
      for (const s of filtered) {
        const session = sessionMap[s.workout_session_id]
        if (!session) continue
        const week = getWeekKey(new Date(session.started_at))
        const ex = exercises[s.exercise_id]
        if (!ex) continue
        const group = getMuscleGroup(ex.target_muscle)
        const vol = (s.weight_kg || 0) * (s.actual_reps || 0)

        if (!weekMap[week]) weekMap[week] = {}
        weekMap[week][group] = (weekMap[week][group] || 0) + vol
      }

      return Object.entries(weekMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, groups]) => {
          const transformed: Record<string, any> = {
            week: `${new Date(week).getDate()}/${new Date(week).getMonth() + 1}`,
          }
          for (const [k, v] of Object.entries(groups)) {
            transformed[k] = Math.round(v / 1000) // in tons
          }
          return transformed
        })
    } else {
      if (!selectedExercise) return []
      const weekMap: Record<string, number> = {}
      for (const s of filtered) {
        if (s.exercise_id !== selectedExercise) continue
        const session = sessionMap[s.workout_session_id]
        if (!session) continue
        const week = getWeekKey(new Date(session.started_at))
        weekMap[week] = (weekMap[week] || 0) + (s.weight_kg || 0) * (s.actual_reps || 0)
      }
      return Object.entries(weekMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, vol]) => ({
          week: `${new Date(week).getDate()}/${new Date(week).getMonth() + 1}`,
          volume: Math.round(vol),
        }))
    }
  }, [workoutSets, sessionMap, exercises, timeRange, groupBy, selectedExercise])

  // Available muscle groups in data
  const availableGroups = useMemo(() => {
    const groups = new Set<string>()
    for (const s of workoutSets) {
      const ex = exercises[s.exercise_id]
      if (ex) groups.add(getMuscleGroup(ex.target_muscle))
    }
    return Array.from(groups).sort()
  }, [workoutSets, exercises])

  // Available exercises
  const availableExercises = useMemo(() => {
    const exIds = new Set(workoutSets.map(s => s.exercise_id))
    return Array.from(exIds)
      .map(id => exercises[id])
      .filter(Boolean)
      .sort((a, b) => (a.name_nl || a.name).localeCompare(b.name_nl || b.name))
  }, [workoutSets, exercises])

  // Filtered PRs
  const filteredPrs = useMemo(() => {
    let prs = personalRecords
    if (selectedGroup) {
      prs = prs.filter(pr => {
        const ex = pr.exercise as any
        return ex && getMuscleGroup(ex.target_muscle) === selectedGroup
      })
    }
    if (selectedExercise) {
      prs = prs.filter(pr => pr.exercise_id === selectedExercise)
    }
    return prs.filter(pr => filterByRange(pr.achieved_at, timeRange))
  }, [personalRecords, selectedGroup, selectedExercise, timeRange])

  const tabs: { id: TabType; label: string }[] = [
    { id: 'kracht', label: 'Kracht' },
    { id: 'volume', label: 'Volume' },
    { id: 'prs', label: "PR's" },
  ]

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-6 h-6 border-[1.5px] border-[rgba(253,253,254,0.48)] border-t-[#FDFDFE] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="pb-24">
      {/* Hero Section */}
      <div className="mb-14 animate-slide-up">
        <p className="text-label mb-3">Training</p>
        <p className="stat-number-hero text-[#1C1E18]">
          <AnimatedNumber value={Math.round(totalVolume / 1000)} suffix=" ton" />
        </p>
        <p className="text-[16px] text-[rgba(28,30,24,0.62)] mt-2">totaal volume</p>
      </div>

      {/* Tab bar */}
      <div className="flex mb-8 animate-slide-up stagger-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-[13px] font-semibold uppercase tracking-[0.06em] transition-all border-b-2 text-center ${
              activeTab === tab.id
                ? 'border-[#FDFDFE] text-[#1C1E18]'
                : 'border-transparent text-[rgba(28,30,24,0.60)] hover:opacity-60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Controls: time range + grouping */}
      <div className="flex items-center justify-between mb-8 animate-slide-up stagger-3">
        <div className="flex gap-1">
          {(['4w', '8w', '12w', 'all'] as TimeRange[]).map(r => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] transition-all ${
                timeRange === r ? 'bg-[#474B48] text-white' : 'text-[rgba(28,30,24,0.62)] hover:text-[#1C1E18]'
              }`}
            >
              {r === 'all' ? 'Alles' : r}
            </button>
          ))}
        </div>

        <div className="flex gap-1">
          <button
            onClick={() => { setGroupBy('spiergroep'); setSelectedExercise(null) }}
            className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] transition-all ${
              groupBy === 'spiergroep' ? 'bg-[#474B48] text-white' : 'text-[rgba(28,30,24,0.62)] hover:text-[#1C1E18]'
            }`}
          >
            Spiergroep
          </button>
          <button
            onClick={() => setGroupBy('oefening')}
            className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] transition-all ${
              groupBy === 'oefening' ? 'bg-[#474B48] text-white' : 'text-[rgba(28,30,24,0.62)] hover:text-[#1C1E18]'
            }`}
          >
            Oefening
          </button>
        </div>
      </div>

      {/* Exercise selector when groupBy = oefening */}
      {groupBy === 'oefening' && (
        <div className="relative mb-8">
          <select
            value={selectedExercise || ''}
            onChange={(e) => setSelectedExercise(e.target.value || null)}
            className="w-full py-2.5 px-4 bg-[rgba(255,255,255,0.50)] backdrop-blur-md border border-[rgba(28,30,24,0.10)] text-[14px] text-[#1C1E18] appearance-none pr-10 focus:border-[#FDFDFE] outline-none rounded-xl"
          >
            <option value="">Selecteer een oefening...</option>
            {availableExercises.map(ex => (
              <option key={ex.id} value={ex.id}>
                {ex.name_nl || ex.name} — {getMuscleGroup(ex.target_muscle)}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgba(28,30,24,0.62)] pointer-events-none" />
        </div>
      )}

      {/* Spiergroep filter pills when groupBy = spiergroep */}
      {groupBy === 'spiergroep' && (
        <div className="flex gap-1 mb-12 overflow-x-auto pb-1 -mx-4 px-4">
          <button
            onClick={() => setSelectedGroup(null)}
            className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] whitespace-nowrap shrink-0 ${
              !selectedGroup ? 'bg-[#474B48] text-white' : 'text-[rgba(28,30,24,0.62)]'
            }`}
          >
            Alles
          </button>
          {availableGroups.map(g => (
            <button
              key={g}
              onClick={() => setSelectedGroup(selectedGroup === g ? null : g)}
              className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] whitespace-nowrap shrink-0 ${
                selectedGroup === g ? 'bg-[#474B48] text-white' : 'text-[rgba(28,30,24,0.62)]'
              }`}
            >
              <span className="inline-block w-2 h-2 mr-1.5" style={{ backgroundColor: GROUP_COLORS[g] || 'rgba(253,253,254,0.55)' }} />
              {g}
            </button>
          ))}
        </div>
      )}

      {/* ═══ TAB: KRACHT ═══════════════════════════════════ */}
      {activeTab === 'kracht' && (
        <div className="animate-slide-up stagger-4">
          {krachtData.length > 0 ? (
            <div className="border-t border-[rgba(28,30,24,0.10)] pt-8 mt-12">
              <p className="text-label mb-3">Max gewicht per week (kg)</p>
              <ResponsiveContainer width="100%" height={220}>
                {groupBy === 'spiergroep' ? (
                  <BarChart data={krachtData} barGap={0} barCategoryGap="15%">
                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'rgba(253,253,254,0.48)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'rgba(253,253,254,0.48)' }} axisLine={false} tickLine={false} width={35} />
                    <Tooltip content={<ChartTooltip />} />
                    {(selectedGroup ? [selectedGroup] : availableGroups).map(g => (
                      <Bar key={g} dataKey={g} stackId="a" fill={GROUP_COLORS[g] || 'rgba(253,253,254,0.55)'} />
                    ))}
                  </BarChart>
                ) : (
                  <AreaChart data={krachtData}>
                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'rgba(253,253,254,0.48)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'rgba(253,253,254,0.48)' }} axisLine={false} tickLine={false} width={35} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="gewicht" stroke="#FDFDFE" fill="#FDFDFE" fillOpacity={0.1} strokeWidth={2} />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-12 text-[14px] text-[rgba(28,30,24,0.60)]">
              {groupBy === 'oefening' && !selectedExercise
                ? 'Selecteer een oefening om data te zien'
                : 'Geen data in deze periode'}
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: VOLUME ═══════════════════════════════════ */}
      {activeTab === 'volume' && (
        <div className="animate-slide-up stagger-4">
          {volumeData.length > 0 ? (
            <div className="border-t border-[rgba(28,30,24,0.10)] pt-8 mt-12">
              <p className="text-label mb-3">
                Volume per week {groupBy === 'spiergroep' ? '(ton)' : '(kg)'}
              </p>
              <ResponsiveContainer width="100%" height={220}>
                {groupBy === 'spiergroep' ? (
                  <BarChart data={volumeData} barGap={0} barCategoryGap="15%">
                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'rgba(253,253,254,0.48)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'rgba(253,253,254,0.48)' }} axisLine={false} tickLine={false} width={35} />
                    <Tooltip content={<ChartTooltip />} />
                    {(selectedGroup ? [selectedGroup] : availableGroups).map(g => (
                      <Bar key={g} dataKey={g} stackId="a" fill={GROUP_COLORS[g] || 'rgba(253,253,254,0.55)'} />
                    ))}
                  </BarChart>
                ) : (
                  <AreaChart data={volumeData}>
                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'rgba(253,253,254,0.48)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'rgba(253,253,254,0.48)' }} axisLine={false} tickLine={false} width={35} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="volume" stroke="#FDFDFE" fill="#FDFDFE" fillOpacity={0.1} strokeWidth={2} />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-12 text-[14px] text-[rgba(28,30,24,0.60)]">
              {groupBy === 'oefening' && !selectedExercise
                ? 'Selecteer een oefening om data te zien'
                : 'Geen data in deze periode'}
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: PR'S ═══════════════════════════════════ */}
      {activeTab === 'prs' && (
        <div className="animate-slide-up stagger-4">
          {filteredPrs.length === 0 ? (
            <div className="text-center py-12">
              <Trophy size={32} strokeWidth={1} className="text-[rgba(253,253,254,0.35)] mx-auto mb-4" />
              <p className="text-[14px] text-[rgba(28,30,24,0.60)]">Geen records in deze periode</p>
            </div>
          ) : (
            <div className="border-t border-[rgba(28,30,24,0.10)] mt-12">
              {filteredPrs.map((pr, idx) => {
                const ex = pr.exercise as any
                const exName = ex?.name_nl || ex?.name || 'Onbekend'
                const group = ex ? getMuscleGroup(ex.target_muscle) : 'Overig'
                const isLast = idx === filteredPrs.length - 1

                return (
                  <div key={pr.id} className={`flex items-center gap-3 py-4 ${!isLast ? 'border-b border-[rgba(28,30,24,0.10)]' : ''}`}>
                    <div className="w-9 h-9 flex items-center justify-center shrink-0" style={{ backgroundColor: `${GROUP_COLORS[group] || 'rgba(253,253,254,0.55)'}15` }}>
                      <Trophy size={16} strokeWidth={1.5} style={{ color: GROUP_COLORS[group] || 'rgba(253,253,254,0.55)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-[#1C1E18] truncate">{exName}</p>
                      <p className="text-[11px] text-[rgba(28,30,24,0.62)]">
                        {group} · {new Date(pr.achieved_at).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[18px] font-bold text-[#1C1E18] tabular-nums">
                        {pr.value}
                      </p>
                      <p className="text-[10px] text-[rgba(28,30,24,0.62)]">
                        {pr.record_type === 'weight' ? 'kg' : pr.record_type === 'reps' ? 'reps' : pr.record_type}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
