import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'

export const runtime = 'nodejs'

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || ''

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails('mailto:info@move-knokke.be', VAPID_PUBLIC, VAPID_PRIVATE)
}

/**
 * GET /api/cron/accountability
 * Runs daily at 20:00 (8 PM) via Vercel Cron
 * Checks which clients didn't train or log nutrition today
 * Creates accountability_logs entries and sends push notifications
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Get today's date range
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart)
    todayEnd.setDate(todayEnd.getDate() + 1)

    // Get all active clients with active programs
    const { data: clients } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'client')

    if (!clients || clients.length === 0) {
      return NextResponse.json({ success: true, message: 'No active clients', count: 0 })
    }

    let logsCreated = 0
    let pushSent = 0

    for (const client of clients) {
      // Check if client already has an accountability log for today
      const { data: existingLog } = await supabase
        .from('accountability_logs')
        .select('id')
        .eq('client_id', client.id)
        .gte('created_at', todayStart.toISOString())
        .lt('created_at', todayEnd.toISOString())
        .limit(1)

      if (existingLog && existingLog.length > 0) continue

      // Check if client completed a workout today
      const { count: workoutCount } = await supabase
        .from('workout_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .not('completed_at', 'is', null)
        .gte('started_at', todayStart.toISOString())
        .lt('started_at', todayEnd.toISOString())

      const didWorkout = (workoutCount || 0) > 0

      // Check if client has an active program (to know if they should train today)
      const { data: activeProgram } = await supabase
        .from('client_programs')
        .select('id')
        .eq('client_id', client.id)
        .eq('is_active', true)
        .limit(1)

      const hasProgram = activeProgram && activeProgram.length > 0

      // Check if client logged nutrition today
      const { count: nutritionCount } = await supabase
        .from('nutrition_logs')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .gte('created_at', todayStart.toISOString())
        .lt('created_at', todayEnd.toISOString())

      const didNutrition = (nutritionCount || 0) > 0

      // Check if client has an active nutrition plan
      const { data: activePlan } = await supabase
        .from('nutrition_plans')
        .select('id')
        .eq('client_id', client.id)
        .eq('is_active', true)
        .limit(1)

      const hasPlan = activePlan && activePlan.length > 0

      // Only prompt if they have something assigned but didn't do it
      const missedWorkout = hasProgram && !didWorkout
      const missedNutrition = hasPlan && !didNutrition

      if (!missedWorkout && !missedNutrition) continue

      // Create accountability log
      const { error: insertError } = await supabase
        .from('accountability_logs')
        .insert({
          client_id: client.id,
          date: todayStart.toISOString().split('T')[0],
          workout_completed: didWorkout,
          nutrition_logged: didNutrition,
          workout_reason: null,
          nutrition_reason: null,
          responded: false,
        })

      if (insertError) {
        console.error(`Error creating log for ${client.id}:`, insertError)
        continue
      }
      logsCreated++

      // Build notification message
      const missing = []
      if (missedWorkout) missing.push('training')
      if (missedNutrition) missing.push('voeding')

      const title = 'Hoe was je dag? 💪'
      const message = `Hey ${client.full_name?.split(' ')[0] || ''}, je hebt vandaag nog geen ${missing.join(' en ')} gelogd. Laat even weten hoe het ging!`

      // Send push notification
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', client.id)
        .eq('is_active', true)

      if (subscriptions && subscriptions.length > 0) {
        const payload = JSON.stringify({
          title,
          body: message,
          url: '/client/accountability',
          tag: `accountability-${todayStart.toISOString().split('T')[0]}`,
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

    return NextResponse.json({
      success: true,
      logsCreated,
      pushSent,
      clientsChecked: clients.length,
    })
  } catch (error) {
    console.error('Accountability cron error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
