'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import {
  ChevronLeft,
  TrendingUp,
  Trophy,
  Dumbbell,
  Calendar,
  Loader,
} from 'lucide-react'

interface Exercise {
  id: string
  name: string
  muscle_groups: string[]
  category: string
}

interface WorkoutSet {
  id: string
  weight: number
  reps: number
  exercise_id: string
  workout_sessions: {
    id: string
    client_id: string
    started_at: string
    completed_at: string
  }
}

interface ProcessedChartData {
  week: string
  date: string
  estimated1rm: number
  volume: number
  maxWeight: number
  setCount: number
}

interface PersonalRecord {
  weight: number
  reps: number
  date: string
  sessionId: string
}

interface RecentSession {
  sessionId: string
  date: string
  sets: Array<{
    weight: number
    reps: number
  }>
  totalVolume: number
}

interface ProgressionSuggestion {
  suggestion: string
  type: string
}

export default function ExerciseProgressionPage() {
  const params = useParams()
  const router = useRouter()
  const exerciseId = params.id as string

  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [chartData, setChartData] = useState<ProcessedChartData[]>([])
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord | null>(
    null
  )
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([])
  const [suggestions, setSuggestions] = useState<ProgressionSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const supabase = createClient()

        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Fetch exercise details
        const { data: exerciseData, error: exerciseError } = await supabase
          .from('exercises')
          .select('*')
          .eq('id', exerciseId)
          .single()

        if (exerciseError || !exerciseData) {
          setError('Oefening niet gevonden')
          return
        }

        setExercise(exerciseData)

        // Fetch all sets for this exercise for this client
        const { data: setsData, error: setsError } = await supabase
          .from('workout_sets')
          .select(
            '*, workout_sessions!inner(id, client_id, started_at, completed_at)'
          )
          .eq('exercise_id', exerciseId)
          .eq('workout_sessions.client_id', user.id)
          .not('workout_sessions.completed_at', 'is', null)
          .order('workout_sessions(started_at)', { ascending: true })

        if (setsError) {
          console.error('Sets fetch error:', setsError)
          setError('Fout bij het laden van oefengegevens')
          return
        }

        if (!setsData || setsData.length === 0) {
          setChartData([])
          setRecentSessions([])
          setPersonalRecords(null)
          setLoading(false)
          return
        }

        // Process data for charts
        const typedSets = setsData as unknown as WorkoutSet[]
        const processed = processChartData(typedSets)
        setChartData(processed)

        // Extract personal records
        const pr = extractPersonalRecords(typedSets)
        setPersonalRecords(pr)

        // Extract recent sessions (last 10)
        const recent = extractRecentSessions(typedSets)
        setRecentSessions(recent)

        // Fetch progression suggestions
        try {
          const suggestionsResponse = await fetch(
            `/api/progression-rules?mode=suggestions&exercise_id=${exerciseId}`,
            { method: 'GET' }
          )
          if (suggestionsResponse.ok) {
            const suggestionsData = await suggestionsResponse.json()
            setSuggestions(suggestionsData.suggestions || [])
          }
        } catch (err) {
          console.error('Failed to fetch suggestions:', err)
        }

        setError(null)
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Er is een fout opgetreden bij het laden van gegevens')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [exerciseId, router])

  const processChartData = (sets: WorkoutSet[]): ProcessedChartData[] => {
    const grouped = new Map<string, WorkoutSet[]>()

    // Group by week
    sets.forEach((set) => {
      const date = new Date(set.workout_sessions.started_at)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      const weekKey = weekStart.toISOString().split('T')[0]

      if (!grouped.has(weekKey)) {
        grouped.set(weekKey, [])
      }
      grouped.get(weekKey)!.push(set)
    })

    // Process grouped data
    return Array.from(grouped.entries())
      .map(([weekKey, weeklySets]) => {
        const maxSet = weeklySets.reduce((prev, current) =>
          prev.weight > current.weight ? prev : current
        )
        const estimated1rm = calculate1RM(maxSet.weight, maxSet.reps)
        const totalVolume = weeklySets.reduce(
          (sum, set) => sum + set.weight * set.reps,
          0
        )

        return {
          week: new Date(weekKey).toLocaleDateString('nl-NL', {
            month: 'short',
            day: 'numeric',
          }),
          date: weekKey,
          estimated1rm: Math.round(estimated1rm * 10) / 10,
          volume: Math.round(totalVolume),
          maxWeight: maxSet.weight,
          setCount: weeklySets.length,
        }
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const extractPersonalRecords = (sets: WorkoutSet[]): PersonalRecord | null => {
    if (sets.length === 0) return null

    let maxWeightPR = sets[0]
    let maxRepsAtWeight: WorkoutSet | null = null
    let maxRepsOverall = sets[0]

    sets.forEach((set) => {
      if (set.weight > maxWeightPR.weight) {
        maxWeightPR = set
      }
      if (set.reps > maxRepsOverall.reps) {
        maxRepsOverall = set
      }
      if (
        set.weight === maxWeightPR.weight &&
        set.reps > (maxRepsAtWeight?.reps || 0)
      ) {
        maxRepsAtWeight = set
      }
    })

    // Use the record with highest weight, or if same weight, highest reps
    const bestAtWeight = maxRepsAtWeight as WorkoutSet | null
    const prSet =
      maxWeightPR.weight > maxRepsOverall.weight ||
      (maxWeightPR.weight === maxRepsOverall.weight &&
        bestAtWeight &&
        bestAtWeight.reps >= maxWeightPR.reps)
        ? bestAtWeight || maxWeightPR
        : maxRepsOverall

    return {
      weight: prSet.weight,
      reps: prSet.reps,
      date: new Date(prSet.workout_sessions.started_at).toLocaleDateString(
        'nl-NL'
      ),
      sessionId: prSet.workout_sessions.id,
    }
  }

  const extractRecentSessions = (sets: WorkoutSet[]): RecentSession[] => {
    const sessionMap = new Map<string, WorkoutSet[]>()

    sets.forEach((set) => {
      const sessionId = set.workout_sessions.id
      if (!sessionMap.has(sessionId)) {
        sessionMap.set(sessionId, [])
      }
      sessionMap.get(sessionId)!.push(set)
    })

    return Array.from(sessionMap.entries())
      .map(([sessionId, sessionSets]) => {
        const totalVolume = sessionSets.reduce(
          (sum, set) => sum + set.weight * set.reps,
          0
        )

        return {
          sessionId,
          date: new Date(
            sessionSets[0].workout_sessions.started_at
          ).toLocaleDateString('nl-NL'),
          sets: sessionSets.map((s) => ({
            weight: s.weight,
            reps: s.reps,
          })),
          totalVolume,
        }
      })
      .sort((a, b) => {
        const dateA = sessionMap
          .get(a.sessionId)?.[0]?.workout_sessions.started_at || ''
        const dateB = sessionMap
          .get(b.sessionId)?.[0]?.workout_sessions.started_at || ''
        return new Date(dateB).getTime() - new Date(dateA).getTime()
      })
      .slice(0, 10)
  }

  const calculate1RM = (weight: number, reps: number): number => {
    // Epley formula: 1RM = weight * (1 + reps / 30)
    if (reps === 0) return weight
    return weight * (1 + reps / 30)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[rgba(28,30,24,0.10)] p-6">
        <div className="flex items-center justify-center h-96">
          <Loader className="w-8 h-8 animate-spin text-[#C0FC01]" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[rgba(28,30,24,0.10)] p-6">
        <div className="flex flex-col gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[#C0FC01] hover:text-[#B5552A] transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Terug
          </button>
          <div className="bg-[rgba(255,255,255,0.50)] backdrop-blur-2xl rounded-2xl border border-[rgba(28,30,24,0.18)] p-6">
            <p className="text-[rgba(28,30,24,0.62)]">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[rgba(28,30,24,0.10)] p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[#C0FC01] hover:text-[#B5552A] transition-colors w-fit"
          >
            <ChevronLeft className="w-5 h-5" />
            Terug
          </button>

          <div className="bg-[rgba(255,255,255,0.50)] backdrop-blur-2xl rounded-2xl border border-[rgba(28,30,24,0.18)] p-6">
            <h1 className="text-4xl font-bold text-[#1C1E18]">
              {exercise?.name}
            </h1>
            {exercise?.muscle_groups && (
              <p className="text-[rgba(28,30,24,0.62)] mt-2">
                {exercise.muscle_groups.join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* Personal Records Section */}
        {personalRecords && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[rgba(255,255,255,0.50)] backdrop-blur-2xl rounded-2xl border border-[rgba(28,30,24,0.18)] p-6">
              <div className="flex items-center gap-3 mb-4">
                <Trophy className="w-6 h-6 text-[#C0FC01]" />
                <h2 className="text-xl font-bold text-[#1C1E18]">
                  Persoonlijke Records
                </h2>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-[rgba(28,30,24,0.62)]">Zwaarste gewicht</p>
                  <p className="text-3xl font-bold text-[#C0FC01]">
                    {personalRecords.weight} kg
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[rgba(28,30,24,0.62)]">Herhalingen op PR</p>
                  <p className="text-2xl font-bold text-[#1C1E18]">
                    {personalRecords.reps}x
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-[rgba(28,30,24,0.62)] pt-2">
                  <Calendar className="w-4 h-4" />
                  {personalRecords.date}
                </div>
              </div>
            </div>

            {chartData.length > 0 && (
              <div className="bg-[rgba(255,255,255,0.50)] backdrop-blur-2xl rounded-2xl border border-[rgba(28,30,24,0.18)] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="w-6 h-6 text-[#C0FC01]" />
                  <h2 className="text-xl font-bold text-[#1C1E18]">
                    Nieuwste week
                  </h2>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-[rgba(28,30,24,0.62)]">1RM schatting</p>
                    <p className="text-3xl font-bold text-[#C0FC01]">
                      {chartData[chartData.length - 1].estimated1rm} kg
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[rgba(28,30,24,0.62)]">Totaal volume</p>
                    <p className="text-2xl font-bold text-[#1C1E18]">
                      {chartData[chartData.length - 1].volume} kg
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Charts Section */}
        {chartData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1RM Chart */}
            <div className="bg-[rgba(255,255,255,0.50)] backdrop-blur-2xl rounded-2xl border border-[rgba(28,30,24,0.18)] p-6">
              <h2 className="text-xl font-bold text-[#1C1E18] mb-4">
                1RM Progressie
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorEstimated1rm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C0FC01" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#C0FC01" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(28,30,24,0.18)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="week"
                    stroke="rgba(253,253,254,0.55)"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis stroke="rgba(253,253,254,0.55)" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1C1E18',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'rgba(28,30,24,0.10)',
                    }}
                    formatter={(value) => `${value} kg`}
                  />
                  <Area
                    type="monotone"
                    dataKey="estimated1rm"
                    stroke="#C0FC01"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorEstimated1rm)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Volume Chart */}
            <div className="bg-[rgba(255,255,255,0.50)] backdrop-blur-2xl rounded-2xl border border-[rgba(28,30,24,0.18)] p-6">
              <h2 className="text-xl font-bold text-[#1C1E18] mb-4">
                Volume Progressie
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(28,30,24,0.18)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="week"
                    stroke="rgba(253,253,254,0.55)"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis stroke="rgba(253,253,254,0.55)" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1C1E18',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'rgba(28,30,24,0.10)',
                    }}
                    formatter={(value) => `${value} kg`}
                  />
                  <Line
                    type="monotone"
                    dataKey="volume"
                    stroke="#C0FC01"
                    strokeWidth={2}
                    dot={{ fill: '#C0FC01', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Progression Suggestions */}
        {suggestions.length > 0 && (
          <div className="bg-[rgba(255,255,255,0.50)] backdrop-blur-2xl rounded-2xl border border-[rgba(28,30,24,0.18)] p-6">
            <div className="flex items-center gap-3 mb-4">
              <Dumbbell className="w-6 h-6 text-[#C0FC01]" />
              <h2 className="text-xl font-bold text-[#1C1E18]">
                Progressie suggesties
              </h2>
            </div>
            <div className="space-y-3">
              {suggestions.map((suggestion, idx) => (
                <div key={idx} className="flex gap-3 p-3 bg-[rgba(28,30,24,0.10)] rounded-lg">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-[#C0FC01] text-white text-sm font-bold">
                      {idx + 1}
                    </div>
                  </div>
                  <div>
                    <p className="text-[#1C1E18] text-sm">
                      {suggestion.suggestion}
                    </p>
                    {suggestion.type && (
                      <span className="inline-block mt-1 text-xs px-2 py-1 bg-[#C0FC01]/10 text-[#C0FC01] rounded">
                        {suggestion.type}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <div className="bg-[rgba(255,255,255,0.50)] backdrop-blur-2xl rounded-2xl border border-[rgba(28,30,24,0.18)] p-6">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-6 h-6 text-[#C0FC01]" />
              <h2 className="text-xl font-bold text-[#1C1E18]">
                Recente sessies
              </h2>
            </div>
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <div
                  key={session.sessionId}
                  className="border border-[rgba(28,30,24,0.18)] rounded-lg p-4 hover:bg-[rgba(28,30,24,0.10)] transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-semibold text-[#1C1E18]">
                      {session.date}
                    </p>
                    <span className="text-sm text-[rgba(28,30,24,0.62)] bg-[rgba(28,30,24,0.10)] px-3 py-1 rounded-full">
                      Volume: {session.totalVolume} kg
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {session.sets.map((set, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-[#C0FC01]/10 text-[#C0FC01] px-3 py-2 rounded-lg font-medium"
                      >
                        {set.weight}kg × {set.reps}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {chartData.length === 0 && (
          <div className="bg-[rgba(255,255,255,0.50)] backdrop-blur-2xl rounded-2xl border border-[rgba(28,30,24,0.18)] p-12 text-center">
            <Dumbbell className="w-12 h-12 text-[rgba(28,30,24,0.62)] mx-auto mb-4 opacity-50" />
            <p className="text-[rgba(28,30,24,0.62)] text-lg">
              Nog geen gegevens beschikbaar voor deze oefening
            </p>
            <p className="text-sm text-[rgba(28,30,24,0.62)] mt-2">
              Voeg deze oefening toe aan je training om progressie bij te houden
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
