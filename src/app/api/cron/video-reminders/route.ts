/**
 * Cron: Video Session Reminders
 * Runs every 15 minutes via Vercel Cron
 * Sends email reminders 24h and 1h before scheduled video sessions
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendNotificationEmail } from '@/lib/email'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const now = new Date()

    // Find sessions in two windows:
    // 1) 24h reminder: sessions 23h45m — 24h15m from now
    // 2) 1h reminder: sessions 45m — 1h15m from now
    const windows = [
      {
        type: '24h' as const,
        from: new Date(now.getTime() + 23 * 60 * 60 * 1000 + 45 * 60 * 1000),
        to: new Date(now.getTime() + 24 * 60 * 60 * 1000 + 15 * 60 * 1000),
        subject: 'Video sessie morgen — MŌVE',
        preheader: 'Je hebt morgen een video sessie met je coach',
        heading: 'Video sessie morgen',
        bodyFn: (time: string, date: string) =>
          `Je hebt morgen een video sessie gepland om <strong>${time}</strong> (${date}). Zorg dat je op tijd klaar bent en een rustige plek hebt.`,
      },
      {
        type: '1h' as const,
        from: new Date(now.getTime() + 45 * 60 * 1000),
        to: new Date(now.getTime() + 75 * 60 * 1000),
        subject: 'Video sessie over 1 uur — MŌVE',
        preheader: 'Je video sessie begint over 1 uur',
        heading: 'Over 1 uur begint je sessie',
        bodyFn: (time: string, date: string) =>
          `Je video sessie met je coach start om <strong>${time}</strong>. Klik hieronder om deel te nemen wanneer het zover is.`,
      },
    ]

    let totalSent = 0
    const errors: string[] = []

    for (const window of windows) {
      // Find upcoming sessions in this time window
      const { data: sessions, error: sessionsError } = await supabase
        .from('video_sessions')
        .select('id, client_id, scheduled_at, duration_minutes, daily_room_url')
        .eq('status', 'scheduled')
        .gte('scheduled_at', window.from.toISOString())
        .lte('scheduled_at', window.to.toISOString())

      if (sessionsError) {
        errors.push(`Query error (${window.type}): ${sessionsError.message}`)
        continue
      }

      if (!sessions || sessions.length === 0) continue

      // Check which ones already received a reminder of this type
      const sessionIds = sessions.map(s => s.id)
      const { data: existingReminders } = await supabase
        .from('video_session_reminders')
        .select('video_session_id')
        .in('video_session_id', sessionIds)
        .eq('reminder_type', window.type)

      const alreadySent = new Set(existingReminders?.map(r => r.video_session_id) || [])

      for (const session of sessions) {
        if (alreadySent.has(session.id)) continue

        // Get client profile and email
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', session.client_id)
          .single()

        if (!profile?.email) continue

        const scheduledDate = new Date(session.scheduled_at)
        const time = scheduledDate.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })
        const date = scheduledDate.toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' })
        const firstName = profile.full_name?.split(' ')[0] || ''

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://movestudio.be'

        try {
          await sendNotificationEmail({
            to: profile.email,
            subject: window.subject,
            preheader: window.preheader,
            heading: `${window.heading}${firstName ? `, ${firstName}` : ''}`,
            body: window.bodyFn(time, date),
            ctaText: 'Naar video sessie',
            ctaUrl: `${appUrl}/client/video/${session.id}`,
          })

          // Log reminder as sent
          await supabase.from('video_session_reminders').insert({
            video_session_id: session.id,
            reminder_type: window.type,
            sent_at: new Date().toISOString(),
            status: 'sent',
          })

          totalSent++
        } catch (emailErr: any) {
          errors.push(`Email failed for ${session.id}: ${emailErr.message}`)

          // Log as failed
          await supabase.from('video_session_reminders').insert({
            video_session_id: session.id,
            reminder_type: window.type,
            sent_at: new Date().toISOString(),
            status: 'failed',
          })
        }
      }
    }

    return NextResponse.json({
      ok: true,
      sent: totalSent,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: now.toISOString(),
    })
  } catch (err: any) {
    console.error('Video reminders cron error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
