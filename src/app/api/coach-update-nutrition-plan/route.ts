import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/coach-update-nutrition-plan
 * Coach-only endpoint: updates a nutrition_plans row — macro targets,
 * meals JSON blob, and guidelines.
 */

interface IncomingMealItem {
  name?: string
  description?: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  grams?: number
  per100g?: {
    calories?: number
    protein?: number
    carbs?: number
    fat?: number
  }
  image?: string | null
}

interface IncomingMeal {
  name?: string
  time?: string
  items?: IncomingMealItem[]
}

export async function POST(request: NextRequest) {
  try {
    const admin = createAdminClient()

    // Auth — accept Bearer token or cookie session
    let userId: string | null = null
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const {
        data: { user },
      } = await admin.auth.getUser(token)
      if (user) userId = user.id
    }
    if (!userId) {
      try {
        const { createServerSupabaseClient } = await import('@/lib/supabase-server')
        const supabase = await createServerSupabaseClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) userId = user.id
      } catch {
        /* ignore */
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    if (!profile || profile.role !== 'coach') {
      return NextResponse.json({ error: 'Coach role required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      planId,
      title,
      caloriesTarget,
      proteinG,
      carbsG,
      fatG,
      guidelines,
      meals,
    }: {
      planId: string
      title?: string
      caloriesTarget: number
      proteinG: number
      carbsG: number
      fatG: number
      guidelines?: string | null
      meals: IncomingMeal[]
    } = body

    if (!planId || !Array.isArray(meals)) {
      return NextResponse.json({ error: 'Missing planId or meals' }, { status: 400 })
    }

    // Verify plan exists
    const { data: plan } = await admin
      .from('nutrition_plans')
      .select('id, title')
      .eq('id', planId)
      .single()

    if (!plan) {
      return NextResponse.json({ error: 'Nutrition plan not found' }, { status: 404 })
    }

    // Normalize meals: keep both `items` (new shape) and `foods` (legacy
    // compatibility for v1 client views that still read foods[]).
    const normalizedMeals = meals.map((m, mIdx) => {
      const items = (m.items || []).filter((it) => (it.name || '').trim())
      return {
        id: `meal-${mIdx}-${(m.name || '').toLowerCase().replace(/\s+/g, '-')}`,
        name: m.name || '',
        time: m.time || '12:00',
        items: items.map((it) => ({
          name: it.name || '',
          description: it.description || `${it.grams || 100}g`,
          calories: Math.round(it.calories || 0),
          protein: Math.round(it.protein || 0),
          carbs: Math.round(it.carbs || 0),
          fat: Math.round(it.fat || 0),
          grams: it.grams || 100,
          per100g: it.per100g || {
            calories: it.calories || 0,
            protein: it.protein || 0,
            carbs: it.carbs || 0,
            fat: it.fat || 0,
          },
          image: it.image ?? null,
        })),
        foods: items.map((it, fIdx) => ({
          id: `food-${mIdx}-${fIdx}`,
          name: it.name || '',
          brand: null,
          image: it.image ?? null,
          grams: it.grams || 100,
          per100g: it.per100g || {
            calories: it.calories || 0,
            protein: it.protein || 0,
            carbs: it.carbs || 0,
            fat: it.fat || 0,
          },
        })),
      }
    })

    const patch: Record<string, unknown> = {
      calories_target: Math.max(0, Math.round(caloriesTarget || 0)),
      protein_g: Math.max(0, Math.round(proteinG || 0)),
      carbs_g: Math.max(0, Math.round(carbsG || 0)),
      fat_g: Math.max(0, Math.round(fatG || 0)),
      meals: normalizedMeals,
      guidelines: (guidelines ?? '').trim() || null,
    }
    if (typeof title === 'string' && title.trim()) {
      patch.title = title.trim()
    }

    const { error: updateError } = await admin
      .from('nutrition_plans')
      .update(patch)
      .eq('id', planId)

    if (updateError) {
      console.error('[coach-update-nutrition-plan] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to save plan' }, { status: 500 })
    }

    return NextResponse.json({ success: true, mealsCount: normalizedMeals.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('[coach-update-nutrition-plan] Error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
