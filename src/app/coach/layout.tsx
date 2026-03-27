import { CoachSidebar } from '@/components/layout/CoachSidebar'
import { BugReporter } from '@/components/ui/BugReporter'

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#EEEBE3]">
      <CoachSidebar />
      <main className="lg:pl-[280px]">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 lg:px-10 py-8 lg:py-10">
          {children}
        </div>
      </main>
      <BugReporter />
      <div className="lg:hidden h-20" />
    </div>
  )
}
