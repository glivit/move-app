import { AuthProvider } from '@/providers/AuthProvider'
import ClientLayoutShell from './ClientLayoutShell'

// GEEN force-dynamic hier: statische prerender van de client-shells maakt
// tab-navigatie instant (RSC payload komt uit de prefetch-cache i.p.v. een
// server-roundtrip per tap — dat kostte 0.5-1.5s per navigatie). Vereiste:
// componenten in deze tree mogen GEEN Supabase-client in render-scope
// aanmaken (zie ClientSidebar.handleLogout) — prerender draait de render.
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ClientLayoutShell>{children}</ClientLayoutShell>
    </AuthProvider>
  )
}
