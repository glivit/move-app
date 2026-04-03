import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// GET: Fetch habits + today's completions
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('client_id') || user.id
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

  // Coach access check
  if (clientId !== user.id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role !== 'coach') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // Get active habits
  const { data: habits } = await supabase
    .from('habits')
    .select('*')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .order('sort_order')

  // Get completions for the date
  const { data: completions } = await supabase
    .from('habit_completions')
    .select('*')
    .eq('client_id', clientId)
    .eq('date', date)

  // Get streak data (last 7 days)
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const { data: weekCompletions } = await supabase
    .from('habit_completions')
    .select('habit_id, date, completed')
    .eq('client_id', clientId)
    .gte('date', weekAgo.toISOString().split('T')[0])
    .eq('completed', true)

  // Calculate streaks per habit
  const streaks: Record<string, number> = {}
  if (habits && weekCompletions) {
    for (const habit of habits) {
      let streak = 0
      const today = new Date()
      for (let i = 0; i < 30; i++) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        const found = weekCompletions.find(
          (c: any) => c.habit_id === habit.id && c.date === dateStr
        )
        if (found) streak++
        else break
      }
      streaks[habit.id] = streak
    }
  }

  const response = NextResponse.json({
    habits: habits || [],
    completions: completions || [],
    streaks,
  })
  response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=120')
  return response
}

// POST: Create a habit (coach) or toggle completion (client)
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  // If creating a new habit
  if (body.action === 'create_habit') {
    const { client_id, name, description, icon, color, frequency, target_value, target_unit } = body

    const { data: habit, error } = await supabase
      .from('habits')
      .insert({
        client_id: client_id || user.id,
        name,
        description: description || null,
        icon: icon || '✅',
        color: color || '#1A1917',
        frequency: frequency || 'daily',
        target_value: target_value || null,
        target_unit: target_unit || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ habit })
  }

  // Toggle completion
  const { habit_id, date, completed, value, notes } = body

  if (!habit_id || !date) {
    return NextResponse.json({ error: 'habit_id en date zijn verplicht' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('habit_completions')
    .upsert(
      {
        habit_id,
        client_id: user.id,
        date,
        completed: completed ?? true,
        value: value || null,
        notes: notes || null,
        completed_at: completed ? new Date().toISOString() : null,
      },
      { onConflict: 'habit_id,client_id,date' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ completion: data })
}

// DELETE: Remove a habit (coach only)
export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const habitId = searchParams.get('id')
  if (!habitId) return NextResponse.json({ error: 'id verplicht' }, { status: 400 })

  // Soft delete (deactivate)
  const { error } = await supabase
    .from('habits')
    .update({ is_active: false })
    .eq('id', habitId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
