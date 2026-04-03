import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// GET: Fetch health metrics for a client
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('client_id') || user.id
  const days = parseInt(searchParams.get('days') || '30')

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)

  const { data, error } = await supabase
    .from('health_metrics')
    .select('*')
    .eq('client_id', clientId)
    .gte('date', cutoff.toISOString().split('T')[0])
    .order('date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const response = NextResponse.json(data)
  response.headers.set('Cache-Control', 'private, max-age=120, stale-while-revalidate=600')
  return response
}

// POST: Upsert health metrics for today (or specified date)
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { date, ...metrics } = body

  const targetDate = date || new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('health_metrics')
    .upsert({
      client_id: user.id,
      date: targetDate,
      ...metrics,
    }, { onConflict: 'client_id,date' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
