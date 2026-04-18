import { getAuthFast } from '@/lib/auth-fast'
import { createAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

/**
 * Server action: repair an abandoned session by setting completed_at.
 * Alleen coach-role mag dit gebruiken.
 */
async function repairSessionAction(formData: FormData) {
  'use server'
  const sessionId = String(formData.get('sessionId') || '')
  const completedAt = String(formData.get('completedAt') || '')
  const q = String(formData.get('q') || '')
  const days = String(formData.get('days') || '6')
  if (!sessionId) return

  const { user, supabase } = await getAuthFast()
  if (!user) return

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'coach') return

  const admin = createAdminClient()
  const iso = completedAt && !isNaN(new Date(completedAt).getTime())
    ? new Date(completedAt).toISOString()
    : new Date().toISOString()

  await admin
    .from('workout_sessions')
    .update({ completed_at: iso })
    .eq('id', sessionId)

  // Suppress unused-param lint — q/days nodig voor redirect-parity (nu enkel voor revalidate)
  void q
  void days
  revalidatePath('/coach/debug-sessions')
}

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
  mood_rating: number | null
  difficulty_rating: number | null
  feedback_text: string | null
  coach_seen: boolean | null
  notes: string | null
}

// Lichte variant voor de "recent ever" diagnostic — alleen gegarandeerd-bestaande kolommen
interface RecentEverRow {
  id: string
  started_at: string | null
  completed_at: string | null
  template_day_id: string | null
  client_program_id: string | null
  created_at: string | null
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

function fmtDuration(seconds: number | null): string {
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
  let client: { id: string; full_name: string | null; email?: string | null; role?: string | null } | null = null
  let multipleMatches: Array<{ id: string; name: string | null; role: string | null }> | null = null
  // Alle profielen die op naam matchen — tonen we altijd, ook als er al een client is gekozen,
  // zodat we kunnen zien of er dubbele Charles-accounts zijn (coach vs trial vs client).
  let allNameMatches: Array<{ id: string; name: string | null; role: string | null }> = []

  if (q) {
    // Try UUID match first
    if (/^[0-9a-f-]{30,}$/i.test(q)) {
      const { data } = await admin.from('profiles').select('id, full_name, role').eq('id', q).single()
      client = data || null
    }
    // Try email
    if (!client && q.includes('@')) {
      const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 200 })
      const match = authUsers?.users?.find((u) => u.email?.toLowerCase() === q.toLowerCase())
      if (match) {
        const { data } = await admin.from('profiles').select('id, full_name, role').eq('id', match.id).single()
        if (data) client = { ...data, email: match.email || null }
      }
    }
    // Fall back to full_name ilike — géén role-filter meer, we willen ALLE matches zien
    if (!q.includes('@') && !/^[0-9a-f-]{30,}$/i.test(q)) {
      const { data } = await admin
        .from('profiles')
        .select('id, full_name, role')
        .ilike('full_name', `%${q}%`)
        .limit(20)
      allNameMatches = (data || []).map((c) => ({ id: c.id, name: c.full_name, role: c.role }))
      if (!client) {
        if (allNameMatches.length === 1) {
          client = { id: allNameMatches[0].id, full_name: allNameMatches[0].name, role: allNameMatches[0].role }
        } else if (allNameMatches.length > 1) {
          multipleMatches = allNameMatches
        }
      }
    }
  }

  let sessions: EnrichedSession[] = []
  let activeProgram: ProgramRow | null = null
  let allPrograms: ProgramRow[] = []
  let templateDays: TemplateDayRow[] = []
  // Diagnostics: ongeacht window, aantal sessies OOIT voor deze client.id, en
  // de 5 meest recente. Zo zien we meteen of het een id-mismatch-probleem is
  // (ooit=0) of een window-probleem (ooit>0, maar windowed=0).
  let everCount: number | null = null
  let recentEver: RecentEverRow[] = []
  // Error capture per query — zo zien we als de SELECT silently faalt
  const queryErrors: { query: string; message: string }[] = []

  if (client) {
    const now = new Date()
    const since = new Date(now.getTime() - days * 86400000)

    const [
      programsRes,
      sessionsByStartedRes,
      sessionsByCompletedRes,
      everCountResWrap,
      recentEverResWrap,
    ] = await Promise.all([
      admin
        .from('client_programs')
        .select('id, name, is_active, schedule, template_id, start_date, end_date')
        .eq('client_id', client.id)
        .order('is_active', { ascending: false }),
      // Sessions whose started_at is in the window
      admin
        .from('workout_sessions')
        .select(
          'id, started_at, completed_at, template_day_id, client_program_id, duration_seconds, mood_rating, difficulty_rating, feedback_text, coach_seen, notes',
        )
        .eq('client_id', client.id)
        .gte('started_at', since.toISOString())
        .order('started_at', { ascending: false }),
      // ALSO sessions whose completed_at is in the window — catches zombie-minimized
      // sessions that were started long ago but finished recently.
      admin
        .from('workout_sessions')
        .select(
          'id, started_at, completed_at, template_day_id, client_program_id, duration_seconds, mood_rating, difficulty_rating, feedback_text, coach_seen, notes',
        )
        .eq('client_id', client.id)
        .gte('completed_at', since.toISOString())
        .order('completed_at', { ascending: false }),
      // Total ever — diagnostic (count only, geen kolom-select dus geen failure-mode)
      admin
        .from('workout_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', client.id),
      // 5 meest recente ooit — START minimaal: alleen guaranteed-existing kolommen
      // (id/started_at/completed_at/template_day_id/client_program_id) zodat we 100%
      // zeker zijn dat 0 rijen NIET door een ontbrekende kolom komt.
      admin
        .from('workout_sessions')
        .select('id, started_at, completed_at, template_day_id, client_program_id, created_at')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    if (programsRes.error) queryErrors.push({ query: 'client_programs', message: programsRes.error.message })
    if (sessionsByStartedRes.error)
      queryErrors.push({ query: 'sessions by started_at', message: sessionsByStartedRes.error.message })
    if (sessionsByCompletedRes.error)
      queryErrors.push({ query: 'sessions by completed_at', message: sessionsByCompletedRes.error.message })
    if (everCountResWrap.error)
      queryErrors.push({ query: 'count ever', message: everCountResWrap.error.message })
    if (recentEverResWrap.error)
      queryErrors.push({ query: 'recent ever (limit 5)', message: recentEverResWrap.error.message })

    const programs = programsRes.data
    const sessionsByStarted = sessionsByStartedRes.data
    const sessionsByCompleted = sessionsByCompletedRes.data
    everCount = everCountResWrap.count ?? null
    recentEver = (recentEverResWrap.data as RecentEverRow[]) || []

    // Merge + dedupe by id
    const byId = new Map<string, SessionRow>()
    for (const s of (sessionsByStarted as SessionRow[]) || []) byId.set(s.id, s)
    for (const s of (sessionsByCompleted as SessionRow[]) || []) byId.set(s.id, s)
    const sessionsRaw = Array.from(byId.values()).sort((a, b) => {
      // Sort by most-recent (completed if present, else started)
      const ta = new Date(a.completed_at || a.started_at).getTime()
      const tb = new Date(b.completed_at || b.started_at).getTime()
      return tb - ta
    })

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

    const sessionsTyped = sessionsRaw

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
            className="mb-4 rounded-2xl p-4"
            style={{ background: CARD, color: INK, border: `1px solid ${HAIR}` }}
          >
            <div className="mb-2 text-[13px]" style={{ color: INK_MUTED }}>
              Meerdere matches — klik om te selecteren:
            </div>
            <div className="flex flex-wrap gap-2">
              {multipleMatches.map((m) => (
                <a
                  key={m.id}
                  href={`?q=${m.id}&days=${days}`}
                  className="rounded-full px-3 py-1.5 text-[12px]"
                  style={{ background: 'rgba(192,252,1,0.14)', color: LIME, border: `1px solid ${HAIR}` }}
                >
                  {m.name || '(geen naam)'} · {m.role || 'null'}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Ook als er één client gekozen is: toon alle naam-matches zodat
            duplicaten / accounts met andere rol zichtbaar zijn */}
        {client && allNameMatches.length > 1 && (
          <div
            className="mb-4 rounded-2xl p-3"
            style={{ background: 'rgba(232,169,60,0.08)', border: `1px solid ${HAIR}`, color: INK }}
          >
            <div className="mb-1.5 text-[12px]" style={{ color: AMBER }}>
              ⚠︎ {allNameMatches.length} profielen matchen &ldquo;{q}&rdquo; — mogelijk verkeerd account
              gekozen:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allNameMatches.map((m) => (
                <a
                  key={m.id}
                  href={`?q=${m.id}&days=${days}`}
                  className="rounded-full px-2.5 py-1 text-[11px] tabular-nums"
                  style={{
                    background: m.id === client.id ? 'rgba(192,252,1,0.14)' : 'rgba(71,75,72,0.55)',
                    color: m.id === client.id ? LIME : INK_MUTED,
                    border: `1px solid ${HAIR}`,
                  }}
                >
                  {m.name || '(geen naam)'} · {m.role || 'null'} · {m.id.slice(0, 8)}
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
              <div className="flex items-center gap-2">
                <div className="text-[16px] font-medium" style={{ color: INK }}>
                  {client.full_name || 'Onbekende client'}
                </div>
                {client.role && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      background:
                        client.role === 'client'
                          ? 'rgba(192,252,1,0.14)'
                          : 'rgba(232,169,60,0.18)',
                      color: client.role === 'client' ? LIME : AMBER,
                    }}
                  >
                    {client.role}
                  </span>
                )}
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
            <div className="mb-3 flex flex-wrap gap-2 text-[12px]">
              <SummaryChip label={`Laatste ${days}d`} value={summary.total} tint={INK} />
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
                label="Off-active"
                value={summary.offActive}
                tint={summary.offActive > 0 ? BLUE : INK_MUTED}
              />
              <SummaryChip
                label="Ooit totaal"
                value={everCount ?? 0}
                tint={everCount && everCount > 0 ? INK : AMBER}
              />
            </div>

            {/* Query errors banner — tonen als enige query faalde */}
            {queryErrors.length > 0 && (
              <div
                className="mb-4 rounded-2xl p-3"
                style={{
                  background: 'rgba(232,169,60,0.10)',
                  border: `1px solid ${HAIR}`,
                  color: INK,
                }}
              >
                <div className="mb-1 text-[12px]" style={{ color: AMBER }}>
                  ⚠︎ Query-errors:
                </div>
                {queryErrors.map((e, i) => (
                  <div key={i} className="text-[11px]" style={{ color: AMBER }}>
                    <span style={{ color: INK }}>{e.query}:</span> {e.message}
                  </div>
                ))}
              </div>
            )}

            {/* Recent-ever diagnostic — altijd zichtbaar, geen date-window */}
            {everCount !== null && (
              <div
                className="mb-4 rounded-2xl p-3"
                style={{
                  background: 'rgba(164,199,242,0.08)',
                  border: `1px solid ${HAIR}`,
                  color: INK,
                }}
              >
                <div className="mb-1.5 text-[12px]" style={{ color: BLUE }}>
                  🔎 5 meest recente workout_sessions (sort op created_at) voor{' '}
                  <span className="tabular-nums">{client.id.slice(0, 8)}</span> — ongeacht datum
                </div>
                {everCount === 0 ? (
                  <div className="text-[12px]" style={{ color: AMBER }}>
                    ⚠︎ 0 sessies ooit voor deze client.id — id-mismatch. Controleer of dit de juiste
                    Charles is.
                  </div>
                ) : recentEver.length === 0 ? (
                  <div className="text-[12px]" style={{ color: AMBER }}>
                    ⚠︎ Count zegt {everCount} sessies, maar SELECT gaf 0 rijen terug — query faalt
                    stil. Zie query-errors boven.
                  </div>
                ) : (
                  <div className="space-y-1 text-[11px] tabular-nums" style={{ color: INK_MUTED }}>
                    {recentEver.map((s) => (
                      <div key={s.id} className="flex items-baseline gap-2">
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px]"
                          style={{
                            background: s.completed_at
                              ? 'rgba(192,252,1,0.14)'
                              : 'rgba(232,169,60,0.18)',
                            color: s.completed_at ? LIME : AMBER,
                          }}
                        >
                          {s.completed_at ? '✓' : '○'}
                        </span>
                        <span style={{ color: INK }}>{fmtTime(s.started_at)}</span>
                        <span>→</span>
                        <span>{fmtTime(s.completed_at)}</span>
                        <span style={{ color: 'rgba(253,253,254,0.35)' }}>
                          (created {fmtTime(s.created_at)})
                        </span>
                        <span className="truncate" style={{ color: 'rgba(253,253,254,0.35)' }}>
                          {s.id.slice(0, 8)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

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
                  <SessionCard
                    key={s.id}
                    s={s}
                    q={q}
                    days={String(days)}
                    action={repairSessionAction}
                  />
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

function SessionCard({
  s,
  q,
  days,
  action,
}: {
  s: EnrichedSession
  q: string
  days: string
  action: (formData: FormData) => Promise<void>
}) {
  const completed = !!s.completed_at
  const badgeColor = completed ? LIME : AMBER
  const badgeLabel = completed ? 'Voltooid' : 'Open'

  // Default completedAt suggestion = started_at + sets_completed activity window.
  // Als er geen sets zijn, pak started_at + 45 min als redelijke gok.
  // Format: datetime-local (no seconds, no TZ suffix).
  const suggestedCompletedAt = (() => {
    if (!s.started_at) return ''
    const started = new Date(s.started_at)
    // Voeg duration_seconds toe als beschikbaar, anders 45 min default
    const fallbackMs = s.duration_seconds ? s.duration_seconds * 1000 : 45 * 60 * 1000
    const suggested = new Date(started.getTime() + fallbackMs)
    // Als gok > nu, cap op nu
    const capped = suggested.getTime() > Date.now() ? new Date() : suggested
    // YYYY-MM-DDTHH:mm in local time
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${capped.getFullYear()}-${pad(capped.getMonth() + 1)}-${pad(capped.getDate())}T${pad(capped.getHours())}:${pad(capped.getMinutes())}`
  })()

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
        <Kv k="Duur" v={fmtDuration(s.duration_seconds)} />
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

      {!completed && (
        <form
          action={action}
          className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3"
          style={{ borderColor: HAIR }}
        >
          <input type="hidden" name="sessionId" value={s.id} />
          <input type="hidden" name="q" value={q} />
          <input type="hidden" name="days" value={days} />
          <label className="text-[11px]" style={{ color: INK_MUTED }}>
            Voltooid op:
          </label>
          <input
            type="datetime-local"
            name="completedAt"
            defaultValue={suggestedCompletedAt}
            className="rounded-lg px-2 py-1 text-[11px] tabular-nums outline-none"
            style={{
              background: 'rgba(0,0,0,0.18)',
              color: INK,
              border: `1px solid ${HAIR}`,
              colorScheme: 'dark',
            }}
          />
          <button
            type="submit"
            className="ml-auto rounded-full px-3 py-1.5 text-[11px] font-medium"
            style={{ background: LIME, color: '#0a0a0a' }}
          >
            Mark voltooid
          </button>
        </form>
      )}
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
