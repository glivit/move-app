import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/supplements
 * Get all supplements and today's logs for the current user
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet geauthenticeerd' }, { status: 401 })

    let adminDb
    try { adminDb = createAdminClient() } catch { adminDb = supabase }

    const today = new Date().toISOString().split('T')[0]

    const { data: supplements } = await adminDb
      .from('supplements')
      .select('*')
      .eq('client_id', user.id)
      .eq('is_active', true)
      .order('time_of_day', { ascending: true })

    const { data: todayLogs } = await adminDb
      .from('supplement_logs')
      .select('*')
      .eq('client_id', user.id)
      .eq('date', today)

    return NextResponse.json({
      data: {
        supplements: supplements || [],
        todayLogs: todayLogs || [],
      }
    })
  } catch (error) {
    console.error('Supplements GET error:', error)
    return NextResponse.json({ error: 'Serverfout' }, { status: 500 })
  }
}

/**
 * POST /api/supplements
 * Create a new supplement
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet geauthenticeerd' }, { status: 401 })

    let adminDb
    try { adminDb = createAdminClient() } catch { adminDb = supabase }

    const body = await request.json()

    const { data, error } = await adminDb
      .from('supplements')
      .insert([{
        client_id: user.id,
        name: body.name,
        dosage: body.dosage || null,
        frequency: body.frequency || 'dagelijks',
        time_of_day: body.time_of_day || 'ochtend',
        notes: body.notes || null,
      }])
      .select()
      .single()

    if (error) {
      console.error('Supplement insert error:', error)
      return NextResponse.json({ error: 'Fout bij toevoegen' }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Supplements POST error:', error)
    return NextResponse.json({ error: 'Serverfout' }, { status: 500 })
  }
}

/**
 * PATCH /api/supplements
 * Log a supplement intake or toggle active state
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet geauthenticeerd' }, { status: 401 })

    let adminDb
    try { adminDb = createAdminClient() } catch { adminDb = supabase }

    const body = await request.json()

    // Log intake
    if (body.action === 'log') {
      const today = new Date().toISOString().split('T')[0]

      // Check if already logged today
      const { data: existing } = await adminDb
        .from('supplement_logs')
        .select('id')
        .eq('supplement_id', body.supplement_id)
        .eq('client_id', user.id)
        .eq('date', today)
        .single()

      if (existing) {
        // Remove log (toggle off)
        await adminDb.from('supplement_logs').delete().eq('id', existing.id)
        return NextResponse.json({ data: { logged: false } })
      }

      // Add log
      const { data, error } = await adminDb
        .from('supplement_logs')
        .insert([{
          supplement_id: body.supplement_id,
          client_id: user.id,
          date: today,
        }])
        .select()
        .single()

      if (error) {
        console.error('Supplement log error:', error)
        return NextResponse.json({ error: 'Fout bij loggen' }, { status: 500 })
      }

      return NextResponse.json({ data: { logged: true, log: data } })
    }

    // Deactivate supplement
    if (body.action === 'deactivate') {
      await adminDb
        .from('supplements')
        .update({ is_active: false })
        .eq('id', body.supplement_id)
        .eq('client_id', user.id)

      return NextResponse.json({ data: { deactivated: true } })
    }

    return NextResponse.json({ error: 'Ongeldige actie' }, { status: 400 })
  } catch (error) {
    console.error('Supplements PATCH error:', error)
    return NextResponse.json({ error: 'Serverfout' }, { status: 500 })
  }
}
