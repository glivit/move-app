'use client'

import { useEffect, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Trophy, Camera, ImageOff } from 'lucide-react'
import Link from 'next/link'

const ProgressLineChart = dynamic(() => import('@/components/coach/ProgressCharts').then(mod => ({ default: mod.ProgressLineChart })), {
  ssr: false,
  loading: () => <div className="h-64 bg-[#A6ADA7] rounded animate-pulse" />
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
  is_warmup: boolean | null
  completed: boolean
  created_at: string
}

// ─── Kracht tab aggregation ────────────────────────────────
// Mirrors the client /client/progress logic so coach sees the same
// filterable breakdown (search + muscle-group chips + sparklines)
// instead of a one-at-a-time dropdown.

type MuscleFilter = 'Alle' | 'Borst' | 'Rug' | 'Benen' | 'Schouders' | 'Armen' | 'Core'

interface ExerciseAgg {
  exerciseId: string
  name: string
  bodyPart: MuscleFilter | 'Overig'
  rawBodyPart: string
  count: number
  lastDate: string
  weekly: number[]  // 12-week e1RM, forward-filled
  current: number
  delta: number
}

function e1RM(weight: number, reps: number): number {
  if (!weight || !reps || reps <= 0) return 0
  const r = Math.min(reps, 12)
  return weight * (1 + r / 30)
}

function weekKey(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const dow = d.getDay()
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
  return d.toISOString().slice(0, 10)
}

function normaliseBodyPart(raw: string | null | undefined): MuscleFilter | 'Overig' {
  if (!raw) return 'Overig'
  const s = raw.toLowerCase()
  if (s.includes('chest') || s.includes('borst') || s.includes('pectoral')) return 'Borst'
  if (s.includes('back') || s.includes('rug') || s.includes('lat')) return 'Rug'
  if (s.includes('leg') || s.includes('ben') || s.includes('quad') || s.includes('ham') || s.includes('glut') || s.includes('calf') || s.includes('kuit') || s.includes('hip')) return 'Benen'
  if (s.includes('shoulder') || s.includes('schou') || s.includes('delt')) return 'Schouders'
  if (s.includes('arm') || s.includes('bicep') || s.includes('tricep') || s.includes('forearm')) return 'Armen'
  if (s.includes('core') || s.includes('waist') || s.includes('abs') || s.includes('abdom')) return 'Core'
  return 'Overig'
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-BE', { day: '2-digit', month: 'short' })
}

// Sparkline (100×22) used inside a list row
function ExSpark({ data, positive }: { data: number[]; positive: boolean }) {
  if (data.length < 2 || data.every((v) => v === 0)) {
    return <svg style={{ width: '100%', height: 22 }} />
  }
  const w = 100, h = 22
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const lastX = w
  const lastY = h - ((data[data.length - 1] - min) / range) * (h - 4) - 2
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 22 }}>
      <polyline
        points={pts}
        fill="none"
        stroke="#FDFDFE"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={positive ? 0.82 : 0.62}
      />
      <circle cx={lastX} cy={lastY} r="1.8" fill="#FDFDFE" opacity={positive ? 1 : 0.85} />
    </svg>
  )
}

// Larger sparkline (full-width × 26) used inside the compounds cards
function LiftSpark({ data, positive }: { data: number[]; positive: boolean }) {
  if (data.length < 2 || data.every((v) => v === 0)) {
    return <svg style={{ width: '100%', height: 26 }} />
  }
  const w = 140, h = 26
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const lastX = w
  const lastY = h - ((data[data.length - 1] - min) / range) * (h - 4) - 2
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 26 }}>
      <polyline
        points={pts}
        fill="none"
        stroke="#FDFDFE"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={positive ? 0.92 : 0.7}
      />
      <circle cx={lastX} cy={lastY} r="2.2" fill="#FDFDFE" opacity={positive ? 1 : 0.85} />
    </svg>
  )
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
  const [loading, setLoading] = useState(true)
  const [photoPosition, setPhotoPosition] = useState<'front' | 'back' | 'left' | 'right'>('front')
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  // Kracht tab filters (mirrors /client/progress)
  const [krachtSearch, setKrachtSearch] = useState('')
  const [krachtMuscle, setKrachtMuscle] = useState<MuscleFilter>('Alle')

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
        // Cap to last ~6mo of activity for power-clients (>2 yrs) — was unbounded select('*).
        // Order desc on the wire to leverage the index, then reverse client-side for chrono render.
        supabase.from('checkins').select('*').eq('client_id', clientId).order('date', { ascending: false }).limit(180),
        supabase.from('workout_sessions').select('*').eq('client_id', clientId).order('started_at', { ascending: false }).limit(180),
        supabase.from('exercises').select('id, name, name_nl, body_part, target_muscle'),
        supabase.from('personal_records').select('*, exercises(id, name, name_nl)').eq('client_id', clientId).order('achieved_at', { ascending: false }).limit(200),
      ])

      // Re-orient checkins/sessions to ascending — fetched desc to use index, but UI expects chrono.
      const checkinsAsc = checkinsData ? [...checkinsData].reverse() : null
      const sessionsAsc = sessionsData ? [...sessionsData].reverse() : null

      if (profileData) setProfile(profileData)
      if (intakeFormData) setIntakeData(intakeFormData as any)
      if (exercisesData) setExercises(exercisesData)
      if (prsData) setPersonalRecords(prsData as PersonalRecord[])

      // ── Phase 2: Dependent queries in parallel ──
      // Sets depend on sessions; signed URLs depend on checkins + intake
      const setsPromise = (sessionsAsc && sessionsAsc.length > 0)
        ? supabase
            .from('workout_sets')
            .select('*')
            .in('workout_session_id', sessionsAsc.map((s: any) => s.id))
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
      if (checkinsAsc) {
        checkinsAsc.forEach((c: any) => {
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

      // Apply results (chrono-ascending)
      if (sessionsAsc) setWorkoutSessions(sessionsAsc)
      if (setsResult.data) setWorkoutSets(setsResult.data)
      if (checkinsAsc) setCheckins(checkinsAsc)

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

  // ─── Full per-exercise aggregation (12 weeks, e1RM series) ───
  // Mirrors client /client/progress Kracht tab. Uses the sessions + sets
  // already loaded; filters to last 12 weeks so sparkline has meaningful
  // shape. Sessions dict maps session_id → started_at for date lookup.
  const exerciseAgg = useMemo<ExerciseAgg[]>(() => {
    if (!workoutSets.length || !exercises.length) return []

    const sessionDate: Record<string, string> = {}
    for (const s of workoutSessions) sessionDate[s.id] = s.started_at

    const exerciseById: Record<string, Exercise> = {}
    for (const e of exercises) exerciseById[e.id] = e

    const now = new Date()
    const twelveWeeksAgo = new Date(now)
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 12 * 7)

    // Build 12 week-keys oldest → newest
    const twelveWeekKeys: string[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i * 7)
      twelveWeekKeys.push(weekKey(d))
    }

    interface Agg {
      name: string
      bodyPart: string
      count: number
      lastDate: string
      weekly: Record<string, number>
    }
    const agg: Record<string, Agg> = {}

    for (const set of workoutSets) {
      if (set.is_warmup) continue
      if (!set.weight_kg || set.weight_kg <= 0) continue
      if (!set.actual_reps || set.actual_reps <= 0) continue

      const startedAt = sessionDate[set.workout_session_id]
      if (!startedAt) continue
      const date = new Date(startedAt)
      if (date < twelveWeeksAgo) continue

      const ex = exerciseById[set.exercise_id]
      if (!ex) continue

      const name = ex.name_nl || ex.name || 'Oefening'
      const bp = ex.body_part || ''

      if (!agg[set.exercise_id]) {
        agg[set.exercise_id] = { name, bodyPart: bp, count: 0, lastDate: startedAt, weekly: {} }
      }
      agg[set.exercise_id].count++
      if (new Date(startedAt) > new Date(agg[set.exercise_id].lastDate)) {
        agg[set.exercise_id].lastDate = startedAt
      }
      const wk = weekKey(date)
      const est = e1RM(set.weight_kg, set.actual_reps)
      if (!agg[set.exercise_id].weekly[wk] || est > agg[set.exercise_id].weekly[wk]) {
        agg[set.exercise_id].weekly[wk] = est
      }
    }

    return Object.entries(agg).map<ExerciseAgg>(([exerciseId, a]) => {
      let last = 0
      const weekly = twelveWeekKeys.map((k) => {
        if (a.weekly[k]) last = a.weekly[k]
        return last
      })
      const firstNonZero = weekly.find((v) => v > 0) || 0
      const current = weekly[weekly.length - 1] || 0
      const bodyPart = normaliseBodyPart(a.bodyPart)
      return {
        exerciseId,
        name: a.name,
        bodyPart,
        rawBodyPart: a.bodyPart,
        count: a.count,
        lastDate: a.lastDate,
        weekly,
        current: Math.round(current),
        delta: Math.round(current - firstNonZero),
      }
    }).filter((m) => m.current > 0)
  }, [workoutSets, workoutSessions, exercises])

  const mainLifts = useMemo(
    () => [...exerciseAgg].sort((a, b) => b.count - a.count).slice(0, 4),
    [exerciseAgg],
  )

  const filteredExercises = useMemo(() => {
    const q = krachtSearch.trim().toLowerCase()
    return exerciseAgg
      .filter((e) => krachtMuscle === 'Alle' || e.bodyPart === krachtMuscle)
      .filter((e) => !q || e.name.toLowerCase().includes(q))
      .sort((a, b) => b.count - a.count)
  }, [exerciseAgg, krachtSearch, krachtMuscle])

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
        <h1 className="text-[32px] font-[family-name:var(--font-display)] text-[#FDFDFE]">Laden...</h1>
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="bg-[#A6ADA7] rounded-2xl h-64 shadow-card animate-shimmer" />
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
          className="inline-flex items-center gap-1 text-[#D6D9D6] hover:text-[#666] transition-colors mb-6"
        >
          <ArrowLeft strokeWidth={1.5} className="w-4 h-4" />
          <span className="text-sm font-medium">Terug naar profiel</span>
        </Link>
        <h1 className="text-[32px] font-[family-name:var(--font-display)] text-[#FDFDFE] mb-1">Voortgang</h1>
        {profile && <p className="text-[#D6D9D6] text-[15px]">{profile.full_name}</p>}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-[#A6ADA7] overflow-x-auto">
        {([
          { id: 'fotos' as TabType, label: "Foto's", color: '#FDFDFE' },
          { id: 'lichaam' as TabType, label: 'Lichaam', color: '#2FA65A' },
          { id: 'maten' as TabType, label: 'Omtrekmaten', color: '#E8B948' },
          { id: 'kracht' as TabType, label: 'Kracht', color: '#5A7FB5' },
          { id: 'prs' as TabType, label: "PR's", color: '#8A7BA8' },
          { id: 'compliance' as TabType, label: 'Compliance', color: '#FDFDFE' },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-[14px] font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-[#FDFDFE]'
                : 'text-[#CDD1CE] border-transparent hover:text-[#FDFDFE]'
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
                    ? 'bg-[#474B48] text-white'
                    : 'bg-[#A6ADA7] text-[#D6D9D6] border border-[#A6ADA7] hover:bg-[#A6ADA7]'
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
                      <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[#A6ADA7] border border-[#A6ADA7]">
                        {photoUrl ? (
                          <Image src={photoUrl} alt={`${entry.label} ${positionLabels[photoPosition]}`} width={400} height={500} sizes="(max-width: 600px) 50vw, 25vw" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full gap-2">
                            <ImageOff className="w-6 h-6 text-[#CDD1CE]" strokeWidth={1.5} />
                            <span className="text-[11px] text-[#CDD1CE]">Geen foto</span>
                          </div>
                        )}
                        {idx === 0 && (
                          <span className="absolute top-2 left-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#474B48] text-white">
                            Start
                          </span>
                        )}
                        {idx === photoTimeline.length - 1 && idx > 0 && (
                          <span className="absolute top-2 left-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#2FA65A] text-white">
                            Laatste
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] font-medium text-center text-[#FDFDFE]">{entry.label}</p>
                      <p className="text-[11px] text-center text-[#D6D9D6]">
                        {new Date(entry.date).toLocaleDateString('nl-BE')}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Side by side: Start vs Latest */}
              {photoTimeline.length >= 2 && (
                <div className="bg-[#A6ADA7] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#A6ADA7]">
                  <h3 className="text-[15px] font-semibold text-[#FDFDFE] mb-4">Start vs. Nu</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[photoTimeline[0], photoTimeline[photoTimeline.length - 1]].map((entry, idx) => {
                      const photoUrl = entry.photos[photoPosition]
                      return (
                        <div key={idx}>
                          <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[#A6ADA7]">
                            {photoUrl ? (
                              <Image src={photoUrl} alt={entry.label} width={400} height={500} sizes="(max-width: 600px) 50vw, 25vw" className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <ImageOff className="w-8 h-8 text-[#CDD1CE]" strokeWidth={1.5} />
                              </div>
                            )}
                          </div>
                          <p className="text-[13px] font-semibold text-center mt-2 text-[#FDFDFE]">
                            {idx === 0 ? 'Start' : 'Nu'}
                          </p>
                          <p className="text-[11px] text-center text-[#D6D9D6]">
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
            <div className="bg-[#A6ADA7] rounded-2xl p-12 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#A6ADA7] text-center">
              <Camera className="w-10 h-10 mx-auto mb-3 text-[#CDD1CE]" strokeWidth={1.5} />
              <p className="text-[#FDFDFE] font-semibold mb-1">Nog geen foto's</p>
              <p className="text-[#D6D9D6] text-[14px]">Foto's verschijnen na de eerste check-in of onboarding.</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ LICHAAM TAB ═══ */}
      {activeTab === 'lichaam' && (
        <div className="space-y-6">
          {/* Weight Chart */}
          {lichaamData.length > 0 && (
            <div className="bg-[#A6ADA7] rounded-2xl p-5 shadow-card border border-[#A6ADA7]">
              <h3 className="text-[17px] font-semibold text-[#FDFDFE] mb-4">Gewicht</h3>
              <div style={{ height: 250 }}>
                <ProgressLineChart
                  data={lichaamData}
                  dataKey="weight"
                  name="Gewicht (kg)"
                  color="#2FA65A"
                  height={250}
                  yAxisConfig={{ domain: ['dataMin - 2', 'dataMax + 2'] }}
                  tooltip={{ backgroundColor: 'white', border: '1px solid #A6ADA7', borderRadius: '0.75rem' }}
                />
              </div>
            </div>
          )}

          {/* Body Fat Chart */}
          {lichaamData.some(d => d.bodyFat) && (
            <div className="bg-[#A6ADA7] rounded-2xl p-5 shadow-card border border-[#A6ADA7]">
              <h3 className="text-[17px] font-semibold text-[#FDFDFE] mb-4">Vetpercentage</h3>
              <div style={{ height: 250 }}>
                <ProgressLineChart
                  data={lichaamData}
                  dataKey="bodyFat"
                  name="Vet (%)"
                  color="#8A7BA8"
                  height={250}
                  tooltip={{ backgroundColor: 'white', border: '1px solid #A6ADA7', borderRadius: '0.75rem' }}
                />
              </div>
            </div>
          )}

          {/* Muscle Mass Chart */}
          {lichaamData.some(d => d.muscle) && (
            <div className="bg-[#A6ADA7] rounded-2xl p-5 shadow-card border border-[#A6ADA7]">
              <h3 className="text-[17px] font-semibold text-[#FDFDFE] mb-4">Spiermassa</h3>
              <div style={{ height: 250 }}>
                <ProgressLineChart
                  data={lichaamData}
                  dataKey="muscle"
                  name="Spiermassa (kg)"
                  color="#5A7FB5"
                  height={250}
                  tooltip={{ backgroundColor: 'white', border: '1px solid #A6ADA7', borderRadius: '0.75rem' }}
                />
              </div>
            </div>
          )}

          {/* Current vs Start summary */}
          {(intakeData?.weight_kg || latest) && (
            <div className="bg-[#A6ADA7] rounded-2xl p-5 shadow-card border border-[#A6ADA7]">
              <h3 className="text-[17px] font-semibold text-[#FDFDFE] mb-4">Start vs. Nu</h3>
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
                    <div key={label} className="p-3 bg-[#A6ADA7] rounded-xl">
                      <p className="text-[12px] text-[#D6D9D6] font-medium mb-1">{label}</p>
                      <p className="text-xl font-bold text-[#FDFDFE]">
                        {current !== null && current !== undefined ? Number(current).toFixed(1) : '—'} {unit}
                      </p>
                      {diff !== null && (
                        <p className={`text-[12px] font-medium mt-0.5 ${isPositive ? 'text-green-600' : 'text-orange-600'}`}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)} {unit}
                        </p>
                      )}
                      {start && (
                        <p className="text-[11px] text-[#CDD1CE] mt-0.5">Start: {Number(start).toFixed(1)} {unit}</p>
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
          <div className="bg-[#A6ADA7] rounded-2xl p-5 shadow-card border border-[#A6ADA7]">
            <h3 className="text-[17px] font-semibold text-[#FDFDFE] mb-4">Omtrekmaten vergelijking</h3>

            {/* Table header */}
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[#A6ADA7]">
                    <th className="text-left px-3 py-2.5 font-medium text-[#D6D9D6]">Meting</th>
                    {intakeData && <th className="text-right px-3 py-2.5 font-medium text-[#D6D9D6]">Start</th>}
                    {checkins.map((c, idx) => (
                      <th key={c.id} className="text-right px-3 py-2.5 font-medium text-[#D6D9D6]">
                        {new Date(c.date).toLocaleDateString('nl-BE', { month: 'short' })}
                      </th>
                    ))}
                    {intakeData && latest && (
                      <th className="text-right px-3 py-2.5 font-medium text-[#FDFDFE]">Verschil</th>
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
                      <tr key={key} className="border-t border-[#A6ADA7]">
                        <td className="px-3 py-2.5 font-medium text-[#FDFDFE]">{label}</td>
                        {intakeData && (
                          <td className="px-3 py-2.5 text-right text-[#FDFDFE]">
                            {startVal ? `${startVal} cm` : '—'}
                          </td>
                        )}
                        {checkins.map(c => (
                          <td key={c.id} className="px-3 py-2.5 text-right text-[#FDFDFE]">
                            {(c as any)[key] ? `${(c as any)[key]} cm` : '—'}
                          </td>
                        ))}
                        {intakeData && latest && (
                          <td className={`px-3 py-2.5 text-right font-semibold ${
                            diff !== null
                              ? diff < 0 ? 'text-green-600' : diff > 0 ? 'text-orange-600' : 'text-[#D6D9D6]'
                              : 'text-[#D6D9D6]'
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
            <div className="bg-[#A6ADA7] rounded-2xl p-6 text-center">
              <p className="text-[14px] text-[#D6D9D6]">
                Meer data verschijnt na de eerste maandelijkse check-in.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══ KRACHT TAB ═══ */}
      {/* Mirrors /client/progress Kracht tab: compounds grid + search +
          muscle-filter chips + full exercise list. Each row links to the
          existing coach per-exercise detail page. */}
      {activeTab === 'kracht' && (
        <div>
          {/* Page sub-title */}
          <div
            style={{
              padding: '0 4px',
              marginBottom: 14,
              fontSize: 22,
              fontWeight: 300,
              letterSpacing: '-0.025em',
              color: '#FDFDFE',
            }}
          >
            Compounds
            <small
              style={{
                fontSize: 13,
                color: 'rgba(253,253,254,0.62)',
                marginLeft: 8,
                fontWeight: 300,
                letterSpacing: '-0.005em',
              }}
            >
              estimated 1RM · 12 weken
            </small>
          </div>

          {/* Top-4 compounds grid */}
          {mainLifts.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                marginBottom: 6,
              }}
            >
              {mainLifts.map((lift) => {
                const positive = lift.delta > 0
                return (
                  <Link
                    key={lift.exerciseId}
                    href={`/coach/clients/${clientId}/exercises/${lift.exerciseId}`}
                    style={{
                      background: '#A6ADA7',
                      padding: '16px 16px 14px',
                      borderRadius: 24,
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.10)',
                      minHeight: 128,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      textDecoration: 'none',
                      color: 'inherit',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 500,
                          letterSpacing: '0.16em',
                          textTransform: 'uppercase',
                          color: 'rgba(253,253,254,0.62)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {lift.name}
                      </div>
                      <div
                        style={{
                          fontSize: 26,
                          fontWeight: 250,
                          letterSpacing: '-0.025em',
                          color: '#FDFDFE',
                          fontFeatureSettings: '"tnum"',
                          lineHeight: 1.05,
                          marginTop: 6,
                        }}
                      >
                        {lift.current}
                        <small
                          style={{
                            fontSize: 11,
                            color: 'rgba(253,253,254,0.62)',
                            marginLeft: 2,
                            letterSpacing: 0,
                            fontWeight: 300,
                          }}
                        >
                          kg
                        </small>
                      </div>
                    </div>
                    <div style={{ width: '100%', height: 26, margin: '6px 0 4px' }}>
                      <LiftSpark data={lift.weekly} positive={positive} />
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 11,
                        color: 'rgba(253,253,254,0.62)',
                        fontWeight: 400,
                      }}
                    >
                      <span>vs. 12w</span>
                      <span
                        style={{
                          color: positive ? '#FDFDFE' : 'rgba(253,253,254,0.62)',
                          fontWeight: positive ? 500 : 400,
                          letterSpacing: '-0.005em',
                        }}
                      >
                        {positive ? '+' : ''}{lift.delta} kg
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div
              style={{
                background: '#A6ADA7',
                padding: '28px 22px',
                borderRadius: 24,
                textAlign: 'center',
                marginBottom: 6,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.10)',
              }}
            >
              <p style={{ color: '#FDFDFE', fontSize: 14, fontWeight: 400 }}>
                Nog geen kracht-data
              </p>
              <p style={{ color: 'rgba(253,253,254,0.62)', fontSize: 12, marginTop: 4 }}>
                Deze klant heeft nog geen sets gelogd met gewicht + reps.
              </p>
            </div>
          )}

          {/* Alle oefeningen cap */}
          <div
            style={{
              padding: '22px 4px 10px',
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(253,253,254,0.62)',
            }}
          >
            Alle oefeningen
          </div>

          {/* Search pill */}
          <div
            style={{
              padding: '11px 16px',
              borderRadius: 999,
              background: 'rgba(253,253,254,0.06)',
              border: '1px solid rgba(253,253,254,0.10)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 10,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(253,253,254,0.62)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="7" />
              <line x1="20" y1="20" x2="16.5" y2="16.5" />
            </svg>
            <input
              type="text"
              placeholder="Zoek een oefening…"
              value={krachtSearch}
              onChange={(e) => setKrachtSearch(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#FDFDFE',
                fontSize: 13,
                fontWeight: 400,
                letterSpacing: '-0.005em',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            {krachtSearch && (
              <button
                onClick={() => setKrachtSearch('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(253,253,254,0.62)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label="Leeg zoekopdracht"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* Muscle chips */}
          <div
            className="overflow-x-auto"
            style={{
              display: 'flex',
              gap: 6,
              marginBottom: 12,
              paddingBottom: 2,
              scrollbarWidth: 'none',
            }}
          >
            {(['Alle', 'Borst', 'Rug', 'Benen', 'Schouders', 'Armen', 'Core'] as MuscleFilter[]).map((m) => {
              const active = krachtMuscle === m
              return (
                <button
                  key={m}
                  onClick={() => setKrachtMuscle(m)}
                  style={{
                    flexShrink: 0,
                    padding: '6px 12px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 400,
                    color: active ? '#FDFDFE' : 'rgba(253,253,254,0.78)',
                    background: active ? 'rgba(253,253,254,0.12)' : 'transparent',
                    border: `1px solid ${active ? 'rgba(253,253,254,0.18)' : 'rgba(253,253,254,0.10)'}`,
                    cursor: 'pointer',
                    letterSpacing: '0.005em',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {m}
                </button>
              )
            })}
          </div>

          {/* Exercise list */}
          {filteredExercises.length > 0 ? (
            <div
              style={{
                background: '#A6ADA7',
                borderRadius: 24,
                overflow: 'hidden',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.10)',
              }}
            >
              {filteredExercises.map((ex, i) => (
                <Link
                  key={ex.exerciseId}
                  href={`/coach/clients/${clientId}/exercises/${ex.exerciseId}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 64px auto',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 18px',
                    borderTop: i > 0 ? '1px solid rgba(0,0,0,0.08)' : 'none',
                    textDecoration: 'none',
                    color: 'inherit',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 400,
                        color: '#FDFDFE',
                        letterSpacing: '-0.005em',
                        lineHeight: 1.25,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {ex.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 400,
                        color: 'rgba(253,253,254,0.62)',
                        marginTop: 2,
                        letterSpacing: '0.005em',
                      }}
                    >
                      {ex.bodyPart} · {ex.count}× gelogd · laatst {formatShortDate(ex.lastDate)}
                    </div>
                  </div>
                  <div style={{ width: '100%', height: 22 }}>
                    <ExSpark data={ex.weekly} positive={ex.delta > 0} />
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 400,
                      color: '#FDFDFE',
                      letterSpacing: '-0.005em',
                      fontFeatureSettings: '"tnum"',
                      textAlign: 'right',
                    }}
                  >
                    {ex.current}
                    <small
                      style={{
                        fontSize: 10,
                        color: 'rgba(253,253,254,0.62)',
                        marginLeft: 2,
                        letterSpacing: 0,
                      }}
                    >
                      kg
                    </small>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div
              style={{
                background: '#A6ADA7',
                padding: '28px 22px',
                borderRadius: 24,
                textAlign: 'center',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.10)',
              }}
            >
              <p style={{ color: '#FDFDFE', fontSize: 14, fontWeight: 400 }}>
                {krachtSearch ? 'Geen oefeningen gevonden' : 'Geen oefeningen in deze groep'}
              </p>
              <p style={{ color: 'rgba(253,253,254,0.62)', fontSize: 12, marginTop: 4 }}>
                {krachtSearch ? 'Probeer een andere zoekterm.' : 'Kies een andere spiergroep of wacht tot de klant meer logt.'}
              </p>
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
                <div key={pr.id} className="bg-[#A6ADA7] rounded-2xl p-5 shadow-card border border-[#A6ADA7] flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#8A7BA8] flex items-center justify-center flex-shrink-0">
                    <Trophy size={20} className="text-white" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[17px] font-semibold text-[#FDFDFE]">
                      {(pr as any).exercises?.name_nl || (pr as any).exercises?.name || 'Oefening'}
                    </p>
                    <p className="text-[13px] text-[#CDD1CE] mt-1">{pr.record_type === 'weight' ? 'Max gewicht' : pr.record_type}</p>
                    <div className="flex items-baseline gap-2 mt-2">
                      <p className="text-2xl font-semibold text-[#FDFDFE]">{pr.value}</p>
                      <p className="text-[15px] text-[#CDD1CE]">kg</p>
                    </div>
                    <p className="text-[13px] text-[#CDD1CE] mt-2">{new Date(pr.achieved_at).toLocaleDateString('nl-BE')}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#A6ADA7] rounded-2xl p-12 shadow-card border border-[#A6ADA7] text-center">
              <Trophy size={32} className="text-[#CDD1CE] mx-auto mb-4" strokeWidth={1.5} />
              <p className="text-[#FDFDFE] font-semibold mb-1">Nog geen PR's</p>
              <p className="text-[#CDD1CE] text-[15px]">PR's verschijnen na gelogde workouts</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ COMPLIANCE TAB ═══ */}
      {activeTab === 'compliance' && (
        <div className="space-y-6">
          <div className="bg-[#A6ADA7] rounded-2xl p-6 shadow-card border border-[#A6ADA7]">
            <h3 className="text-[17px] font-semibold text-[#FDFDFE] mb-6">Workouts deze maand</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-[15px] text-[#D6D9D6]">Voltooide workouts</p>
                <p className="text-[17px] font-semibold text-[#FDFDFE]">{complianceData.completed} / {complianceData.total}</p>
              </div>
              <div className="w-full bg-[#A6ADA7] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#FDFDFE] h-full transition-all duration-300"
                  style={{ width: `${complianceData.total > 0 ? (complianceData.completed / complianceData.total) * 100 : 0}%` }}
                />
              </div>
              <p className="text-[13px] text-[#CDD1CE] font-medium">{complianceData.percentage}% compliance</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
