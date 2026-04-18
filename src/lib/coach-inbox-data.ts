import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Unified coach inbox data.
 *
 * Streams 5 thread types into one feed (matches coach-inbox.html v3 mockup):
 *   • Client questions (unread messages from client → coach)
 *   • Weekly check-ins (prompt_responses, coach_seen=false)
 *   • Post-session feedback (workout_sessions with feedback_text, coach_seen=false)
 *   • System alerts (derived: silent client, missed check-in)
 *   • Info-only messages (older / non-question traffic)
 *
 * Each thread carries a `dotClass` that drives the visual status indicator
 * (amber=action, lime-pulse=today, neutral=open, filled-lime=done, mini=archived).
 */

// ─── Types ──────────────────────────────────────────────────────

export type InboxDotClass = 'action' | 'today' | 'open' | 'done' | 'mini'
export type InboxKicker = 'act' | 'live' | 'info'
export type InboxBucket = 'vandaag' | 'gisteren' | 'ouder'

export interface CheckinStat {
  value: string   // "4/5", "7u", "80%", "+0,4kg"
  label: string   // "Energie"
  warn: boolean
}

export interface InboxThread {
  id: string
  kind: 'question' | 'checkin' | 'session_feedback' | 'alert' | 'message'
  clientId: string | null
  clientName: string
  dotClass: InboxDotClass
  kicker: string               // e.g. "Vraag · Push A"
  kickerVariant: InboxKicker   // amber/lime/grey
  body: string                 // preview text (quoted if from client)
  timeLabel: string            // "2u", "gister · 18:42", "ma"
  createdAtMs: number          // for sort/bucket
  bucket: InboxBucket
  read: boolean                // controls muted styling
  stats?: CheckinStat[]        // weekly check-ins only
  href: string                 // tap target
  alertVariant?: boolean       // system-alert card (amber outline)
  quickActions?: Array<{ label: string; kind: 'primary' | 'ghost' }>
}

export interface CoachInboxData {
  threads: InboxThread[]
  counts: {
    all: number
    vragen: number
    checkins: number
    alerts: number
    berichten: number
    archivedThisWeek: number
  }
  headlineSub: string   // "3 vragen wachten" — under title
}

// ─── Row types ──────────────────────────────────────────────────

interface ProfileLite {
  id: string
  full_name: string | null
  avatar_url: string | null
}

interface MessageRow {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  message_type: string
  read_at: string | null
  created_at: string
}

interface PromptResponseRow {
  id: string
  prompt_id: string
  client_id: string
  response: string
  mood_score: number | null
  energy_score: number | null
  sleep_score: number | null
  coach_seen: boolean
  created_at: string
  prompts?: { title: string | null } | { title: string | null }[] | null
}

interface SessionRow {
  id: string
  client_id: string
  feedback_text: string | null
  mood_rating: number | null
  difficulty_rating: number | null
  completed_at: string | null
  started_at: string
  coach_seen: boolean | null
  template_day_id: string | null
}

interface TemplateDayRow {
  id: string
  name: string | null
}

interface CheckinRow {
  id: string
  client_id: string
  date: string
  weight_kg: number | null
  coach_reviewed: boolean
  created_at: string
  coach_notes: string | null
}

// ─── Helpers ────────────────────────────────────────────────────

function formatRelTime(iso: string, now: Date): { label: string; bucket: InboxBucket; ms: number } {
  const then = new Date(iso)
  const ms = then.getTime()
  const diffMin = Math.round((now.getTime() - ms) / 60000)

  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const thenDay = new Date(then)
  thenDay.setHours(0, 0, 0, 0)
  const dayDiff = Math.round((today.getTime() - thenDay.getTime()) / 86400000)

  let bucket: InboxBucket = 'ouder'
  let label: string

  if (dayDiff <= 0) {
    bucket = 'vandaag'
    if (diffMin < 1) label = 'zojuist'
    else if (diffMin < 60) label = `${diffMin} min`
    else label = `${Math.floor(diffMin / 60)} u`
  } else if (dayDiff === 1) {
    bucket = 'gisteren'
    const hh = String(then.getHours()).padStart(2, '0')
    const mm = String(then.getMinutes()).padStart(2, '0')
    label = `gister · ${hh}:${mm}`
  } else {
    const days = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za']
    label = dayDiff < 7 ? days[then.getDay()] : then.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })
  }

  return { label, bucket, ms }
}

function promptTitleOf(row: PromptResponseRow): string | null {
  const p = row.prompts
  if (!p) return null
  if (Array.isArray(p)) return p[0]?.title || null
  return p.title || null
}

function previewText(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ')
  if (trimmed.length <= 180) return trimmed
  return trimmed.slice(0, 177) + '…'
}

function firstName(full: string | null): string {
  if (!full) return '—'
  return full.split(' ')[0]
}

// Detect "question" intent in a message — basic heuristic.
function looksLikeQuestion(content: string): boolean {
  const trimmed = content.trim()
  if (!trimmed) return false
  if (trimmed.includes('?')) return true
  const openings = /^(kan|mag|moet|zal|is|ga|ben|wil|wat|wanneer|hoe|waar|waarom|kunnen|mogen|moeten|zou)\b/i
  return openings.test(trimmed)
}

// ─── Main fetcher ───────────────────────────────────────────────

export async function fetchCoachInbox(coachId: string): Promise<CoachInboxData> {
  const admin = createAdminClient()
  const now = new Date()
  const monthAgoIso = new Date(now.getTime() - 30 * 86400000).toISOString()

  // Fetch clients linked to this coach to scope alerts
  const [
    { data: clientsData },
    { data: messagesData },
    { data: responsesData },
    { data: sessionsData },
    { data: templateDaysData },
    { data: checkinsData },
  ] = await Promise.all([
    admin
      .from('profiles')
      .select('id, full_name, avatar_url, start_date')
      .eq('role', 'client'),
    admin
      .from('messages')
      .select('id, sender_id, receiver_id, content, message_type, read_at, created_at')
      .eq('receiver_id', coachId)
      .gte('created_at', monthAgoIso)
      .order('created_at', { ascending: false })
      .limit(60),
    admin
      .from('prompt_responses')
      .select(
        'id, prompt_id, client_id, response, mood_score, energy_score, sleep_score, coach_seen, created_at, prompts(title)'
      )
      .gte('created_at', monthAgoIso)
      .order('created_at', { ascending: false })
      .limit(40),
    admin
      .from('workout_sessions')
      .select(
        'id, client_id, feedback_text, mood_rating, difficulty_rating, completed_at, started_at, coach_seen, template_day_id'
      )
      .not('feedback_text', 'is', null)
      .gte('started_at', monthAgoIso)
      .order('started_at', { ascending: false })
      .limit(40),
    admin.from('program_template_days').select('id, name'),
    admin
      .from('checkins')
      .select('id, client_id, date, weight_kg, coach_reviewed, created_at, coach_notes')
      .gte('created_at', monthAgoIso)
      .order('created_at', { ascending: false })
      .limit(40),
  ])

  const clients = (clientsData || []) as ProfileLite[]
  const clientById = new Map<string, ProfileLite>()
  for (const c of clients) clientById.set(c.id, c)

  const messages = (messagesData || []) as MessageRow[]
  const responses = (responsesData || []) as PromptResponseRow[]
  const sessions = (sessionsData || []) as SessionRow[]
  const tplDays = (templateDaysData || []) as TemplateDayRow[]
  const tplById = new Map<string, TemplateDayRow>()
  for (const t of tplDays) tplById.set(t.id, t)
  const checkins = (checkinsData || []) as CheckinRow[]

  // ─── Build threads ───
  const threads: InboxThread[] = []

  // 1. Client messages → questions + info messages
  for (const m of messages) {
    const client = clientById.get(m.sender_id)
    if (!client) continue
    const t = formatRelTime(m.created_at, now)
    const read = !!m.read_at
    const isQuestion = looksLikeQuestion(m.content)
    let dot: InboxDotClass
    if (read) {
      dot = 'done'
    } else if (t.bucket === 'vandaag' && t.ms > now.getTime() - 3 * 3600 * 1000 && isQuestion) {
      dot = 'action'
    } else if (isQuestion) {
      dot = 'action'
    } else if (t.bucket === 'vandaag' && t.ms > now.getTime() - 2 * 3600 * 1000) {
      dot = 'today'
    } else {
      dot = 'open'
    }
    threads.push({
      id: `msg-${m.id}`,
      kind: isQuestion ? 'question' : 'message',
      clientId: client.id,
      clientName: client.full_name || '—',
      dotClass: dot,
      kicker: isQuestion
        ? read
          ? 'Vraag · beantwoord'
          : 'Vraag'
        : read
        ? 'Bericht'
        : 'Bericht',
      kickerVariant: isQuestion && !read ? 'act' : 'info',
      body: `"${previewText(m.content)}"`,
      timeLabel: t.label,
      createdAtMs: t.ms,
      bucket: read && t.bucket === 'vandaag' ? 'ouder' : t.bucket,
      read,
      href: `/coach/messages/${client.id}`,
    })
  }

  // 2. Weekly check-ins (prompt_responses)
  for (const r of responses) {
    const client = clientById.get(r.client_id)
    if (!client) continue
    const t = formatRelTime(r.created_at, now)
    const read = !!r.coach_seen
    const stats: CheckinStat[] = []
    if (r.energy_score !== null) {
      stats.push({
        value: `${r.energy_score}/5`,
        label: 'Energie',
        warn: r.energy_score < 3,
      })
    }
    if (r.sleep_score !== null) {
      stats.push({
        value: `${r.sleep_score}u`,
        label: 'Slaap',
        warn: r.sleep_score < 6,
      })
    }
    if (r.mood_score !== null) {
      stats.push({
        value: `${r.mood_score}/5`,
        label: 'Stemming',
        warn: r.mood_score < 3,
      })
    }

    const promptTitle = promptTitleOf(r) || 'Check-in'

    const dot: InboxDotClass = read
      ? 'done'
      : t.bucket === 'vandaag' && t.ms > now.getTime() - 2 * 3600 * 1000
      ? 'today'
      : 'open'

    threads.push({
      id: `chk-${r.id}`,
      kind: 'checkin',
      clientId: client.id,
      clientName: client.full_name || '—',
      dotClass: dot,
      kicker: read ? `${promptTitle} · verwerkt` : promptTitle,
      kickerVariant: read ? 'info' : dot === 'today' ? 'live' : 'info',
      body: `"${previewText(r.response)}"`,
      timeLabel: t.label,
      createdAtMs: t.ms,
      bucket: read && t.bucket === 'vandaag' ? 'ouder' : t.bucket,
      read,
      stats: stats.length ? stats : undefined,
      href: `/coach/check-ins/${r.id}`,
    })
  }

  // 3. Post-session feedback
  for (const s of sessions) {
    const client = clientById.get(s.client_id)
    if (!client) continue
    if (!s.feedback_text) continue
    const iso = s.completed_at || s.started_at
    const t = formatRelTime(iso, now)
    const read = s.coach_seen === true
    const tpl = s.template_day_id ? tplById.get(s.template_day_id) : null
    const dayName = tpl?.name || 'Training'
    const dot: InboxDotClass = read ? 'done' : 'action'
    threads.push({
      id: `ses-${s.id}`,
      kind: 'session_feedback',
      clientId: client.id,
      clientName: client.full_name || '—',
      dotClass: dot,
      kicker: read ? `Na sessie · ${dayName} · gezien` : `Na sessie · ${dayName}`,
      kickerVariant: read ? 'info' : 'act',
      body: `"${previewText(s.feedback_text)}"`,
      timeLabel: t.label,
      createdAtMs: t.ms,
      bucket: read && t.bucket === 'vandaag' ? 'ouder' : t.bucket,
      read,
      href: `/coach/clients/${client.id}/sessions/${s.id}`,
    })
  }

  // 4. Body check-ins
  for (const c of checkins) {
    const client = clientById.get(c.client_id)
    if (!client) continue
    const t = formatRelTime(c.created_at, now)
    const read = !!c.coach_reviewed
    const dot: InboxDotClass = read
      ? 'done'
      : t.bucket === 'vandaag' && t.ms > now.getTime() - 2 * 3600 * 1000
      ? 'today'
      : 'open'
    const weightSuffix = c.weight_kg ? ` · ${c.weight_kg.toFixed(1).replace('.', ',')} kg` : ''
    threads.push({
      id: `bod-${c.id}`,
      kind: 'checkin',
      clientId: client.id,
      clientName: client.full_name || '—',
      dotClass: dot,
      kicker: read ? `Lichaam check-in · verwerkt${weightSuffix}` : `Lichaam check-in${weightSuffix}`,
      kickerVariant: read ? 'info' : dot === 'today' ? 'live' : 'info',
      body: c.coach_notes ? previewText(c.coach_notes) : 'Nieuwe metingen beschikbaar.',
      timeLabel: t.label,
      createdAtMs: t.ms,
      bucket: read && t.bucket === 'vandaag' ? 'ouder' : t.bucket,
      read,
      href: `/coach/clients/${client.id}`,
    })
  }

  // 5. System alerts — silent clients (derived)
  // A client is "silent" if they haven't sent a message OR completed a session
  // OR logged a check-in in the past 3 days, and had activity before that.
  {
    // Build last-activity map per client
    const lastActivityByClient = new Map<string, number>()
    for (const m of messages) {
      if (clientById.has(m.sender_id)) {
        const prev = lastActivityByClient.get(m.sender_id) || 0
        const ms = new Date(m.created_at).getTime()
        if (ms > prev) lastActivityByClient.set(m.sender_id, ms)
      }
    }
    for (const s of sessions) {
      const ms = new Date(s.completed_at || s.started_at).getTime()
      const prev = lastActivityByClient.get(s.client_id) || 0
      if (ms > prev) lastActivityByClient.set(s.client_id, ms)
    }
    for (const c of checkins) {
      const ms = new Date(c.created_at).getTime()
      const prev = lastActivityByClient.get(c.client_id) || 0
      if (ms > prev) lastActivityByClient.set(c.client_id, ms)
    }
    for (const r of responses) {
      const ms = new Date(r.created_at).getTime()
      const prev = lastActivityByClient.get(r.client_id) || 0
      if (ms > prev) lastActivityByClient.set(r.client_id, ms)
    }

    const threeDaysAgo = now.getTime() - 3 * 86400000
    const twoWeeksAgo = now.getTime() - 14 * 86400000

    for (const [clientId, lastMs] of lastActivityByClient.entries()) {
      if (lastMs < threeDaysAgo && lastMs > twoWeeksAgo) {
        const client = clientById.get(clientId)
        if (!client) continue
        const days = Math.floor((now.getTime() - lastMs) / 86400000)
        const t = formatRelTime(new Date().toISOString(), now)
        threads.push({
          id: `alert-silent-${clientId}`,
          kind: 'alert',
          clientId: client.id,
          clientName: `${client.full_name || '—'} · ${days} dagen stil`,
          dotClass: 'action',
          kicker: 'Systeem · Check-in gemist',
          kickerVariant: 'act',
          body: `Geen activiteit sinds ${days} dagen. Eerste gemiste periode deze maand.`,
          timeLabel: t.label,
          createdAtMs: now.getTime() - 60_000, // sort near top
          bucket: 'vandaag',
          read: false,
          alertVariant: true,
          quickActions: [
            { label: 'Stuur ping', kind: 'primary' },
            { label: 'Laat staan', kind: 'ghost' },
          ],
          href: `/coach/clients/${client.id}`,
        })
      }
    }
  }

  // ─── Sort + order ───
  // Within each bucket: alerts first, amber dots next, then today, then open, then done.
  const dotPriority: Record<InboxDotClass, number> = {
    action: 0,
    today: 1,
    open: 2,
    done: 3,
    mini: 4,
  }
  const bucketPriority: Record<InboxBucket, number> = {
    vandaag: 0,
    gisteren: 1,
    ouder: 2,
  }
  threads.sort((a, b) => {
    const bb = bucketPriority[a.bucket] - bucketPriority[b.bucket]
    if (bb !== 0) return bb
    const dp = dotPriority[a.dotClass] - dotPriority[b.dotClass]
    if (dp !== 0) return dp
    return b.createdAtMs - a.createdAtMs
  })

  // ─── Counts for filter pills ───
  const vragen = threads.filter(
    (t) => t.kind === 'question' && !t.read
  ).length
  const checkinsCount = threads.filter(
    (t) => t.kind === 'checkin' && !t.read
  ).length
  const alerts = threads.filter((t) => t.kind === 'alert').length
  const berichten = threads.filter((t) => t.kind === 'message').length
  const all = threads.length
  const archivedThisWeek = threads.filter(
    (t) => t.read && t.createdAtMs > now.getTime() - 7 * 86400000
  ).length

  const headlineSub = vragen > 0
    ? `${vragen} ${vragen === 1 ? 'vraag wacht' : 'vragen wachten'}`
    : checkinsCount > 0
    ? `${checkinsCount} check-in${checkinsCount === 1 ? '' : 's'} te bekijken`
    : alerts > 0
    ? `${alerts} alert${alerts === 1 ? '' : 's'} actief`
    : 'Alles onder controle'

  void firstName

  return {
    threads,
    counts: {
      all,
      vragen,
      checkins: checkinsCount,
      alerts,
      berichten,
      archivedThisWeek,
    },
    headlineSub,
  }
}
