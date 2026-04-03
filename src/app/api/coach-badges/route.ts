import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

/**
 * GET /api/coach-badges
 * Returns badge counts for the coach sidebar.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({})

    const [unseenWorkouts, unreadMessages, pendingCheckins] = await Promise.all([
      // coach_seen can be false OR null (if migration 005 wasn't run)
      supabase.from('workout_sessions').select('id', { count: 'exact', head: true })
        .not('completed_at', 'is', null)
        .or('coach_seen.eq.false,coach_seen.is.null'),
      supabase.from('messages').select('id', { count: 'exact', head: true })
        .eq('receiver_id', user.id).is('read_at', null).in('message_type', ['text', 'image', 'video', 'file']),
      supabase.from('checkins').select('id', { count: 'exact', head: true })
        .eq('coach_reviewed', false),
    ])

    const workoutCount = unseenWorkouts.count || 0
    const messageCount = unreadMessages.count || 0
    const checkinCount = pendingCheckins.count || 0

    const response = NextResponse.json({
      '/coach': workoutCount + messageCount + checkinCount,
      '/coach/activity': workoutCount,
      '/coach/clients': workoutCount,
      '/coach/check-ins': checkinCount,
      '/coach/messages': messageCount,
    })
    response.headers.set('Cache-Control', 'private, max-age=10, stale-while-revalidate=60')
    return response
  } catch (e) {
    console.error('[coach-badges] Error:', e)
    return NextResponse.json({})
  }
}
