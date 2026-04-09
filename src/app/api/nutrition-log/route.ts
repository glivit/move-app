import { getAuthFast } from '@/lib/auth-fast'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

// GET: Fetch nutrition logs for a specific date
export async function GET(request: NextRequest) {
  const { user } = await getAuthFast()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
  const clientId = searchParams.get('client_id') || user.id

  // If requesting another client's data, must be coach
  if (clientId !== user.id) {
    const { data: profile } = await db
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role !== 'coach') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // Get meal logs
  const { data: logs } = await db
    .from('nutrition_logs')
    .select('*')
    .eq('client_id', clientId)
    .eq('date', date)
    .order('created_at')

  // Get daily summary
  const { data: summary } = await db
    .from('nutrition_daily_summary')
    .select('*')
    .eq('client_id', clientId)
    .eq('date', date)
    .single()

  const response = NextResponse.json({ logs: logs || [], summary: summary || null })
  response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=120')
  return response
}

// POST: Log or update a meal completion
export async function POST(request: NextRequest) {
  const { user } = await getAuthFast()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()

  const body = await request.json()
  const {
    plan_id,
    date,
    meal_id,
    meal_name,
    completed,
    foods_eaten,
    client_notes,
  } = body

  if (!meal_id || !meal_name || !date) {
    return NextResponse.json({ error: 'meal_id, meal_name en date zijn verplicht' }, { status: 400 })
  }

  // Upsert the meal log
  const { data: log, error: logError } = await db
    .from('nutrition_logs')
    .upsert(
      {
        client_id: user.id,
        plan_id: plan_id || null,
        date,
        meal_id,
        meal_name,
        completed: completed ?? false,
        foods_eaten: foods_eaten || [],
        client_notes: client_notes || null,
        completed_at: completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'client_id,date,meal_id' }
    )
    .select()
    .single()

  if (logError) {
    console.error('Nutrition log error:', logError)
    return NextResponse.json({ error: logError.message }, { status: 500 })
  }

  // Update daily summary — count calories from individually checked foods
  const { data: allLogs } = await db
    .from('nutrition_logs')
    .select('*')
    .eq('client_id', user.id)
    .eq('date', date)

  let totalCal = 0, totalProt = 0, totalCarbs = 0, totalFat = 0
  let mealsCompleted = 0

  for (const l of allLogs || []) {
    if (!Array.isArray(l.foods_eaten)) continue
    const foods = l.foods_eaten
    let mealAllChecked = foods.length > 0

    for (const f of foods) {
      // Count macros for checked individual items
      if (f.checked === true) {
        const g = f.grams || 100
        totalCal += Math.round(((f.per100g?.calories || f.calories || 0) * g) / 100)
        totalProt += Math.round(((f.per100g?.protein || f.protein || 0) * g) / 100)
        totalCarbs += Math.round(((f.per100g?.carbs || f.carbs || 0) * g) / 100)
        totalFat += Math.round(((f.per100g?.fat || f.fat || 0) * g) / 100)
      } else {
        mealAllChecked = false
      }
    }

    // Also support legacy completed meals (all foods counted)
    if (l.completed && !foods.some((f: any) => 'checked' in f)) {
      for (const f of foods) {
        const g = f.grams || 100
        totalCal += Math.round(((f.per100g?.calories || f.calories || 0) * g) / 100)
        totalProt += Math.round(((f.per100g?.protein || f.protein || 0) * g) / 100)
        totalCarbs += Math.round(((f.per100g?.carbs || f.carbs || 0) * g) / 100)
        totalFat += Math.round(((f.per100g?.fat || f.fat || 0) * g) / 100)
      }
      mealAllChecked = true
    }

    if (mealAllChecked) mealsCompleted++
  }

  await db
    .from('nutrition_daily_summary')
    .upsert(
      {
        client_id: user.id,
        date,
        meals_planned: allLogs?.length || 0,
        meals_completed: mealsCompleted,
        total_calories: totalCal,
        total_protein: totalProt,
        total_carbs: totalCarbs,
        total_fat: totalFat,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'client_id,date' }
    )

  return NextResponse.json({ success: true, log })
}

// PATCH: Update daily summary (mood, water, daily note)
export async function PATCH(request: NextRequest) {
  const { user } = await getAuthFast()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()

  const body = await request.json()
  const { date, daily_note, mood, water_liters, coach_seen } = body

  if (!date) {
    return NextResponse.json({ error: 'date is verplicht' }, { status: 400 })
  }

  // Coach can mark as seen
  const updates: any = { updated_at: new Date().toISOString() }
  if (daily_note !== undefined) updates.daily_note = daily_note
  if (mood !== undefined) updates.mood = mood
  if (water_liters !== undefined) updates.water_liters = water_liters
  if (coach_seen !== undefined) {
    updates.coach_seen = coach_seen
    updates.coach_seen_at = new Date().toISOString()
  }

  const { error } = await db
    .from('nutrition_daily_summary')
    .upsert(
      { client_id: body.client_id || user.id, date, ...updates },
      { onConflict: 'client_id,date' }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}