'use client'

/**
 * Lift-detail · /client/progress/exercise/[exerciseId]
 *
 * Antwoordt op Glenn's vraag: "wat zijn al mijn PR's op deze lift?"
 * Design-ref: design-system/11e-progress-lift.html
 *
 * Structuur:
 *   · Custom top-bar (back + titel + body-part caption)
 *   · Hero (dark) — e1RM groot, delta sinds range, area chart, range-pills
 *   · View-mode chips — Rep-max / Volume / Sessies
 *   · Rep-max breakdown (light) — 1/2/3/5/8/10/12/15/20 RM, + datum + delta
 *   · Recente sessies (light) — laatste 4 loggings met sets + e1RM
 */

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

// ─── Types ──────────────────────────────────────────────────

interface SetEntry {
  weight_kg: number
  reps: number
  is_warmup: boolean
  sessionId: string
  sessionDate: string
}

interface ExerciseInfo {
  name: string
  bodyPart: string
}

interface RepMaxRow {
  rep: number
  weight: number
  setReps: number
  date: string
  delta: number | null   // kg vs. previous non-ongoing PR (null = first ever)
  isRecent: boolean      // achieved within last ~6 weeks
  isOld: boolean         // >3 months
}

interface SessionEntry {
  id: string
  date: string
  sets: Array<{ weight: number; reps: number }>
  e1rmBest: number
}

type ViewMode = 'repmax' | 'volume' | 'sessions'
type Range = '1M' | '3M' | '6M' | '1J'

// ─── Utils ──────────────────────────────────────────────────

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

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-BE', { day: '2-digit', month: 'short' })
}

function formatWeekdayDate(iso: string): string {
  const d = new Date(iso)
  const wd = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'][d.getDay()]
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)} ${d.toLocaleDateString('nl-BE', { day: '2-digit', month: 'short' })}`
}

function formatKg(n: number): string {
  return Number.isInteger(n) ? `${n}` : n.toFixed(1).replace('.', ',')
}

function normaliseBodyPart(raw: string | null | undefined): string {
  if (!raw) return ''
  const s = raw.toLowerCase()
  if (s.includes('chest') || s.includes('borst') || s.includes('pectoral')) return 'Borst'
  if (s.includes('back') || s.includes('rug') || s.includes('lat')) return 'Rug'
  if (s.includes('leg') || s.includes('ben') || s.includes('quad') || s.includes('ham') || s.includes('glut') || s.includes('calf') || s.includes('kuit') || s.includes('hip')) return 'Benen'
  if (s.includes('shoulder') || s.includes('schou') || s.includes('delt')) return 'Schouders'
  if (s.includes('arm') || s.includes('bicep') || s.includes('tricep') || s.includes('forearm')) return 'Armen'
  if (s.includes('core') || s.includes('waist') || s.includes('abs') || s.includes('abdom')) return 'Core'
  return ''
}

// ─── Mini chart ─────────────────────────────────────────────

function HeroChart({ points, labels }: { points: Array<{ x: number; y: number }>; labels: string[] }) {
  if (points.length < 2) {
    return (
      <div
        style={{
          height: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(253,253,254,0.44)',
          fontSize: 11,
          letterSpacing: '-0.005em',
        }}
      >
        Nog niet genoeg data voor een trend.
      </div>
    )
  }
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L 300 100 L 0 100 Z`
  const last = points[points.length - 1]
  return (
    <>
      <svg viewBox="0 0 300 100" preserveAspectRatio="none" style={{ width: '100%', height: 100, marginTop: 2 }}>
        <defs>
          <linearGradient id="lift-hero-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FDFDFE" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#FDFDFE" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" y1="25" x2="300" y2="25" stroke="rgba(253,253,254,0.06)" strokeDasharray="2 4" />
        <line x1="0" y1="50" x2="300" y2="50" stroke="rgba(253,253,254,0.06)" strokeDasharray="2 4" />
        <line x1="0" y1="75" x2="300" y2="75" stroke="rgba(253,253,254,0.06)" strokeDasharray="2 4" />
        <path d={areaPath} fill="url(#lift-hero-grad)" />
        <path
          d={linePath}
          fill="none"
          stroke="#FDFDFE"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.92"
        />
        <circle cx={last.x} cy={last.y} r="2.8" fill="#FDFDFE" />
      </svg>
      {labels.length > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 9,
            fontWeight: 500,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'rgba(253,253,254,0.44)',
            marginTop: 6,
          }}
        >
          {labels.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      )}
    </>
  )
}

// ─── Main ───────────────────────────────────────────────────

const REP_TARGETS = [1, 2, 3, 5, 8, 10, 12, 15, 20]

export default function LiftDetailPage() {
  const params = useParams<{ exerciseId: string }>()
  const router = useRouter()
  const exerciseId = params?.exerciseId

  const [info, setInfo] = useState<ExerciseInfo | null>(null)
  const [sets, setSets] = useState<SetEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<Range>('6M')
  const [mode, setMode] = useState<ViewMode>('repmax')

  useEffect(() => {
    if (!exerciseId) return
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Exercise info
        const { data: ex } = await supabase
          .from('exercises')
          .select('name, name_nl, body_part')
          .eq('id', exerciseId)
          .maybeSingle()

        if (ex) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const row = ex as any
          setInfo({
            name: row.name_nl || row.name || 'Oefening',
            bodyPart: normaliseBodyPart(row.body_part),
          })
        }

        // Sessions-first query (mirrors progress page pattern that's proven to work).
        // Querying workout_sets directly with !inner-join filters returned silent 400s
        // under RLS — going via workout_sessions and embedding the filtered sets is
        // the pattern Supabase + RLS actually plays nicely with.
        const { data: sessionRows, error: sessErr } = await supabase
          .from('workout_sessions')
          .select('id, started_at, completed_at, workout_sets(weight_kg, actual_reps, is_warmup, exercise_id)')
          .eq('client_id', user.id)
          .not('completed_at', 'is', null)
          .order('started_at', { ascending: false })

        if (sessErr) {
          console.error('Lift-detail sessions query error:', sessErr)
        }

        if (sessionRows) {
          const entries: SetEntry[] = []
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const sess of sessionRows as any[]) {
            const setsArr = Array.isArray(sess.workout_sets) ? sess.workout_sets : []
            const sessionDate = sess.completed_at || sess.started_at
            for (const s of setsArr) {
              if (s.exercise_id !== exerciseId) continue
              const weight = Number(s.weight_kg) || 0
              const reps = Number(s.actual_reps) || 0
              if (weight <= 0 || reps <= 0) continue
              entries.push({
                weight_kg: weight,
                reps,
                is_warmup: !!s.is_warmup,
                sessionId: sess.id,
                sessionDate,
              })
            }
          }
          entries.sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime())
          setSets(entries)
        }
      } catch (err) {
        console.error('Lift-detail load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [exerciseId])

  // Working sets only (drop warm-ups for PR logic)
  const workingSets = useMemo(() => sets.filter(s => !s.is_warmup), [sets])

  // Hero: weekly-best e1RM, filtered by range
  const heroChart = useMemo(() => {
    if (workingSets.length < 2) return { points: [] as Array<{ x: number; y: number }>, labels: [] as string[], current: 0, start: 0 }

    const days = range === '1M' ? 30 : range === '3M' ? 90 : range === '6M' ? 180 : 365
    const cutoff = Date.now() - days * 86400000
    const bucket: Record<string, number> = {}
    for (const s of workingSets) {
      const t = new Date(s.sessionDate).getTime()
      if (t < cutoff) continue
      const k = weekKey(new Date(s.sessionDate))
      const est = e1RM(s.weight_kg, s.reps)
      if (!bucket[k] || est > bucket[k]) bucket[k] = est
    }
    const keys = Object.keys(bucket).sort()
    if (keys.length < 2) return { points: [] as Array<{ x: number; y: number }>, labels: [] as string[], current: 0, start: 0 }

    const values = keys.map(k => bucket[k])
    const max = Math.max(...values)
    const min = Math.min(...values)
    const r = max - min || 1
    const pad = 10
    const innerH = 100 - pad * 2
    const points = values.map((v, i) => ({
      x: (i / (values.length - 1)) * 300,
      y: pad + innerH - ((v - min) / r) * innerH,
    }))

    // Month labels — up to 6 evenly-spaced
    const first = new Date(keys[0]).getTime()
    const last = new Date(keys[keys.length - 1]).getTime()
    const span = last - first
    const labelCount = Math.min(6, Math.max(2, Math.round(span / (30 * 86400000))))
    const labels: string[] = []
    for (let i = 0; i < labelCount; i++) {
      const t = first + (span * i) / (labelCount - 1)
      labels.push(new Date(t).toLocaleDateString('nl-BE', { month: 'short' }).replace('.', ''))
    }

    return { points, labels, current: values[values.length - 1], start: values[0] }
  }, [workingSets, range])

  // Overall current e1RM (last set regardless of range — for hero big number)
  const currentE1RM = useMemo(() => {
    if (workingSets.length === 0) return 0
    // workingSets sorted desc by date — take the top e1RM from the most recent session
    const latestDate = workingSets[0].sessionDate.slice(0, 10)
    let best = 0
    for (const s of workingSets) {
      if (s.sessionDate.slice(0, 10) !== latestDate) break
      const est = e1RM(s.weight_kg, s.reps)
      if (est > best) best = est
    }
    return best
  }, [workingSets])

  // Rep-max rows: for each target X, MAX(weight) WHERE reps >= X
  const repMaxRows = useMemo<RepMaxRow[]>(() => {
    if (workingSets.length === 0) return []
    const now = Date.now()
    const rows: RepMaxRow[] = []

    for (const target of REP_TARGETS) {
      // Find the set that proves this rep-max
      let best: SetEntry | null = null
      for (const s of workingSets) {
        if (s.reps < target) continue
        if (!best || s.weight_kg > best.weight_kg ||
            (s.weight_kg === best.weight_kg && new Date(s.sessionDate) > new Date(best.sessionDate))) {
          best = s
        }
      }
      if (!best) continue

      // Previous best (excluding the winning set's date) — for delta
      let prev = 0
      for (const s of workingSets) {
        if (s.reps < target) continue
        if (s.sessionDate === best.sessionDate && s.weight_kg === best.weight_kg) continue
        if (new Date(s.sessionDate) >= new Date(best.sessionDate)) continue
        if (s.weight_kg > prev) prev = s.weight_kg
      }

      const delta = prev > 0 ? best.weight_kg - prev : null
      const ageDays = (now - new Date(best.sessionDate).getTime()) / 86400000
      rows.push({
        rep: target,
        weight: best.weight_kg,
        setReps: best.reps,
        date: best.sessionDate,
        delta,
        isRecent: ageDays < 42,
        isOld: ageDays > 90,
      })
    }
    return rows
  }, [workingSets])

  // Recent sessions — last 4 sessions grouped by date
  const recentSessions = useMemo<SessionEntry[]>(() => {
    if (workingSets.length === 0) return []
    const byDate = new Map<string, { id: string; date: string; sets: SetEntry[] }>()
    for (const s of workingSets) {
      const key = s.sessionDate.slice(0, 10)
      if (!byDate.has(key)) byDate.set(key, { id: s.sessionId, date: s.sessionDate, sets: [] })
      byDate.get(key)!.sets.push(s)
    }
    const arr = Array.from(byDate.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 4)
    return arr.map(sess => {
      // Top 3 working sets by weight (for display clarity)
      const sorted = [...sess.sets].sort((a, b) => e1RM(b.weight_kg, b.reps) - e1RM(a.weight_kg, a.reps)).slice(0, 3)
      let bestE1rm = 0
      for (const s of sess.sets) {
        const est = e1RM(s.weight_kg, s.reps)
        if (est > bestE1rm) bestE1rm = est
      }
      return {
        id: sess.id,
        date: sess.date,
        sets: sorted.map(s => ({ weight: s.weight_kg, reps: s.reps })),
        e1rmBest: Math.round(bestE1rm),
      }
    })
  }, [workingSets])

  // Volume per week (last 12)
  const volumeRows = useMemo(() => {
    if (workingSets.length === 0) return [] as Array<{ label: string; date: string; volume: number; sets: number }>
    const buckets: Record<string, { label: string; volume: number; sets: number }> = {}
    for (const s of workingSets) {
      const k = weekKey(new Date(s.sessionDate))
      const d = new Date(k)
      const label = `${d.getDate()} ${d.toLocaleDateString('nl-BE', { month: 'short' }).replace('.', '')}`
      if (!buckets[k]) buckets[k] = { label, volume: 0, sets: 0 }
      buckets[k].volume += s.weight_kg * s.reps
      buckets[k].sets += 1
    }
    return Object.entries(buckets)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 12)
      .map(([date, v]) => ({ label: v.label, date, volume: Math.round(v.volume), sets: v.sets }))
  }, [workingSets])

  // ─── Render ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className="pb-28 animate-fade-in">
        <div style={{ height: 32, marginBottom: 18 }} />
        <div className="rounded-[24px] mb-4 animate-pulse" style={{ height: 200, background: '#474B48' }} />
        <div className="rounded-[24px] mb-2 animate-pulse" style={{ height: 180, background: '#A6ADA7' }} />
      </div>
    )
  }

  if (workingSets.length === 0) {
    return (
      <div className="pb-28 animate-fade-in">
        <TopBar title={info?.name || 'Oefening'} subtitle={info?.bodyPart} onBack={() => router.back()} />
        <div
          style={{
            background: '#A6ADA7',
            padding: '48px 22px',
            borderRadius: 24,
            textAlign: 'center',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.10)',
            margin: '0 0 6px',
          }}
        >
          <p style={{ color: '#FDFDFE', fontSize: 16, fontWeight: 300, letterSpacing: '-0.012em', marginBottom: 8 }}>
            Nog geen werksets gelogd
          </p>
          <p style={{ color: 'rgba(253,253,254,0.62)', fontSize: 13, maxWidth: 240, margin: '0 auto' }}>
            Log een werkset om je PR&apos;s en e1RM-trend te zien verschijnen.
          </p>
        </div>
      </div>
    )
  }

  const heroDelta = heroChart.current && heroChart.start
    ? heroChart.current - heroChart.start
    : 0
  const rangeMonths = range === '1M' ? 1 : range === '3M' ? 3 : range === '6M' ? 6 : 12
  const rangeStartLabel = new Date(Date.now() - rangeMonths * 30 * 86400000)
    .toLocaleDateString('nl-BE', { month: 'long' })

  return (
    <div className="pb-28">
      <TopBar title={info?.name || 'Oefening'} subtitle={info?.bodyPart} onBack={() => router.back()} />

      {/* ═══ HERO CARD ═══════════════════════════════════════════ */}
      <div
        className="animate-slide-up stagger-2 mb-4"
        style={{
          background: '#474B48',
          padding: '22px 22px 18px',
          borderRadius: 24,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 6px rgba(0,0,0,0.18)',
        }}
      >
        <div className="flex items-baseline justify-between" style={{ marginBottom: 4 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'rgba(253,253,254,0.44)',
            }}
          >
            Geschatte 1RM
          </span>
          <div className="flex" style={{ gap: 4 }}>
            {(['1M', '3M', '6M', '1J'] as Range[]).map(r => {
              const active = range === r
              return (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    padding: '3px 8px',
                    borderRadius: 999,
                    color: active ? '#FDFDFE' : 'rgba(253,253,254,0.62)',
                    background: active ? 'rgba(253,253,254,0.12)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    letterSpacing: '0.02em',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {r}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-baseline" style={{ gap: 10, margin: '4px 0 8px' }}>
          <span
            style={{
              fontSize: 44,
              fontWeight: 200,
              letterSpacing: '-0.03em',
              color: '#FDFDFE',
              fontFeatureSettings: '"tnum"',
              lineHeight: 1,
            }}
          >
            {formatKg(Math.round(currentE1RM * 10) / 10)}
            <small
              style={{
                fontSize: 14,
                color: 'rgba(253,253,254,0.62)',
                marginLeft: 3,
                letterSpacing: 0,
                fontWeight: 300,
              }}
            >
              kg
            </small>
          </span>
          {heroDelta !== 0 && heroChart.points.length >= 2 && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 400,
                color: 'rgba(253,253,254,0.78)',
                letterSpacing: '-0.005em',
              }}
            >
              {heroDelta > 0 ? '+' : ''}
              <strong style={{ color: '#FDFDFE', fontWeight: 500 }}>
                {formatKg(Math.round(heroDelta * 10) / 10)} kg
              </strong>{' '}
              sinds {rangeStartLabel}
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'rgba(253,253,254,0.44)',
            letterSpacing: '-0.002em',
            marginTop: -2,
            marginBottom: 14,
          }}
        >
          Berekend via Epley uit beste werkset per sessie
        </div>

        <HeroChart points={heroChart.points} labels={heroChart.labels} />
      </div>

      {/* ═══ VIEW-MODE CHIPS ═══════════════════════════════════════ */}
      <div
        className="animate-slide-up stagger-3"
        style={{
          display: 'flex',
          gap: 6,
          marginBottom: 14,
        }}
      >
        {([
          { id: 'repmax', label: 'Rep-max' },
          { id: 'volume', label: 'Volume' },
          { id: 'sessions', label: 'Sessies' },
        ] as Array<{ id: ViewMode; label: string }>).map(v => {
          const active = mode === v.id
          return (
            <button
              key={v.id}
              onClick={() => setMode(v.id)}
              style={{
                flexShrink: 0,
                padding: '8px 14px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: active ? 500 : 400,
                letterSpacing: '-0.005em',
                color: active ? '#2A2D2B' : 'rgba(253,253,254,0.78)',
                background: active ? '#FDFDFE' : 'transparent',
                border: `1px solid ${active ? '#FDFDFE' : 'rgba(253,253,254,0.10)'}`,
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {v.label}
            </button>
          )
        })}
      </div>

      {/* ═══ REP-MAX VIEW ══════════════════════════════════════════ */}
      {mode === 'repmax' && (
        <>
          <div
            style={{
              padding: '8px 4px 10px',
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(253,253,254,0.44)',
            }}
          >
            Beste rep-max · alle tijden
          </div>

          {repMaxRows.length > 0 ? (
            <div
              className="animate-slide-up stagger-4"
              style={{
                background: '#A6ADA7',
                borderRadius: 24,
                overflow: 'hidden',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.10)',
                marginBottom: 6,
              }}
            >
              {repMaxRows.map((row, i) => (
                <div
                  key={row.rep}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '54px 1fr auto',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 18px',
                    borderTop: i > 0 ? '1px solid rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: '0.1em',
                      color: 'rgba(253,253,254,0.78)',
                      fontFeatureSettings: '"tnum"',
                    }}
                  >
                    <strong
                      style={{
                        fontSize: 17,
                        fontWeight: 300,
                        letterSpacing: '-0.015em',
                        color: '#FDFDFE',
                        marginRight: 2,
                      }}
                    >
                      {row.rep}
                    </strong>
                    RM
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 300,
                        letterSpacing: '-0.015em',
                        color: '#FDFDFE',
                        fontFeatureSettings: '"tnum"',
                        lineHeight: 1.1,
                      }}
                    >
                      {formatKg(row.weight)}
                      <small style={{ fontSize: 10, color: 'rgba(253,253,254,0.62)', marginLeft: 2, fontWeight: 400 }}>
                        kg
                      </small>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'rgba(253,253,254,0.44)',
                        letterSpacing: '-0.002em',
                      }}
                    >
                      {row.setReps} × {formatKg(row.weight)} — {formatShortDate(row.date)}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 400,
                      color: row.isOld
                        ? 'rgba(253,253,254,0.44)'
                        : row.delta === null
                          ? 'rgba(253,253,254,0.78)'
                          : row.delta > 0
                            ? '#FDFDFE'
                            : 'rgba(253,253,254,0.44)',
                      letterSpacing: '-0.005em',
                      fontFeatureSettings: '"tnum"',
                      whiteSpace: 'nowrap',
                      textAlign: 'right',
                    }}
                  >
                    {row.delta === null
                      ? 'eerste'
                      : row.delta > 0
                        ? `+${formatKg(row.delta)} kg`
                        : row.delta === 0
                          ? '—'
                          : `${formatKg(row.delta)} kg`}
                  </div>
                </div>
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
                Nog geen rep-max data
              </p>
            </div>
          )}
        </>
      )}

      {/* ═══ VOLUME VIEW ═══════════════════════════════════════════ */}
      {mode === 'volume' && (
        <>
          <div
            style={{
              padding: '8px 4px 10px',
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(253,253,254,0.44)',
            }}
          >
            Volume per week · laatste 12
          </div>
          {volumeRows.length > 0 ? (
            <div
              className="animate-slide-up stagger-4"
              style={{
                background: '#A6ADA7',
                borderRadius: 24,
                overflow: 'hidden',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.10)',
                marginBottom: 6,
              }}
            >
              {volumeRows.map((row, i) => (
                <div
                  key={row.date}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto',
                    alignItems: 'baseline',
                    gap: 12,
                    padding: '14px 18px',
                    borderTop: i > 0 ? '1px solid rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      color: '#FDFDFE',
                      letterSpacing: '-0.005em',
                    }}
                  >
                    wk van {row.label}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'rgba(253,253,254,0.44)',
                      fontFeatureSettings: '"tnum"',
                    }}
                  >
                    {row.sets} sets
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 400,
                      color: '#FDFDFE',
                      fontFeatureSettings: '"tnum"',
                      letterSpacing: '-0.005em',
                      textAlign: 'right',
                      minWidth: 72,
                    }}
                  >
                    {formatKg(Math.round(row.volume / 10) / 100)}
                    <small style={{ fontSize: 10, color: 'rgba(253,253,254,0.62)', marginLeft: 2 }}>
                      ton
                    </small>
                  </div>
                </div>
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
              <p style={{ color: '#FDFDFE', fontSize: 14, fontWeight: 400 }}>Nog geen volume-data</p>
            </div>
          )}
        </>
      )}

      {/* ═══ SESSIONS VIEW ═════════════════════════════════════════ */}
      {mode === 'sessions' && (
        <>
          <div
            style={{
              padding: '8px 4px 10px',
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(253,253,254,0.44)',
            }}
          >
            Recente sessies
          </div>
          {recentSessions.length > 0 ? (
            <div
              className="animate-slide-up stagger-4"
              style={{
                background: '#A6ADA7',
                borderRadius: 24,
                overflow: 'hidden',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.10)',
                marginBottom: 6,
              }}
            >
              {recentSessions.map((sess, i) => (
                <div
                  key={sess.id + sess.date}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 18px',
                    borderTop: i > 0 ? '1px solid rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 500,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: 'rgba(253,253,254,0.44)',
                        marginBottom: 3,
                      }}
                    >
                      {formatWeekdayDate(sess.date)}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 400,
                        color: '#FDFDFE',
                        letterSpacing: '-0.005em',
                        fontFeatureSettings: '"tnum"',
                      }}
                      className="truncate"
                    >
                      {sess.sets.map((s, j) => (
                        <span key={j}>
                          {formatKg(s.weight)}×{s.reps}
                          {j < sess.sets.length - 1 && (
                            <span style={{ color: 'rgba(253,253,254,0.44)', margin: '0 6px' }}>·</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 400,
                      color: 'rgba(253,253,254,0.78)',
                      fontFeatureSettings: '"tnum"',
                      textAlign: 'right',
                    }}
                  >
                    {sess.e1rmBest}
                    <small
                      style={{
                        display: 'block',
                        fontSize: 9,
                        fontWeight: 500,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: 'rgba(253,253,254,0.44)',
                        marginTop: 2,
                      }}
                    >
                      e1RM
                    </small>
                  </div>
                </div>
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
              <p style={{ color: '#FDFDFE', fontSize: 14, fontWeight: 400 }}>Nog geen sessies gelogd</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Top bar ────────────────────────────────────────────────

function TopBar({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack: () => void }) {
  return (
    <div
      className="animate-slide-up"
      style={{
        display: 'grid',
        gridTemplateColumns: '32px 1fr 32px',
        alignItems: 'center',
        gap: 10,
        marginBottom: 18,
      }}
    >
      <button
        onClick={onBack}
        aria-label="Terug"
        style={{
          width: 32,
          height: 32,
          borderRadius: 999,
          background: 'rgba(253,253,254,0.06)',
          border: '1px solid rgba(253,253,254,0.10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FDFDFE',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 6 9 12 15 18" />
        </svg>
      </button>
      <div
        style={{
          textAlign: 'center',
          fontSize: 15,
          fontWeight: 400,
          letterSpacing: '-0.005em',
          color: '#FDFDFE',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {subtitle && (
          <div
            style={{
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'rgba(253,253,254,0.44)',
              marginBottom: 2,
              lineHeight: 1,
            }}
          >
            {subtitle}
          </div>
        )}
        {title}
      </div>
      <div />
    </div>
  )
}
