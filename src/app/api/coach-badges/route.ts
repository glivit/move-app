import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/coach-badges
 * Returns badge counts for the coach sidebar. Single lightweight endpoint
 * instead of 3 separate Supabase queries from the client.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({})

    const [unseenWorkouts, unreadMessages, pendingCheckins] = await Promise.all([
      supabase.from('workout_sessions').select('id', { count: 'exact', head: true })
        .not('completed_at', 'is', null).eq('coach_seen', false),
      supabase.from('messages').select('id', { count: 'exact', head: true })
        .eq('receiver_id', user.id).is('read_at', null),
      supabase.from('checkins').select('id', { count: 'exact', head: true })
        .eq('coach_reviewed', false),
    ])

    return NextResponse.json({
      '/coach': (unseenWorkouts.count || 0) + (unreadMessages.count || 0) + (pendingCheckins.count || 0),
      '/coach/activity': unseenWorkouts.count || 0,
      '/coach/clients': unseenWorkouts.count || 0,
      '/coach/check-ins': pendingCheckins.count || 0,
      '/coach/messages': unreadMessages.count || 0,
    })
  } catch {
    return NextResponse.json({})
  }
}
