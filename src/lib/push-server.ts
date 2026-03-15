/**
 * Server-side push notification utilities for MŌVE
 * Used by API routes and cron jobs to send Web Push notifications
 */
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase-admin'

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || ''

let vapidConfigured = false

function ensureVapid() {
  if (vapidConfigured || !VAPID_PUBLIC || !VAPID_PRIVATE) return
  webpush.setVapidDetails('mailto:info@move-knokke.be', VAPID_PUBLIC, VAPID_PRIVATE)
  vapidConfigured = true
}

/**
 * Send push notification to a specific user (all their active devices)
 */
export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string; tag?: string }
): Promise<{ sent: number; total: number }> {
  ensureVapid()
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return { sent: 0, total: 0 }
  }

  const supabase = createAdminClient()

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (!subscriptions || subscriptions.length === 0) {
    return { sent: 0, total: 0 }
  }

  const pushPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/client',
    tag: payload.tag || `move-${Date.now()}`,
    icon: '/icon-192x192.png',
  })

  let sent = 0

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          pushPayload
        )
        sent++
      } catch (err: any) {
        // Expired or invalid subscription — deactivate
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase
            .from('push_subscriptions')
            .update({ is_active: false })
            .eq('id', sub.id)
        }
      }
    })
  )

  return { sent, total: subscriptions.length }
}

/**
 * Send push notification to multiple users
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: { title: string; body: string; url?: string; tag?: string }
): Promise<{ sent: number; total: number }> {
  const results = await Promise.all(
    userIds.map((id) => sendPushToUser(id, payload))
  )
  return {
    sent: results.reduce((sum, r) => sum + r.sent, 0),
    total: results.reduce((sum, r) => sum + r.total, 0),
  }
}
