import { AuthProvider } from '@/providers/AuthProvider'
import ClientLayoutShell from './ClientLayoutShell'

// Alle /client/* routes hebben runtime auth nodig (cookies-based session).
// Force dynamic op layout-niveau voorkomt build-time prerender-fouten zoals
// "Supabase URL/key required" die optreden wanneer Next probeert deze
// pagina's statisch te genereren tijdens een build zonder env-vars.
export const dynamic = 'force-dynamic'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ClientLayoutShell>{children}</ClientLayoutShell>
    </AuthProvider>
  )
}
