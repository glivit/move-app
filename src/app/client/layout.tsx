'use client'

import { ClientBottomNav } from '@/components/layout/ClientBottomNav'
import { ClientSidebar } from '@/components/layout/ClientSidebar'
import { NotificationPermission } from '@/components/notifications/NotificationPermission'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="client-app min-h-screen bg-[#F9F8F5]">
      {/* Desktop sidebar */}
      <ClientSidebar />

      {/* Mobile header — frosted glass, premium */}
      <header className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-2xl border-b border-[#ECEAE5]">
        <div className="max-w-2xl mx-auto px-5 py-3.5">
          <h1
            className="display text-lg font-semibold text-center text-[#1A1A18] tracking-[-0.03em]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            MŌVE
          </h1>
        </div>
      </header>

      {/* Main content — generous padding */}
      <main className="lg:pl-[280px]">
        <div className="max-w-3xl mx-auto px-5 py-8 lg:py-10">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <ClientBottomNav />

      {/* Push notification permission prompt */}
      <NotificationPermission />

      {/* Spacer for bottom nav on mobile */}
      <div className="lg:hidden h-20" />
    </div>
  )
}
