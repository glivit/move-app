'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { TopBarAvatar } from '@/components/layout/TopBarAvatar'

// Lazy load non-critical UI components — komen in een aparte chunk
// die pas downloadt wanneer de browser idle is na first paint.
const ClientBottomNav = dynamic(
  () => import('@/components/layout/ClientBottomNav').then(m => ({ default: m.ClientBottomNav })),
  { ssr: false },
)
// ClientSidebar — alleen zichtbaar op desktop (lg:). Mobile users
// betalen geen byte.
const ClientSidebar = dynamic(
  () => import('@/components/layout/ClientSidebar').then(m => ({ default: m.ClientSidebar })),
  { ssr: false },
)
// ActiveWorkoutBar — alleen zichtbaar als een workout actief is.
// Default state = niet actief, dus geen reden voor sync-load.
const ActiveWorkoutBar = dynamic(
  () => import('@/components/workout/ActiveWorkoutBar').then(m => ({ default: m.ActiveWorkoutBar })),
  { ssr: false },
)
const NotificationPermission = dynamic(
  () => import('@/components/notifications/NotificationPermission').then(m => m.NotificationPermission),
  { ssr: false },
)
const SyncStatusIndicator = dynamic(
  () => import('@/components/ui/SyncStatusIndicator').then(m => m.SyncStatusIndicator),
  { ssr: false },
)
const DevFeedbackWidget = dynamic(
  () => import('@/components/DevFeedbackWidget').then(m => m.DevFeedbackWidget),
  { ssr: false },
)

export default function ClientLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  // ─── Prefetch routes + warm API caches ─────────────────────────────
  // Tab-navigatie was 3-6s op iPhone 14 Pro omdat elke tab zijn eigen
  // fetch-on-mount doet (network roundtrip op cold cache). Prefetch alleen
  // van routes (JS chunks) lost dat niet op — de data moet ook in-memory
  // klaar staan. cachedFetch() vult zijn module-level Map zodat de tab-
  // page het cache-hit pad raakt en instant rendert.
  useEffect(() => {
    const id = setTimeout(() => {
      const ric = (window as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback
      const warm = () => {
        // Route bundles
        ;['/client', '/client/workout', '/client/nutrition', '/client/progress']
          .forEach(r => router.prefetch(r))

        // API responses — populate cachedFetch's Map zodat tab-pages
        // bij mount instant cache-hits krijgen i.p.v. network roundtrip.
        // 60s maxAge = lang genoeg voor casual tab-hopping.
        const today = new Date().toISOString().slice(0, 10)
        Promise.allSettled([
          import('@/lib/fetcher').then(({ cachedFetch }) => Promise.all([
            cachedFetch('/api/client-program', { maxAge: 60_000 }),
            cachedFetch('/api/progress', { maxAge: 60_000 }),
            cachedFetch(`/api/nutrition-log?date=${today}`, { maxAge: 60_000 }),
          ])),
        ]).catch(() => {})
      }
      if (ric) ric(warm)
      else warm()
    }, 3000)
    return () => clearTimeout(id)
  }, [router])

  // ─── Sync-queue bootstrap ─────────────────────────────────────────
  // initSyncQueue() hoort 1× te draaien per page-load: het hangt
  // online/offline listeners aan `window` en processt achterstallige
  // actions uit IDB. Zonder deze call blijft SyncStatusIndicator eeuwig
  // op "online=true" staan, ongeacht wat navigator.onLine doet.
  useEffect(() => {
    let cancelled = false
    import('@/lib/sync-queue').then(({ initSyncQueue }) => {
      if (!cancelled) initSyncQueue()
    })
    return () => { cancelled = true }
  }, [])

  // ─── Workout-finish retry-queue + auto-finish safety-net ─────────
  //
  // Twee stappen bij elke mount:
  //
  //  1. processPendingWorkoutFinish — loopt de localStorage retry-queue
  //     af. Vangt scenario B: handleComplete runde wél maar fetch faalde.
  //
  //  2. /api/workout-auto-finish — vindt open sessies (completed_at IS NULL)
  //     van de user en sluit die af als:
  //        - laatste set > 90 min geleden  → completed_at = last_set + 2min
  //        - geen sets en started_at > 6u  → completed_at = started_at + 1min
  //     Vangt scenario A: user drukte nooit op Sluiten. We sturen de
  //     currently-active sessionId mee als excludeSessionId zodat we een
  //     minimized workout (background-bar) niet per ongeluk afsluiten.
  //
  // Beide stappen zijn best-effort — niks fataals als ze falen.
  useEffect(() => {
    let cancelled = false
    // 5s defer — dashboard-fetch + hydration moeten eerst klaar zijn.
    // Workout-auto-finish is een safety-net (geen latency-critical pad)
    // en mocht best wachten tot na de eerste interaction-window.
    const deferId = setTimeout(() => {
      if (cancelled) return
      ;(async () => {
        try {
          const [{ createClient }, { processPendingWorkoutFinish }] = await Promise.all([
            import('@/lib/supabase'),
            import('@/lib/workout-finish-retry'),
          ])
          if (cancelled) return
          const supabase = createClient()
          const { data: { session: authSession } } = await supabase.auth.getSession()
          const headers: Record<string, string> = {}
          if (authSession?.access_token) {
            headers['Authorization'] = `Bearer ${authSession.access_token}`
          }
          if (cancelled) return

          // 1. retry-queue
          await processPendingWorkoutFinish(headers)
          if (cancelled) return

          // 2. auto-finish abandoned sessions
          let excludeSessionId: string | null = null
          try {
            const raw = window.localStorage.getItem('move_minimized_workout')
            if (raw) {
              const parsed = JSON.parse(raw) as { sessionId?: string }
              if (parsed?.sessionId) excludeSessionId = parsed.sessionId
            }
          } catch {
            /* ignore */
          }

          await fetch('/api/workout-auto-finish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify({ excludeSessionId }),
          })
        } catch {
          /* best-effort */
        }
      })()
    }, 5000)
    return () => {
      cancelled = true
      clearTimeout(deferId)
    }
  }, [])
  // Workout active page = focus-modus: top-bar + bnav + active-bar weggelaten,
  // page rendert zelf zijn eigen chrome conform design-system/06-workout.html
  const isFocusMode =
    pathname?.startsWith('/client/workout/active') ||
    pathname?.startsWith('/client/workout/complete') ||
    pathname?.startsWith('/client/messages')

  return (
    <div className="client-app min-h-screen">
      {/* Desktop sidebar — wordt later gemigreerd naar v6 tokens */}
      {!isFocusMode && <ClientSidebar />}

      {/* Mobile top bar — MŌVE logo + avatar met lime-dot voor unread */}
      {!isFocusMode && (
        <header
          className="lg:hidden fixed top-0 left-0 right-0 z-40"
          style={{
            padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 5% 10px',
            background: 'linear-gradient(to bottom, rgba(237,236,227,0.85), rgba(237,236,227,0.65))',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
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
              color: '#1C1E18',
              textDecoration: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            MŌVE
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <TopBarAvatar />
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

      {/* In-app feedback widget — altijd zichtbaar, ook tijdens active
       * workout / chat / complete (focus-mode). Anders kunnen users juist
       * dáár geen feedback geven waar ze meeste tijd doorbrengen. */}
      <DevFeedbackWidget />

      {/* Spacer for bottom nav on mobile */}
      {!isFocusMode && <div className="lg:hidden h-24" />}
    </div>
  )
}
