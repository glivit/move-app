'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ClientBottomNav } from '@/components/layout/ClientBottomNav'
import { ClientSidebar } from '@/components/layout/ClientSidebar'
import { TopBarAvatar } from '@/components/layout/TopBarAvatar'
import { ActiveWorkoutBar } from '@/components/workout/ActiveWorkoutBar'

// Lazy load non-critical UI components
const NotificationPermission = dynamic(
  () => import('@/components/notifications/NotificationPermission').then(m => m.NotificationPermission),
  { ssr: false },
)
const SyncStatusIndicator = dynamic(
  () => import('@/components/ui/SyncStatusIndicator').then(m => m.SyncStatusIndicator),
  { ssr: false },
)
const BugReporter = dynamic(
  () => import('@/components/ui/BugReporter').then(m => m.BugReporter),
  { ssr: false },
)

export default function ClientLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // Workout active page = focus-modus: top-bar + bnav + active-bar weggelaten,
  // page rendert zelf zijn eigen chrome conform design-system/06-workout.html
  const isFocusMode =
    pathname?.startsWith('/client/workout/active') ||
    pathname?.startsWith('/client/workout/complete')

  return (
    <div
      className="client-app min-h-screen"
      style={{
        // v6 · design-system shared.css .phone achtergrond exact:
        //   canvas #8E9890 + radial highlight top (w 0.10) + shadow bottom (b 0.25).
        // background-attachment: fixed bewust weg — iOS Safari rendert het niet
        // betrouwbaar (jitter bij scroll, platslaat de vignette).
        background: '#8E9890',
        backgroundImage:
          'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255,255,255,0.10), transparent 60%),' +
          'radial-gradient(ellipse 80% 60% at 50% 110%, rgba(0,0,0,0.25), transparent 60%)',
      }}
    >
      {/* Desktop sidebar — wordt later gemigreerd naar v6 tokens */}
      {!isFocusMode && <ClientSidebar />}

      {/* Mobile top bar — MŌVE logo + avatar met lime-dot voor unread */}
      {!isFocusMode && (
        <header
          className="lg:hidden fixed top-0 left-0 right-0 z-40"
          style={{
            padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 5% 10px',
            background: 'linear-gradient(to bottom, rgba(142,152,144,0.96), rgba(142,152,144,0.82))',
            backdropFilter: 'blur(14px) saturate(1.1)',
            WebkitBackdropFilter: 'blur(14px) saturate(1.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link
            href="/client"
            aria-label="Naar home"
            style={{
              fontFamily: 'var(--font-sans, Outfit), Outfit, sans-serif',
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: '-0.02em',
              color: '#FDFDFE',
              textDecoration: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            MŌVE
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <TopBarAvatar />
            <button className="ico-btn" aria-label="Menu">
              <svg viewBox="0 0 24 24">
                <line x1="4" y1="8" x2="20" y2="8" />
                <line x1="4" y1="16" x2="20" y2="16" />
              </svg>
            </button>
          </div>
        </header>
      )}

      {/* Main content */}
      <main className={isFocusMode ? '' : 'lg:pl-[280px]'}>
        {isFocusMode ? (
          children
        ) : (
          <div className="client-shell-content max-w-lg mx-auto px-6 pb-4 lg:max-w-3xl lg:px-8 lg:pt-12">
            <div className="animate-fade-in">
              {children}
            </div>
          </div>
        )}
      </main>

      {/* Active workout persistent bar — niet zichtbaar op active page zelf */}
      {!isFocusMode && <ActiveWorkoutBar />}

      {/* Mobile bottom nav — v6 pill */}
      {!isFocusMode && <ClientBottomNav />}

      {/* Push notification permission prompt */}
      <NotificationPermission />

      {/* Offline sync status indicator */}
      <SyncStatusIndicator />

      {/* Bug reporter for test users */}
      <BugReporter />

      {/* Spacer for bottom nav on mobile */}
      {!isFocusMode && <div className="lg:hidden h-24" />}
    </div>
  )
}
