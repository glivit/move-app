/**
 * Cron: Video Session Reminders
 * Runs daily at 07:00 via Vercel Cron (Hobby plan = max 1/day)
 * Sends email reminders for:
 *   - Sessions scheduled TODAY  → "vandaag" reminder
 *   - Sessions scheduled TOMORROW → "morgen" reminder
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

    // Calculate today and tomorrow boundaries in UTC
    // We use a wide window: from now until end of tomorrow
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    const tomorrowEnd = new Date(todayStart)
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 2) // end of tomorrow

    // Find all scheduled sessions from now through end of tomorrow
    const { data: sessions, error: sessionsError } = await supabase
      .from('video_sessions')
      .select('id, client_id, scheduled_at, duration_minutes, daily_room_url')
      .eq('status', 'scheduled')
      .gte('scheduled_at', now.toISOString())
      .lt('scheduled_at', tomorrowEnd.toISOString())

    if (sessionsError) {
      return NextResponse.json({ error: sessionsError.message }, { status: 500 })
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, message: 'No upcoming sessions' })
    }

    // Check which reminders were already sent
    const sessionIds = sessions.map(s => s.id)
    const { data: existingReminders } = await supabase
      .from('video_session_reminders')
      .select('video_session_id, reminder_type')
      .in('video_session_id', sessionIds)

    const sentSet = new Set(
      (existingReminders || []).map(r => `${r.video_session_id}:${r.reminder_type}`)
    )

    let totalSent = 0
    const errors: string[] = []
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://movestudio.be'

    for (const session of sessions) {
      const scheduledDate = new Date(session.scheduled_at)
      const isToday = scheduledDate.toDateString() === now.toDateString()

      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const isTomorrow = scheduledDate.toDateString() === tomorrow.toDateString()

      // Determine reminder type
      let reminderType: string
      let subject: string
      let preheader: string
      let heading: string
      let bodyText: (time: string, date: string) => string

      if (isToday) {
        reminderType = 'today'
        subject = 'Videocall vandaag — MŌVE'
        preheader = 'Je hebt vandaag een videocall met je coach'
        heading = 'Vandaag: videocall'
        bodyText = (time, date) =>
          `Je hebt vandaag een videocall om <strong>${time}</strong>. Zorg dat je op tijd klaar bent en een rustige plek hebt.`
      } else if (isTomorrow) {
        reminderType = 'tomorrow'
        subject = 'Videocall morgen — MŌVE'
        preheader = 'Je hebt morgen een videocall met je coach'
        heading = 'Morgen: videocall'
        bodyText = (time, date) =>
          `Je hebt morgen (${date}) een videocall om <strong>${time}</strong>. Zorg dat je op tijd klaar bent en een rustige plek hebt.`
      } else {
        continue
      }

      // Skip if already sent
      if (sentSet.has(`${session.id}:${reminderType}`)) continue

      // Get client profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', session.client_id)
        .single()

      if (!profile?.email) continue

      const time = scheduledDate.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })
      const date = scheduledDate.toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' })
      const firstName = profile.full_name?.split(' ')[0] || ''

      try {
        await sendNotificationEmail({
          to: profile.email,
          subject,
          preheader,
          heading: `${heading}${firstName ? `, ${firstName}` : ''}`,
          body: bodyText(time, date),
          ctaText: 'Naar videocall',
          ctaUrl: `${appUrl}/client/video/${session.id}`,
        })

        await supabase.from('video_session_reminders').insert({
          video_session_id: session.id,
          reminder_type: reminderType,
          sent_at: new Date().toISOString(),
          status: 'sent',
        })

        totalSent++
      } catch (emailErr: any) {
        errors.push(`Email failed for ${session.id}: ${emailErr.message}`)

        await supabase.from('video_session_reminders').insert({
          video_session_id: session.id,
          reminder_type: reminderType,
          sent_at: new Date().toISOString(),
          status: 'failed',
        })
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
