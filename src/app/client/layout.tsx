import ClientLayoutShell from './ClientLayoutShell'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <ClientLayoutShell>{children}</ClientLayoutShell>
}
