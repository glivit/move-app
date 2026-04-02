'use client'

import { ClientBottomNav } from '@/components/layout/ClientBottomNav'
import { ClientSidebar } from '@/components/layout/ClientSidebar'
import { NotificationPermission } from '@/components/notifications/NotificationPermission'
import { ActiveWorkoutBar } from '@/components/workout/ActiveWorkoutBar'
import { SyncStatusIndicator } from '@/components/ui/SyncStatusIndicator'
import { BugReporter } from '@/components/ui/BugReporter'

export default function ClientLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="client-app min-h-screen bg-white">
      {/* Desktop sidebar */}
      <ClientSidebar />

      {/* Main content */}
      <main className="lg:pl-[280px]">
        <div className="max-w-lg mx-auto px-6 pt-16 pb-4 lg:max-w-3xl lg:px-8 lg:pt-12">
          <div className="animate-fade-in">
            {children}
          </div>
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
