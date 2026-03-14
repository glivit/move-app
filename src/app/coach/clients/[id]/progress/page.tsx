'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { ArrowLeft, Trophy } from 'lucide-react'
import Link from 'next/link'

interface CheckIn {
  id: string
  client_id: string
  date: string
  weight_kg: number | null
  body_fat_pct: number | null
  muscle_mass_kg: number | null
  bmi: number | null
  chest_cm: number | null
  waist_cm: number | null
  hips_cm: number | null
  photo_front_url: string | null
  photo_back_url: string | null
  photo_left_url: string | null
  photo_right_url: string | null
  coach_notes: string | null
  coach_reviewed: boolean
  created_at: string
}

interface Exercise {
  id: string
  name: string
  name_nl: string | null
  body_part: string
  target_muscle: string
  gif_url: string | null
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
  mood_rating: number | null
  template_day_id: string | null
}

interface Profile {
  id: string
  full_name: string
  email: string
  role: string
}

type TabType = 'kracht' | 'volume' | 'prs' | 'lichaam' | 'compliance'

export default function CoachClientProgressPage() {
  const params = useParams() as unknown as { id: string }
  const clientId = params.id

  const [activeTab, setActiveTab] = useState<TabType>('lichaam')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [checkins, setCheckins] = useState<CheckIn[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([])
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([])
  const [workoutSets, setWorkoutSets] = useState<WorkoutSet[]>([])
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      // Fetch client profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', clientId)
        .single()

      if (profileData) setProfile(profileData)

      // Fetch checkins
      const { data: checkinsData } = await supabase
        .from('checkins')
        .select('*')
        .eq('client_id', clientId)
        .order('date', { ascending: true })

      if (checkinsData) setCheckins(checkinsData)

      // Fetch workout sessions
      const { data: sessionsData } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('client_id', clientId)
        .order('started_at', { ascending: true })

      if (sessionsData) setWorkoutSessions(sessionsData)

      // Fetch workout sets
      if (sessionsData && sessionsData.length > 0) {
        const sessionIds = sessionsData.map(s => s.id)
        const { data: setsData } = await supabase
          .from('workout_sets')
          .select('*')
          .in('workout_session_id', sessionIds)

        if (setsData) setWorkoutSets(setsData)
      }

      // Fetch exercises
      const { data: exercisesData } = await supabase
        .from('exercises')
        .select('*')

      if (exercisesData) setExercises(exercisesData)

      // Fetch personal records
      const { data: prsData } = await supabase
        .from('personal_records')
        .select('*, exercises(id, name, name_nl)')
        .eq('client_id', clientId)
        .order('achieved_at', { ascending: false })

      if (prsData) setPersonalRecords(prsData as PersonalRecord[])

      setLoading(false)
    }
    load()
  }, [clientId])

  const latest = useMemo(() => checkins[checkins.length - 1], [checkins])
  const first = useMemo(() => checkins[0], [checkins])

  // Kracht Tab: Get max weight for selected exercise over time
  const krachtData = useMemo(() => {
    if (!selectedExerciseId || workoutSets.length === 0) return []

    const relevantSets = workoutSets
      .filter(set => set.exercise_id === selectedExerciseId && set.completed && set.weight_kg)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    const groupedByDate: { [key: string]: number } = {}
    relevantSets.forEach(set => {
      const date = new Date(set.created_at).toLocaleDateString('nl-BE')
      const weight = set.weight_kg || 0
      groupedByDate[date] = Math.max(groupedByDate[date] || 0, weight)
    })

    return Object.entries(groupedByDate).map(([date, maxWeight]) => ({
      date,
      weight: maxWeight,
    }))
  }, [selectedExerciseId, workoutSets])

  // Volume Tab: Weekly volume over last 8 weeks
  const volumeData = useMemo(() => {
    const weeklyVolume: { [key: string]: number } = {}
    const now = new Date()

    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - i * 7)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)

      const weekKey = `W${Math.ceil((weekStart.getDate() + new Date(weekStart.getFullYear(), weekStart.getMonth(), 1).getDay()) / 7)}`

      const weekVolume = workoutSets
        .filter(set => {
          const setDate = new Date(set.created_at)
          return setDate >= weekStart && setDate <= weekEnd && set.completed && set.weight_kg && set.actual_reps
        })
        .reduce((sum, set) => sum + ((set.weight_kg || 0) * (set.actual_reps || 0)), 0)

      weeklyVolume[weekKey] = weekVolume
    }

    return Object.entries(weeklyVolume).map(([week, volume]) => ({
      week,
      volume,
    }))
  }, [workoutSets])

  // Compliance: Workouts completed vs planned this month
  const complianceData = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const sessionsThisMonth = workoutSessions.filter(session => {
      const sessionDate = new Date(session.started_at)
      return sessionDate.getMonth() === currentMonth && sessionDate.getFullYear() === currentYear
    })

    const completedSessions = sessionsThisMonth.filter(s => s.completed_at).length
    const totalSessions = sessionsThisMonth.length

    return {
      completed: completedSessions,
      total: totalSessions,
      percentage: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
    }
  }, [workoutSessions])

  // Body measurements data
  const lichaamData = useMemo(() =>
    checkins.map(c => ({
      date: c.date,
      dateShort: new Date(c.date).toLocaleDateString('nl-BE', { month: 'short', day: 'numeric' }),
      weight: c.weight_kg,
      bodyFat: c.body_fat_pct,
    })),
    [checkins]
  )

  // Get exercises with logged data
  const exercisesWithData = useMemo(() => {
    const exerciseIds = new Set(workoutSets.map(s => s.exercise_id))
    return exercises.filter(e => exerciseIds.has(e.id))
  }, [exercises, workoutSets])

  const selectedExercise = useMemo(() =>
    exercises.find(e => e.id === selectedExerciseId),
    [exercises, selectedExerciseId]
  )

  // Ensure selectedExerciseId is set
  useEffect(() => {
    if (!selectedExerciseId && exercisesWithData.length > 0) {
      setSelectedExerciseId(exercisesWithData[0].id)
    }
  }, [exercisesWithData, selectedExerciseId])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[32px] font-[family-name:var(--font-display)] text-[#1A1A18] mb-2">Laden...</h1>
        </div>
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-2xl h-64 shadow-card animate-shimmer" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/coach/clients/${clientId}`}
          className="inline-flex items-center gap-1 text-[#8E8E93] hover:text-[#8E8E93] transition-colors mb-6"
        >
          <ArrowLeft strokeWidth={1.5} className="w-4 h-4" />
          <span className="text-sm font-medium">Terug naar profiel</span>
        </Link>
        <h1 className="text-[32px] font-[family-name:var(--font-display)] text-[#1A1A18] mb-1">
          Voortgang
        </h1>
        {profile && (
          <p className="text-[#8E8E93] text-[15px]">{profile.full_name}</p>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-[#F0F0ED] overflow-x-auto">
        <button
          onClick={() => setActiveTab('kracht')}
          className={`px-4 py-3 text-[15px] font-semibold transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'kracht'
              ? 'text-[#1A1A18] border-[#007AFF]'
              : 'text-[#C7C7CC] border-transparent hover:text-[#1A1A18]'
          }`}
        >
          Kracht
        </button>
        <button
          onClick={() => setActiveTab('volume')}
          className={`px-4 py-3 text-[15px] font-semibold transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'volume'
              ? 'text-[#1A1A18] border-[#FF9500]'
              : 'text-[#C7C7CC] border-transparent hover:text-[#1A1A18]'
          }`}
        >
          Volume
        </button>
        <button
          onClick={() => setActiveTab('prs')}
          className={`px-4 py-3 text-[15px] font-semibold transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'prs'
              ? 'text-[#1A1A18] border-[#AF52DE]'
              : 'text-[#C7C7CC] border-transparent hover:text-[#1A1A18]'
          }`}
        >
          PR's
        </button>
        <button
          onClick={() => setActiveTab('lichaam')}
          className={`px-4 py-3 text-[15px] font-semibold transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'lichaam'
              ? 'text-[#1A1A18] border-[#34C759]'
              : 'text-[#C7C7CC] border-transparent hover:text-[#1A1A18]'
          }`}
        >
          Lichaam
        </button>
        <button
          onClick={() => setActiveTab('compliance')}
          className={`px-4 py-3 text-[15px] font-semibold transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'compliance'
              ? 'text-[#1A1A18] border-[#8B6914]'
              : 'text-[#C7C7CC] border-transparent hover:text-[#1A1A18]'
          }`}
        >
          Compliance
        </button>
      </div>

      {/* Kracht Tab */}
      {activeTab === 'kracht' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 shadow-card border border-[#F0F0ED]">
            <label className="text-[13px] font-semibold text-[#1A1A18] block mb-3">
              Selecteer oefening
            </label>
            <select
              value={selectedExerciseId}
              onChange={(e) => setSelectedExerciseId(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-[#F0F0ED] bg-white text-[15px] focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
            >
              {exercisesWithData.map(ex => (
                <option key={ex.id} value={ex.id}>
                  {ex.name_nl || ex.name}
                </option>
              ))}
            </select>
          </div>

          {krachtData.length > 0 && selectedExercise ? (
            <div className="bg-white rounded-2xl p-5 shadow-card border border-[#F0F0ED]">
              <h3 className="text-[17px] font-semibold text-[#1A1A18] mb-4">
                {selectedExercise.name_nl || selectedExercise.name}
              </h3>
              <div style={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={krachtData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0ED" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#C7C7CC' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#C7C7CC' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #F0F0ED',
                        borderRadius: '0.75rem',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#007AFF"
                      strokeWidth={2}
                      dot={{ fill: '#007AFF', r: 4 }}
                      activeDot={{ r: 6 }}
                      
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 shadow-card border border-[#F0F0ED] text-center">
              <p className="text-[#C7C7CC] text-[15px]">Geen data beschikbaar</p>
            </div>
          )}
        </div>
      )}

      {/* Volume Tab */}
      {activeTab === 'volume' && (
        <div className="bg-white rounded-2xl p-5 shadow-card border border-[#F0F0ED]">
          <h3 className="text-[17px] font-semibold text-[#1A1A18] mb-4">Wekelijks Volume</h3>
          {volumeData.length > 0 ? (
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0ED" />
                  <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#C7C7CC' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#C7C7CC' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #F0F0ED',
                      borderRadius: '0.75rem',
                    }}
                  />
                  <Bar dataKey="volume" fill="#FF9500" radius={[8, 8, 0, 0]}  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-[#C7C7CC] text-[15px]">Geen gegevens beschikbaar</p>
            </div>
          )}
        </div>
      )}

      {/* PR's Tab */}
      {activeTab === 'prs' && (
        <div className="space-y-4">
          {personalRecords.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {personalRecords.map(pr => (
                <div
                  key={pr.id}
                  className="bg-white rounded-2xl p-5 shadow-card border border-[#F0F0ED] flex items-start gap-4"
                >
                  <div className="w-10 h-10 rounded-full bg-[#AF52DE] flex items-center justify-center flex-shrink-0">
                    <Trophy size={20} className="text-white" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[17px] font-semibold text-[#1A1A18]">
                      {(pr as any).exercises?.name_nl || (pr as any).exercises?.name || 'Oefening'}
                    </p>
                    <p className="text-[13px] text-[#C7C7CC] mt-1">
                      {pr.record_type === 'weight' ? 'Max gewicht' : pr.record_type}
                    </p>
                    <div className="flex items-baseline gap-2 mt-2">
                      <p className="text-2xl font-semibold text-[#1A1A18]">{pr.value}</p>
                      <p className="text-[15px] text-[#C7C7CC]">kg</p>
                    </div>
                    <p className="text-[13px] text-[#C7C7CC] mt-2">
                      {new Date(pr.achieved_at).toLocaleDateString('nl-BE')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 shadow-card border border-[#F0F0ED] text-center">
              <div className="flex justify-center mb-4">
                <Trophy size={32} className="text-[#C7C7CC]" strokeWidth={1.5} />
              </div>
              <p className="text-[#1A1A18] font-semibold mb-1">Nog geen PR's geregistreerd</p>
              <p className="text-[#C7C7CC] text-[15px]">PR's zullen hier verschijnen</p>
            </div>
          )}
        </div>
      )}

      {/* Lichaam Tab */}
      {activeTab === 'lichaam' && (
        <div className="space-y-6">
          {lichaamData.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-card border border-[#F0F0ED]">
              <h3 className="text-[17px] font-semibold text-[#1A1A18] mb-4">Gewicht</h3>
              <div style={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lichaamData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0ED" />
                    <XAxis dataKey="dateShort" tick={{ fontSize: 12, fill: '#C7C7CC' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#C7C7CC' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #F0F0ED',
                        borderRadius: '0.75rem',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="#34C759"
                      strokeWidth={2}
                      dot={{ fill: '#34C759', r: 4 }}
                      activeDot={{ r: 6 }}
                      
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {lichaamData.some(d => d.bodyFat) && (
            <div className="bg-white rounded-2xl p-5 shadow-card border border-[#F0F0ED]">
              <h3 className="text-[17px] font-semibold text-[#1A1A18] mb-4">Vetpercentage</h3>
              <div style={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lichaamData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0ED" />
                    <XAxis dataKey="dateShort" tick={{ fontSize: 12, fill: '#C7C7CC' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#C7C7CC' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #F0F0ED',
                        borderRadius: '0.75rem',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="bodyFat"
                      stroke="#AF52DE"
                      strokeWidth={2}
                      dot={{ fill: '#AF52DE', r: 4 }}
                      activeDot={{ r: 6 }}
                      
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {latest && (
            <div className="bg-white rounded-2xl p-5 shadow-card border border-[#F0F0ED]">
              <h3 className="text-[17px] font-semibold text-[#1A1A18] mb-4">Huidige metingen</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Gewicht', value: latest.weight_kg, unit: 'kg' },
                  { label: 'Vetpercentage', value: latest.body_fat_pct, unit: '%' },
                  { label: 'Spiermassa', value: latest.muscle_mass_kg, unit: 'kg' },
                  { label: 'BMI', value: latest.bmi, unit: '' },
                ].map(({ label, value, unit }) => (
                  <div key={label} className="p-3 bg-[#FAFAFA] rounded-xl">
                    <p className="text-[13px] text-[#C7C7CC] font-semibold mb-1">{label}</p>
                    <p className="text-xl font-semibold text-[#1A1A18]">
                      {value !== null ? value.toFixed(1) : '—'} {unit}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Compliance Tab */}
      {activeTab === 'compliance' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-card border border-[#F0F0ED]">
            <h3 className="text-[17px] font-semibold text-[#1A1A18] mb-6">Workouts deze maand</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-[15px] text-[#8E8E93]">Voltooide workouts</p>
                  <p className="text-[17px] font-semibold text-[#1A1A18]">{complianceData.completed} / {complianceData.total}</p>
                </div>
                <div className="w-full bg-[#F0F0ED] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#8B6914] h-full transition-all duration-300"
                    style={{ width: `${complianceData.total > 0 ? (complianceData.completed / complianceData.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <p className="text-[13px] text-[#C7C7CC] font-medium">
                  {complianceData.percentage}% compliance
                </p>
              </div>
            </div>
          </div>

          {complianceData.total === 0 && (
            <div className="bg-white rounded-2xl p-12 shadow-card border border-[#F0F0ED] text-center">
              <p className="text-[#C7C7CC] text-[15px]">Geen workouts deze maand</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
