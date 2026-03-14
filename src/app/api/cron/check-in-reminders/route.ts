import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createAdminClient()

    // Get all active clients
    const { data: clients, error: clientError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'client')

    if (clientError) {
      console.error('Error fetching clients:', clientError)
      return NextResponse.json(
        { error: 'Failed to fetch clients' },
        { status: 500 }
      )
    }

    if (!clients || clients.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active clients',
        notificationsCreated: 0,
      })
    }

    // For each client, check if they have an open check-in window
    // Check-in window is typically 1 month from their last check-in
    const notificationsToCreate = []
    const now = new Date()

    for (const client of clients) {
      // Get the last check-in for this client
      const { data: lastCheckin, error: checkinError } = await supabase
        .from('checkins')
        .select('date')
        .eq('client_id', client.id)
        .order('date', { ascending: false })
        .limit(1)
        .single()

      if (checkinError && checkinError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine for new clients
        console.error(`Error fetching last checkin for client ${client.id}:`, checkinError)
        continue
      }

      // Calculate if the client's check-in window is open
      let shouldSendReminder = false
      let windowStart: Date | null = null
      let windowEnd: Date | null = null

      if (!lastCheckin) {
        // New client - window is open immediately
        shouldSendReminder = true
        windowStart = new Date()
        windowEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      } else {
        // Window opens 1 month after last check-in
        const lastCheckInDate = new Date(lastCheckin.date)
        windowStart = new Date(lastCheckInDate)
        windowStart.setMonth(windowStart.getMonth() + 1)

        // Window stays open for 7 days
        windowEnd = new Date(windowStart)
        windowEnd.setDate(windowEnd.getDate() + 7)

        // Check if we're currently in the window
        if (now >= windowStart && now <= windowEnd) {
          shouldSendReminder = true
        }
      }

      if (shouldSendReminder) {
        // Check if we already sent a reminder for this window
        const windowStartStr = windowStart.toISOString().split('T')[0]
        const { data: existingNotification } = await supabase
          .from('notifications')
          .select('id')
          .eq('client_id', client.id)
          .eq('type', 'check_in_reminder')
          .gte('created_at', `${windowStartStr}T00:00:00`)
          .limit(1)
          .single()

        if (!existingNotification) {
          notificationsToCreate.push({
            client_id: client.id,
            type: 'check_in_reminder',
            title: 'Maandelijkse check-in',
            message: `Je maandelijkse check-in is nu open. Neem jezelf op en voer je metingen in.`,
            read: false,
            created_at: new Date().toISOString(),
          })
        }
      }
    }

    // Create notification entries
    if (notificationsToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notificationsToCreate)

      if (insertError) {
        console.error('Error creating notifications:', insertError)
        return NextResponse.json(
          { error: 'Failed to create notifications' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${clients.length} clients`,
      notificationsCreated: notificationsToCreate.length,
      clientsProcessed: clients.length,
    })
  } catch (error) {
    console.error('Unexpected error in check-in-reminders cron:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
