/**
 * One-off seed: voegt Cedric's "betere versie" dieet toe als coach-template
 * in de nutrition_plans tabel.
 *
 * Usage:
 *   npx tsx scripts/seed-cedric-diet-template.ts
 *
 * De template komt beschikbaar onder /coach/nutrition (tab: Mijn templates).
 * Coach kan daar op "Toewijzen" klikken om het aan Cedric te koppelen.
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const COACH_EMAIL = 'glenndelille@gmail.com'
const TEMPLATE_TITLE = 'Cedric · betere versie — Template'

// ─── Meals — exact cijfers uit het dieet ────────────────────────
// Per-item velden: grams + per100g macros. De app rekent absolute kcal/
// protein als (per100g * grams / 100).
type FoodEntry = {
  id: string
  name: string
  brand: string | null
  image: string | null
  grams: number
  per100g: { calories: number; protein: number; carbs: number; fat: number }
}

type Meal = {
  id: string
  name: string
  time: string
  items: Array<{
    name: string
    description: string
    calories: number
    protein: number
    carbs: number
    fat: number
    grams: number
    per100g: { calories: number; protein: number; carbs: number; fat: number }
  }>
  foods: FoodEntry[]
}

// Helper: bouw meal met items + foods array (beide schema's verwacht)
function mkMeal(
  id: string,
  name: string,
  time: string,
  raw: Array<{
    name: string
    grams: number
    per100g: { calories: number; protein: number; carbs: number; fat: number }
  }>
): Meal {
  const items = raw.map((r) => {
    const factor = r.grams / 100
    return {
      name: r.name,
      description: '',
      calories: Math.round(r.per100g.calories * factor),
      protein: Math.round(r.per100g.protein * factor * 10) / 10,
      carbs: Math.round(r.per100g.carbs * factor * 10) / 10,
      fat: Math.round(r.per100g.fat * factor * 10) / 10,
      grams: r.grams,
      per100g: r.per100g,
    }
  })
  const foods: FoodEntry[] = raw.map((r, idx) => ({
    id: `food-${id}-${idx}`,
    name: r.name,
    brand: null,
    image: null,
    grams: r.grams,
    per100g: r.per100g,
  }))
  return { id, name, time, items, foods }
}

const meals: Meal[] = [
  mkMeal('meal-0-eerste-maaltijd', 'Eerste maaltijd', '07:30', [
    // Volle yoghurt 250g → 155 kcal / 9g proteïne
    {
      name: 'Volle yoghurt',
      grams: 250,
      per100g: { calories: 62, protein: 3.6, carbs: 4, fat: 3.5 },
    },
    // Skyr / high-protein yoghurt 200g → 120 kcal / 22g proteïne
    {
      name: 'Skyr / high-protein yoghurt',
      grams: 200,
      per100g: { calories: 60, protein: 11, carbs: 4, fat: 0.2 },
    },
    // Rozijnen 15g → 45 kcal
    {
      name: 'Rozijnen',
      grams: 15,
      per100g: { calories: 300, protein: 0, carbs: 79, fat: 0.5 },
    },
  ]),

  mkMeal('meal-1-tussendoor', 'Tussendoor', '10:30', [
    // Protein pudding (1 potje) → 150 kcal / 20g proteïne
    {
      name: 'Protein pudding (1 potje)',
      grams: 200,
      per100g: { calories: 75, protein: 10, carbs: 6, fat: 1.5 },
    },
  ]),

  mkMeal('meal-2-middag', 'Middag', '12:30', [
    // Foodmaker maaltijd → 600 kcal / 40g proteïne
    {
      name: 'Foodmaker maaltijd',
      grams: 500,
      per100g: { calories: 120, protein: 8, carbs: 11, fat: 4 },
    },
  ]),

  mkMeal('meal-3-na-middag', 'Na middag', '16:00', [
    // Whey shake met water (1 scoop) → 120 kcal / 24–25g proteïne
    {
      name: 'Whey shake met water (1 scoop)',
      grams: 30,
      per100g: { calories: 400, protein: 80, carbs: 10, fat: 6 },
    },
  ]),

  mkMeal('meal-4-thuiskomen', 'Thuiskomen', '18:00', [
    // Protein pudding of protein bar (1 stuk) → 150–200 kcal / 20g proteïne
    {
      name: 'Protein pudding of protein bar (1 stuk)',
      grams: 60,
      per100g: { calories: 300, protein: 33, carbs: 25, fat: 8 },
    },
  ]),

  mkMeal('meal-5-avondeten', 'Avondeten', '19:30', [
    // Kippenborst 200g → 220 kcal / 46g proteïne
    {
      name: 'Kippenborst',
      grams: 200,
      per100g: { calories: 110, protein: 23, carbs: 0, fat: 2 },
    },
    // Noedels, droge hoeveelheid 75g → 270 kcal / 9g proteïne
    {
      name: 'Noedels (droge hoeveelheid)',
      grams: 75,
      per100g: { calories: 360, protein: 12, carbs: 72, fat: 2 },
    },
    // Wokgroenten 300g → 75 kcal / 5g proteïne
    {
      name: 'Wokgroenten',
      grams: 300,
      per100g: { calories: 25, protein: 1.7, carbs: 5, fat: 0.3 },
    },
    // Woksaus 40g → 50 kcal / 1g proteïne
    {
      name: 'Woksaus',
      grams: 40,
      per100g: { calories: 125, protein: 2.5, carbs: 20, fat: 2 },
    },
    // Olie voor bakken 10g → 90 kcal
    {
      name: 'Olie voor bakken',
      grams: 10,
      per100g: { calories: 900, protein: 0, carbs: 0, fat: 100 },
    },
  ]),

  mkMeal('meal-6-na-avondeten', 'Na avondeten', '21:30', [
    // 1 mignonette → 60 kcal / 1g proteïne
    {
      name: 'Mignonette (1 stuk)',
      grams: 100,
      per100g: { calories: 60, protein: 1, carbs: 11, fat: 1 },
    },
  ]),
]

// ─── Macros ─────────────────────────────────────────────────────
// Dagtotaal: 1955 kcal · 197–198g proteïne (met protein pudding bij thuiskomst)
const CALORIES_TARGET = 1955
const PROTEIN_G = 197
// Carbs/fat zijn in het dieet niet expliciet opgegeven — we sturen ze
// niet als target, maar laten de app ze uit items berekenen. Toch moet
// de kolom een waarde hebben; we gebruiken redelijke schattingen.
const CARBS_G = 150
const FAT_G = 65

const GUIDELINES = `Dagtotaal: 1955 kcal · 197–198g proteïne.
Whey shake bij "Na middag" kan vervangen worden door een tweede protein pudding indien praktischer.
"Na avondeten" is optioneel — 1 mignonette zet het totaal op +60 kcal.`

// ─── Insert ─────────────────────────────────────────────────────
async function main() {
  // 1 · Vind de coach-user via email
  console.log(`[seed] Lookup coach by email: ${COACH_EMAIL}`)
  const { data: usersList, error: usersErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })
  if (usersErr) {
    console.error('[seed] Failed to list users:', usersErr.message)
    process.exit(1)
  }
  const coach = usersList.users.find(
    (u) => u.email?.toLowerCase() === COACH_EMAIL.toLowerCase()
  )
  if (!coach) {
    console.error(`[seed] Coach niet gevonden voor ${COACH_EMAIL}`)
    process.exit(1)
  }
  console.log(`[seed] Coach found: ${coach.id}`)

  // 2 · Controleer of dezelfde template al bestaat (voorkom duplicates)
  const { data: existing } = await admin
    .from('nutrition_plans')
    .select('id, title')
    .eq('client_id', coach.id)
    .eq('title', TEMPLATE_TITLE)
    .limit(1)
    .maybeSingle()

  if (existing) {
    console.log(`[seed] Template bestaat al (id=${existing.id}), update in plaats van insert…`)
    const { error: updErr } = await admin
      .from('nutrition_plans')
      .update({
        calories_target: CALORIES_TARGET,
        protein_g: PROTEIN_G,
        carbs_g: CARBS_G,
        fat_g: FAT_G,
        meals,
        guidelines: GUIDELINES,
        valid_from: new Date().toISOString().split('T')[0],
      })
      .eq('id', existing.id)
    if (updErr) {
      console.error('[seed] Update failed:', updErr.message)
      process.exit(1)
    }
    console.log(`[seed] ✓ Template updated: ${existing.id}`)
    return
  }

  // 3 · Insert nieuwe template
  const { data, error } = await admin
    .from('nutrition_plans')
    .insert({
      client_id: coach.id,
      title: TEMPLATE_TITLE,
      calories_target: CALORIES_TARGET,
      protein_g: PROTEIN_G,
      carbs_g: CARBS_G,
      fat_g: FAT_G,
      meals,
      guidelines: GUIDELINES,
      is_active: false,
      valid_from: new Date().toISOString().split('T')[0],
    })
    .select('id')
    .single()

  if (error) {
    console.error('[seed] Insert failed:', error.message)
    process.exit(1)
  }

  console.log(`[seed] ✓ Template aangemaakt: ${data?.id}`)
  console.log(`[seed] Titel: ${TEMPLATE_TITLE}`)
  console.log('[seed] Open /coach/nutrition → tab "Mijn templates" om het toe te wijzen aan Cedric.')
}

main().catch((err) => {
  console.error('[seed] Unexpected error:', err)
  process.exit(1)
})
