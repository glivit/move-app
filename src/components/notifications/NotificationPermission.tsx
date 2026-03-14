'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, X } from 'lucide-react'

export function NotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Check if push is supported
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setPermission('unsupported')
      return
    }

    setPermission(Notification.permission)

    // Show banner after a short delay if permission not yet granted
    if (Notification.permission === 'default') {
      const dismissed = localStorage.getItem('move-push-dismissed')
      if (!dismissed) {
        const timer = setTimeout(() => setShowBanner(true), 3000)
        return () => clearTimeout(timer)
      }
    }
  }, [])

  const subscribe = async () => {
    setLoading(true)
    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      // Request notification permission
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result !== 'granted') {
        setLoading(false)
        return
      }

      // Subscribe to push
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        console.error('VAPID public key not configured')
        setLoading(false)
        return
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      })

      // Save subscription to server
      const response = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      })

      if (!response.ok) {
        console.error('Failed to save subscription')
      }

      setShowBanner(false)
    } catch (error) {
      console.error('Push subscription failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const dismiss = () => {
    setDismissed(true)
    setShowBanner(false)
    localStorage.setItem('move-push-dismissed', 'true')
  }

  // Don't show anything if unsupported, already granted, or denied
  if (permission === 'unsupported' || permission === 'granted' || permission === 'denied' || !showBanner || dismissed) {
    return null
  }

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 lg:bottom-8 lg:left-auto lg:right-8 lg:max-w-sm animate-in slide-in-from-bottom">
      <div
        className="rounded-2xl p-4 shadow-lg border"
        style={{
          backgroundColor: 'white',
          borderColor: '#F0F0ED',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#FFF8ED' }}
          >
            <Bell strokeWidth={1.5} className="w-5 h-5" style={{ color: '#8B6914' }} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: '#1A1A18' }}>
              Meldingen inschakelen
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#8E8E93' }}>
              Ontvang herinneringen voor je training en berichten van je coach.
            </p>

            <div className="flex gap-2 mt-3">
              <button
                onClick={subscribe}
                disabled={loading}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-white transition-all"
                style={{ backgroundColor: '#8B6914' }}
              >
                {loading ? 'Bezig...' : 'Inschakelen'}
              </button>
              <button
                onClick={dismiss}
                className="py-2 px-3 rounded-xl text-xs font-semibold transition-all"
                style={{ color: '#8E8E93', backgroundColor: '#FAFAFA' }}
              >
                Later
              </button>
            </div>
          </div>

          <button
            onClick={dismiss}
            className="flex-shrink-0 p-1"
          >
            <X strokeWidth={1.5} className="w-4 h-4" style={{ color: '#C7C7CC' }} />
          </button>
        </div>
      </div>
    </div>
  )
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
