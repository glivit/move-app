import { getAuthFast } from '@/lib/auth-fast'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

// Force dynamic rendering (uses cookies for auth)
export const dynamic = 'force-dynamic'

/**
 * Server Component — thin auth-gate.
 *
 * Architecturele keuze: data-fetch GEBEURT OP DE CLIENT, niet op de server.
 * Reden:
 *   - PWA is offline-first; IDB-cache geeft instant warm-start
 *   - Server-side fetch blokkeerde HTML-stream tot DB queries klaar waren
 *     → 8-12s witte pagina op trage netwerk (we hebben dat live gezien)
 *   - Skeleton-flash via client = veel betere UX dan blanco wachten
 *
 * Server doet hier alleen 0ms-werk:
 *   1. JWT-parse via getAuthFast (lokaal, geen netwerk)
 *   2. Redirect naar / als geen user
 *
 * HTML shell stuurt binnen ~50ms. DashboardClient hydrateert + leest IDB
 * + fetcht /api/dashboard parallel — total time-to-content ~200-500ms warm,
 * ~1-2s cold (IDB miss + API).
 */
export default async function DashboardPage() {
  const { user } = await getAuthFast()

  if (!user) {
    redirect('/')
  }

  return <DashboardClient initialData={null} userId={user.id} />
}
