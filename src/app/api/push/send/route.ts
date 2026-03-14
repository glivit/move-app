import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'

// Configure VAPID
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || ''

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(
    'mailto:info@move-knokke.be',
    VAPID_PUBLIC,
    VAPID_PRIVATE
  )
}

// POST: Send push notification to a client (coach only)
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify coach role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'coach') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { client_id, title, message, url = '/client' } = body

  if (!client_id || !title || !message) {
    return NextResponse.json({ error: 'client_id, title, and message required' }, { status: 400 })
  }

  // Get active subscriptions for the client
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', client_id)
    .eq('is_active', true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ error: 'No active subscriptions for this client' }, { status: 404 })
  }

  const payload = JSON.stringify({
    title,
    body: message,
    url,
    tag: `coach-${Date.now()}`,
    icon: '/icon-192x192.png',
  })

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        )
        return { endpoint: sub.endpoint, success: true }
      } catch (err: any) {
        // If subscription expired or invalid, mark as inactive
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase
            .from('push_subscriptions')
            .update({ is_active: false })
            .eq('id', sub.id)
        }
        return { endpoint: sub.endpoint, success: false, error: err.message }
      }
    })
  )

  const sent = results.filter(
    (r) => r.status === 'fulfilled' && (r.value as any).success
  ).length

  return NextResponse.json({
    success: true,
    sent,
    total: subscriptions.length,
  })
}
