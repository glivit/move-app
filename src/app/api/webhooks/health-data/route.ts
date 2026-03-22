import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

/**
 * POST /api/webhooks/health-data
 * Receives health data from Terra API / Vital webhook
 * Processes and stores in health_metrics table
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (Terra sends X-Tryterra-Signature)
    const signature = request.headers.get('x-tryterra-signature') || request.headers.get('x-webhook-secret')
    const webhookSecret = process.env.TERRA_WEBHOOK_SECRET

    if (webhookSecret && signature !== webhookSecret) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const body = await request.json()
    const supabase = createAdminClient()

    // Terra API webhook format
    const eventType = body.type || body.event
    const userData = body.user || {}
    const externalUserId = userData.user_id || userData.id

    if (!externalUserId) {
      return NextResponse.json({ error: 'No user ID in webhook' }, { status: 400 })
    }

    // Find our client by external user ID
    const { data: integration } = await supabase
      .from('health_integrations')
      .select('client_id, provider')
      .eq('external_user_id', externalUserId)
      .eq('is_active', true)
      .single()

    if (!integration) {
      return NextResponse.json({ error: 'Unknown user' }, { status: 404 })
    }

    const clientId = integration.client_id
    const source = integration.provider

    // Process based on data type
    const dataPayloads = body.data || [body]

    for (const data of Array.isArray(dataPayloads) ? dataPayloads : [dataPayloads]) {
      const date = data.metadata?.start_time?.split('T')[0] ||
                   data.date ||
                   new Date().toISOString().split('T')[0]

      const metrics: Record<string, any> = {}

      // Steps
      if (data.steps !== undefined || data.daily?.steps !== undefined) {
        metrics.steps = data.steps || data.daily?.steps
      }

      // Sleep (minutes)
      if (data.sleep?.duration_seconds !== undefined) {
        metrics.sleep_minutes = Math.round(data.sleep.duration_seconds / 60)
        metrics.sleep_quality = data.sleep?.efficiency || null
      }

      // Heart rate
      if (data.heart_rate?.avg_hr !== undefined || data.avg_heart_rate !== undefined) {
        metrics.resting_heart_rate = data.heart_rate?.resting_hr || data.resting_heart_rate || null
        metrics.avg_heart_rate = data.heart_rate?.avg_hr || data.avg_heart_rate || null
      }

      // Calories
      if (data.calories !== undefined || data.daily?.calories !== undefined) {
        metrics.active_calories = data.calories || data.daily?.calories || null
      }

      // HRV
      if (data.hrv?.avg_hrv !== undefined) {
        metrics.hrv = data.hrv.avg_hrv
      }

      if (Object.keys(metrics).length === 0) continue

      // Upsert health metrics (don't overwrite manual entries)
      for (const [metricType, value] of Object.entries(metrics)) {
        if (value === null || value === undefined) continue

        // Check if manual entry exists for this date
        const { data: existing } = await supabase
          .from('health_metrics')
          .select('id, source')
          .eq('client_id', clientId)
          .eq('metric_type', metricType)
          .eq('date', date)
          .single()

        if (existing && existing.source === 'manual') {
          continue // Don't overwrite manual entries
        }

        if (existing) {
          await supabase
            .from('health_metrics')
            .update({
              value: value,
              source,
              auto_synced: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
        } else {
          await supabase
            .from('health_metrics')
            .insert({
              client_id: clientId,
              metric_type: metricType,
              value: value,
              date,
              source,
              auto_synced: true,
            })
        }
      }
    }

    // Update last_sync_at
    await supabase
      .from('health_integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('client_id', clientId)
      .eq('external_user_id', externalUserId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Health webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
