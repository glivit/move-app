'use client'

/**
 * Mijn logs · /client/profile/logs
 *
 * Filterbare geschiedenis van workouts / gewicht / voeding met per-row delete.
 * Handig voor test-accounts opruimen én voor de cliënt om fout gelogde data
 * te verwijderen.
 *
 * Design-ref: v6 Orion — dark-card hero, segmented pill tabs, light-card list,
 * swipe-left to reveal delete (mirror van workout/history swipe-delete).
 */

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

// ─── Types ──────────────────────────────────────────────────

type Tab = 'workout' | 'weight' | 'diet'
type Range = '7' | '30' | '90' | 'all'

interface WorkoutLog {
  kind: 'workout'
  id: string
  date: string
  name: string | null
  setCount: number
  durationMin: number | null
}

interface WeightLog {
  kind: 'weight'
  id: string
  source: 'health_metrics' | 'weekly_checkins'
  date: string
  weightKg: number
}

interface DietLog {
  kind: 'diet'
  id: string
  date: string
  mealName: string
  completed: boolean
}

type Log = WorkoutLog | WeightLog | DietLog

// ─── Utils ──────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso)
  const wd = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'][d.getDay()]
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)} ${d.getDate()} ${d.toLocaleDateString('nl-BE', { month: 'short' }).replace('.', '')}`
}

function formatKg(n: number): string {
  return Number.isInteger(n) ? `${n}` : n.toFixed(1).replace('.', ',')
}

function rangeToDate(range: Range): Date | null {
  if (range === 'all') return null
  const days = parseInt(range, 10)
  return new Date(Date.now() - days * 86400000)
}

// ─── Page ───────────────────────────────────────────────────

export default function LogsPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('workout')
  const [range, setRange] = useState<Range>('30')
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Log | null>(null)

  const load = useCallback(async (uid: string, t: Tab, r: Range) => {
    setLoading(true)
    const supabase = createClient()
    const rangeCutoff = rangeToDate(r)
    const iso = rangeCutoff ? rangeCutoff.toISOString() : null
    const dateIso = rangeCutoff ? rangeCutoff.toISOString().slice(0, 10) : null

    try {
      if (t === 'workout') {
        let q = supabase
          .from('workout_sessions')
          .select('id, started_at, completed_at, duration_seconds, notes, workout_sets(id), program_template_days(name)')
          .eq('client_id', uid)
          .order('started_at', { ascending: false })
        if (iso) q = q.gte('started_at', iso)
        const { data, error } = await q
        if (error) throw error
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows = (data as any[] | null) || []
        setLogs(rows.map(row => ({
          kind: 'workout' as const,
          id: row.id,
          date: row.completed_at || row.started_at,
          name: row.program_template_days?.name || row.notes || null,
          setCount: Array.isArray(row.workout_sets) ? row.workout_sets.length : 0,
          durationMin: row.duration_seconds ? Math.round(row.duration_seconds / 60) : null,
        })))
      } else if (t === 'weight') {
        // Combine health_metrics (daily) + weekly_checkins (weekly) entries
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sb = supabase as any
        let qHealth = sb.from('health_metrics')
          .select('id, date, weight_kg')
          .eq('client_id', uid)
          .not('weight_kg', 'is', null)
          .order('date', { ascending: false })
        if (dateIso) qHealth = qHealth.gte('date', dateIso)

        let qWeekly = sb.from('weekly_checkins')
          .select('id, date, weight_kg')
          .eq('client_id', uid)
          .not('weight_kg', 'is', null)
          .order('date', { ascending: false })
        if (dateIso) qWeekly = qWeekly.gte('date', dateIso)

        const [h, w] = await Promise.all([qHealth, qWeekly])
        const healthRows = (h.data || []).map((r: { id: string; date: string; weight_kg: number }) => ({
          kind: 'weight' as const,
          id: r.id,
          source: 'health_metrics' as const,
          date: r.date,
          weightKg: r.weight_kg,
        }))
        const weeklyRows = (w.data || []).map((r: { id: string; date: string; weight_kg: number }) => ({
          kind: 'weight' as const,
          id: r.id,
          source: 'weekly_checkins' as const,
          date: r.date,
          weightKg: r.weight_kg,
        }))
        const merged = [...healthRows, ...weeklyRows].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )
        setLogs(merged)
      } else {
        // diet
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sb = supabase as any
        let q = sb.from('nutrition_logs')
          .select('id, date, meal_name, completed, created_at')
          .eq('client_id', uid)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
        if (dateIso) q = q.gte('date', dateIso)
        const { data, error } = await q
        if (error) throw error
        setLogs((data || []).map((r: { id: string; date: string; meal_name: string; completed: boolean }) => ({
          kind: 'diet' as const,
          id: r.id,
          date: r.date,
          mealName: r.meal_name,
          completed: !!r.completed,
        })))
      }
    } catch (err) {
      console.error('Logs load error:', err)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/')
        return
      }
      setUserId(user.id)
      load(user.id, tab, range)
    }
    init()
    // Only on mount — subsequent reloads handled by the tab/range effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (userId) load(userId, tab, range)
  }, [userId, tab, range, load])

  const handleDelete = useCallback(async (log: Log) => {
    setDeletingId(log.id)
    const supabase = createClient()
    try {
      if (log.kind === 'workout') {
        const { error } = await supabase.from('workout_sessions').delete().eq('id', log.id)
        if (error) throw error
      } else if (log.kind === 'weight') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sb = supabase as any
        if (log.source === 'health_metrics') {
          const { error } = await sb.from('health_metrics').delete().eq('id', log.id)
          if (error) throw error
        } else {
          const { error } = await sb.from('weekly_checkins').delete().eq('id', log.id)
          if (error) throw error
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sb = supabase as any
        const { error } = await sb.from('nutrition_logs').delete().eq('id', log.id)
        if (error) throw error
      }
      setLogs(prev => prev.filter(l => l.id !== log.id))
      setConfirmDelete(null)
    } catch (err) {
      console.error('Delete log error:', err)
      alert('Kon log niet verwijderen. Probeer opnieuw.')
    } finally {
      setDeletingId(null)
    }
  }, [])

  const counts = useMemo(() => {
    if (tab !== 'workout') return { workout: 0, sets: 0 }
    const sets = logs.reduce((a, l) => a + (l.kind === 'workout' ? l.setCount : 0), 0)
    return { workout: logs.length, sets }
  }, [logs, tab])

  // ─── Render ────────────────────────────────────────────

  return (
    <div className="pb-28">
      {/* ═══ TOPBAR ═══════════════════════════════════════════ */}
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
          onClick={() => router.back()}
          aria-label="Terug"
          style={{
            width: 32, height: 32, borderRadius: 999,
            background: 'var(--card-bg-subtle)',
            border: '1px solid var(--card-divider)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--card-text)', cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 6 9 12 15 18" />
          </svg>
        </button>
        <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 400, letterSpacing: '-0.005em', color: 'var(--card-text)' }}>
          <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--card-text-muted)', marginBottom: 2, lineHeight: 1 }}>
            Profiel
          </div>
          Mijn logs
        </div>
        <div />
      </div>

      {/* ═══ HERO DARK CARD ═══════════════════════════════════ */}
      <div className="animate-slide-up stagger-2 mb-4 dark-surface"
        style={{
          background: '#474B48',
          padding: '20px 22px 18px',
          borderRadius: 24,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 6px rgba(0,0,0,0.18)',
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--card-text-muted)', marginBottom: 8 }}>
          Geschiedenis
        </div>
        <div style={{ fontSize: 22, fontWeight: 300, letterSpacing: '-0.018em', color: 'var(--card-text)', lineHeight: 1.2, marginBottom: 6 }}>
          Bekijk en verwijder je {tab === 'workout' ? 'workouts' : tab === 'weight' ? 'gewicht-loggings' : 'voedings-loggings'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--card-text-muted)', letterSpacing: '-0.002em' }}>
          {loading
            ? 'Laden…'
            : tab === 'workout'
              ? `${counts.workout} sessie${counts.workout === 1 ? '' : 's'} · ${counts.sets} sets`
              : `${logs.length} entr${logs.length === 1 ? 'y' : 'ies'}`}
        </div>
      </div>

      {/* ═══ TAB PILL ═══════════════════════════════════════════ */}
      <div
        className="animate-slide-up stagger-3"
        style={{ display: 'flex', gap: 6, marginBottom: 10 }}
      >
        {([
          { id: 'workout' as Tab, label: 'Workouts' },
          { id: 'weight' as Tab, label: 'Gewicht' },
          { id: 'diet' as Tab, label: 'Voeding' },
        ]).map(t => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
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
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ═══ RANGE PILL ═════════════════════════════════════════ */}
      <div
        className="animate-slide-up stagger-4"
        style={{ display: 'flex', gap: 4, marginBottom: 14, justifyContent: 'flex-end' }}
      >
        {([
          { id: '7' as Range, label: '7d' },
          { id: '30' as Range, label: '30d' },
          { id: '90' as Range, label: '90d' },
          { id: 'all' as Range, label: 'Alles' },
        ]).map(r => {
          const active = range === r.id
          return (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              style={{
                fontSize: 11,
                fontWeight: 500,
                padding: '5px 10px',
                borderRadius: 999,
                color: active ? '#FDFDFE' : 'rgba(253,253,254,0.62)',
                background: active ? 'rgba(253,253,254,0.12)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                letterSpacing: '0.02em',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {r.label}
            </button>
          )
        })}
      </div>

      {/* ═══ LIST ═══════════════════════════════════════════════ */}
      {loading ? (
        <div
          style={{
            background: 'rgba(255,255,255,0.50)',
            borderRadius: 24,
            padding: '36px 22px',
            textAlign: 'center',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.10)',
          }}
        >
          <p style={{ color: 'var(--card-text-muted)', fontSize: 13 }}>Laden…</p>
        </div>
      ) : logs.length === 0 ? (
        <div
          className="animate-fade-in"
          style={{
            background: 'rgba(255,255,255,0.50)',
            borderRadius: 24,
            padding: '48px 22px',
            textAlign: 'center',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.10)',
          }}
        >
          <p style={{ color: 'var(--card-text)', fontSize: 15, fontWeight: 400, marginBottom: 6 }}>
            Geen logs in deze range
          </p>
          <p style={{ color: 'var(--card-text-muted)', fontSize: 12 }}>
            Verander het bereik of ga een dag trainen.
          </p>
        </div>
      ) : (
        <div
          className="animate-slide-up stagger-5"
          style={{
            background: 'rgba(255,255,255,0.50)',
            borderRadius: 24,
            overflow: 'hidden',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.10)',
          }}
        >
          {logs.map((log, i) => (
            <LogRow
              key={`${log.kind}-${log.id}`}
              log={log}
              isFirst={i === 0}
              isDeleting={deletingId === log.id}
              onDeleteRequest={() => setConfirmDelete(log)}
            />
          ))}
        </div>
      )}

      {/* ═══ CONFIRM DELETE MODAL ═════════════════════════════ */}
      {confirmDelete && (
        <ConfirmDelete
          log={confirmDelete}
          busy={deletingId === confirmDelete.id}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete)}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// LogRow — grid layout matchend met rest van Orion list rows
// ═══════════════════════════════════════════════════════════════

function LogRow({
  log,
  isFirst,
  isDeleting,
  onDeleteRequest,
}: {
  log: Log
  isFirst: boolean
  isDeleting: boolean
  onDeleteRequest: () => void
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 32px',
        alignItems: 'center',
        gap: 12,
        padding: '14px 18px',
        borderTop: isFirst ? 'none' : '1px solid rgba(0,0,0,0.08)',
        opacity: isDeleting ? 0.4 : 1,
        transition: 'opacity 160ms',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 10, fontWeight: 500,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--card-text-muted)', marginBottom: 3,
          }}
        >
          {formatDate(log.date)}
        </div>
        <div
          style={{
            fontSize: 14, fontWeight: 400, color: 'var(--card-text)',
            letterSpacing: '-0.005em',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
        >
          {log.kind === 'workout' && (log.name || 'Workout')}
          {log.kind === 'weight' && `${formatKg(log.weightKg)} kg`}
          {log.kind === 'diet' && log.mealName}
        </div>
      </div>
      <div
        style={{
          fontSize: 11, fontWeight: 400,
          color: 'var(--card-text-muted)',
          fontFeatureSettings: '"tnum"',
          whiteSpace: 'nowrap',
        }}
      >
        {log.kind === 'workout' && (
          <>
            {log.setCount} set{log.setCount === 1 ? '' : 's'}
            {log.durationMin != null && ` · ${log.durationMin}m`}
          </>
        )}
        {log.kind === 'weight' && (
          <span style={{
            fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--card-text-muted)',
          }}>
            {log.source === 'weekly_checkins' ? 'check-in' : 'dagelijks'}
          </span>
        )}
        {log.kind === 'diet' && (
          <span style={{
            fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: log.completed ? '#2FA65A' : 'rgba(253,253,254,0.44)',
          }}>
            {log.completed ? 'voltooid' : 'gepland'}
          </span>
        )}
      </div>
      <button
        onClick={onDeleteRequest}
        disabled={isDeleting}
        aria-label="Verwijder log"
        style={{
          width: 32, height: 32, borderRadius: 999,
          background: 'rgba(0,0,0,0.08)',
          border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: isDeleting ? 'default' : 'pointer',
          color: 'var(--card-text-soft)',
          WebkitTapHighlightColor: 'transparent',
          flexShrink: 0,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// ConfirmDelete — sheet-style confirmation
// ═══════════════════════════════════════════════════════════════

function ConfirmDelete({
  log,
  busy,
  onCancel,
  onConfirm,
}: {
  log: Log
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const label =
    log.kind === 'workout'
      ? 'workout-sessie'
      : log.kind === 'weight'
        ? 'gewicht-entry'
        : 'voedings-log'

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 60,
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="animate-slide-up"
        style={{
          background: '#474B48',
          borderRadius: 24,
          width: '100%',
          maxWidth: 420,
          padding: '22px 22px 18px',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 -8px 24px rgba(0,0,0,0.28)',
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--card-text-muted)', marginBottom: 8 }}>
          Verwijderen
        </div>
        <div style={{ fontSize: 18, fontWeight: 300, letterSpacing: '-0.01em', color: 'var(--card-text)', lineHeight: 1.3, marginBottom: 10 }}>
          Deze {label} permanent verwijderen?
        </div>
        <p style={{ fontSize: 13, color: 'var(--card-text-soft)', letterSpacing: '-0.003em', marginBottom: 18 }}>
          {log.kind === 'workout' && 'Alle sets die bij deze sessie horen worden ook verwijderd. Dit kan niet ongedaan gemaakt worden.'}
          {log.kind === 'weight' && 'De entry wordt weggehaald uit je gewichtgeschiedenis.'}
          {log.kind === 'diet' && 'De maaltijd-log wordt weggehaald uit je voedingsgeschiedenis.'}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onCancel}
            disabled={busy}
            style={{
              flex: 1,
              padding: '13px 18px',
              borderRadius: 999,
              border: '1px solid rgba(253,253,254,0.14)',
              background: 'transparent',
              color: 'var(--card-text)',
              fontSize: 14,
              fontWeight: 400,
              letterSpacing: '-0.003em',
              cursor: busy ? 'default' : 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Annuleer
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            style={{
              flex: 1,
              padding: '13px 18px',
              borderRadius: 999,
              border: 'none',
              background: '#FDFDFE',
              color: '#2A2D2B',
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: '-0.003em',
              cursor: busy ? 'default' : 'pointer',
              WebkitTapHighlightColor: 'transparent',
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? 'Bezig…' : 'Verwijder'}
          </button>
        </div>
      </div>
    </div>
  )
}
