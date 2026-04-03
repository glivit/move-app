import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

// GET /api/supplement-plans?client_id=X
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Niet geauthenticeerd' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('client_id') || user.id

    let db
    try { db = createAdminClient() } catch { db = supabase }

    const { data: plan, error } = await db
      .from('supplement_plans')
      .select(`
        *,
        supplement_plan_items(*)
      `)
      .eq('client_id', clientId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    // Get today's logs
    const today = new Date().toISOString().split('T')[0]
    let todayLogs: any[] = []
    if (plan) {
      const { data: logs } = await db
        .from('supplement_daily_logs')
        .select('*')
        .eq('client_id', clientId)
        .eq('date', today)

      todayLogs = logs || []
    }

    // Get compliance stats (last 7 days)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    let compliance = null

    if (plan && plan.supplement_plan_items?.length > 0) {
      const { data: weekLogs } = await db
        .from('supplement_daily_logs')
        .select('taken')
        .eq('client_id', clientId)
        .gte('date', weekAgo.toISOString().split('T')[0])

      if (weekLogs && weekLogs.length > 0) {
        const taken = weekLogs.filter((l: any) => l.taken).length
        compliance = Math.round((taken / weekLogs.length) * 100)
      }
    }

    const response = NextResponse.json({
      data: {
        plan: plan || null,
        todayLogs,
        compliance,
      },
    })
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300')
    return response
  } catch (error: any) {
    console.error('Error fetching supplement plan:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

// POST /api/supplement-plans — create or update plan (coach)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Niet geauthenticeerd' }, { status: 401 })
    }

    const body = await request.json()
    const { client_id, items, notes } = body

    if (!client_id || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'client_id en items zijn verplicht' }, { status: 400 })
    }

    let db
    try { db = createAdminClient() } catch { db = supabase }

    // Deactivate existing plans
    await db
      .from('supplement_plans')
      .update({ is_active: false })
      .eq('client_id', client_id)
      .eq('is_active', true)

    // Create new plan
    const { data: plan, error: planError } = await db
      .from('supplement_plans')
      .insert({
        client_id,
        coach_id: user.id,
        notes: notes || null,
      })
      .select()
      .single()

    if (planError) throw planError

    // Insert items
    const itemsToInsert = items.map((item: any, idx: number) => ({
      plan_id: plan.id,
      name: item.name,
      dosage: item.dosage || null,
      timing: item.timing || 'ochtend',
      notes: item.notes || null,
      sort_order: idx,
    }))

    const { error: itemsError } = await db
      .from('supplement_plan_items')
      .insert(itemsToInsert)

    if (itemsError) throw itemsError

    return NextResponse.json({ data: plan }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating supplement plan:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
