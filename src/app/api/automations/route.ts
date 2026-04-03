import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

// GET /api/automations — list all rules for the coach
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Niet geauthenticeerd' }, { status: 401 })
    }

    let db
    try { db = createAdminClient() } catch { db = supabase }

    // Get rules with log counts
    const { data: rules, error } = await db
      .from('automation_rules')
      .select('*')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Get log counts per rule
    const ruleIds = (rules || []).map(r => r.id)
    let logCounts: Record<string, number> = {}

    if (ruleIds.length > 0) {
      const { data: logs } = await db
        .from('automation_logs')
        .select('rule_id')
        .in('rule_id', ruleIds)

      if (logs) {
        logCounts = logs.reduce((acc: Record<string, number>, log: any) => {
          acc[log.rule_id] = (acc[log.rule_id] || 0) + 1
          return acc
        }, {})
      }
    }

    const rulesWithCounts = (rules || []).map(rule => ({
      ...rule,
      total_triggers: logCounts[rule.id] || 0,
    }))

    const response = NextResponse.json({ data: rulesWithCounts })
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=120')
    return response
  } catch (error: any) {
    console.error('Error fetching automations:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

// POST /api/automations — create a new rule
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Niet geauthenticeerd' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, trigger_type, trigger_config, action_type, action_config, target, target_config, cooldown_hours } = body

    // Validate required fields
    if (!name || !trigger_type || !action_type) {
      return NextResponse.json({ error: 'Naam, trigger en actie zijn verplicht' }, { status: 400 })
    }

    const validTriggers = ['days_inactive', 'workout_completed', 'checkin_submitted', 'streak_milestone', 'program_week_completed', 'missed_meals', 'weight_change', 'first_workout', 'subscription_anniversary']
    const validActions = ['send_message', 'send_notification', 'send_checkin_request', 'flag_at_risk']

    if (!validTriggers.includes(trigger_type)) {
      return NextResponse.json({ error: 'Ongeldig trigger type' }, { status: 400 })
    }
    if (!validActions.includes(action_type)) {
      return NextResponse.json({ error: 'Ongeldig actie type' }, { status: 400 })
    }

    let db
    try { db = createAdminClient() } catch { db = supabase }

    const { data, error } = await db
      .from('automation_rules')
      .insert({
        coach_id: user.id,
        name,
        description: description || null,
        trigger_type,
        trigger_config: trigger_config || {},
        action_type,
        action_config: action_config || {},
        target: target || 'all_clients',
        target_config: target_config || {},
        cooldown_hours: cooldown_hours || 168,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating automation:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

// PATCH /api/automations — update a rule
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Niet geauthenticeerd' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Rule ID is verplicht' }, { status: 400 })
    }

    let db
    try { db = createAdminClient() } catch { db = supabase }

    // Verify ownership
    const { data: existing } = await db
      .from('automation_rules')
      .select('id')
      .eq('id', id)
      .eq('coach_id', user.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Regel niet gevonden' }, { status: 404 })
    }

    // Only allow safe fields to be updated
    const allowedFields = ['name', 'description', 'is_active', 'trigger_type', 'trigger_config', 'action_type', 'action_config', 'target', 'target_config', 'cooldown_hours']
    const safeUpdates: Record<string, any> = {}
    for (const key of allowedFields) {
      if (key in updates) {
        safeUpdates[key] = updates[key]
      }
    }

    const { data, error } = await db
      .from('automation_rules')
      .update(safeUpdates)
      .eq('id', id)
      .eq('coach_id', user.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Error updating automation:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

// DELETE /api/automations — delete a rule
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Niet geauthenticeerd' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Rule ID is verplicht' }, { status: 400 })
    }

    let db
    try { db = createAdminClient() } catch { db = supabase }

    const { error } = await db
      .from('automation_rules')
      .delete()
      .eq('id', id)
      .eq('coach_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting automation:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
