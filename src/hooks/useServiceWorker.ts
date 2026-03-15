import { useEffect } from 'react'

export function useServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    // Register unified service worker (caching + push)
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[MŌVE] Service Worker registered')
        // Check for updates every 5 minutes
        setInterval(() => registration.update(), 5 * 60 * 1000)
      })
      .catch((error) => {
        console.error('[MŌVE] SW registration failed:', error)
      })

    // Clear app badge when app is opened/focused
    const clearBadge = () => {
      if ('clearAppBadge' in navigator) {
        (navigator as any).clearAppBadge().catch(() => {})
      }
      // Also tell SW to clear
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_BADGE' })
      }
    }
    clearBadge() // Clear on load
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') clearBadge()
    })

    // Refresh page when new SW takes control
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    })
  }, [])
}
