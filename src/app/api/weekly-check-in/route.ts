import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/weekly-check-in
 * Check if user already submitted this week + get last check-in
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // This week's Monday
    const now = new Date()
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    const weekStart = monday.toISOString().split('T')[0]

    // Check for existing this week
    const { data: thisWeek } = await supabase
      .from('weekly_checkins')
      .select('*')
      .eq('client_id', user.id)
      .gte('date', weekStart)
      .order('date', { ascending: false })
      .limit(1)
      .single()

    // Last check-in (for weight comparison)
    const { data: last } = await supabase
      .from('weekly_checkins')
      .select('weight_kg, date')
      .eq('client_id', user.id)
      .lt('date', weekStart)
      .order('date', { ascending: false })
      .limit(1)
      .single()

    const response = NextResponse.json({
      alreadySubmitted: !!thisWeek,
      thisWeek: thisWeek || null,
      lastWeight: last?.weight_kg || null,
      lastDate: last?.date || null,
    })
    response.headers.set('Cache-Control', 'private, max-age=120, stale-while-revalidate=600')
    return response
  } catch {
    return NextResponse.json({ alreadySubmitted: false, thisWeek: null, lastWeight: null, lastDate: null })
  }
}

/**
 * POST /api/weekly-check-in
 * Submit weekly check-in
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { weight_kg, photo_url, energy_level, sleep_quality, nutrition_adherence, notes } = body

    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('weekly_checkins')
      .upsert({
        client_id: user.id,
        date: today,
        weight_kg: weight_kg ? parseFloat(String(weight_kg).replace(',', '.')) : null,
        photo_url: photo_url || null,
        energy_level: energy_level || null,
        sleep_quality: sleep_quality || null,
        nutrition_adherence: nutrition_adherence || null,
        notes: notes || null,
      }, { onConflict: 'client_id,date' })
      .select()
      .single()

    if (error) {
      console.error('Weekly check-in error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also update health_metrics weight for tracking
    if (weight_kg) {
      await supabase.from('health_metrics').insert({
        client_id: user.id,
        metric_type: 'weight',
        value: parseFloat(String(weight_kg).replace(',', '.')),
        measured_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Weekly check-in error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
