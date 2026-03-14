import { createServerSupabaseClient } from '@/lib/supabase-server'
import { mealPlanSchema } from '@/lib/validation'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/meal-plans?client_id=xxx
 * List all meal plans for a client
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user is coach
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'coach') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const clientId = request.nextUrl.searchParams.get('client_id')
    if (!clientId) {
      return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
    }

    const { data: mealPlans, error } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(mealPlans)
  } catch (err) {
    console.error('Error fetching meal plans:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch meal plans' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/meal-plans
 * Create a new meal plan
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user is coach
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'coach') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    // Validate request body with zod
    const validation = mealPlanSchema.safeParse(body)
    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors
      return NextResponse.json(
        {
          error: 'Validatiefout',
          fields: errors,
        },
        { status: 400 }
      )
    }

    const { client_id, title, description, content, pdf_url, valid_from, valid_until } = validation.data

    // Create meal plan
    const { data, error } = await supabase
      .from('meal_plans')
      .insert({
        client_id,
        title,
        description: description || null,
        content: content || null,
        pdf_url: pdf_url || null,
        is_active: false,
        valid_from: valid_from || null,
        valid_until: valid_until || null,
      })
      .select()

    if (error) throw error

    // If this is the first plan, activate it automatically
    if (data && data.length > 0) {
      const { data: existingPlans } = await supabase
        .from('meal_plans')
        .select('id, is_active')
        .eq('client_id', client_id)

      const hasActivePlan = existingPlans?.some((p) => p.is_active)
      if (!hasActivePlan) {
        await supabase.from('meal_plans').update({ is_active: true }).eq('id', data[0].id)
      }
    }

    return NextResponse.json(data[0], { status: 201 })
  } catch (err) {
    console.error('Error creating meal plan:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create meal plan' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/meal-plans
 * Update meal plan (activate/deactivate)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user is coach
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'coach') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { id, is_active, ...updates } = body

    // Basic validation for id
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID is vereist' }, { status: 400 })
    }

    // Validate partial meal plan data with zod
    const validation = mealPlanSchema.partial().safeParse({ ...updates, is_active })
    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors
      return NextResponse.json(
        {
          error: 'Validatiefout',
          fields: errors,
        },
        { status: 400 }
      )
    }

    // Get the meal plan to find the client_id
    const { data: mealPlan } = await supabase
      .from('meal_plans')
      .select('client_id')
      .eq('id', id)
      .single()

    if (!mealPlan) {
      return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 })
    }

    // If activating, deactivate all other plans for this client
    if (is_active === true) {
      await supabase
        .from('meal_plans')
        .update({ is_active: false })
        .eq('client_id', mealPlan.client_id)
        .neq('id', id)
    }

    // Update the meal plan
    const { data, error } = await supabase
      .from('meal_plans')
      .update({
        ...updates,
        is_active: is_active !== undefined ? is_active : undefined,
      })
      .eq('id', id)
      .select()

    if (error) throw error

    return NextResponse.json(data[0])
  } catch (err) {
    console.error('Error updating meal plan:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update meal plan' },
      { status: 500 }
    )
  }
}
