'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { SubPageHeader } from '@/components/layout/SubPageHeader'
import { Trophy, TrendingUp, ChevronRight, Search } from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────

interface WorkoutSet {
  exercise_id: string
  weight_kg: number | null
  actual_reps: number | null
  is_pr: boolean
  created_at: string
}

interface Exercise {
  id: string
  name: string
  name_nl: string | null
  body_part: string
  target_muscle: string
}

interface ExerciseStats {
  exercise: Exercise
  totalSets: number
  totalVolume: number
  bestWeight: number
  bestReps: number
  lastUsed: string
  prCount: number
  sessions: number
}

// ─── Muscle group mapping ───────────────────────────────────

const MUSCLE_GROUPS: Record<string, string[]> = {
  'Borst': ['chest', 'pectorals'],
  'Rug': ['back', 'lats', 'upper back', 'lower back', 'traps', 'trapezius'],
  'Schouders': ['shoulders', 'delts', 'deltoids'],
  'Armen': ['biceps', 'triceps', 'forearms'],
  'Benen': ['quads', 'quadriceps', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors'],
  'Core': ['abs', 'abdominals', 'obliques', 'core'],
}

function getMuscleGroup(target: string): string {
  const lower = target.toLowerCase()
  for (const [group, muscles] of Object.entries(MUSCLE_GROUPS)) {
    if (muscles.some(m => lower.includes(m))) return group
  }
  return 'Overig'
}

// ─── Main Component ─────────────────────────────────────────

export default function ExercisesPage() {
  const [exerciseMap, setExerciseMap] = useState<Record<string, Exercise>>({})
  const [allSets, setAllSets] = useState<WorkoutSet[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Get all workout sets with session info
        const { data: sessions } = await supabase
          .from('workout_sessions')
          .select('id, started_at, workout_sets(exercise_id, weight_kg, actual_reps, is_pr, created_at)')
          .eq('client_id', user.id)
          .not('completed_at', 'is', null)
          .order('started_at', { ascending: false })

        if (sessions) {
          const sets: WorkoutSet[] = []
          const exerciseIds = new Set<string>()
          const sessionExerciseMap = new Map<string, Set<string>>()

          for (const s of sessions as any[]) {
            for (const set of (s.workout_sets || [])) {
              sets.push({ ...set, created_at: set.created_at || s.started_at })
              exerciseIds.add(set.exercise_id)

              if (!sessionExerciseMap.has(set.exercise_id)) {
                sessionExerciseMap.set(set.exercise_id, new Set())
              }
              sessionExerciseMap.get(set.exercise_id)!.add(s.id)
            }
          }
          setAllSets(sets)

          // Fetch exercise details
          if (exerciseIds.size > 0) {
            const { data: exercises } = await supabase
              .from('exercises')
              .select('id, name, name_nl, body_part, target_muscle')
              .in('id', Array.from(exerciseIds))

            if (exercises) {
              const map: Record<string, Exercise> = {}
              for (const ex of exercises) map[ex.id] = ex as Exercise
              setExerciseMap(map)
            }
          }
        }
      } catch (err) {
        console.error('Exercises load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Compute stats per exercise
  const exerciseStats = useMemo(() => {
    const statsMap: Record<string, ExerciseStats> = {}
    const sessionTracker: Record<string, Set<string>> = {}

    for (const set of allSets) {
      const ex = exerciseMap[set.exercise_id]
      if (!ex) continue

      if (!statsMap[set.exercise_id]) {
        statsMap[set.exercise_id] = {
          exercise: ex,
          totalSets: 0,
          totalVolume: 0,
          bestWeight: 0,
          bestReps: 0,
          lastUsed: set.created_at,
          prCount: 0,
          sessions: 0,
        }
        sessionTracker[set.exercise_id] = new Set()
      }

      const stat = statsMap[set.exercise_id]
      stat.totalSets++
      stat.totalVolume += (set.weight_kg || 0) * (set.actual_reps || 0)
      if ((set.weight_kg || 0) > stat.bestWeight) stat.bestWeight = set.weight_kg || 0
      if ((set.actual_reps || 0) > stat.bestReps) stat.bestReps = set.actual_reps || 0
      if (set.is_pr) stat.prCount++
      if (set.created_at > stat.lastUsed) stat.lastUsed = set.created_at

      // Track unique sessions
      const sessionKey = set.created_at.slice(0, 10)
      sessionTracker[set.exercise_id].add(sessionKey)
    }

    // Set session counts
    for (const [id, tracker] of Object.entries(sessionTracker)) {
      if (statsMap[id]) statsMap[id].sessions = tracker.size
    }

    return Object.values(statsMap).sort((a, b) => b.sessions - a.sessions)
  }, [allSets, exerciseMap])

  // Get unique muscle groups
  const muscleGroups = useMemo(() => {
    const groups = new Set<string>()
    for (const stat of exerciseStats) {
      groups.add(getMuscleGroup(stat.exercise.target_muscle))
    }
    return Array.from(groups).sort()
  }, [exerciseStats])

  // Filter
  const filtered = useMemo(() => {
    return exerciseStats.filter(stat => {
      const name = (stat.exercise.name_nl || stat.exercise.name).toLowerCase()
      const matchesSearch = !searchQuery || name.includes(searchQuery.toLowerCase())
      const matchesGroup = !selectedGroup || getMuscleGroup(stat.exercise.target_muscle) === selectedGroup
      return matchesSearch && matchesGroup
    })
  }, [exerciseStats, searchQuery, selectedGroup])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-6 h-6 border-[1.5px] border-[#CCC7BC] border-t-[#1A1917] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="pb-24">
      <SubPageHeader overline="Training" title="Oefeningen" backHref="/client/progress" />

      {/* Summary */}
      <div className="flex gap-4 mb-6 border-b border-[#E8E4DC] pb-5">
        <div className="text-center flex-1">
          <p className="text-[22px] font-bold text-[#1A1917]">{exerciseStats.length}</p>
          <p className="text-label mt-1">Oefeningen</p>
        </div>
        <div className="text-center flex-1">
          <p className="text-[22px] font-bold text-[#1A1917]">
            {exerciseStats.reduce((sum, s) => sum + s.prCount, 0)}
          </p>
          <p className="text-label mt-1">Records</p>
        </div>
        <div className="text-center flex-1">
          <p className="text-[22px] font-bold text-[#1A1917]">
            {Math.round(exerciseStats.reduce((sum, s) => sum + s.totalVolume, 0) / 1000)}t
          </p>
          <p className="text-label mt-1">Volume</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C5C2BC]" />
        <input
          type="text"
          placeholder="Zoek oefening..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E8E4DC] text-[14px] text-[#1A1917] placeholder-[#C5C2BC] focus:border-[#1A1917] outline-none"
        />
      </div>

      {/* Muscle group filter */}
      <div className="flex gap-1 mb-5 overflow-x-auto pb-1 -mx-4 px-4">
        <button
          onClick={() => setSelectedGroup(null)}
          className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] whitespace-nowrap shrink-0 transition-all ${
            !selectedGroup ? 'bg-[#1A1917] text-white' : 'text-[#A09D96] hover:text-[#1A1917]'
          }`}
        >
          Alles
        </button>
        {muscleGroups.map(group => (
          <button
            key={group}
            onClick={() => setSelectedGroup(selectedGroup === group ? null : group)}
            className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] whitespace-nowrap shrink-0 transition-all ${
              selectedGroup === group ? 'bg-[#1A1917] text-white' : 'text-[#A09D96] hover:text-[#1A1917]'
            }`}
          >
            {group}
          </button>
        ))}
      </div>

      {/* Exercise list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[14px] text-[#C5C2BC]">Geen oefeningen gevonden</p>
          </div>
        ) : (
          filtered.map(stat => (
            <div
              key={stat.exercise.id}
              className="border border-[#E8E4DC] bg-white p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-semibold text-[#1A1917] truncate">
                      {stat.exercise.name_nl || stat.exercise.name}
                    </p>
                    {stat.prCount > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#7B5EA7] bg-[#7B5EA7]/10 px-1.5 py-0.5 shrink-0">
                        <Trophy size={10} strokeWidth={2} />
                        {stat.prCount}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#A09D96] mt-0.5">
                    {getMuscleGroup(stat.exercise.target_muscle)} · {stat.exercise.target_muscle}
                  </p>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex gap-4 mt-3 pt-3 border-t border-[#F0EDE8]">
                <div>
                  <p className="text-[15px] font-bold text-[#1A1917] tabular-nums">{stat.bestWeight} kg</p>
                  <p className="text-[10px] text-[#C5C2BC]">Beste gewicht</p>
                </div>
                <div className="w-px bg-[#F0EDE8]" />
                <div>
                  <p className="text-[15px] font-bold text-[#1A1917] tabular-nums">{stat.totalSets}</p>
                  <p className="text-[10px] text-[#C5C2BC]">Sets totaal</p>
                </div>
                <div className="w-px bg-[#F0EDE8]" />
                <div>
                  <p className="text-[15px] font-bold text-[#1A1917] tabular-nums">{stat.sessions}x</p>
                  <p className="text-[10px] text-[#C5C2BC]">Sessies</p>
                </div>
                <div className="w-px bg-[#F0EDE8]" />
                <div>
                  <p className="text-[15px] font-bold text-[#1A1917] tabular-nums">
                    {stat.totalVolume >= 1000 ? `${(stat.totalVolume / 1000).toFixed(1)}t` : `${Math.round(stat.totalVolume)} kg`}
                  </p>
                  <p className="text-[10px] text-[#C5C2BC]">Volume</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
