import { CoachSidebar } from '@/components/layout/CoachSidebar'

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="client-app min-h-screen bg-[#F9F8F5]">
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
