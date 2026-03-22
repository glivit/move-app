import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET /api/automations/logs?rule_id=X&limit=50
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Niet geauthenticeerd' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const ruleId = searchParams.get('rule_id')
    const limit = parseInt(searchParams.get('limit') || '50')

    let db
    try { db = createAdminClient() } catch { db = supabase }

    // Get coach's rule IDs first (for access control)
    const { data: rules } = await db
      .from('automation_rules')
      .select('id')
      .eq('coach_id', user.id)

    const ruleIds = (rules || []).map((r: any) => r.id)
    if (ruleIds.length === 0) {
      return NextResponse.json({ data: [] })
    }

    let query = db
      .from('automation_logs')
      .select(`
        *,
        automation_rules!inner(name, trigger_type, action_type),
        profiles!automation_logs_client_id_fkey(full_name)
      `)
      .in('rule_id', ruleIds)
      .order('triggered_at', { ascending: false })
      .limit(limit)

    if (ruleId) {
      query = query.eq('rule_id', ruleId)
    }

    const { data: logs, error } = await query

    if (error) throw error

    return NextResponse.json({ data: logs || [] })
  } catch (error: any) {
    console.error('Error fetching automation logs:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
