import { createAdminClient } from '@/lib/supabase-admin'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/coach-seen
 * Marks a workout session as seen by the coach.
 * Uses admin client to bypass RLS (coach can SELECT but not UPDATE workout_sessions).
 *
 * Request: { sessionId: string }
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

    const { sessionId } = await request.json()
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
    }

    // Use admin client to bypass RLS
    const admin = createAdminClient()
    const { error } = await admin
      .from('workout_sessions')
      .update({ coach_seen: true })
      .eq('id', sessionId)

    if (error) {
      console.error('[coach-seen] Update error:', error)
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[coach-seen] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
