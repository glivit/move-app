import { getAuthFast } from '@/lib/auth-fast'
import { fetchCoachWeekOverview } from '@/lib/coach-week-data'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/coach/week-overview
 * Returns per-client week data for the mobile coach home screen.
 * Initial page load uses the Server Component; this route is for client-side revalidation.
 */
export async function GET() {
  try {
    const { user, supabase } = await getAuthFast()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'coach') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const data = await fetchCoachWeekOverview(user.id)
    const response = NextResponse.json(data)
    response.headers.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=60')
    return response
  } catch (err) {
    console.error('Coach week-overview API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
