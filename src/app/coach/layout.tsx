import dynamic from 'next/dynamic'
import { CoachSidebar } from '@/components/layout/CoachSidebar'
import { CoachBottomNav } from '@/components/layout/CoachBottomNav'

const BugReporter = dynamic(
  () => import('@/components/ui/BugReporter').then((m) => m.BugReporter)
)

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#8E9890]">
      {/* Desktop sidebar only — mobile top/bottom bars hidden via `lg:` prefixes inside */}
      <div className="hidden lg:block">
        <CoachSidebar />
      </div>

      <main className="lg:pl-[280px]">
        <div className="max-w-[420px] lg:max-w-5xl mx-auto px-[22px] lg:px-10 pt-[14px] lg:pt-10 pb-8">
          {children}
        </div>
      </main>

      <BugReporter />

      {/* v3 Orion 3-tab mobile bottom nav */}
      <CoachBottomNav />

      {/* Spacer so content isn't hidden behind the fixed mobile nav */}
      <div className="lg:hidden h-[90px]" />
    </div>
  )
}
