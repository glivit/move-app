import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'

export const runtime = 'nodejs'

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || ''

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails('mailto:info@movestudio.be', VAPID_PUBLIC, VAPID_PRIVATE)
}

/**
 * GET /api/cron/meeting-reminders
 * Runs every 15 minutes via Vercel Cron
 * Sends push notifications 1 hour and 15 minutes before scheduled video calls
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const now = new Date()
    let pushSent = 0

    // Find sessions starting in ~1 hour (55-65 min from now)
    const oneHourFrom = new Date(now.getTime() + 55 * 60 * 1000)
    const oneHourTo = new Date(now.getTime() + 65 * 60 * 1000)

    // Find sessions starting in ~15 min (10-20 min from now)
    const fifteenMinFrom = new Date(now.getTime() + 10 * 60 * 1000)
    const fifteenMinTo = new Date(now.getTime() + 20 * 60 * 1000)

    // Get upcoming sessions in both windows
    const { data: sessions } = await supabase
      .from('video_sessions')
      .select('id, scheduled_at, duration_minutes, client_id, coach_id, profiles!video_sessions_client_id_fkey(full_name)')
      .eq('status', 'scheduled')
      .is('cancelled_at', null)
      .or(
        `and(scheduled_at.gte.${oneHourFrom.toISOString()},scheduled_at.lt.${oneHourTo.toISOString()}),` +
        `and(scheduled_at.gte.${fifteenMinFrom.toISOString()},scheduled_at.lt.${fifteenMinTo.toISOString()})`
      )

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ success: true, message: 'No upcoming sessions', pushSent: 0 })
    }

    for (const session of sessions) {
      const scheduledAt = new Date(session.scheduled_at)
      const minutesUntil = Math.round((scheduledAt.getTime() - now.getTime()) / 60000)
      const isOneHour = minutesUntil > 40
      const timeLabel = isOneHour ? 'over 1 uur' : 'over 15 minuten'
      const reminderTag = isOneHour ? '1h' : '15m'

      const timeStr = scheduledAt.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })
      const clientName = (session.profiles as any)?.full_name || 'Cliënt'

      // Notify both client and coach
      const usersToNotify = [
        {
          userId: session.client_id,
          title: `Video call ${timeLabel}`,
          body: `Je hebt ${timeLabel} een coaching sessie om ${timeStr}. Zorg dat je klaar bent!`,
        },
        {
          userId: session.coach_id,
          title: `Video call ${timeLabel}`,
          body: `Sessie met ${clientName} om ${timeStr} (${session.duration_minutes} min)`,
        },
      ]

      for (const notify of usersToNotify) {
        // Check if we already sent this specific reminder
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('client_id', notify.userId)
          .eq('type', `meeting_reminder_${reminderTag}`)
          .gte('created_at', new Date(now.getTime() - 30 * 60 * 1000).toISOString())
          .limit(1)

        if (existing && existing.length > 0) continue

        // Create notification record
        await supabase.from('notifications').insert({
          client_id: notify.userId,
          type: `meeting_reminder_${reminderTag}`,
          title: notify.title,
          message: notify.body,
          read: false,
        })

        // Send push notification
        const { data: subscriptions } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', notify.userId)
          .eq('is_active', true)

        if (subscriptions && subscriptions.length > 0) {
          const payload = JSON.stringify({
            title: notify.title,
            body: notify.body,
            url: notify.userId === session.client_id ? '/client/video' : `/coach/video/${session.id}`,
            tag: `meeting-${session.id}-${reminderTag}`,
            icon: '/icon-192x192.png',
          })

          for (const sub of subscriptions) {
            try {
              await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                payload
              )
              pushSent++
            } catch (err: any) {
              if (err.statusCode === 410 || err.statusCode === 404) {
                await supabase
                  .from('push_subscriptions')
                  .update({ is_active: false })
                  .eq('id', sub.id)
              }
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      sessionsFound: sessions.length,
      pushSent,
    })
  } catch (error) {
    console.error('Meeting reminders cron error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
