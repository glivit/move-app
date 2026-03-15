import { CoachSidebar } from '@/components/layout/CoachSidebar'

export const dynamic = 'force-dynamic'

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F5F2ED]">
      <CoachSidebar />
      <main className="lg:pl-[280px]">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 lg:px-10 py-8 lg:py-10">
          {children}
        </div>
      </main>
      <div className="lg:hidden h-20" />
    </div>
  )
}
