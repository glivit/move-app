import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/workout-auto-finish
 *
 * Safety-net voor "scenario A": user sluit de app vóór ze op Sluiten
 * drukken op /client/workout/complete. Zonder deze route blijft
 * workout_sessions.completed_at NULL en is de training onvindbaar.
 *
 * Beleid per open sessie van de caller:
 *   - Er is minstens één workout_set én de laatste set is > 90 min oud
 *     → completed_at = last_set.created_at + 2 min
 *   - Er is geen enkele set én started_at > 6 uur geleden
 *     → completed_at = started_at + 1 min, notes prefix "[auto] abandoned"
 *     (zodat coach ziet dat dit een foute start was, niet een echte sessie)
 *   - Anders: laten staan. Mogelijk is de user nu actief aan het trainen
 *     (we hebben geen heartbeat om dat 100% te bepalen, dus we zijn
 *     conservatief).
 *
 * Body: optional { excludeSessionId?: string } — om de client-side
 * minimized-workout sessie uit te sluiten (die is niet abandoned, die
 * staat actief in de background-bar).
 *
 * Antwoord: { finished: Array<{ sessionId, completedAt, reason }> }
 * Logt elke auto-finish naar bug_reports zodat coach zicht heeft op
 * hoe vaak deze bug triggert.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient()

    // Auth (zelfde patroon als /api/workout-finish).
    let userId: string | null = null
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const { data: { user } } = await admin.auth.getUser(token)
      if (user) userId = user.id
    }
    if (!userId) {
      try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) userId = user.id
      } catch {
        /* below */
      }
    }
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const excludeSessionId: string | null = typeof body?.excludeSessionId === 'string'
      ? body.excludeSessionId
      : null

    // Vind alle open sessies van deze user (laatste 7 dagen, niet verder terug —
    // anything older than 7d is oud vuil dat we niet zomaar aanraken).
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const { data: openSessions, error: openErr } = await admin
      .from('workout_sessions')
      .select('id, started_at, notes')
      .eq('client_id', userId)
      .is('completed_at', null)
      .gte('started_at', weekAgo)
      .order('started_at', { ascending: false })

    if (openErr) {
      console.error('[workout-auto-finish] query open sessions failed:', openErr)
      return NextResponse.json({ error: openErr.message }, { status: 500 })
    }

    if (!openSessions || openSessions.length === 0) {
      return NextResponse.json({ finished: [] })
    }

    const now = Date.now()
    const INACTIVITY_CUTOFF_MS = 90 * 60 * 1000 // 90 min
    const ABANDONED_CUTOFF_MS = 6 * 3600 * 1000 // 6 uur

    const finished: Array<{ sessionId: string; completedAt: string; reason: string }> = []

    for (const s of openSessions) {
      if (s.id === excludeSessionId) continue // actieve (minimized) sessie

      // Haal de laatste set van deze sessie — bepaalt of we auto-finishen.
      const { data: lastSets } = await admin
        .from('workout_sets')
        .select('created_at')
        .eq('workout_session_id', s.id)
        .order('created_at', { ascending: false })
        .limit(1)

      const lastSet = lastSets && lastSets.length > 0 ? lastSets[0] : null
      const startedAt = new Date(s.started_at).getTime()

      let completedAtMs: number | null = null
      let reason: string | null = null
      let notePrefix = ''

      if (lastSet) {
        const lastSetAt = new Date(lastSet.created_at).getTime()
        if (now - lastSetAt > INACTIVITY_CUTOFF_MS) {
          completedAtMs = lastSetAt + 2 * 60 * 1000
          reason = `last-set ${Math.round((now - lastSetAt) / 60000)}min geleden`
        }
      } else {
        // Geen sets — alleen afsluiten als het heel oud is.
        if (now - startedAt > ABANDONED_CUTOFF_MS) {
          completedAtMs = startedAt + 60 * 1000
          reason = `no sets, started ${Math.round((now - startedAt) / 3600000)}h geleden`
          notePrefix = '[auto] abandoned — '
        }
      }

      if (completedAtMs == null || reason == null) continue

      // Cap op "nu" — zekerheidsmaatregel.
      if (completedAtMs > now) completedAtMs = now

      const durationSeconds = Math.max(0, Math.floor((completedAtMs - startedAt) / 1000))
      const completedAtIso = new Date(completedAtMs).toISOString()

      const existingNotes = (s.notes as string | null) || ''
      const newNote = notePrefix
        ? (existingNotes ? `${notePrefix}${existingNotes}` : notePrefix.trim())
        : existingNotes || null

      const { error: updErr } = await admin
        .from('workout_sessions')
        .update({
          completed_at: completedAtIso,
          duration_seconds: durationSeconds,
          notes: newNote,
        })
        .eq('id', s.id)

      if (updErr) {
        console.error('[workout-auto-finish] update failed for', s.id, updErr)
        continue
      }

      finished.push({ sessionId: s.id, completedAt: completedAtIso, reason })

      // Log naar bug_reports zodat coach ziet dat dit triggert — is signaal
      // dat de complete-flow users regelmatig de mist in stuurt en we dus
      // aan scenario A moeten blijven werken (bv. expliciete "Sluit je training af?"
      // prompt bij app-open).
      try {
        await admin.from('bug_reports').insert({
          user_id: userId,
          page_url: '/api/workout-auto-finish',
          description: `[auto-finish] session ${s.id} — ${reason}. Set completed_at=${completedAtIso}, duration=${durationSeconds}s`,
          viewport_width: null,
          viewport_height: null,
          user_agent: request.headers.get('user-agent') || null,
        })
      } catch (e) {
        console.error('[workout-auto-finish] bug_reports log failed:', e)
      }
    }

    return NextResponse.json({ finished })
  } catch (error) {
    console.error('[workout-auto-finish] unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
