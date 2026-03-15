import ClientLayoutShell from './ClientLayoutShell'

export const dynamic = 'force-dynamic'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <ClientLayoutShell>{children}</ClientLayoutShell>
}
