'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from '@/components/charts/LazyRecharts'
import {
  TrendingUp,
  Trophy,
  Flame,
  Scale,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Share2,
  Copy,
  Check,
  BarChart3,
} from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

interface PeriodOption {
  label: string
  days: number
  key: 'weeks4' | 'weeks8' | 'weeks12' | 'alltime'
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { label: 'Laatste 4 weken', days: 28, key: 'weeks4' },
  { label: 'Laatste 8 weken', days: 56, key: 'weeks8' },
  { label: 'Laatste 12 weken', days: 84, key: 'weeks12' },
  { label: 'Hele periode', days: 999999, key: 'alltime' },
]

interface WorkoutSession {
  id: string
  started_at: string
  completed_at: string
  duration_minutes: number
  client_id: string
}

interface PRData {
  id: string
  weight_kg: number
  reps: number
  is_pr: boolean
  exercises: {
    name: string
  }
  workout_sessions: {
    started_at: string
  }
}

interface Checkin {
  created_at: string
  weight: number
}

interface ClientProfile {
  id: string
  full_name: string
}

interface WeightChartData {
  date: string
  weight: number
}

interface WeeklyData {
  week: string
  workouts: number
}

export default function ProgressReportPage() {
  const supabase = createClient()
  const reportRef = useRef<HTMLDivElement>(null)

  const [selectedPeriod, setSelectedPeriod] = useState<'weeks4' | 'weeks8' | 'weeks12' | 'alltime'>('weeks4')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  // Data states
  const [clientName, setClientName] = useState<string>('')
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [prs, setPrs] = useState<PRData[]>([])
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [weightChartData, setWeightChartData] = useState<WeightChartData[]>([])
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([])
  const [error, setError] = useState<string | null>(null)

  // Calculate period date
  const getPeriodDates = (periodKey: string) => {
    const endDate = new Date()
    const days = PERIOD_OPTIONS.find(p => p.key === periodKey)?.days || 28
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)
    return { startDate, endDate }
  }

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError('Not authenticated')
          setLoading(false)
          return
        }

        // Fetch client profile
        const { data: profile } = await supabase
          .from('clients')
          .select('id, full_name')
          .eq('id', user.id)
          .single()

        if (profile) {
          setClientName(profile.full_name || 'Client')
        }

        const { startDate, endDate } = getPeriodDates(selectedPeriod)

        // Fetch workout sessions
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('workout_sessions')
          .select('*')
          .eq('client_id', user.id)
          .not('completed_at', 'is', null)
          .gte('started_at', startDate.toISOString())
          .lte('started_at', endDate.toISOString())
          .order('started_at', { ascending: true })

        if (sessionsError) throw sessionsError
        setSessions(sessionsData || [])

        // Fetch PRs
        const { data: prsData, error: prsError } = await supabase
          .from('workout_sets')
          .select('id, weight_kg, reps, is_pr, exercises(name), workout_sessions(started_at, client_id)')
          .eq('is_pr', true)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .order('weight_kg', { ascending: false })
          .limit(5)

        if (prsError) throw prsError

        // Filter PRs to only include user's PRs
        const userPrs = (prsData || []).filter(
          (pr: any) => pr.workout_sessions?.client_id === user.id
        )
        setPrs(userPrs as unknown as PRData[])

        // Fetch weight checkins
        const { data: checkinsData, error: checkinsError } = await supabase
          .from('checkins')
          .select('created_at, weight')
          .eq('client_id', user.id)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .order('created_at', { ascending: true })

        if (checkinsError) throw checkinsError
        setCheckins(checkinsData || [])

        // Process weight chart data
        if (checkinsData && checkinsData.length > 0) {
          const chartData = checkinsData.map(c => ({
            date: new Date(c.created_at).toLocaleDateString('nl-NL', {
              month: 'short',
              day: 'numeric',
            }),
            weight: c.weight,
          }))
          setWeightChartData(chartData)
        }

        // Process weekly data
        if (sessionsData && sessionsData.length > 0) {
          const weeklyMap = new Map<string, number>()

          sessionsData.forEach(session => {
            const date = new Date(session.started_at)
            const weekStart = new Date(date)
            weekStart.setDate(date.getDate() - date.getDay())
            const weekKey = weekStart.toLocaleDateString('nl-NL', {
              month: 'short',
              day: 'numeric',
            })

            weeklyMap.set(weekKey, (weeklyMap.get(weekKey) || 0) + 1)
          })

          const weekly = Array.from(weeklyMap.entries()).map(([week, workouts]) => ({
            week,
            workouts,
          }))
          setWeeklyData(weekly)
        }
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Failed to load progress data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedPeriod, supabase])

  // Calculate metrics
  const totalWorkouts = sessions.length
  const averagePerWeek =
    selectedPeriod === 'alltime' && sessions.length > 0
      ? (totalWorkouts / Math.ceil(Math.max(1, getDaysDifference(sessions[0].started_at, new Date())) / 7)).toFixed(1)
      : selectedPeriod === 'weeks4'
        ? (totalWorkouts / 4).toFixed(1)
        : selectedPeriod === 'weeks8'
          ? (totalWorkouts / 8).toFixed(1)
          : (totalWorkouts / 12).toFixed(1)

  const currentStreak = calculateStreak(sessions)

  const weightChange =
    checkins.length >= 2
      ? parseFloat((checkins[checkins.length - 1].weight - checkins[0].weight).toFixed(1))
      : null

  function getDaysDifference(date1: string, date2: Date): number {
    return Math.floor(
      (date2.getTime() - new Date(date1).getTime()) / (1000 * 60 * 60 * 24)
    )
  }

  function calculateStreak(workoutSessions: WorkoutSession[]): number {
    if (workoutSessions.length === 0) return 0

    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const sessionDates = new Set<string>()
    workoutSessions.forEach(session => {
      const date = new Date(session.started_at)
      date.setHours(0, 0, 0, 0)
      sessionDates.add(date.toISOString().split('T')[0])
    })

    let checkDate = new Date(today)
    while (sessionDates.has(checkDate.toISOString().split('T')[0])) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    }

    return streak
  }

  const periodLabel = PERIOD_OPTIONS.find(p => p.key === selectedPeriod)?.label || 'Laatste 4 weken'
  const reportDate = new Date().toLocaleDateString('nl-NL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const handleShare = async () => {
    const text = `Mijn voortgangsrapport:
${clientName}
Periode: ${periodLabel}
Totaal workouts: ${totalWorkouts}
Gemiddeld per week: ${averagePerWeek}
Huidige streak: ${currentStreak} dagen
${weightChange ? `Gewichtsverandering: ${weightChange > 0 ? '+' : ''}${weightChange} kg` : ''}

Bekijk mijn voortgang in Move!`

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Mijn voortgangsrapport',
          text: text,
        })
      } catch (err) {
        console.log('Share cancelled or failed')
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[rgba(28,30,24,0.10)] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#C0FC01]"></div>
          <p className="mt-4 text-[rgba(28,30,24,0.62)]">Voortgangsrapport laden...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[rgba(28,30,24,0.10)] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-[#1C1E18] mb-2">Oops!</h1>
          <p className="text-[rgba(28,30,24,0.62)]">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[rgba(28,30,24,0.10)] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="page-title text-4xl mb-2">
              Voortgangsrapport
            </h1>
            <p className="text-[rgba(28,30,24,0.62)]">Volg je vooruitgang en feest je successen</p>
          </div>
        </div>

        {/* Period Selector */}
        <div className="mb-6 bg-[rgba(255,255,255,0.50)] backdrop-blur-md rounded-2xl border border-[rgba(28,30,24,0.10)] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-[#C0FC01]" />
            <span className="font-semibold text-[#1C1E18]">Periode</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {PERIOD_OPTIONS.map(option => (
              <button
                key={option.key}
                onClick={() => setSelectedPeriod(option.key)}
                className={`py-2 px-3 rounded-lg font-medium transition-all ${
                  selectedPeriod === option.key
                    ? 'bg-[#C0FC01] text-white'
                    : 'bg-[rgba(28,30,24,0.10)] text-[rgba(28,30,24,0.62)] hover:bg-[rgba(28,30,24,0.10)]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Report Card Container */}
        <div ref={reportRef} className="bg-[rgba(255,255,255,0.50)] backdrop-blur-md rounded-2xl border border-[rgba(28,30,24,0.10)] p-8 mb-6">
          {/* Report Header */}
          <div className="text-center mb-8 pb-6 border-b border-[rgba(28,30,24,0.10)]">
            <h2 className="text-3xl font-bold text-[#1C1E18] mb-1">{clientName}</h2>
            <p className="text-[rgba(28,30,24,0.62)]">
              {periodLabel} • {reportDate}
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {/* Total Workouts */}
            <div className="bg-[rgba(28,30,24,0.10)] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[rgba(28,30,24,0.62)]">Totaal workouts</span>
                <TrendingUp className="w-5 h-5 text-[#C0FC01]" />
              </div>
              <p className="text-3xl font-bold text-[#1C1E18]">{totalWorkouts}</p>
            </div>

            {/* Average Per Week */}
            <div className="bg-[rgba(28,30,24,0.10)] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[rgba(28,30,24,0.62)]">Gemiddeld/week</span>
                <TrendingUp className="w-5 h-5 text-[#C0FC01]" />
              </div>
              <p className="text-3xl font-bold text-[#1C1E18]">{averagePerWeek}</p>
            </div>

            {/* Current Streak */}
            <div className="bg-[rgba(28,30,24,0.10)] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[rgba(28,30,24,0.62)]">Huidige streak</span>
                <Flame className="w-5 h-5 text-[#C0FC01]" />
              </div>
              <p className="text-3xl font-bold text-[#1C1E18]">{currentStreak}d</p>
            </div>

            {/* Weight Change */}
            <div className="bg-[rgba(28,30,24,0.10)] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[rgba(28,30,24,0.62)]">Gewichtsverandering</span>
                <Scale className="w-5 h-5 text-[#C0FC01]" />
              </div>
              <p className={`text-3xl font-bold ${weightChange ? (weightChange < 0 ? 'text-green-600' : 'text-[#1C1E18]') : 'text-[rgba(28,30,24,0.62)]'}`}>
                {weightChange ? `${weightChange > 0 ? '+' : ''}${weightChange}kg` : '—'}
              </p>
            </div>
          </div>

          {/* Weight Trend Chart */}
          {weightChartData.length > 1 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-[#1C1E18] mb-4">Gewichtsverloop</h3>
              <div className="bg-[rgba(28,30,24,0.10)] rounded-xl p-4 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weightChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#C0FC01" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#C0FC01" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,30,24,0.10)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: 'rgba(253,253,254,0.55)', fontSize: 12 }}
                      stroke="rgba(28,30,24,0.10)"
                    />
                    <YAxis
                      tick={{ fill: 'rgba(253,253,254,0.55)', fontSize: 12 }}
                      stroke="rgba(28,30,24,0.10)"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid rgba(28,30,24,0.10)',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#1C1E18' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="weight"
                      stroke="#C0FC01"
                      fillOpacity={1}
                      fill="url(#colorWeight)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Weekly Workouts Chart */}
          {weeklyData.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-[#1C1E18] mb-4">Wekelijkse activiteit</h3>
              <div className="bg-[rgba(28,30,24,0.10)] rounded-xl p-4 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(28,30,24,0.10)" />
                    <XAxis
                      dataKey="week"
                      tick={{ fill: 'rgba(253,253,254,0.55)', fontSize: 12 }}
                      stroke="rgba(28,30,24,0.10)"
                    />
                    <YAxis
                      tick={{ fill: 'rgba(253,253,254,0.55)', fontSize: 12 }}
                      stroke="rgba(28,30,24,0.10)"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid rgba(28,30,24,0.10)',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#1C1E18' }}
                    />
                    <Bar
                      dataKey="workouts"
                      fill="#C0FC01"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Top PRs */}
          {prs.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-[#1C1E18] mb-4 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-[#C0FC01]" />
                Persoonlijke Records
              </h3>
              <div className="space-y-3">
                {prs.map((pr, index) => (
                  <div key={pr.id} className="flex items-center justify-between bg-[rgba(28,30,24,0.10)] rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#C0FC01] text-white flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-[#1C1E18]">{pr.exercises?.name}</p>
                        <p className="text-sm text-[rgba(28,30,24,0.62)]">
                          {new Date(pr.workout_sessions?.started_at).toLocaleDateString('nl-NL')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#1C1E18]">{pr.weight_kg} kg</p>
                      <p className="text-sm text-[rgba(28,30,24,0.62)]">{pr.reps} reps</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {prs.length === 0 && weightChartData.length === 0 && weeklyData.length === 0 && (
            <EmptyState
              icon={BarChart3}
              title="Nog geen gegevens"
              description="Voor deze periode is er nog geen voortgang gelogd. Start met trainingen of voeg een check-in toe."
              cta={{ label: 'Nieuwe check-in', href: '/client/check-in' }}
              secondaryCta={{ label: 'Start training', href: '/client/workout' }}
            />
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 bg-[#C0FC01] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#B85730] transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5" />
                Gekopieerd!
              </>
            ) : typeof navigator !== 'undefined' && typeof navigator.share === 'function' ? (
              <>
                <Share2 className="w-5 h-5" />
                Deel je resultaten
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                Kopieer resultaten
              </>
            )}
          </button>
          <a
            href="/client/dashboard"
            className="flex items-center gap-2 bg-[rgba(28,30,24,0.10)] text-[#1C1E18] px-6 py-3 rounded-xl font-semibold border border-[rgba(28,30,24,0.10)] hover:bg-[rgba(28,30,24,0.10)] transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Terug naar dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
