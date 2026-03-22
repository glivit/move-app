import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET /api/supplement-logs?date=2026-03-22&client_id=X
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Niet geauthenticeerd' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const clientId = searchParams.get('client_id') || user.id

    let db
    try { db = createAdminClient() } catch { db = supabase }

    const { data: logs, error } = await db
      .from('supplement_daily_logs')
      .select('*, supplement_plan_items(name, dosage, timing)')
      .eq('client_id', clientId)
      .eq('date', date)

    if (error) throw error

    return NextResponse.json({ data: logs || [] })
  } catch (error: any) {
    console.error('Error fetching supplement logs:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

// POST /api/supplement-logs — toggle supplement taken
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Niet geauthenticeerd' }, { status: 401 })
    }

    const body = await request.json()
    const { supplement_item_id, supplement_name, date, taken } = body

    if (!supplement_item_id || !supplement_name) {
      return NextResponse.json({ error: 'supplement_item_id en supplement_name zijn verplicht' }, { status: 400 })
    }

    let db
    try { db = createAdminClient() } catch { db = supabase }

    const logDate = date || new Date().toISOString().split('T')[0]

    // Upsert
    const { data, error } = await db
      .from('supplement_daily_logs')
      .upsert({
        client_id: user.id,
        supplement_item_id,
        supplement_name,
        date: logDate,
        taken: taken !== false,
        taken_at: taken !== false ? new Date().toISOString() : null,
      }, {
        onConflict: 'client_id,supplement_item_id,date',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Error logging supplement:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
