import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'
import { sendPushToUser } from '@/lib/push-server'

export const runtime = 'nodejs'
export const maxDuration = 60

interface AutomationRule {
  id: string
  coach_id: string
  name: string
  trigger_type: string
  trigger_config: Record<string, any>
  action_type: string
  action_config: Record<string, any>
  target: string
  target_config: Record<string, any>
  cooldown_hours: number
}

/**
 * GET /api/cron/automations
 * Runs every 15 minutes via Vercel Cron
 * Evaluates all active automation rules and executes matching actions
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
    let totalProcessed = 0
    let totalTriggered = 0

    // Get all active rules
    const { data: rules, error: rulesError } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('is_active', true)

    if (rulesError) throw rulesError
    if (!rules || rules.length === 0) {
      return NextResponse.json({ message: 'Geen actieve regels', processed: 0, triggered: 0 })
    }

    // Get all clients (role = 'client')
    const { data: allClients } = await supabase
      .from('profiles')
      .select('id, full_name, created_at')
      .eq('role', 'client')

    if (!allClients || allClients.length === 0) {
      return NextResponse.json({ message: 'Geen clients', processed: 0, triggered: 0 })
    }

    for (const rule of rules as AutomationRule[]) {
      // Determine target clients
      const targetClients = getTargetClients(rule, allClients)

      // Get recent logs for cooldown check
      const cooldownCutoff = new Date(now.getTime() - rule.cooldown_hours * 60 * 60 * 1000)
      const { data: recentLogs } = await supabase
        .from('automation_logs')
        .select('client_id')
        .eq('rule_id', rule.id)
        .gte('triggered_at', cooldownCutoff.toISOString())

      const cooldownClientIds = new Set((recentLogs || []).map((l: any) => l.client_id))

      // Filter out clients in cooldown
      const eligibleClients = targetClients.filter(c => !cooldownClientIds.has(c.id))

      for (const client of eligibleClients) {
        totalProcessed++

        const shouldTrigger = await evaluateTrigger(supabase, rule, client, now)
        if (!shouldTrigger) continue

        totalTriggered++

        // Execute action
        const result = await executeAction(supabase, rule, client)

        // Log
        await supabase.from('automation_logs').insert({
          rule_id: rule.id,
          client_id: client.id,
          action_taken: `${rule.action_type}: ${rule.name}`,
          success: result.success,
          error_message: result.error || null,
          metadata: { trigger_type: rule.trigger_type, action_type: rule.action_type },
        })
      }
    }

    return NextResponse.json({
      message: 'Automations verwerkt',
      processed: totalProcessed,
      triggered: totalTriggered,
      rules_evaluated: rules.length,
    })
  } catch (error: any) {
    console.error('Automation cron error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function getTargetClients(rule: AutomationRule, allClients: any[]): any[] {
  switch (rule.target) {
    case 'specific_clients': {
      const ids = rule.target_config?.client_ids || []
      return allClients.filter(c => ids.includes(c.id))
    }
    case 'all_clients':
    default:
      return allClients
  }
}

async function evaluateTrigger(
  supabase: any,
  rule: AutomationRule,
  client: any,
  now: Date
): Promise<boolean> {
  const config = rule.trigger_config || {}

  switch (rule.trigger_type) {
    case 'days_inactive': {
      const days = config.days || 3
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

      const { data: sessions } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('client_id', client.id)
        .gte('started_at', cutoff.toISOString())
        .not('completed_at', 'is', null)
        .limit(1)

      return !sessions || sessions.length === 0
    }

    case 'workout_completed': {
      // Check if a workout was completed in the last 15 minutes (cron interval)
      const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000)

      const { data: sessions } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('client_id', client.id)
        .gte('completed_at', fifteenMinAgo.toISOString())
        .limit(1)

      return sessions && sessions.length > 0
    }

    case 'checkin_submitted': {
      const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000)

      const { data: checkins } = await supabase
        .from('checkins')
        .select('id')
        .eq('client_id', client.id)
        .gte('created_at', fifteenMinAgo.toISOString())
        .limit(1)

      return checkins && checkins.length > 0
    }

    case 'streak_milestone': {
      const targetDays = config.streak_days || 7

      // Count consecutive days with completed workouts
      const { data: sessions } = await supabase
        .from('workout_sessions')
        .select('started_at')
        .eq('client_id', client.id)
        .not('completed_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(targetDays + 5)

      if (!sessions || sessions.length < targetDays) return false

      // Check consecutive days
      let streak = 1
      const dates = sessions.map((s: any) => {
        const d = new Date(s.started_at)
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      })
      const uniqueDates = [...new Set(dates)] as string[]

      for (let i = 1; i < uniqueDates.length; i++) {
        const prev = new Date(uniqueDates[i - 1] as string)
        const curr = new Date(uniqueDates[i] as string)
        const diffDays = Math.abs((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays <= 1.5) {
          streak++
        } else {
          break
        }
      }

      return streak >= targetDays
    }

    case 'first_workout': {
      const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000)

      // Check total workouts — if exactly 1 and it was recent
      const { count } = await supabase
        .from('workout_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .not('completed_at', 'is', null)

      if (count !== 1) return false

      const { data: recent } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('client_id', client.id)
        .not('completed_at', 'is', null)
        .gte('completed_at', fifteenMinAgo.toISOString())
        .limit(1)

      return recent && recent.length > 0
    }

    case 'missed_meals': {
      const days = config.days || 3
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

      const { data: logs } = await supabase
        .from('nutrition_logs')
        .select('id')
        .eq('client_id', client.id)
        .gte('date', cutoff.toISOString().split('T')[0])
        .limit(1)

      return !logs || logs.length === 0
    }

    case 'subscription_anniversary': {
      const months = config.months || 1
      const clientCreated = new Date(client.created_at)
      const anniversaryDate = new Date(clientCreated)
      anniversaryDate.setMonth(anniversaryDate.getMonth() + months)

      // Check if anniversary is today
      const today = now.toISOString().split('T')[0]
      const annDate = anniversaryDate.toISOString().split('T')[0]

      return today === annDate
    }

    default:
      return false
  }
}

async function executeAction(
  supabase: any,
  rule: AutomationRule,
  client: any
): Promise<{ success: boolean; error?: string }> {
  const config = rule.action_config || {}
  const clientName = client.full_name || 'Client'

  // Replace variables in message templates
  const replaceVars = (text: string) => {
    return text
      .replace(/{client_name}/g, clientName)
      .replace(/{first_name}/g, clientName.split(' ')[0] || clientName)
  }

  try {
    switch (rule.action_type) {
      case 'send_message': {
        const message = replaceVars(config.message || 'Hey! Hoe gaat het?')

        await supabase.from('messages').insert({
          sender_id: rule.coach_id,
          receiver_id: client.id,
          content: message,
          message_type: 'text',
        })

        // Also send push notification about the message
        try {
          await sendPushToUser(client.id, {
            title: 'Nieuw bericht van je coach',
            body: message.substring(0, 100),
            url: '/client/messages',
            tag: `auto-msg-${rule.id}`,
          })
        } catch { /* push is best-effort */ }

        return { success: true }
      }

      case 'send_notification': {
        const title = replaceVars(config.title || 'MŌVE')
        const body = replaceVars(config.body || 'Je coach heeft een update voor je!')

        try {
          await sendPushToUser(client.id, {
            title,
            body,
            url: config.url || '/client',
            tag: `auto-notif-${rule.id}`,
          })
        } catch { /* push is best-effort */ }

        return { success: true }
      }

      case 'send_checkin_request': {
        // Send a message prompting for check-in
        const message = replaceVars(
          config.message || `Hey {first_name}! Het is even geleden sinds je laatste check-in. Hoe gaat het? Vul even je wekelijkse check-in in zodat ik je beter kan helpen.`
        )

        await supabase.from('messages').insert({
          sender_id: rule.coach_id,
          receiver_id: client.id,
          content: message,
          message_type: 'text',
        })

        try {
          await sendPushToUser(client.id, {
            title: 'Check-in herinnering',
            body: 'Je coach vraagt om een check-in!',
            url: '/client/check-in',
            tag: `auto-checkin-${rule.id}`,
          })
        } catch { /* push is best-effort */ }

        return { success: true }
      }

      case 'flag_at_risk': {
        // Update client profile or create a flag
        // For now, send a notification to the coach
        try {
          await sendPushToUser(rule.coach_id, {
            title: `⚠️ Aandacht: ${clientName}`,
            body: replaceVars(config.message || `{client_name} vereist aandacht — ${rule.name}`),
            url: `/coach/clients`,
            tag: `auto-flag-${rule.id}-${client.id}`,
          })
        } catch { /* push is best-effort */ }

        return { success: true }
      }

      default:
        return { success: false, error: `Onbekend actie type: ${rule.action_type}` }
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
