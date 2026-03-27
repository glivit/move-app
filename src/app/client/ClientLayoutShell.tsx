'use client'

import { ClientBottomNav } from '@/components/layout/ClientBottomNav'
import { ClientSidebar } from '@/components/layout/ClientSidebar'
import { NotificationPermission } from '@/components/notifications/NotificationPermission'
import { ActiveWorkoutBar } from '@/components/workout/ActiveWorkoutBar'
import { SyncStatusIndicator } from '@/components/ui/SyncStatusIndicator'
import { BugReporter } from '@/components/ui/BugReporter'

export default function ClientLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="client-app min-h-screen bg-[#EEEBE3]">
      {/* Desktop sidebar */}
      <ClientSidebar />

      {/* Mobile header — thin, editorial */}
      <header className="lg:hidden sticky top-0 z-30 bg-[#EEEBE3] border-b border-[#E8E4DC]">
        <div className="max-w-2xl mx-auto px-6 h-12 flex items-center justify-center">
          <span
            className="text-[15px] font-semibold tracking-[0.2em] uppercase text-[#1A1917]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            MŌVE
          </span>
        </div>
      </header>

      {/* Main content — 16px side padding (8px grid), generous vertical */}
      <main className="lg:pl-[280px]">
        <div className="max-w-lg mx-auto px-4 pt-8 pb-4 lg:max-w-3xl lg:px-6 lg:pt-12">
          {children}
        </div>
      </main>

      {/* Active workout persistent bar */}
      <ActiveWorkoutBar />

      {/* Mobile bottom nav */}
      <ClientBottomNav />

      {/* Push notification permission prompt */}
      <NotificationPermission />

      {/* Offline sync status indicator */}
      <SyncStatusIndicator />

      {/* Bug reporter for test users */}
      <BugReporter />

      {/* Spacer for bottom nav on mobile */}
      <div className="lg:hidden h-20" />
    </div>
  )
}
