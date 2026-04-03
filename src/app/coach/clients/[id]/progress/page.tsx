'use client'

import { useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Trophy, Camera, ImageOff, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

const ProgressLineChart = dynamic(() => import('@/components/coach/ProgressCharts').then(mod => ({ default: mod.ProgressLineChart })), {
  ssr: false,
  loading: () => <div className="h-64 bg-[#F8F8F6] rounded animate-pulse" />
})

const ProgressBarChart = dynamic(() => import('@/components/coach/ProgressCharts').then(mod => ({ default: mod.ProgressBarChart })), {
  ssr: false,
  loading: () => <div className="h-64 bg-[#F8F8F6] rounded animate-pulse" />
})

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
  left_arm_cm: number | null
  right_arm_cm: number | null
  left_thigh_cm: number | null
  right_thigh_cm: number | null
  left_calf_cm: number | null
  right_calf_cm: number | null
  photo_front_url: string | null
  photo_back_url: string | null
  photo_left_url: string | null
  photo_right_url: string | null
  coach_notes: string | null
  coach_reviewed: boolean
  created_at: string
}

interface IntakeData {
  weight_kg: number | null
  height_cm: number | null
  age: number | null
  chest_cm: number | null
  waist_cm: number | null
  hips_cm: number | null
  left_arm_cm: number | null
  right_arm_cm: number | null
  left_thigh_cm: number | null
  right_thigh_cm: number | null
  left_calf_cm: number | null
  right_calf_cm: number | null
  photo_front_url: string | null
  photo_back_url: string | null
  photo_left_url: string | null
  photo_right_url: string | null
  created_at: string
}

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
  mood_rating: number | null
}

interface Profile {
  id: string
  full_name: string
}

type TabType = 'fotos' | 'lichaam' | 'maten' | 'kracht' | 'prs' | 'compliance'

export default function CoachClientProgressPage() {
  const params = useParams() as unknown as { id: string }
  const clientId = params.id

  const [activeTab, setActiveTab] = useState<TabType>('fotos')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [checkins, setCheckins] = useState<CheckIn[]>([])
  const [intakeData, setIntakeData] = useState<IntakeData | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([])
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([])
  const [workoutSets, setWorkoutSets] = useState<WorkoutSet[]>([])
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [photoPosition, setPhotoPosition] = useState<'front' | 'back' | 'left' | 'right'>('front')
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      // ── Phase 1: Fire ALL independent queries in parallel ──
      const [
        { data: profileData },
        { data: intakeFormData },
        { data: checkinsData },
        { data: sessionsData },
        { data: exercisesData },
        { data: prsData },
      ] = await Promise.all([
        supabase.from('profiles').select('id, full_name').eq('id', clientId).single(),
        supabase.from('intake_forms').select('*').eq('client_id', clientId).single(),
        supabase.from('checkins').select('*').eq('client_id', clientId).order('date', { ascending: true }),
        supabase.from('workout_sessions').select('*').eq('client_id', clientId).order('started_at', { ascending: true }),
        supabase.from('exercises').select('*'),
        supabase.from('personal_records').select('*, exercises(id, name, name_nl)').eq('client_id', clientId).order('achieved_at', { ascending: false }),
      ])

      if (profileData) setProfile(profileData)
      if (intakeFormData) setIntakeData(intakeFormData as any)
      if (exercisesData) setExercises(exercisesData)
      if (prsData) setPersonalRecords(prsData as PersonalRecord[])

      // ── Phase 2: Dependent queries in parallel ──
      // Sets depend on sessions; signed URLs depend on checkins + intake
      const setsPromise = (sessionsData && sessionsData.length > 0)
        ? supabase
            .from('workout_sets')
            .select('*')
            .in('workout_session_id', sessionsData.map((s: any) => s.id))
        : Promise.resolve({ data: null })

      // Collect all photo URLs that need signing
      const allUrls: string[] = []
      const collectUrl = (url: string | null) => {
        if (url && !allUrls.includes(url)) allUrls.push(url)
      }
      if (intakeFormData) {
        const ifd = intakeFormData as any
        collectUrl(ifd.photo_front_url)
        collectUrl(ifd.photo_back_url)
        collectUrl(ifd.photo_left_url)
        collectUrl(ifd.photo_right_url)
      }
      if (checkinsData) {
        checkinsData.forEach((c: any) => {
          collectUrl(c.photo_front_url)
          collectUrl(c.photo_back_url)
          collectUrl(c.photo_left_url)
          collectUrl(c.photo_right_url)
        })
      }

      // Sign all URLs in parallel (instead of sequential for loop)
      const signPromises = allUrls.map(async (url) => {
        const match = url.match(/\/storage\/v1\/object\/public\/checkin-photos\/(.+)$/)
        if (match) {
          const { data: signedData } = await supabase.storage
            .from('checkin-photos')
            .createSignedUrl(match[1], 3600)
          if (signedData?.signedUrl) return [url, signedData.signedUrl] as const
        }
        return null
      })

      const [setsResult, ...signResults] = await Promise.all([setsPromise, ...signPromises])

      // Apply results
      if (sessionsData) setWorkoutSessions(sessionsData)
      if (setsResult.data) setWorkoutSets(setsResult.data)
      if (checkinsData) setCheckins(checkinsData)

      const urlMap: Record<string, string> = {}
      for (const result of signResults) {
        if (result) urlMap[result[0]] = result[1]
      }
      setSignedUrls(urlMap)

      setLoading(false)
    }
    load()
  }, [clientId])

  const getSignedUrl = (url: string | null | undefined): string | null => {
    if (!url) return null
    return signedUrls[url] || url
  }

  const latest = useMemo(() => checkins[checkins.length - 1], [checkins])
  const first = useMemo(() => checkins[0], [checkins])

  // Build photo timeline: intake + check-ins
  const photoTimeline = useMemo(() => {
    const entries: { label: string; date: string; photos: Record<string, string | null> }[] = []

    if (intakeData) {
      const i = intakeData as any
      if (i.photo_front_url || i.photo_back_url || i.photo_left_url || i.photo_right_url) {
        entries.push({
          label: 'Intake',
          date: intakeData.created_at,
          photos: {
            front: getSignedUrl(i.photo_front_url),
            back: getSignedUrl(i.photo_back_url),
            left: getSignedUrl(i.photo_left_url),
            right: getSignedUrl(i.photo_right_url),
          }
        })
      }
    }

    checkins.forEach(c => {
      if (c.photo_front_url || c.photo_back_url || c.photo_left_url || c.photo_right_url) {
        entries.push({
          label: new Date(c.date).toLocaleDateString('nl-BE', { month: 'short', year: 'numeric' }),
          date: c.date,
          photos: {
            front: getSignedUrl(c.photo_front_url),
            back: getSignedUrl(c.photo_back_url),
            left: getSignedUrl(c.photo_left_url),
            right: getSignedUrl(c.photo_right_url),
          }
        })
      }
    })

    return entries
  }, [intakeData, checkins, signedUrls])

  // Weight chart: intake baseline + check-ins
  const lichaamData = useMemo(() => {
    const data: any[] = []
    if (intakeData?.weight_kg) {
      data.push({
        dateShort: 'Start',
        date: intakeData.created_at,
        weight: intakeData.weight_kg,
        bodyFat: null,
        muscle: null,
      })
    }
    checkins.forEach(c => {
      data.push({
        dateShort: new Date(c.date).toLocaleDateString('nl-BE', { month: 'short', day: 'numeric' }),
        date: c.date,
        weight: c.weight_kg,
        bodyFat: c.body_fat_pct,
        muscle: c.muscle_mass_kg,
      })
    })
    return data
  }, [intakeData, checkins])

  // Measurements comparison: intake vs latest check-in
  const measurementFields = [
    { key: 'chest_cm', label: 'Borst' },
    { key: 'waist_cm', label: 'Taille' },
    { key: 'hips_cm', label: 'Heupen' },
    { key: 'left_arm_cm', label: 'L. Arm' },
    { key: 'right_arm_cm', label: 'R. Arm' },
    { key: 'left_thigh_cm', label: 'L. Been' },
    { key: 'right_thigh_cm', label: 'R. Been' },
    { key: 'left_calf_cm', label: 'L. Kuit' },
    { key: 'right_calf_cm', label: 'R. Kuit' },
  ]

  // Kracht data
  const krachtData = useMemo(() => {
    if (!selectedExerciseId || workoutSets.length === 0) return []
    const relevantSets = workoutSets
      .filter(set => set.exercise_id === selectedExerciseId && set.completed && set.weight_kg)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    const groupedByDate: { [key: string]: number } = {}
    relevantSets.forEach(set => {
      const date = new Date(set.created_at).toLocaleDateString('nl-BE')
      groupedByDate[date] = Math.max(groupedByDate[date] || 0, set.weight_kg || 0)
    })
    return Object.entries(groupedByDate).map(([date, maxWeight]) => ({ date, weight: maxWeight }))
  }, [selectedExerciseId, workoutSets])

  const exercisesWithData = useMemo(() => {
    const exerciseIds = new Set(workoutSets.map(s => s.exercise_id))
    return exercises.filter(e => exerciseIds.has(e.id))
  }, [exercises, workoutSets])

  const selectedExercise = useMemo(() => exercises.find(e => e.id === selectedExerciseId), [exercises, selectedExerciseId])

  useEffect(() => {
    if (!selectedExerciseId && exercisesWithData.length > 0) {
      setSelectedExerciseId(exercisesWithData[0].id)
    }
  }, [exercisesWithData, selectedExerciseId])

  // Compliance
  const complianceData = useMemo(() => {
    const now = new Date()
    const sessionsThisMonth = workoutSessions.filter(s => {
      const d = new Date(s.started_at)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    const completed = sessionsThisMonth.filter(s => s.completed_at).length
    const total = sessionsThisMonth.length
    return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 }
  }, [workoutSessions])

  const positionLabels: Record<string, string> = { front: 'Voorkant', back: 'Achterkant', left: 'Linkerkant', right: 'Rechterkant' }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-[32px] font-[family-name:var(--font-display)] text-[#1A1A18]">Laden...</h1>
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
          className="inline-flex items-center gap-1 text-[#8E8E93] hover:text-[#666] transition-colors mb-6"
        >
          <ArrowLeft strokeWidth={1.5} className="w-4 h-4" />
          <span className="text-sm font-medium">Terug naar profiel</span>
        </Link>
        <h1 className="text-[32px] font-[family-name:var(--font-display)] text-[#1A1A18] mb-1">Voortgang</h1>
        {profile && <p className="text-[#8E8E93] text-[15px]">{profile.full_name}</p>}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-[#E8E4DC] overflow-x-auto">
        {([
          { id: 'fotos' as TabType, label: "Foto's", color: '#1A1917' },
          { id: 'lichaam' as TabType, label: 'Lichaam', color: '#34C759' },
          { id: 'maten' as TabType, label: 'Omtrekmaten', color: '#FF9500' },
          { id: 'kracht' as TabType, label: 'Kracht', color: '#007AFF' },
          { id: 'prs' as TabType, label: "PR's", color: '#AF52DE' },
          { id: 'compliance' as TabType, label: 'Compliance', color: '#1A1917' },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-[14px] font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-[#1A1A18]'
                : 'text-[#C7C7CC] border-transparent hover:text-[#1A1A18]'
            }`}
            style={{ borderBottomColor: activeTab === tab.id ? tab.color : 'transparent' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ FOTO'S TAB ═══ */}
      {activeTab === 'fotos' && (
        <div className="space-y-6">
          {/* Position selector */}
          <div className="flex gap-2">
            {(['front', 'back', 'left', 'right'] as const).map(pos => (
              <button
                key={pos}
                onClick={() => setPhotoPosition(pos)}
                className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-all ${
                  photoPosition === pos
                    ? 'bg-[#1A1A18] text-white'
                    : 'bg-[#FAFAFA] text-[#8E8E93] border border-[#E8E4DC] hover:bg-[#EDEAE4]'
                }`}
              >
                {positionLabels[pos]}
              </button>
            ))}
          </div>

          {photoTimeline.length > 0 ? (
            <>
              {/* Photo comparison grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photoTimeline.map((entry, idx) => {
                  const photoUrl = entry.photos[photoPosition]
                  return (
                    <div key={idx} className="space-y-2">
                      <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[#FAFAFA] border border-[#E8E4DC]">
                        {photoUrl ? (
                          <Image src={photoUrl} alt={`${entry.label} ${positionLabels[photoPosition]}`} width={400} height={500} className="w-full h-full object-cover" unoptimized loading="lazy" />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full gap-2">
                            <ImageOff className="w-6 h-6 text-[#C7C7CC]" strokeWidth={1.5} />
                            <span className="text-[11px] text-[#C7C7CC]">Geen foto</span>
                          </div>
                        )}
                        {idx === 0 && (
                          <span className="absolute top-2 left-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#1A1917] text-white">
                            Start
                          </span>
                        )}
                        {idx === photoTimeline.length - 1 && idx > 0 && (
                          <span className="absolute top-2 left-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#34C759] text-white">
                            Laatste
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] font-medium text-center text-[#1A1A18]">{entry.label}</p>
                      <p className="text-[11px] text-center text-[#8E8E93]">
                        {new Date(entry.date).toLocaleDateString('nl-BE')}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Side by side: Start vs Latest */}
              {photoTimeline.length >= 2 && (
                <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC]">
                  <h3 className="text-[15px] font-semibold text-[#1A1A18] mb-4">Start vs. Nu</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[photoTimeline[0], photoTimeline[photoTimeline.length - 1]].map((entry, idx) => {
                      const photoUrl = entry.photos[photoPosition]
                      return (
                        <div key={idx}>
                          <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[#FAFAFA]">
                            {photoUrl ? (
                              <Image src={photoUrl} alt={entry.label} width={400} height={500} className="w-full h-full object-cover" unoptimized loading="lazy" />
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <ImageOff className="w-8 h-8 text-[#C7C7CC]" strokeWidth={1.5} />
                              </div>
                            )}
                          </div>
                          <p className="text-[13px] font-semibold text-center mt-2 text-[#1A1A18]">
                            {idx === 0 ? 'Start' : 'Nu'}
                          </p>
                          <p className="text-[11px] text-center text-[#8E8E93]">
                            {new Date(entry.date).toLocaleDateString('nl-BE')}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl p-12 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC] text-center">
              <Camera className="w-10 h-10 mx-auto mb-3 text-[#C7C7CC]" strokeWidth={1.5} />
              <p className="text-[#1A1A18] font-semibold mb-1">Nog geen foto's</p>
              <p className="text-[#8E8E93] text-[14px]">Foto's verschijnen na de eerste check-in of onboarding.</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ LICHAAM TAB ═══ */}
      {activeTab === 'lichaam' && (
        <div className="space-y-6">
          {/* Weight Chart */}
          {lichaamData.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-card border border-[#E8E4DC]">
              <h3 className="text-[17px] font-semibold text-[#1A1A18] mb-4">Gewicht</h3>
              <div style={{ height: 250 }}>
                <ProgressLineChart
                  data={lichaamData}
                  dataKey="weight"
                  name="Gewicht (kg)"
                  color="#34C759"
                  height={250}
                  yAxisConfig={{ domain: ['dataMin - 2', 'dataMax + 2'] }}
                  tooltip={{ backgroundColor: 'white', border: '1px solid #E8E4DC', borderRadius: '0.75rem' }}
                />
              </div>
            </div>
          )}

          {/* Body Fat Chart */}
          {lichaamData.some(d => d.bodyFat) && (
            <div className="bg-white rounded-2xl p-5 shadow-card border border-[#E8E4DC]">
              <h3 className="text-[17px] font-semibold text-[#1A1A18] mb-4">Vetpercentage</h3>
              <div style={{ height: 250 }}>
                <ProgressLineChart
                  data={lichaamData}
                  dataKey="bodyFat"
                  name="Vet (%)"
                  color="#AF52DE"
                  height={250}
                  tooltip={{ backgroundColor: 'white', border: '1px solid #E8E4DC', borderRadius: '0.75rem' }}
                />
              </div>
            </div>
          )}

          {/* Muscle Mass Chart */}
          {lichaamData.some(d => d.muscle) && (
            <div className="bg-white rounded-2xl p-5 shadow-card border border-[#E8E4DC]">
              <h3 className="text-[17px] font-semibold text-[#1A1A18] mb-4">Spiermassa</h3>
              <div style={{ height: 250 }}>
                <ProgressLineChart
                  data={lichaamData}
                  dataKey="muscle"
                  name="Spiermassa (kg)"
                  color="#007AFF"
                  height={250}
                  tooltip={{ backgroundColor: 'white', border: '1px solid #E8E4DC', borderRadius: '0.75rem' }}
                />
              </div>
            </div>
          )}

          {/* Current vs Start summary */}
          {(intakeData?.weight_kg || latest) && (
            <div className="bg-white rounded-2xl p-5 shadow-card border border-[#E8E4DC]">
              <h3 className="text-[17px] font-semibold text-[#1A1A18] mb-4">Start vs. Nu</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Gewicht', start: intakeData?.weight_kg, current: latest?.weight_kg, unit: 'kg', positiveDown: true },
                  { label: 'Vetpercentage', start: null, current: latest?.body_fat_pct, unit: '%', positiveDown: true },
                  { label: 'Spiermassa', start: null, current: latest?.muscle_mass_kg, unit: 'kg', positiveDown: false },
                  { label: 'BMI', start: null, current: latest?.bmi, unit: '', positiveDown: true },
                ].map(({ label, start, current, unit, positiveDown }) => {
                  const diff = start && current ? current - start : null
                  const isPositive = diff !== null ? (positiveDown ? diff < 0 : diff > 0) : null
                  return (
                    <div key={label} className="p-3 bg-[#FAFAFA] rounded-xl">
                      <p className="text-[12px] text-[#8E8E93] font-medium mb-1">{label}</p>
                      <p className="text-xl font-bold text-[#1A1A18]">
                        {current !== null && current !== undefined ? Number(current).toFixed(1) : '—'} {unit}
                      </p>
                      {diff !== null && (
                        <p className={`text-[12px] font-medium mt-0.5 ${isPositive ? 'text-green-600' : 'text-orange-600'}`}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)} {unit}
                        </p>
                      )}
                      {start && (
                        <p className="text-[11px] text-[#C7C7CC] mt-0.5">Start: {Number(start).toFixed(1)} {unit}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ OMTREKMATEN TAB ═══ */}
      {activeTab === 'maten' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 shadow-card border border-[#E8E4DC]">
            <h3 className="text-[17px] font-semibold text-[#1A1A18] mb-4">Omtrekmaten vergelijking</h3>

            {/* Table header */}
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[#FAFAFA]">
                    <th className="text-left px-3 py-2.5 font-medium text-[#8E8E93]">Meting</th>
                    {intakeData && <th className="text-right px-3 py-2.5 font-medium text-[#8E8E93]">Start</th>}
                    {checkins.map((c, idx) => (
                      <th key={c.id} className="text-right px-3 py-2.5 font-medium text-[#8E8E93]">
                        {new Date(c.date).toLocaleDateString('nl-BE', { month: 'short' })}
                      </th>
                    ))}
                    {intakeData && latest && (
                      <th className="text-right px-3 py-2.5 font-medium text-[#1A1917]">Verschil</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {measurementFields.map(({ key, label }) => {
                    const startVal = intakeData ? (intakeData as any)[key] : null
                    const latestVal = latest ? (latest as any)[key] : null
                    const diff = startVal && latestVal ? latestVal - startVal : null
                    const hasAnyData = startVal || checkins.some(c => (c as any)[key])

                    if (!hasAnyData) return null

                    return (
                      <tr key={key} className="border-t border-[#E8E4DC]">
                        <td className="px-3 py-2.5 font-medium text-[#1A1A18]">{label}</td>
                        {intakeData && (
                          <td className="px-3 py-2.5 text-right text-[#1A1A18]">
                            {startVal ? `${startVal} cm` : '—'}
                          </td>
                        )}
                        {checkins.map(c => (
                          <td key={c.id} className="px-3 py-2.5 text-right text-[#1A1A18]">
                            {(c as any)[key] ? `${(c as any)[key]} cm` : '—'}
                          </td>
                        ))}
                        {intakeData && latest && (
                          <td className={`px-3 py-2.5 text-right font-semibold ${
                            diff !== null
                              ? diff < 0 ? 'text-green-600' : diff > 0 ? 'text-orange-600' : 'text-[#8E8E93]'
                              : 'text-[#8E8E93]'
                          }`}>
                            {diff !== null ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}` : '—'}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {(!intakeData || !checkins.length) && (
            <div className="bg-[#FAFAFA] rounded-2xl p-6 text-center">
              <p className="text-[14px] text-[#8E8E93]">
                Meer data verschijnt na de eerste maandelijkse check-in.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══ KRACHT TAB ═══ */}
      {activeTab === 'kracht' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 shadow-card border border-[#E8E4DC]">
            <label className="text-[13px] font-semibold text-[#1A1A18] block mb-3">Selecteer oefening</label>
            <select
              value={selectedExerciseId}
              onChange={(e) => setSelectedExerciseId(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-[#E8E4DC] bg-white text-[15px] focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
            >
              {exercisesWithData.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name_nl || ex.name}</option>
              ))}
            </select>
          </div>

          {krachtData.length > 0 && selectedExercise ? (
            <div className="bg-white rounded-2xl p-5 shadow-card border border-[#E8E4DC]">
              <h3 className="text-[17px] font-semibold text-[#1A1A18] mb-4">{selectedExercise.name_nl || selectedExercise.name}</h3>
              <div style={{ height: 250 }}>
                <ProgressLineChart
                  data={krachtData}
                  dataKey="weight"
                  name="Gewicht (kg)"
                  color="#007AFF"
                  height={250}
                  xAxisKey="date"
                  tooltip={{ backgroundColor: 'white', border: '1px solid #E8E4DC', borderRadius: '0.75rem' }}
                />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 shadow-card border border-[#E8E4DC] text-center">
              <p className="text-[#C7C7CC] text-[15px]">Geen data beschikbaar</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ PR'S TAB ═══ */}
      {activeTab === 'prs' && (
        <div className="space-y-4">
          {personalRecords.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {personalRecords.map(pr => (
                <div key={pr.id} className="bg-white rounded-2xl p-5 shadow-card border border-[#E8E4DC] flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#AF52DE] flex items-center justify-center flex-shrink-0">
                    <Trophy size={20} className="text-white" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[17px] font-semibold text-[#1A1A18]">
                      {(pr as any).exercises?.name_nl || (pr as any).exercises?.name || 'Oefening'}
                    </p>
                    <p className="text-[13px] text-[#C7C7CC] mt-1">{pr.record_type === 'weight' ? 'Max gewicht' : pr.record_type}</p>
                    <div className="flex items-baseline gap-2 mt-2">
                      <p className="text-2xl font-semibold text-[#1A1A18]">{pr.value}</p>
                      <p className="text-[15px] text-[#C7C7CC]">kg</p>
                    </div>
                    <p className="text-[13px] text-[#C7C7CC] mt-2">{new Date(pr.achieved_at).toLocaleDateString('nl-BE')}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 shadow-card border border-[#E8E4DC] text-center">
              <Trophy size={32} className="text-[#C7C7CC] mx-auto mb-4" strokeWidth={1.5} />
              <p className="text-[#1A1A18] font-semibold mb-1">Nog geen PR's</p>
              <p className="text-[#C7C7CC] text-[15px]">PR's verschijnen na gelogde workouts</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ COMPLIANCE TAB ═══ */}
      {activeTab === 'compliance' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-card border border-[#E8E4DC]">
            <h3 className="text-[17px] font-semibold text-[#1A1A18] mb-6">Workouts deze maand</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-[15px] text-[#8E8E93]">Voltooide workouts</p>
                <p className="text-[17px] font-semibold text-[#1A1A18]">{complianceData.completed} / {complianceData.total}</p>
              </div>
              <div className="w-full bg-[#E8E4DC] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#1A1917] h-full transition-all duration-300"
                  style={{ width: `${complianceData.total > 0 ? (complianceData.completed / complianceData.total) * 100 : 0}%` }}
                />
              </div>
              <p className="text-[13px] text-[#C7C7CC] font-medium">{complianceData.percentage}% compliance</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
