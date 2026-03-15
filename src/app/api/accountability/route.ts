import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/accountability
 * Get today's accountability log for the authenticated client
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let adminDb
    try { adminDb = createAdminClient() } catch { adminDb = supabase }

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    const { data: log } = await adminDb
      .from('accountability_logs')
      .select('*')
      .eq('client_id', user.id)
      .eq('date', todayStr)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({ success: true, data: log || null })
  } catch (error) {
    console.error('Error fetching accountability:', error)
    return NextResponse.json({ success: true, data: null })
  }
}

/**
 * POST /api/accountability
 * Client responds to accountability prompt
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let adminDb
    try { adminDb = createAdminClient() } catch { adminDb = supabase }

    const body = await request.json()
    const { log_id, workout_reason, nutrition_reason } = body

    if (!log_id) {
      return NextResponse.json({ error: 'log_id is vereist' }, { status: 400 })
    }

    // Verify the log belongs to this user
    const { data: log } = await adminDb
      .from('accountability_logs')
      .select('id, client_id, workout_completed, nutrition_logged')
      .eq('id', log_id)
      .eq('client_id', user.id)
      .single()

    if (!log) {
      return NextResponse.json({ error: 'Log niet gevonden' }, { status: 404 })
    }

    // Validate: if workout was missed, reason is required
    if (!log.workout_completed && (!workout_reason || !workout_reason.trim())) {
      return NextResponse.json({ error: 'Geef een reden op voor je gemiste training' }, { status: 400 })
    }

    // Validate: if nutrition was missed, reason is required
    if (!log.nutrition_logged && (!nutrition_reason || !nutrition_reason.trim())) {
      return NextResponse.json({ error: 'Geef een reden op voor je gemiste voeding' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {
      responded: true,
      responded_at: new Date().toISOString(),
    }

    if (!log.workout_completed && workout_reason) {
      updateData.workout_reason = workout_reason.trim()
    }
    if (!log.nutrition_logged && nutrition_reason) {
      updateData.nutrition_reason = nutrition_reason.trim()
    }

    const { data: updated, error } = await adminDb
      .from('accountability_logs')
      .update(updateData)
      .eq('id', log_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating accountability log:', error)
      return NextResponse.json({ error: 'Fout bij opslaan' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error responding to accountability:', error)
    return NextResponse.json({ error: 'Serverfout' }, { status: 500 })
  }
}
