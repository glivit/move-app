'use client'

import { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'

const DISMISS_KEY = 'move-push-dismissed-at'
const DISMISS_DURATION = 24 * 60 * 60 * 1000 // 24 hours — then show again

export function NotificationPermission() {
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Must be in a PWA context or browser that supports push
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !('Notification' in window)
    ) return

    // Already granted — silently ensure subscription is saved
    if (Notification.permission === 'granted') {
      ensureSubscription()
      return
    }

    // Denied — can't do anything
    if (Notification.permission === 'denied') return

    // Default — check if recently dismissed
    const dismissedAt = localStorage.getItem(DISMISS_KEY)
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10)
      if (elapsed < DISMISS_DURATION) return // Still within dismiss window
      localStorage.removeItem(DISMISS_KEY)
    }

    // Show banner after 2 seconds
    const timer = setTimeout(() => setShow(true), 2000)
    return () => clearTimeout(timer)
  }, [])

  async function ensureSubscription() {
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) return

      const registration = await navigator.serviceWorker.ready

      // Check if already subscribed
      let sub = await registration.pushManager.getSubscription()
      if (!sub) {
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
        })
      }

      // Save to server (upsert — safe to call multiple times)
      await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      })
    } catch (err) {
      console.error('[Push] ensureSubscription failed:', err)
    }
  }

  async function subscribe() {
    setLoading(true)
    try {
      // Register SW if not already
      await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      // Request permission (must be from user gesture — this is a click handler)
      const result = await Notification.requestPermission()
      if (result !== 'granted') {
        setShow(false)
        return
      }

      await ensureSubscription()
      setShow(false)
    } catch (error) {
      console.error('[Push] Subscribe failed:', error)
    } finally {
      setLoading(false)
    }
  }

  function dismiss() {
    setShow(false)
    localStorage.setItem(DISMISS_KEY, Date.now().toString())
  }

  if (!show) return null

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 lg:bottom-8 lg:left-auto lg:right-8 lg:max-w-sm">
      <div
        className="rounded-2xl p-4 border"
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
              Ontvang berichten van je coach direct op je iPhone.
            </p>

            <div className="flex gap-2 mt-3">
              <button
                onClick={subscribe}
                disabled={loading}
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold text-white transition-all active:scale-[0.97]"
                style={{ backgroundColor: '#8B6914', minHeight: '44px' }}
              >
                {loading ? 'Bezig...' : 'Inschakelen'}
              </button>
              <button
                onClick={dismiss}
                className="py-2.5 px-3 rounded-xl text-xs font-semibold transition-all active:scale-[0.97]"
                style={{ color: '#8E8E93', backgroundColor: '#FAFAFA', minHeight: '44px' }}
              >
                Later
              </button>
            </div>
          </div>

          <button onClick={dismiss} className="flex-shrink-0 p-1">
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
