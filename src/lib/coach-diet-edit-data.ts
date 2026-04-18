import { createAdminClient } from '@/lib/supabase-admin'

/**
 * Data for the v3 Dieet-editor — editing a single nutrition_plan.
 *
 * Returns the plan + client header + macro targets + structured meals so the
 * view can render presets, macro sliders, meal pattern and meal cards.
 */

export interface DietEditMealItem {
  name: string
  description: string
  calories: number
  protein: number
  carbs: number
  fat: number
  grams?: number
  per100g?: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
  image?: string | null
}

export interface DietEditMeal {
  name: string
  time: string
  items: DietEditMealItem[]
}

export interface DietEditData {
  plan: {
    id: string
    title: string
    caloriesTarget: number
    proteinG: number
    carbsG: number
    fatG: number
    guidelines: string
    meals: DietEditMeal[]
  }
  client: {
    id: string
    fullName: string
    weightKg: number | null
  }
  maintenanceKcal: number
  subtitle: string
}

interface PlanRow {
  id: string
  client_id: string
  title: string
  calories_target: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  meals: unknown
  guidelines: string | null
}

interface ProfileRow {
  id: string
  full_name: string
}

interface CheckinRow {
  weight_kg: number | null
}

interface RawMealItem {
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

interface RawFoodLegacy {
  name?: string
  brand?: string | null
  image?: string | null
  grams?: number
  per100g?: {
    calories?: number
    protein?: number
    carbs?: number
    fat?: number
  }
}

interface RawMeal {
  name?: string
  time?: string
  items?: RawMealItem[]
  foods?: RawFoodLegacy[]
}

// ─── Helpers ────────────────────────────────────────────────────

function normalizeItem(raw: RawMealItem): DietEditMealItem {
  return {
    name: raw.name || '',
    description: raw.description || `${raw.grams || 100}g`,
    calories: Math.round(raw.calories || 0),
    protein: Math.round(raw.protein || 0),
    carbs: Math.round(raw.carbs || 0),
    fat: Math.round(raw.fat || 0),
    grams: raw.grams,
    per100g: raw.per100g
      ? {
          calories: raw.per100g.calories || 0,
          protein: raw.per100g.protein || 0,
          carbs: raw.per100g.carbs || 0,
          fat: raw.per100g.fat || 0,
        }
      : undefined,
    image: raw.image ?? null,
  }
}

function fromLegacyFood(f: RawFoodLegacy): DietEditMealItem {
  const grams = f.grams || 100
  const per = f.per100g || { calories: 0, protein: 0, carbs: 0, fat: 0 }
  return {
    name: f.name || '',
    description: f.brand ? `${f.brand} — ${grams}g` : `${grams}g`,
    calories: Math.round(((per.calories || 0) * grams) / 100),
    protein: Math.round(((per.protein || 0) * grams) / 100),
    carbs: Math.round(((per.carbs || 0) * grams) / 100),
    fat: Math.round(((per.fat || 0) * grams) / 100),
    grams,
    per100g: {
      calories: per.calories || 0,
      protein: per.protein || 0,
      carbs: per.carbs || 0,
      fat: per.fat || 0,
    },
    image: f.image ?? null,
  }
}

function parseMeals(raw: unknown): DietEditMeal[] {
  if (!Array.isArray(raw)) return []
  return (raw as RawMeal[]).map((m) => {
    const items: DietEditMealItem[] =
      m.items && m.items.length > 0
        ? m.items.map(normalizeItem)
        : (m.foods || []).map(fromLegacyFood)
    return {
      name: m.name || '',
      time: m.time || '12:00',
      items,
    }
  })
}

function buildSubtitle(clientName: string, title: string): string {
  const cleanTitle = title.replace(/\s*—\s*Template\s*$/i, '').trim()
  if (cleanTitle) return `${clientName} · ${cleanTitle}`
  return clientName
}

// ─── Main fetcher ───────────────────────────────────────────────

export async function fetchCoachDietEdit(planId: string): Promise<DietEditData | null> {
  const admin = createAdminClient()

  const { data: planData } = await admin
    .from('nutrition_plans')
    .select('id, client_id, title, calories_target, protein_g, carbs_g, fat_g, meals, guidelines')
    .eq('id', planId)
    .single()

  const plan = planData as PlanRow | null
  if (!plan) return null

  const [{ data: profileData }, { data: checkinData }] = await Promise.all([
    admin.from('profiles').select('id, full_name').eq('id', plan.client_id).single(),
    admin
      .from('checkins')
      .select('weight_kg')
      .eq('client_id', plan.client_id)
      .not('weight_kg', 'is', null)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const profile = (profileData || null) as ProfileRow | null
  const checkin = (checkinData || null) as CheckinRow | null

  const clientName = profile?.full_name || 'Klant'
  const weightKg = checkin?.weight_kg ?? null
  const maintenanceKcal = weightKg ? Math.round(weightKg * 33) : 2100

  return {
    plan: {
      id: plan.id,
      title: plan.title || '',
      caloriesTarget: plan.calories_target ?? 2100,
      proteinG: plan.protein_g ?? 160,
      carbsG: plan.carbs_g ?? 220,
      fatG: plan.fat_g ?? 70,
      guidelines: plan.guidelines || '',
      meals: parseMeals(plan.meals),
    },
    client: {
      id: plan.client_id,
      fullName: clientName,
      weightKg,
    },
    maintenanceKcal,
    subtitle: buildSubtitle(clientName, plan.title || ''),
  }
}
