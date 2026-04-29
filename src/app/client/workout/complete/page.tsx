'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { invalidateCache } from '@/lib/fetcher'
import { optimisticMutate } from '@/lib/optimistic'
import { readDashboardCache, writeDashboardCache } from '@/lib/dashboard-cache'
import type { DashboardData } from '@/app/client/DashboardClient'

// ─── Types ──────────────────────────────────────────────────

interface ExerciseInfo {
  id: string
  name: string
  name_nl: string
}

interface WorkoutSet {
  id: string
  exercise_id: string
  set_number: number
  weight_kg: number | null
  actual_reps: number | null
  is_pr: boolean
  pain_flag: boolean
  pain_notes: string | null
  exercises?: ExerciseInfo
}

interface WorkoutSessionComplete {
  id: string
  started_at: string
  template_day_id: string | null
  workout_sets: WorkoutSet[]
}

interface ExerciseGroup {
  exerciseId: string
  name: string
  sets: WorkoutSet[]
  volume: number
  prevVolume: number | null
  hasPR: boolean
  topSet: WorkoutSet | null
  history: number[]
}

interface PRRow {
  exerciseId: string
  name: string
  kind: 'weight' | 'reps' | 'volume'
  fromVal: number
  toVal: number
  unit: string
}

// ─── Helpers ────────────────────────────────────────────────

function buildTrendPath(values: number[], w = 300, h = 96, padL = 10, padR = 10, padT = 10, padB = 26): string {
  if (values.length < 2) return ''
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const innerW = w - padL - padR
  const innerH = h - padT - padB
  const step = innerW / (values.length - 1)
  return values
    .map((v, i) => {
      const x = padL + i * step
      const y = padT + innerH - ((v - min) / range) * innerH
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

function buildSparkPath(values: number[], w = 64, h = 28, pad = 2): { d: string; lastX: number; lastY: number } {
  if (values.length === 0) return { d: '', lastX: 0, lastY: 0 }
  if (values.length === 1) {
    const x = w - pad
    const y = h / 2
    return { d: `M ${pad} ${y} L ${x} ${y}`, lastX: x, lastY: y }
  }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const innerW = w - pad * 2
  const innerH = h - pad * 2
  const step = innerW / (values.length - 1)
  let lastX = pad
  let lastY = h / 2
  const d = values
    .map((v, i) => {
      const x = pad + i * step
      const y = pad + innerH - ((v - min) / range) * innerH
      lastX = x
      lastY = y
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
  return { d, lastX, lastY }
}

// ─── Component ──────────────────────────────────────────────

export default function WorkoutCompletePageWrapper() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#8E9890',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: '2px solid rgba(253,253,254,0.20)',
              borderTopColor: '#1C1E18',
              animation: 'spin 1s linear infinite',
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      }
    >
      <WorkoutCompletePage />
    </Suspense>
  )
}

function WorkoutCompletePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')

  const [session, setSession] = useState<WorkoutSessionComplete | null>(null)
  const [programName, setProgramName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [rpe, setRpe] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [exerciseGroups, setExerciseGroups] = useState<ExerciseGroup[]>([])
  const [prRows, setPrRows] = useState<PRRow[]>([])
  const [trendHistory, setTrendHistory] = useState<number[]>([])
  const [prevVolume, setPrevVolume] = useState<number | null>(null)
  const [nextWorkout, setNextWorkout] = useState<{ name: string; meta: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [confettiOn, setConfettiOn] = useState(false)

  useEffect(() => {
    const loadSession = async () => {
      try {
        if (!sessionId) {
          router.push('/client/workout')
          return
        }
        const supabase = createClient()
        const { data: sessionData, error: sessionErr } = await supabase
          .from('workout_sessions')
          .select('id, started_at, template_day_id, workout_sets(*, exercises(id, name, name_nl))')
          .eq('id', sessionId)
          .single()

        if (sessionErr) {
          console.error('[complete] Session load error:', sessionErr.message, sessionErr.details)
        }

        if (!sessionData) {
          setLoading(false)
          return
        }

        const sd = sessionData as unknown as WorkoutSessionComplete
        let workoutSets = sd.workout_sets || []

        // RESCUE: if no sets in DB, recover from localStorage
        if (workoutSets.length === 0) {
          try {
            const raw = localStorage.getItem('move_active_workout')
            if (raw) {
              const saved = JSON.parse(raw)
              if (saved.sessionId === sessionId && saved.sets) {
                const templateExIds = Object.keys(saved.sets)
                const { data: templateExercises } = await supabase
                  .from('program_template_exercises')
                  .select('id, exercise_id')
                  .in('id', templateExIds)

                const idMap: Record<string, string> = {}
                for (const te of templateExercises || []) {
                  idMap[te.id] = te.exercise_id
                }

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const setsToInsert: any[] = []
                for (const [templateExId, exSets] of Object.entries(saved.sets)) {
                  const realExId = idMap[templateExId] || templateExId
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  for (const s of exSets as any[]) {
                    if (!s.weight_kg && !s.actual_reps) continue
                    setsToInsert.push({
                      workout_session_id: sessionId,
                      exercise_id: realExId,
                      set_number: s.set_number,
                      prescribed_reps: s.prescribed_reps || null,
                      actual_reps: s.actual_reps,
                      weight_kg: s.weight_kg,
                      is_warmup: s.is_warmup || false,
                      completed: true,
                      is_pr: s.is_pr || false,
                    })
                  }
                }

                if (setsToInsert.length > 0) {
                  const { error: insertErr } = await supabase.from('workout_sets').insert(setsToInsert)
                  if (!insertErr) {
                    const { data: refreshed } = await supabase
                      .from('workout_sessions')
                      .select('id, started_at, template_day_id, workout_sets(*, exercises(id, name, name_nl))')
                      .eq('id', sessionId)
                      .single()
                    if (refreshed) {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      workoutSets = (refreshed as any).workout_sets || []
                    }
                  }
                }
              }
            }
          } catch (e) {
            console.error('Recovery from localStorage failed:', e)
          }
          try {
            localStorage.removeItem('move_active_workout')
            localStorage.removeItem('move_minimized_workout')
          } catch {
            /* ok */
          }
        }

        setSession({ ...sd, workout_sets: workoutSets })

        // ── Program name for page-head sub ──
        if (sd.template_day_id) {
          // Get this template day (name + parent template) plus siblings to determine "next workout"
          const { data: dayRow } = await supabase
            .from('program_template_days')
            .select('id, name, day_number, template_id, program_templates(name)')
            .eq('id', sd.template_day_id)
            .single()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const dayAny = dayRow as any
          const tplName = dayAny?.program_templates?.name as string | undefined
          if (tplName) setProgramName(tplName)

          // ── Next workout: next day in same template by day_number ──
          if (dayAny?.template_id) {
            const { data: days } = await supabase
              .from('program_template_days')
              .select('id, name, day_number, program_template_exercises(id)')
              .eq('template_id', dayAny.template_id)
              .order('day_number', { ascending: true })
            if (days && days.length > 0) {
              const idx = days.findIndex((t) => t.id === sd.template_day_id)
              const next =
                idx >= 0 && idx + 1 < days.length
                  ? days[idx + 1]
                  : days[0]
              if (next && next.id !== sd.template_day_id) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const exCount = ((next as any).program_template_exercises || []).length
                setNextWorkout({
                  name: next.name,
                  meta: exCount > 0 ? `${exCount} oefeningen` : 'Volgende training',
                })
              }
            }
          }
        }

        // ── Group sets per exercise ──
        const groupMap: Record<string, ExerciseGroup> = {}
        for (const set of workoutSets) {
          const exId = set.exercise_id
          if (!groupMap[exId]) {
            groupMap[exId] = {
              exerciseId: exId,
              name: set.exercises?.name_nl || set.exercises?.name || 'Oefening',
              sets: [],
              volume: 0,
              prevVolume: null,
              hasPR: false,
              topSet: null,
              history: [],
            }
          }
          groupMap[exId].sets.push(set)
          groupMap[exId].volume += (set.weight_kg || 0) * (set.actual_reps || 0)
          if (set.is_pr) groupMap[exId].hasPR = true
          const cur = groupMap[exId].topSet
          const curVol = cur ? (cur.weight_kg || 0) * (cur.actual_reps || 0) : -1
          const setVol = (set.weight_kg || 0) * (set.actual_reps || 0)
          if (setVol > curVol) groupMap[exId].topSet = set
        }
        const groups = Object.values(groupMap)

        // ── Per-exercise history (last 6 sessions incl current) for sparklines & prevVolume ──
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const sbAny: any = supabase
            for (const g of groups) {
              const { data: hist } = await sbAny
                .from('workout_sets')
                .select('weight_kg, actual_reps, workout_session_id, workout_sessions!inner(client_id, started_at, completed_at)')
                .eq('exercise_id', g.exerciseId)
                .eq('workout_sessions.client_id', user.id)
                .not('workout_sessions.completed_at', 'is', null)
                .order('workout_sessions(started_at)', { ascending: false })
                .limit(60)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const histAny = (hist as any[]) || []
              // bucket per session_id, compute volume
              const buckets: Record<string, { volume: number; startedAt: string }> = {}
              for (const row of histAny) {
                const sid = row.workout_session_id
                if (!buckets[sid]) {
                  buckets[sid] = {
                    volume: 0,
                    startedAt: row.workout_sessions?.started_at || '',
                  }
                }
                buckets[sid].volume += (row.weight_kg || 0) * (row.actual_reps || 0)
              }
              const ordered = Object.values(buckets)
                .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
                .slice(-6)
              g.history = ordered.map((b) => b.volume)
              if (ordered.length >= 2) {
                // previous volume = second-to-last (i.e. previous session for this exercise)
                g.prevVolume = ordered[ordered.length - 2].volume
              }
            }
          }
        } catch (e) {
          console.warn('per-exercise history failed:', e)
        }

        setExerciseGroups(groups)

        // ── PR rows (only is_pr sets) ──
        const prRowsMap: Record<string, PRRow> = {}
        for (const set of workoutSets) {
          if (!set.is_pr) continue
          const exId = set.exercise_id
          const name = set.exercises?.name_nl || set.exercises?.name || 'Oefening'
          const weight = set.weight_kg || 0
          const reps = set.actual_reps || 0
          // keep the heaviest PR row per exercise
          if (!prRowsMap[exId] || weight > prRowsMap[exId].toVal) {
            prRowsMap[exId] = {
              exerciseId: exId,
              name,
              kind: 'weight',
              fromVal: 0,
              toVal: weight,
              unit: 'kg',
            }
            // look up previous best for this exercise
            try {
              const { data: prev } = await supabase
                .from('workout_sets')
                .select('weight_kg, actual_reps, workout_session_id, workout_sessions!inner(started_at)')
                .eq('exercise_id', exId)
                .lt('workout_sessions.started_at' as never, session?.started_at || new Date().toISOString())
                .order('weight_kg', { ascending: false })
                .limit(1)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const prevRow = ((prev as any[]) || [])[0]
              if (prevRow?.weight_kg) {
                prRowsMap[exId].fromVal = prevRow.weight_kg
              }
            } catch {
              /* ok */
            }
            // if weight is 0 (e.g. bodyweight), show reps delta
            if (weight === 0 && reps > 0) {
              prRowsMap[exId].kind = 'reps'
              prRowsMap[exId].toVal = reps
              prRowsMap[exId].unit = 'reps'
            }
          }
        }
        setPrRows(Object.values(prRowsMap))

        // ── Global volume trend: last 6 user sessions ──
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: recent } = await supabase
              .from('workout_sessions')
              .select('id, started_at, completed_at, workout_sets(weight_kg, actual_reps)')
              .eq('client_id', user.id)
              .not('completed_at', 'is', null)
              .order('started_at', { ascending: false })
              .limit(6)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const recentAny = ((recent as any[]) || []).reverse()
            const volumes = recentAny.map((s) =>
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (s.workout_sets || []).reduce(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (sum: number, st: any) => sum + (st.weight_kg || 0) * (st.actual_reps || 0),
                0
              )
            )
            // include current session as last point if not already present
            const currentVol = workoutSets.reduce(
              (sum, st) => sum + (st.weight_kg || 0) * (st.actual_reps || 0),
              0
            )
            let hist = volumes
            if (volumes.length === 0 || volumes[volumes.length - 1] === 0) {
              hist = [...volumes, currentVol]
            }
            setTrendHistory(hist)
            if (hist.length >= 2) setPrevVolume(hist[hist.length - 2])
          }
        } catch (e) {
          console.warn('trend history failed:', e)
        }
      } catch (error) {
        console.error('Error loading session:', error)
      } finally {
        setLoading(false)
      }
    }
    loadSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  // ── Trigger confetti if any PR ──
  const prCount = prRows.length
  useEffect(() => {
    if (prCount > 0) {
      setConfettiOn(true)
      const t = setTimeout(() => setConfettiOn(false), 3000)
      return () => clearTimeout(t)
    }
  }, [prCount])

  // ── Share ──
  const handleShare = useCallback(async () => {
    if (!session) return
    const workoutSets = session.workout_sets || []
    const totalSets = workoutSets.length
    const totalVolume = workoutSets.reduce(
      (sum, set) => sum + (set.weight_kg || 0) * (set.actual_reps || 0),
      0
    )
    const minutes = Math.max(
      1,
      Math.floor((new Date().getTime() - new Date(session.started_at).getTime()) / 1000 / 60)
    )

    let text = `MŌVE — training voltooid\n\n`
    text += `${minutes} min · ${totalSets} sets · ${Math.round(totalVolume)} kg volume\n`
    if (prCount > 0) {
      text += `${prCount} ${prCount === 1 ? 'nieuw record' : 'nieuwe records'}\n`
    }
    text += `\n— movestudio.be`

    if (navigator.share) {
      try {
        await navigator.share({ text })
      } catch {
        /* cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(text)
        alert('Gekopieerd naar klembord')
      } catch {
        /* ok */
      }
    }
  }, [session, prCount])

  // ── Complete (Sluiten) ──
  //
  // Fase 4 — optimistic workout-complete:
  //   • UI navigeert onmiddellijk naar /client/workout (geen blocking spinner).
  //   • Dashboard IDB-cache krijgt direct training.completedToday=true +
  //     today in completedDates, zodat home bij volgende mount al "voltooid"
  //     toont zonder server-round-trip.
  //   • API-call loopt op de achtergrond. Faalt /api/workout-finish, dan
  //     valt commit terug op directe DB-update + best-effort /api/workout-complete.
  //   • Faalt ook dat: rollback van de IDB-cache zodat home authoritatieve
  //     state ophaalt bij volgend bezoek.
  const handleComplete = async () => {
    if (!session) {
      router.push('/client/workout')
      return
    }

    setSaving(true)
    const supabase = createClient()
    const startTime = new Date(session.started_at)
    const endTime = new Date()
    const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
    const todayStr = endTime.toISOString().split('T')[0]

    const { data: { session: authSession } } = await supabase.auth.getSession()
    const userId = authSession?.user?.id ?? null
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (authSession?.access_token) {
      headers['Authorization'] = `Bearer ${authSession.access_token}`
    }

    // Snapshot dashboard-cache vóór de optimistische patch — nodig voor rollback.
    let cacheSnapshot: DashboardData | null = null
    if (userId) {
      const hit = await readDashboardCache<DashboardData>(userId).catch(() => null)
      cacheSnapshot = hit?.data ?? null
    }

    // Navigeer direct — alle volgende werk gebeurt op de achtergrond.
    router.push('/client/workout')

    optimisticMutate({
      key: 'workout-complete',
      apply: () => {
        if (userId && cacheSnapshot) {
          const dates = cacheSnapshot.training.completedDates ?? []
          const nextData: DashboardData = {
            ...cacheSnapshot,
            training: {
              ...cacheSnapshot.training,
              completedToday: true,
              completedDates: dates.includes(todayStr) ? dates : [...dates, todayStr],
            },
          }
          writeDashboardCache(userId, nextData).catch(() => {})
        }
      },
      rollback: () => {
        if (userId && cacheSnapshot) {
          writeDashboardCache(userId, cacheSnapshot).catch(() => {})
        }
      },
      commit: async () => {
        const res = await fetch('/api/workout-finish', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            sessionId,
            completedAt: endTime.toISOString(),
            durationSeconds,
            moodRating: null,
            difficultyRating: rpe ?? null,
            notes: notes || null,
            feedbackText: null,
            painData: null,
          }),
        })

        if (res.ok) return res

        // Primary mislukt → fallback op directe DB-update (oude pad blijft intact).
        const errBody = await res.json().catch(() => ({}))
        console.warn('[workout-finish] primary failed, trying fallback:', errBody)

        const { error: dbErr } = await supabase
          .from('workout_sessions')
          .update({
            completed_at: endTime.toISOString(),
            duration_seconds: durationSeconds,
            difficulty_rating: rpe ?? null,
            notes: notes || null,
          })
          .eq('id', sessionId)

        if (dbErr) {
          throw new Error(
            `workout-finish + fallback both failed: ${JSON.stringify(errBody)} / ${dbErr.message}`,
          )
        }

        // Fallback gelukt → fire-and-forget de post-completion hooks.
        fetch('/api/workout-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        }).catch(() => {})
        return res
      },
      onSuccess: () => {
        invalidateCache('/api/dashboard')
      },
      onError: (err) => {
        console.error('[optimistic:workout-complete] commit failed:', err)
        // Log naar bug_reports zodat coach dit ziet ipv stille fail.
        try {
          const msg = err instanceof Error ? err.message : String(err)
          void supabase.from('bug_reports').insert({
            user_id: userId,
            page_url: typeof window !== 'undefined' ? window.location.href : '/client/workout/complete',
            description:
              '[auto] workout-complete commit failed — ' +
              msg +
              ' | session=' +
              sessionId +
              ' started=' +
              session.started_at,
            viewport_width: typeof window !== 'undefined' ? window.innerWidth : null,
            viewport_height: typeof window !== 'undefined' ? window.innerHeight : null,
            user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          })
        } catch {
          /* best-effort */
        }
        // Queue voor retry bij volgende mount (localStorage-gebaseerd).
        try {
          if (typeof window !== 'undefined') {
            const raw = window.localStorage.getItem('pending-workout-finish') || '[]'
            const queue: Array<Record<string, unknown>> = JSON.parse(raw)
            queue.push({
              sessionId,
              completedAt: endTime.toISOString(),
              durationSeconds,
              difficultyRating: rpe ?? null,
              notes: notes || null,
              queuedAt: new Date().toISOString(),
            })
            // Keep queue bounded — max 10 items.
            window.localStorage.setItem(
              'pending-workout-finish',
              JSON.stringify(queue.slice(-10)),
            )
          }
        } catch {
          /* best-effort */
        }
      },
    }).catch(() => {
      // Rollback al uitgevoerd; user is al genavigeerd, niets meer te doen UI-wise.
    })
  }

  // ── Loading / empty states ──
  if (loading) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#8E9890',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: '2px solid rgba(253,253,254,0.20)',
            borderTopColor: '#1C1E18',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!session) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#8E9890',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(28,30,24,0.65)',
          fontSize: 14,
        }}
      >
        Sessie niet gevonden
      </div>
    )
  }

  // ── Derived stats ──
  const workoutSets = session.workout_sets || []
  const totalSets = workoutSets.length
  const totalVolume = workoutSets.reduce(
    (sum, set) => sum + (set.weight_kg || 0) * (set.actual_reps || 0),
    0
  )
  const startTime = new Date(session.started_at)
  const endTime = new Date()
  const minutes = Math.max(1, Math.floor((endTime.getTime() - startTime.getTime()) / 1000 / 60))

  const deltaPct =
    prevVolume && prevVolume > 0
      ? Math.round(((totalVolume - prevVolume) / prevVolume) * 100)
      : null

  const startLabel = new Date(session.started_at).toLocaleTimeString('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const pageSub = programName ? `${programName} · ${startLabel}` : startLabel

  const trendD = buildTrendPath(trendHistory)
  const trendMin = trendHistory.length > 0 ? Math.min(...trendHistory) : 0
  const trendMax = trendHistory.length > 0 ? Math.max(...trendHistory) : 0

  // last point coords for the lime dot on trend chart
  let lastX = 290
  let lastY = 8
  if (trendHistory.length >= 2) {
    const padL = 10
    const padR = 10
    const padT = 10
    const padB = 26
    const innerW = 300 - padL - padR
    const innerH = 96 - padT - padB
    const range = trendMax - trendMin || 1
    const i = trendHistory.length - 1
    lastX = padL + i * (innerW / (trendHistory.length - 1))
    lastY = padT + innerH - ((trendHistory[i] - trendMin) / range) * innerH
  }
  // first point coords for the small dim circle + label
  let firstX = 10
  let firstY = 58
  if (trendHistory.length >= 2) {
    const padL = 10
    const padT = 10
    const padB = 26
    const innerH = 96 - padT - padB
    const range = trendMax - trendMin || 1
    firstX = padL
    firstY = padT + innerH - ((trendHistory[0] - trendMin) / range) * innerH
  }

  const fmtVolume = (v: number) =>
    v >= 1000
      ? v.toLocaleString('nl-NL', { maximumFractionDigits: 0 })
      : `${Math.round(v)}`

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#8E9890',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ═══ CONFETTI ══════════════════════════════ */}
      {confettiOn && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        >
          {Array.from({ length: 40 }).map((_, i) => {
            const left = Math.random() * 100
            const delay = Math.random() * 0.6
            const dur = 1.5 + Math.random() * 1
            const size = 6 + Math.random() * 6
            const colors = ['#C0FC01', '#A6ADA7', '#1C1E18', '#2FA65A']
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `${left}%`,
                  top: '-10px',
                  width: `${size}px`,
                  height: `${size * 0.6}px`,
                  backgroundColor: colors[i % colors.length],
                  borderRadius: '2px',
                  transform: `rotate(${Math.random() * 360}deg)`,
                  animation: `confettiFall ${dur}s ease-in ${delay}s forwards`,
                  opacity: 0,
                }}
              />
            )
          })}
          <style>{`@keyframes confettiFall { 0% { opacity:1; transform:translateY(0) rotate(0deg);} 100% { opacity:0; transform:translateY(100vh) rotate(720deg);} }`}</style>
        </div>
      )}

      {/* ═══ TOP BAR ═══════════════════════════════ */}
      <div
        style={{
          padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 5% 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          aria-label="Naar home"
          onClick={() => router.push('/client')}
          style={{
            fontFamily: 'var(--font-sans, Outfit), Outfit, sans-serif',
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: '-0.02em',
            color: '#1C1E18',
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          MŌVE
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #646B66, #4a4f4c)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 500,
              color: '#1C1E18',
            }}
          >
            G
          </div>
          <button
            className="ico-btn"
            aria-label="Menu"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <svg viewBox="0 0 24 24">
              <line x1="4" y1="8" x2="20" y2="8" />
              <line x1="4" y1="16" x2="20" y2="16" />
            </svg>
          </button>
        </div>
      </div>

      {/* ═══ PAGE HEAD ═════════════════════════════ */}
      <div
        className="page-head review-head"
        style={{ padding: '4px 5% 18px', flexShrink: 0 }}
      >
        <div>
          <div className="page-title">Voltooid</div>
          <div className="page-sub">{pageSub}</div>
        </div>
      </div>

      {/* ═══ SCROLL ════════════════════════════════ */}
      <main
        className="review-scroll"
        style={{ flex: 1, overflowY: 'auto', width: '100%' }}
      >
        {/* 1 · Hero + 2 · Trend + 3 · PRs */}
        <div style={{ padding: '0 5%', display: 'flex', flexDirection: 'column' }}>
          {/* Hero (dark) */}
          <div className="review-card dark hero-card">
            <div className="hero-title">
              <span className="dot" />
              Training afgerond
            </div>
            <div className="hero-num">{fmtVolume(totalVolume)}</div>
            <div className="hero-sub">kg volume</div>
            <div className="hero-meta">
              <span>{minutes} min</span>
              <span className="sep" />
              <span>
                {totalSets}/{totalSets} sets
              </span>
              {deltaPct !== null && (
                <span className="hero-delta">
                  {deltaPct >= 0 ? '+' : ''}
                  {deltaPct}%
                </span>
              )}
            </div>
          </div>

          {/* Trend (light) */}
          {trendHistory.length >= 2 && (
            <div className="review-card">
              <div className="trend-head">
                <div className="trend-title">
                  Volume-trend · {trendHistory.length} {trendHistory.length === 1 ? 'sessie' : 'sessies'}
                </div>
                <div className="trend-scale">kg</div>
              </div>
              <svg className="trend-svg" viewBox="0 0 300 96" preserveAspectRatio="none">
                <line
                  x1="0"
                  y1="88"
                  x2="300"
                  y2="88"
                  stroke="rgba(28,30,24,0.10)"
                  strokeWidth="1"
                />
                <path
                  d={trendD}
                  stroke="rgba(28,30,24,0.68)"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx={firstX} cy={firstY} r="2.5" fill="rgba(253,253,254,0.45)" />
                <circle cx={lastX} cy={lastY} r="8" fill="rgba(192,252,1,0.18)" />
                <circle cx={lastX} cy={lastY} r="4" fill="#C0FC01" />
                <text
                  x={lastX}
                  y={Math.max(lastY - 10, 10)}
                  fill="#1C1E18"
                  fontFamily="Outfit"
                  fontSize="11"
                  fontWeight="500"
                  textAnchor="end"
                  style={{ fontFeatureSettings: "'tnum'" }}
                >
                  {fmtVolume(trendHistory[trendHistory.length - 1])}
                </text>
                <text
                  x={firstX}
                  y={firstY + 16}
                  fill="rgba(28,30,24,0.58)"
                  fontFamily="Outfit"
                  fontSize="10"
                  fontWeight="400"
                  textAnchor="start"
                  style={{ fontFeatureSettings: "'tnum'" }}
                >
                  {fmtVolume(trendHistory[0])}
                </text>
              </svg>
              <div className="trend-axis">
                <div className="pt">{trendHistory.length}w geleden</div>
                <div className="pt now">Vandaag</div>
              </div>
            </div>
          )}

          {/* PRs (light, conditional) */}
          {prRows.length > 0 && (
            <div className="review-card">
              <div className="prs-head">
                <span className="pulse" />
                <div className="prs-title">
                  Nieuwe records · {prRows.length}
                </div>
              </div>
              {prRows.map((pr) => (
                <div key={pr.exerciseId} className="pr-row">
                  <div>
                    <span className="pr-name">{pr.name}</span>
                    <span className="pr-tag">Nieuw</span>
                  </div>
                  <div className="pr-delta">
                    {pr.fromVal > 0 && <span>{pr.fromVal}</span>}
                    {pr.fromVal > 0 && <span className="arrow">→</span>}
                    <span>
                      {pr.toVal} {pr.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4 · Per oefening */}
        {exerciseGroups.length > 0 && (
          <>
            <div className="review-section-head">
              <h3>Per oefening</h3>
              <span>
                {exerciseGroups.length} oefeningen
              </span>
            </div>
            {exerciseGroups.map((g) => {
              const top = g.topSet
              const topSummary = top
                ? top.weight_kg && top.weight_kg > 0
                  ? `${g.sets.length} × ${top.weight_kg} kg`
                  : `${g.sets.length} × ${top.actual_reps || 0} reps`
                : `${g.sets.length} sets`
              let deltaLabel = '='
              let deltaFlat = true
              if (g.prevVolume && g.prevVolume > 0 && g.volume > 0) {
                const diff = g.volume - g.prevVolume
                if (Math.abs(diff) / g.prevVolume >= 0.02) {
                  deltaFlat = false
                  if (g.hasPR) {
                    deltaLabel = `+${Math.round(diff)} kg · PR`
                  } else if (diff > 0) {
                    deltaLabel = `+${Math.round(diff)} kg`
                  } else {
                    deltaLabel = `${Math.round(diff)} kg`
                  }
                } else if (g.hasPR) {
                  deltaFlat = false
                  deltaLabel = 'PR'
                }
              } else if (g.hasPR) {
                deltaFlat = false
                deltaLabel = 'PR'
              }

              const spark = buildSparkPath(
                g.history.length > 0 ? g.history : [g.volume],
                64,
                28,
                2
              )

              return (
                <button
                  key={g.exerciseId}
                  className="ex-review"
                  onClick={() =>
                    router.push(`/client/exercises/${g.exerciseId}/history`)
                  }
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <div className="ex-body">
                    <div className="ex-name">{g.name}</div>
                    <div className="ex-meta">
                      <span>{topSummary}</span>
                      <span className={`delta${deltaFlat ? ' flat' : ''}`}>
                        {deltaLabel}
                      </span>
                    </div>
                  </div>
                  <svg
                    className="spark"
                    viewBox="0 0 64 28"
                    preserveAspectRatio="none"
                  >
                    <path
                      d={spark.d}
                      stroke="rgba(28,30,24,0.62)"
                      strokeWidth="1.3"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {g.hasPR ? (
                      <>
                        <circle
                          cx={spark.lastX}
                          cy={spark.lastY}
                          r="3.5"
                          fill="rgba(192,252,1,0.22)"
                        />
                        <circle
                          cx={spark.lastX}
                          cy={spark.lastY}
                          r="2.5"
                          fill="#C0FC01"
                        />
                      </>
                    ) : (
                      <circle
                        cx={spark.lastX}
                        cy={spark.lastY}
                        r="2.5"
                        fill="rgba(253,253,254,0.70)"
                      />
                    )}
                  </svg>
                  <svg className="chev" viewBox="0 0 24 24">
                    <polyline
                      points="9 6 15 12 9 18"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )
            })}
          </>
        )}

        {/* 5 · Reflect + 6 · Morgen */}
        <div
          style={{
            padding: '0 5%',
            marginTop: 14,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div className="review-card dark reflect">
            <h3>Hoe voelde deze training?</h3>
            <div className="rpe">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`rpe-dot${rpe === n ? ' on' : ''}`}
                  onClick={() => setRpe(n)}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="rpe-scale">
              <span>Licht</span>
              <span>Maximaal</span>
            </div>
            <textarea
              className="note-box"
              placeholder="Notitie voor je coach…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {nextWorkout && (
            <button
              className="tomorrow"
              onClick={() => router.push('/client/workout')}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <div className="t-lbl">Morgen</div>
              <div className="t-body">
                {nextWorkout.name}
                <small>{nextWorkout.meta}</small>
              </div>
              <svg className="chev" viewBox="0 0 24 24">
                <polyline
                  points="9 6 15 12 9 18"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>
      </main>

      {/* ═══ STICKY FOOTER ═════════════════════════ */}
      <div className="review-foot">
        <button
          className="btn-share"
          onClick={handleShare}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <svg viewBox="0 0 24 24">
            <path d="M7 11l10-6M7 13l10 6" strokeLinecap="round" />
            <circle cx="5" cy="12" r="2.5" />
            <circle cx="19" cy="5" r="2.5" />
            <circle cx="19" cy="19" r="2.5" />
          </svg>
          Delen met coach
        </button>
        <button
          className="btn-close"
          onClick={handleComplete}
          disabled={saving}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {saving ? 'Opslaan…' : 'Sluiten'}
        </button>
      </div>
    </div>
  )
}
