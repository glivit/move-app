import { getAuthFast } from '@/lib/auth-fast'
import { fetchDashboardData } from '@/lib/dashboard-data'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

// Force dynamic rendering (uses cookies for auth)
export const dynamic = 'force-dynamic'

/**
 * Server Component — auth + initial data fetch.
 *
 * Fase 3 perf-optimization: data fetch GEBEURT NU op de server zodat de
 * eerste paint al alle data heeft. Voorheen schipten we `initialData={null}`
 * en moest de client een extra round-trip naar /api/dashboard doen voor
 * cold starts (skeleton flash + 2-5s wait).
 *
 * Trade-off:
 *   - Voor cold start: TTFB iets hoger (we wachten op DB), maar TTI veel
 *     lager. Geen skeleton flash, content meteen zichtbaar.
 *   - Voor warm start: DashboardClient gebruikt nog steeds IDB-cache als
 *     primary, valt terug op deze SSR-data.
 *   - Bij DB-fout: we passen null door, client doet retry-fetch via API.
 *
 * NB: `fetchDashboardData` is dezelfde call die /api/dashboard intern doet,
 * dus geen duplicate query-pad — alleen anders aangeroepen.
 */
export default async function DashboardPage() {
  const { user } = await getAuthFast()

  if (!user) {
    redirect('/')
  }

  // Server-side data fetch. Bij fout: log en fallback naar null
  // zodat client zelf opnieuw probeert. Geen blocking error.
  let initialData = null
  try {
    initialData = await fetchDashboardData(user.id)
  } catch (err) {
    console.error('[dashboard SSR fetch]', err)
  }

  return <DashboardClient initialData={initialData} userId={user.id} />
}
