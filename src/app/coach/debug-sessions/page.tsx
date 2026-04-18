import { getAuthFast } from '@/lib/auth-fast'
import { createAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/**
 * Coach-only diagnostische pagina. Laat sessies van een specifieke client
 * zien (inclusief incomplete / niet-afgesloten) zodat je kan achterhalen
 * waarom een gelogde training niet opduikt.
 *
 * Gebruik: /coach/debug-sessions?q=charles  of  ?q=<uuid>  of  ?q=email@x.y
 */

type Props = { searchParams: Promise<{ q?: string; days?: string }> }

interface SessionRow {
  id: string
  started_at: string
  completed_at: string | null
  template_day_id: string | null
  client_program_id: string | null
  duration_seconds: number | null
  duration_minutes: number | null
  mood_rating: number | null
  difficulty_rating: number | null
  feedback_text: string | null
  coach_seen: boolean | null
  notes: string | null
}

interface ProgramRow {
  id: string
  name: string | null
  is_active: boolean | null
  schedule: Record<string, string> | null
  template_id: string | null
  start_date: string | null
  end_date: string | null
}

interface TemplateDayRow {
  id: string
  name: string
  template_id: string
}

interface EnrichedSession extends SessionRow {
  template_day_name: string | null
  belongs_to_active_program: boolean
  sets_total: number
  sets_completed: number
  program_label: string
}

// V3 Orion tokens — dezelfde palette als rest van coach
const CANVAS = '#8E9890'
const INK = '#FDFDFE'
const INK_MUTED = 'rgba(253,253,254,0.62)'
const CARD = '#474B48'
const HAIR = 'rgba(253,253,254,0.08)'
const LIME = '#C0FC01'
const AMBER = '#E8A93C'
const BLUE = '#A4C7F2'

function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const date = d.toLocaleDateString('nl-BE', { weekday: 'short', day: '2-digit', month: '2-digit' })
  const time = d.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })
  return `${date} ${time}`
}

function fmtDuration(seconds: number | null, minutes: number | null): string {
  if (minutes != null) return `${minutes} min`
  if (seconds != null) return `${Math.round(seconds / 60)} min`
  return '—'
}

export default async function CoachDebugSessionsPage({ searchParams }: Props) {
  const { user, supabase } = await getAuthFast()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'coach') redirect('/')

  const sp = await searchParams
  const q = (sp.q || '').trim()
  const days = Math.min(Math.max(Number(sp.days || '2'), 1), 30)

  const admin = createAdminClient()

  // Resolve client from query (id / email / name)
  let client: { id: string; full_name: string | null; email?: string | null } | null = null
  let multipleMatches: Array<{ id: string; name: string | null }> | null = null

  if (q) {
    // Try UUID match first
    if (/^[0-9a-f-]{30,}$/i.test(q)) {
      const { data } = await admin.from('profiles').select('id, full_name').eq('id', q).single()
      client = data || null
    }
    // Try email
    if (!client && q.includes('@')) {
      const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 200 })
      const match = authUsers?.users?.find((u) => u.email?.toLowerCase() === q.toLowerCase())
      if (match) {
        const { data } = await admin.from('profiles').select('id, full_name').eq('id', match.id).single()
        if (data) client = { ...data, email: match.email || null }
      }
    }
    // Fall back to full_name ilike
    if (!client) {
      const { data } = await admin
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'client')
        .ilike('full_name', `%${q}%`)
        .limit(10)
      if (data && data.length === 1) {
        client = data[0]
      } else if (data && data.length > 1) {
        multipleMatches = data.map((c) => ({ id: c.id, name: c.full_name }))
      }
    }
  }

  let sessions: EnrichedSession[] = []
  let activeProgram: ProgramRow | null = null
  let allPrograms: ProgramRow[] = []
  let templateDays: TemplateDayRow[] = []

  if (client) {
    const now = new Date()
    const since = new Date(now.getTime() - days * 86400000)

    const [{ data: programs }, { data: sessionsRaw }] = await Promise.all([
      admin
        .from('client_programs')
        .select('id, name, is_active, schedule, template_id, start_date, end_date')
        .eq('client_id', client.id)
        .order('is_active', { ascending: false }),
      admin
        .from('workout_sessions')
        .select(
          'id, started_at, completed_at, template_day_id, client_program_id, duration_seconds, duration_minutes, mood_rating, difficulty_rating, feedback_text, coach_seen, notes',
        )
        .eq('client_id', client.id)
        .gte('started_at', since.toISOString())
        .order('started_at', { ascending: false }),
    ])

    allPrograms = (programs as ProgramRow[]) || []
    activeProgram = allPrograms.find((p) => p.is_active) || null

    const templateIds = Array.from(
      new Set(allPrograms.map((p) => p.template_id).filter(Boolean) as string[]),
    )
    if (templateIds.length) {
      const { data: tdays } = await admin
        .from('program_template_days')
        .select('id, name, template_id')
        .in('template_id', templateIds)
      templateDays = (tdays as TemplateDayRow[]) || []
    }

    const dayNameMap = new Map(templateDays.map((d) => [d.id, d.name]))
    const dayTemplateMap = new Map(templateDays.map((d) => [d.id, d.template_id]))
    const programLabelById = new Map(
      allPrograms.map((p) => [p.id, `${p.name || 'Onbekend'}${p.is_active ? ' · actief' : ''}`]),
    )

    const sessionsTyped = (sessionsRaw as SessionRow[]) || []

    const sessionIds = sessionsTyped.map((s) => s.id)
    let setsRows: Array<{ workout_session_id: string; completed: boolean | null }> = []
    if (sessionIds.length) {
      const { data } = await admin
        .from('workout_sets')
        .select('workout_session_id, completed')
        .in('workout_session_id', sessionIds)
      setsRows = (data as typeof setsRows) || []
    }
    const setCounts = new Map<string, { total: number; completed: number }>()
    for (const row of setsRows) {
      const cur = setCounts.get(row.workout_session_id) || { total: 0, completed: 0 }
      cur.total += 1
      if (row.completed) cur.completed += 1
      setCounts.set(row.workout_session_id, cur)
    }

    sessions = sessionsTyped.map((s) => {
      const sets = setCounts.get(s.id) || { total: 0, completed: 0 }
      const tmplName = s.template_day_id ? dayNameMap.get(s.template_day_id) || null : null
      const tmplProgram = s.template_day_id ? dayTemplateMap.get(s.template_day_id) || null : null
      const belongs =
        !!activeProgram &&
        s.client_program_id === activeProgram.id &&
        (!tmplProgram || tmplProgram === activeProgram.template_id)
      return {
        ...s,
        template_day_name: tmplName,
        belongs_to_active_program: belongs,
        sets_total: sets.total,
        sets_completed: sets.completed,
        program_label: s.client_program_id
          ? programLabelById.get(s.client_program_id) || 'Onbekend programma'
          : '—',
      }
    })
  }

  const summary = {
    total: sessions.length,
    completed: sessions.filter((s) => s.completed_at).length,
    unfinished: sessions.filter((s) => !s.completed_at).length,
    zeroSets: sessions.filter((s) => s.sets_total === 0).length,
    offActive: sessions.filter((s) => !s.belongs_to_active_program).length,
  }

  return (
    <div className="min-h-screen pt-safe pb-safe" style={{ background: CANVAS, color: INK }}>
      <div className="mx-auto max-w-[880px] px-5 pt-6 pb-24">
        <div className="mb-4 flex items-center justify-between">
          <a
            href="/coach"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px]"
            style={{ background: 'rgba(71,75,72,0.55)', color: INK }}
          >
            ← Terug
          </a>
          <div className="text-[12px]" style={{ color: INK_MUTED }}>
            Debug · workout-sessies
          </div>
        </div>

        <h1 className="mb-1 text-[22px] font-semibold tracking-tight" style={{ color: INK }}>
          Sessie-diagnose
        </h1>
        <p className="mb-5 text-[13px]" style={{ color: INK_MUTED }}>
          Zoek een client op naam, email of UUID. Toont ook incomplete / abandoned sessies.
        </p>

        <form method="get" className="mb-6 flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="charles / e@x.y / uuid"
            className="flex-1 rounded-xl px-4 py-2.5 text-[14px] outline-none"
            style={{
              background: CARD,
              color: INK,
              border: `1px solid ${HAIR}`,
            }}
            autoFocus
          />
          <input
            type="number"
            name="days"
            defaultValue={days}
            min={1}
            max={30}
            className="w-[70px] rounded-xl px-3 py-2.5 text-center text-[14px] tabular-nums outline-none"
            style={{
              background: CARD,
              color: INK,
              border: `1px solid ${HAIR}`,
            }}
            title="Aantal dagen terug"
          />
          <button
            type="submit"
            className="rounded-xl px-4 py-2.5 text-[14px] font-medium"
            style={{ background: LIME, color: '#0a0a0a' }}
          >
            Zoek
          </button>
        </form>

        {q && !client && !multipleMatches && (
          <div
            className="rounded-2xl p-4 text-[13px]"
            style={{ background: CARD, color: INK_MUTED, border: `1px solid ${HAIR}` }}
          >
            Geen client gevonden voor &ldquo;{q}&rdquo;.
          </div>
        )}

        {multipleMatches && (
          <div
            className="rounded-2xl p-4"
            style={{ background: CARD, color: INK, border: `1px solid ${HAIR}` }}
          >
            <div className="mb-2 text-[13px]" style={{ color: INK_MUTED }}>
              Meerdere matches — klik om verder te zoeken:
            </div>
            <div className="flex flex-wrap gap-2">
              {multipleMatches.map((m) => (
                <a
                  key={m.id}
                  href={`?q=${m.id}&days=${days}`}
                  className="rounded-full px-3 py-1.5 text-[13px]"
                  style={{ background: 'rgba(192,252,1,0.14)', color: LIME, border: `1px solid ${HAIR}` }}
                >
                  {m.name || m.id}
                </a>
              ))}
            </div>
          </div>
        )}

        {client && (
          <>
            {/* Client header */}
            <div
              className="mb-4 rounded-2xl p-4"
              style={{ background: CARD, border: `1px solid ${HAIR}` }}
            >
              <div className="text-[16px] font-medium" style={{ color: INK }}>
                {client.full_name || 'Onbekende client'}
              </div>
              <div className="mt-0.5 text-[12px] tabular-nums" style={{ color: INK_MUTED }}>
                {client.id}
              </div>
              {activeProgram && (
                <div className="mt-3 text-[13px]" style={{ color: INK }}>
                  Actief programma:{' '}
                  <span style={{ color: LIME }}>{activeProgram.name || '—'}</span>
                </div>
              )}
              {activeProgram?.schedule && (
                <div className="mt-1.5 text-[12px]" style={{ color: INK_MUTED }}>
                  Schedule:{' '}
                  {Object.entries(activeProgram.schedule as Record<string, string>)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([dow, tid]) => {
                      const name = templateDays.find((d) => d.id === tid)?.name || '?'
                      const label = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'][Number(dow) - 1] || '?'
                      return `${label}=${name}`
                    })
                    .join(' · ')}
                </div>
              )}
            </div>

            {/* Summary chips */}
            <div className="mb-4 flex flex-wrap gap-2 text-[12px]">
              <SummaryChip label="Totaal" value={summary.total} tint={INK} />
              <SummaryChip label="Voltooid" value={summary.completed} tint={LIME} />
              <SummaryChip
                label="Open / abandoned"
                value={summary.unfinished}
                tint={summary.unfinished > 0 ? AMBER : INK_MUTED}
              />
              <SummaryChip
                label="0 sets"
                value={summary.zeroSets}
                tint={summary.zeroSets > 0 ? AMBER : INK_MUTED}
              />
              <SummaryChip
                label="Niet bij actief programma"
                value={summary.offActive}
                tint={summary.offActive > 0 ? BLUE : INK_MUTED}
              />
            </div>

            {/* Session list */}
            {sessions.length === 0 ? (
              <div
                className="rounded-2xl p-6 text-center text-[13px]"
                style={{ background: CARD, color: INK_MUTED, border: `1px solid ${HAIR}` }}
              >
                Geen sessies in deze {days}-daagse window.
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((s) => (
                  <SessionCard key={s.id} s={s} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function SummaryChip({ label, value, tint }: { label: string; value: number; tint: string }) {
  return (
    <div
      className="rounded-full px-3 py-1.5"
      style={{ background: 'rgba(71,75,72,0.55)', border: `1px solid ${HAIR}` }}
    >
      <span style={{ color: 'rgba(253,253,254,0.55)' }}>{label}:</span>{' '}
      <span className="font-medium tabular-nums" style={{ color: tint }}>
        {value}
      </span>
    </div>
  )
}

function SessionCard({ s }: { s: EnrichedSession }) {
  const completed = !!s.completed_at
  const badgeColor = completed ? LIME : AMBER
  const badgeLabel = completed ? 'Voltooid' : 'Open'

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: CARD, border: `1px solid ${HAIR}` }}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[15px] font-medium" style={{ color: INK }}>
            {s.template_day_name || (
              <span style={{ color: AMBER }}>⚠︎ template_day_id = null</span>
            )}
          </div>
          <div className="mt-0.5 text-[12px] tabular-nums" style={{ color: INK_MUTED }}>
            {fmtTime(s.started_at)} → {fmtTime(s.completed_at)}
          </div>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium"
          style={{
            background: completed ? 'rgba(192,252,1,0.14)' : 'rgba(232,169,60,0.18)',
            color: badgeColor,
          }}
        >
          {badgeLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]" style={{ color: INK_MUTED }}>
        <Kv k="Sets" v={`${s.sets_completed} / ${s.sets_total}`} />
        <Kv k="Duur" v={fmtDuration(s.duration_seconds, s.duration_minutes)} />
        <Kv k="RPE" v={s.difficulty_rating != null ? String(s.difficulty_rating) : '—'} />
        <Kv k="Mood" v={s.mood_rating != null ? String(s.mood_rating) : '—'} />
        <Kv
          k="Programma"
          v={s.program_label}
          tint={s.belongs_to_active_program ? INK : BLUE}
        />
        <Kv k="Coach gezien" v={s.coach_seen ? 'ja' : 'nee'} />
      </div>

      {(s.feedback_text || s.notes) && (
        <div className="mt-3 space-y-1.5 border-t pt-3 text-[12px]" style={{ borderColor: HAIR }}>
          {s.feedback_text && (
            <div style={{ color: INK }}>
              <span style={{ color: INK_MUTED }}>Feedback:</span> {s.feedback_text}
            </div>
          )}
          {s.notes && (
            <div style={{ color: INK }}>
              <span style={{ color: INK_MUTED }}>Notes:</span> {s.notes}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 text-[11px] tabular-nums" style={{ color: 'rgba(253,253,254,0.35)' }}>
        {s.id}
      </div>
    </div>
  )
}

function Kv({ k, v, tint }: { k: string; v: string; tint?: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span style={{ color: 'rgba(253,253,254,0.45)' }}>{k}:</span>
      <span className="truncate" style={{ color: tint || INK }}>
        {v}
      </span>
    </div>
  )
}
