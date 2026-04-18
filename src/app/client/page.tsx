import { getAuthFast } from '@/lib/auth-fast'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

// Force dynamic rendering (uses cookies for auth)
export const dynamic = 'force-dynamic'

/**
 * Server Component — thin auth-gate.
 *
 * Fase 2 offline-first: de data-fetch is verhuisd naar de client
 * (IDB-first, dan /api/dashboard). We blocken hier niet meer op een
 * server-side DB-roundtrip. Resultaat:
 *   - HTML shell komt in ~20-50ms aan (alleen een auth-cookie check)
 *   - Warm start: DashboardClient rendert direct uit IDB-cache
 *   - Cold start: skeleton verschijnt onmiddellijk, fetch vult in
 *
 * Auth blijft server-side omdat:
 *   1. getAuthFast() is een lokale JWT-parse (~0ms, geen netwerk)
 *   2. We hebben de userId nodig voor IDB-cache namespacing
 *   3. Defense-in-depth — middleware redirect is de primaire guard,
 *      deze redirect is backup mocht die ooit misgaan
 */
export default async function DashboardPage() {
  const { user } = await getAuthFast()

  if (!user) {
    redirect('/')
  }

  return <DashboardClient initialData={null} userId={user.id} />
}
