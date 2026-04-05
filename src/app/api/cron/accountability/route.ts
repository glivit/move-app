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
 * GET /api/cron/accountability
 * Runs daily at 20:00 (8 PM) via Vercel Cron
 * Checks which clients didn't train or log nutrition today
 * Creates accountability_logs entries and sends push notifications
 *
 * Optimized: batch queries instead of N+1 per-client loops
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
    const todayStr = todayStart.toISOString().split('T')[0]

    // Get all active clients
    const { data: clients } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'client')

    if (!clients || clients.length === 0) {
      return NextResponse.json({ success: true, message: 'No active clients', count: 0 })
    }

    const clientIds = clients.map(c => c.id)

    // Batch fetch ALL data we need in parallel (instead of N+1 per client)
    const [
      existingLogsRes,
      todayWorkoutsRes,
      activeProgramsRes,
      activePlansRes,
      dailySummariesRes,
      pushSubscriptionsRes,
    ] = await Promise.all([
      // 1. Existing accountability logs for today
      supabase
        .from('accountability_logs')
        .select('client_id')
        .in('client_id', clientIds)
        .gte('created_at', todayStart.toISOString())
        .lt('created_at', todayEnd.toISOString()),

      // 2. Completed workouts today
      supabase
        .from('workout_sessions')
        .select('client_id')
        .in('client_id', clientIds)
        .not('completed_at', 'is', null)
        .gte('started_at', todayStart.toISOString())
        .lt('started_at', todayEnd.toISOString()),

      // 3. Active programs
      supabase
        .from('client_programs')
        .select('client_id')
        .in('client_id', clientIds)
        .eq('is_active', true),

      // 4. Active nutrition plans with meals
      supabase
        .from('nutrition_plans')
        .select('client_id, meals')
        .in('client_id', clientIds)
        .eq('is_active', true),

      // 5. Today's nutrition summaries
      supabase
        .from('nutrition_daily_summary')
        .select('client_id, meals_completed, meals_planned')
        .in('client_id', clientIds)
        .eq('date', todayStr),

      // 6. Active push subscriptions
      supabase
        .from('push_subscriptions')
        .select('*')
        .in('user_id', clientIds)
        .eq('is_active', true),
    ])

    // Build lookup sets/maps from batch results
    const clientsWithExistingLog = new Set(
      (existingLogsRes.data || []).map(l => l.client_id)
    )

    const clientsWithWorkoutToday = new Set(
      (todayWorkoutsRes.data || []).map(w => w.client_id)
    )

    const clientsWithProgram = new Set(
      (activeProgramsRes.data || []).map(p => p.client_id)
    )

    // For nutrition plans, take the first active plan per client
    const clientPlanMeals: Record<string, number> = {}
    for (const plan of activePlansRes.data || []) {
      if (!(plan.client_id in clientPlanMeals)) {
        clientPlanMeals[plan.client_id] = Array.isArray(plan.meals) ? plan.meals.length : 0
      }
    }

    const clientMealsCompleted: Record<string, number> = {}
    for (const summary of dailySummariesRes.data || []) {
      clientMealsCompleted[summary.client_id] = summary.meals_completed || 0
    }

    const clientSubscriptions: Record<string, any[]> = {}
    for (const sub of pushSubscriptionsRes.data || []) {
      if (!clientSubscriptions[sub.user_id]) {
        clientSubscriptions[sub.user_id] = []
      }
      clientSubscriptions[sub.user_id].push(sub)
    }

    // Process each client using pre-fetched data (no additional queries)
    let logsCreated = 0
    let pushSent = 0
    const logsToInsert: any[] = []
    const pushTasks: { clientId: string; firstName: string; missing: string[]; mealsCompleted: number; totalPlanMeals: number }[] = []

    for (const client of clients) {
      // Skip if already has a log today
      if (clientsWithExistingLog.has(client.id)) continue

      const didWorkout = clientsWithWorkoutToday.has(client.id)
      const hasProgram = clientsWithProgram.has(client.id)
      const hasPlan = client.id in clientPlanMeals
      const totalPlanMeals = clientPlanMeals[client.id] || 0
      const mealsCompleted = clientMealsCompleted[client.id] || 0

      let didNutrition = false
      if (hasPlan && totalPlanMeals > 0) {
        didNutrition = mealsCompleted >= totalPlanMeals
      } else if (!hasPlan) {
        didNutrition = true
      }

      const missedWorkout = hasProgram && !didWorkout
      const missedNutrition = hasPlan && !didNutrition

      if (!missedWorkout && !missedNutrition) continue

      // Collect log for batch insert
      logsToInsert.push({
        client_id: client.id,
        date: todayStr,
        workout_completed: didWorkout,
        nutrition_logged: didNutrition,
        meals_completed: hasPlan ? mealsCompleted : null,
        meals_total: hasPlan ? totalPlanMeals : null,
        workout_reason: null,
        nutrition_reason: null,
        responded: false,
      })

      // Collect push notification info
      const missing: string[] = []
      if (missedWorkout) missing.push('training')
      if (missedNutrition && mealsCompleted > 0) {
        missing.push(`voeding (${mealsCompleted}/${totalPlanMeals} maaltijden)`)
      } else if (missedNutrition) {
        missing.push('voeding')
      }

      pushTasks.push({
        clientId: client.id,
        firstName: client.full_name?.split(' ')[0] || '',
        missing,
        mealsCompleted,
        totalPlanMeals,
      })
    }

    // Batch insert all accountability logs at once
    if (logsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('accountability_logs')
        .insert(logsToInsert)

      if (insertError) {
        console.error('Error batch inserting accountability logs:', insertError)
      } else {
        logsCreated = logsToInsert.length
      }
    }

    // Send push notifications (fire all in parallel)
    const pushPromises: Promise<void>[] = []
    for (const task of pushTasks) {
      const subs = clientSubscriptions[task.clientId]
      if (!subs || subs.length === 0) continue

      const title = 'Hoe was je dag? 💪'
      const message = `Hey ${task.firstName}, je hebt vandaag nog geen ${task.missing.join(' en ')} afgerond. Laat even weten hoe het ging!`
      const payload = JSON.stringify({
        title,
        body: message,
        url: '/client/accountability',
        tag: `accountability-${todayStr}`,
        icon: '/icon-192x192.png',
      })

      for (const sub of subs) {
        pushPromises.push(
          webpush
            .sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload
            )
            .then(() => { pushSent++ })
            .catch(async (err: any) => {
              if (err.statusCode === 410 || err.statusCode === 404) {
                await supabase
                  .from('push_subscriptions')
                  .update({ is_active: false })
                  .eq('id', sub.id)
              }
            })
        )
      }
    }

    // Wait for all push notifications to complete
    await Promise.allSettled(pushPromises)

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
