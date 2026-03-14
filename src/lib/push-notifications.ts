/**
 * Push notification utilities for MŌVE coaching app
 * Handles permission requests, service worker registration, and push subscriptions
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.log('Deze browser ondersteunt meldingen niet');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  return await Notification.requestPermission();
}

/**
 * Register the service worker for push notifications
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Workers worden niet ondersteund');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    console.log('Service Worker geregistreerd:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registratie mislukt:', error);
    return null;
  }
}

/**
 * Subscribe to push notifications
 * Requires service worker to be registered and permission to be granted
 */
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notificaties worden niet ondersteund');
    return null;
  }

  try {
    // Get the service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('Reeds geabonneerd op push notificaties');
      return existingSubscription;
    }

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });

    console.log('Geabonneerd op push notificaties');

    // Save subscription to localStorage as placeholder
    await savePushSubscriptionLocally(subscription);

    return subscription;
  } catch (error) {
    console.error('Abonnering op push notificaties mislukt:', error);
    return null;
  }
}

/**
 * Save push subscription to localStorage (placeholder for Supabase push_subscriptions table)
 * In production, this should save to the push_subscriptions table in Supabase
 */
export async function savePushSubscriptionLocally(
  subscription: PushSubscription
): Promise<void> {
  try {
    const subscriptionJson = JSON.stringify(subscription);
    localStorage.setItem('move_push_subscription', subscriptionJson);
    console.log('Push abonnement lokaal opgeslagen');
  } catch (error) {
    console.error('Fout bij opslaan van push abonnement:', error);
  }
}

/**
 * Save push subscription to Supabase (future implementation)
 * Currently a placeholder that uses localStorage
 */
export async function savePushSubscriptionToSupabase(
  userId: string,
  subscription: PushSubscription
): Promise<void> {
  try {
    // TODO: Implement Supabase storage
    // For now, store in localStorage with userId key
    const key = `move_push_subscription_${userId}`;
    const subscriptionJson = JSON.stringify(subscription);
    localStorage.setItem(key, subscriptionJson);
    console.log('Push abonnement voor gebruiker opgeslagen');
  } catch (error) {
    console.error('Fout bij opslaan van push abonnement:', error);
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        localStorage.removeItem('move_push_subscription');
        console.log('Afgemeldt van push notificaties');
      }
    }
  } catch (error) {
    console.error('Fout bij afmelden van push notificaties:', error);
  }
}

/**
 * Get current push subscription
 */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      return await registration.pushManager.getSubscription();
    }
    return null;
  } catch (error) {
    console.error('Fout bij ophalen van push abonnement:', error);
    return null;
  }
}

/**
 * Convert VAPID key from base64 to Uint8Array
 * Required for subscribeToPushNotifications
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
