import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const TEMPLATE_ID = '2dd61c52-b4ad-4265-aa00-61097e1af277'

type MealItem = { name: string; calories: number; protein: number; grams: number }
type Meal = { name: string; time: string; items: MealItem[] }

async function main() {
  const { data, error } = await admin
    .from('nutrition_plans')
    .select('title, calories_target, protein_g, meals, is_active, guidelines')
    .eq('id', TEMPLATE_ID)
    .single()

  if (error || !data) {
    console.error('Not found:', error?.message)
    process.exit(1)
  }

  console.log(`Title: ${data.title}`)
  console.log(`Target: ${data.calories_target} kcal · ${data.protein_g}g protein`)
  console.log(`Active: ${data.is_active}`)
  console.log('')

  let totalKcal = 0
  let totalProt = 0
  const meals = data.meals as Meal[]
  for (const meal of meals) {
    let mealKcal = 0
    let mealProt = 0
    console.log(`── ${meal.name} (${meal.time}) ──`)
    for (const item of meal.items) {
      console.log(
        `  · ${item.name.padEnd(42)} ${String(item.grams).padStart(4)}g  ${String(item.calories).padStart(4)} kcal  ${String(item.protein).padStart(5)}g p`
      )
      mealKcal += item.calories
      mealProt += item.protein
    }
    console.log(`  Totaal: ${Math.round(mealKcal)} kcal · ${Math.round(mealProt)}g protein`)
    console.log('')
    totalKcal += mealKcal
    totalProt += mealProt
  }
  console.log(`━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`Day total: ${Math.round(totalKcal)} kcal · ${Math.round(totalProt)}g protein`)
  console.log(`Expected:  1955 kcal · 197–198g protein`)
}

main()
