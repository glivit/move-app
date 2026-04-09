import { getAuthFast } from '@/lib/auth-fast'
import { fetchDashboardData } from '@/lib/dashboard-data'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/dashboard
 * Thin wrapper around fetchDashboardData() for client-side revalidation.
 * Initial page load uses the Server Component (no API call needed).
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthFast()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const data = await fetchDashboardData(user.id)

    const response = NextResponse.json(data)
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=120')
    return response
  } catch (err) {
    console.error('Dashboard API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
