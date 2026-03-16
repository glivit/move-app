'use client'

import { ClientBottomNav } from '@/components/layout/ClientBottomNav'
import { ClientSidebar } from '@/components/layout/ClientSidebar'
import { NotificationPermission } from '@/components/notifications/NotificationPermission'

export default function ClientLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="client-app min-h-screen bg-[#EEEBE3]">
      {/* Desktop sidebar */}
      <ClientSidebar />

      {/* Mobile header — editorial, clean */}
      <header className="lg:hidden sticky top-0 z-30 glass-warm border-b border-[#DDD9D0]">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <h1
            className="text-[22px] font-semibold text-center text-[#1A1917] tracking-[0.12em] uppercase"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            MŌVE
          </h1>
        </div>
      </header>

      {/* Main content — generous whitespace */}
      <main className="lg:pl-[280px]">
        <div className="max-w-3xl mx-auto px-6 py-8 lg:py-12">
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
