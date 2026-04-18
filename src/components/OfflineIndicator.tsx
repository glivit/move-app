'use client'

/**
 * OfflineIndicator — top-banner die persisteert zolang de browser offline is.
 *
 * Werkt complementair met SyncStatusIndicator (bottom pill, transient):
 *   - Top-banner = persistent context "je bent offline" (geen verrassing
 *     als een actie geen server-respons teruggeeft).
 *   - Bottom-pill = transient feedback "X items wachten op sync" en
 *     "alles weer in sync" als je terug online komt.
 *
 * v6 Orion: dark-ink banner met lime-rand. Geen bg-warning class meer
 * (oranje/geel matcht de v6 paint nergens en haalt focus naar zichzelf).
 */

import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export function OfflineIndicator() {
  // Lazy initial — synchronous navigator.onLine lezen vóór eerste render
  // (tijdens SSR bestaat navigator niet, vandaar de typeof-guard).
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) return null

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
