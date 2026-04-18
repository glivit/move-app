/**
 * Push notification client utilities for MŌVE coaching app
 * Handles permission requests, service worker registration, and push subscriptions
 * Subscriptions are stored in Supabase via /api/push
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

/**
 * Check if push notifications are supported on this device/browser
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission !== 'default') return Notification.permission
  return await Notification.requestPermission()
}

/**
 * Register the service worker for push notifications
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null

  try {
    // Sinds de Serwist-migratie wordt de SW geserveerd vanuit een Route
    // Handler op /serwist/sw.js (zie src/app/serwist/[path]/route.ts).
    // De scope blijft '/' omdat createSerwistRoute() de Service-Worker-Allowed
    // header automatisch meestuurt.
    const registration = await navigator.serviceWorker.register('/serwist/sw.js', { scope: '/' })
    return registration
  } catch (error) {
    console.error('[Push] Service Worker registratie mislukt:', error)
    return null
  }
}

/**
 * Full push setup: request permission → register SW → subscribe → save to Supabase
 * Call this once after the client logs in
 */
export async function setupPushNotifications(): Promise<boolean> {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) {
    console.log('[Push] Niet ondersteund of VAPID key ontbreekt')
    return false
  }

  try {
    // 1. Request permission
    const permission = await requestNotificationPermission()
    if (permission !== 'granted') {
      console.log('[Push] Toestemming geweigerd')
      return false
    }

    // 2. Register service worker
    const registration = await registerServiceWorker()
    if (!registration) return false

    // Wait for SW to be ready
    await navigator.serviceWorker.ready

    // 3. Check existing subscription
    let subscription = await registration.pushManager.getSubscription()

    // 4. Subscribe if not yet subscribed
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      })
    }

    // 5. Save to Supabase via API
    const res = await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    })

    if (!res.ok) {
      console.error('[Push] Opslaan mislukt:', await res.text())
      return false
    }

    console.log('[Push] Notificaties actief')
    return true
  } catch (error) {
    console.error('[Push] Setup mislukt:', error)
    return false
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<void> {
  try {
    if (!('serviceWorker' in navigator)) return

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      const endpoint = subscription.endpoint
      await subscription.unsubscribe()

      // Remove from Supabase
      await fetch('/api/push', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      })
    }
  } catch (error) {
    console.error('[Push] Afmelden mislukt:', error)
  }
}

/**
 * Helper: send push notification to specific client(s)
 * Called from coach-side code after sending broadcast/message/prompt
 */
export async function sendPushToClient(
  clientId: string,
  title: string,
  message: string,
  url: string = '/client'
): Promise<boolean> {
  try {
    const res = await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, title, message, url }),
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Convert VAPID key from base64 to Uint8Array
 */
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
