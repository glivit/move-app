import { getAuthFast } from '@/lib/auth-fast'
import { fetchDashboardData } from '@/lib/dashboard-data'
import DashboardClient from './DashboardClient'

// Force dynamic rendering (uses cookies for auth)
export const dynamic = 'force-dynamic'

/**
 * Server Component — fetches dashboard data on the server.
 * Data arrives with the initial HTML, no extra client-side API call needed.
 * Eliminates an entire HTTP round trip + JS hydration wait.
 */
export default async function DashboardPage() {
  let initialData = null

  try {
    const { user } = await getAuthFast()
    if (user) {
      initialData = await fetchDashboardData(user.id)
    }
  } catch {
    // Auth failed or data fetch failed — client component will handle fallback
  }

  return <DashboardClient initialData={initialData} />
}
