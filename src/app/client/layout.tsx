import { AuthProvider } from '@/providers/AuthProvider'
import ClientLayoutShell from './ClientLayoutShell'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ClientLayoutShell>{children}</ClientLayoutShell>
    </AuthProvider>
  )
}
