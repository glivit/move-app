'use client'

/**
 * OfflineIndicator — top-banner die toont wanneer de browser offline gaat.
 *
 * Werkt complementair met SyncStatusIndicator (bottom pill, transient):
 *   - Top-banner = persistent context "je bent offline" zodra de browser
 *     écht een offline-event vuurt.
 *   - Bottom-pill = transient feedback "X items wachten op sync" en
 *     "alles weer in sync" als je terug online komt.
 *
 * BELANGRIJK — géén navigator.onLine-check bij mount:
 *   navigator.onLine is op iOS PWA (en sommige Safari-builds) niet betrouw-
 *   baar bij app-launch — het kan 'false' rapporteren totdat de eerste echte
 *   fetch slaagt. Dat zorgde ervoor dat online users de offline-banner zagen.
 *   We rekenen daarom alleen op het 'offline' event vanuit het OS.
 *   Een echte offline-situatie wordt sowieso binnen ms door de browser ge-
 *   signaleerd, dus dit kost niets aan UX.
 *
 * v6 Orion: dark-ink banner met lime-rand.
 */

import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export function OfflineIndicator() {
  // Default: aannemen dat we online zijn. Pas tonen na een offline-event.
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-2 text-[12px] font-medium tracking-tight"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 6px)',
        paddingBottom: 6,
        background: '#474B48',
        color: '#FDFDFE',
        borderBottom: '1px solid rgba(192,252,1,0.30)',
        boxShadow: '0 1px 8px rgba(0,0,0,0.18)',
      }}
      role="status"
      aria-live="polite"
    >
      <WifiOff className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.75} style={{ color: '#C0FC01' }} />
      <span>Je bent offline — wijzigingen worden lokaal bewaard</span>
    </div>
  )
}
