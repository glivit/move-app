import { createAdminClient } from '@/lib/supabase-admin'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/coach-seen
 * Marks workout session(s) as seen by the coach.
 * Uses admin client to bypass RLS (coach can SELECT but not UPDATE workout_sessions).
 *
 * Request body, one of:
 *   { sessionId: string }    — mark a single session as seen
 *   { clientId: string }     — bulk: mark every unseen session for this client
 *
 * When a `clientId` is supplied, we also mark any unread messages from that
 * client to the coach as read, so the row's unread badge clears too.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify the caller is a coach
    const userSupabase = await createServerSupabaseClient()
    const { data: { user } } = await userSupabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await userSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'coach') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({})) as {
      sessionId?: string
      clientId?: string
    }

    if (!body.sessionId && !body.clientId) {
      return NextResponse.json({ error: 'sessionId or clientId required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Single-session path
    if (body.sessionId) {
      const { error } = await admin
        .from('workout_sessions')
        .update({ coach_seen: true })
        .eq('id', body.sessionId)

      if (error) {
        console.error('[coach-seen] Update error:', error)
        return NextResponse.json({ error: 'Update failed' }, { status: 500 })
      }
      return NextResponse.json({ success: true, mode: 'single' })
    }

    // Bulk path — every unseen session for a client + mark DMs read
    const { error: sessErr, count: updatedSessions } = await admin
      .from('workout_sessions')
      .update({ coach_seen: true }, { count: 'exact' })
      .eq('client_id', body.clientId!)
      .eq('coach_seen', false)

    if (sessErr) {
      console.error('[coach-seen] Bulk session update error:', sessErr)
      return NextResponse.json({ error: 'Bulk update failed' }, { status: 500 })
    }

    // Also mark unread messages from this client as read by the coach
    const nowIso = new Date().toISOString()
    const { error: msgErr, count: updatedMessages } = await admin
      .from('messages')
      .update({ read_at: nowIso }, { count: 'exact' })
      .eq('sender_id', body.clientId!)
      .eq('receiver_id', user.id)
      .is('read_at', null)

    if (msgErr) {
      console.error('[coach-seen] Bulk message update error:', msgErr)
      // Non-fatal — sessions were already marked seen
    }

    return NextResponse.json({
      success: true,
      mode: 'bulk',
      updatedSessions: updatedSessions ?? 0,
      updatedMessages: updatedMessages ?? 0,
    })
  } catch (error) {
    console.error('[coach-seen] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
