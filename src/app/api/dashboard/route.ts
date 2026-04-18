import { getAuthFast } from '@/lib/auth-fast'
import { fetchDashboardData } from '@/lib/dashboard-data'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/dashboard
 * Primary data source voor de client dashboard sinds Fase 2 (offline-first).
 *
 * De client component (DashboardClient) rendert eerst uit IDB-cache voor
 * instant paint, en roept dan parallel deze endpoint aan voor verse data.
 * Cache-Control geeft de browser ook nog SWR-mogelijkheden voor
 * tussen-route navigatie binnen dezelfde sessie.
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
