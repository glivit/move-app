'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  ChevronLeft, Save, Loader2, Plus, Trash2,
  UtensilsCrossed, Flame, Beef, Wheat, Droplet,
  Search, X
} from 'lucide-react'
import { FoodSearch, type FoodItem } from '@/components/coach/FoodSearch'

interface MealItem {
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

interface Meal {
  name: string
  time: string
  items: MealItem[]
}

const DEFAULT_MEALS: Meal[] = [
  { name: 'Ontbijt', time: '07:30', items: [] },
  { name: 'Lunch', time: '12:30', items: [] },
  { name: 'Avondeten', time: '18:30', items: [] },
]

const TEMPLATE_PRESETS = [
  { name: 'Afvallen — Calorie deficit', calories: 1800, protein: 150, carbs: 150, fat: 60, meals: 3 },
  { name: 'Spiermassa — Surplus', calories: 2800, protein: 180, carbs: 300, fat: 80, meals: 4 },
  { name: 'Onderhoud', calories: 2200, protein: 160, carbs: 220, fat: 70, meals: 3 },
  { name: 'Keto — Low carb', calories: 2000, protein: 140, carbs: 30, fat: 150, meals: 3 },
  { name: 'High protein', calories: 2400, protein: 220, carbs: 200, fat: 65, meals: 4 },
]

export default function NewNutritionPlanPage() {
  const router = useRouter()
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [caloriesTarget, setCaloriesTarget] = useState(2200)
  const [proteinG, setProteinG] = useState(160)
  const [carbsG, setCarbsG] = useState(220)
  const [fatG, setFatG] = useState(70)
  const [guidelines, setGuidelines] = useState('')
  const [meals, setMeals] = useState<Meal[]>([...DEFAULT_MEALS])
  const [saving, setSaving] = useState(false)
  const [isTemplate, setIsTemplate] = useState(true)
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [clients, setClients] = useState<{ id: string; full_name: string }[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [showFoodSearch, setShowFoodSearch] = useState<number | null>(null) // mealIndex or null

  // Load clients if assigning directly
  async function loadClients() {
    if (clients.length > 0) return
    setLoadingClients(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'client')
      .order('full_name')
    setClients(data || [])
    setLoadingClients(false)
  }

  function applyPreset(preset: typeof TEMPLATE_PRESETS[0]) {
    setTitle(preset.name)
    setCaloriesTarget(preset.calories)
    setProteinG(preset.protein)
    setCarbsG(preset.carbs)
    setFatG(preset.fat)

    const mealNames = ['Ontbijt', 'Lunch', 'Avondeten', 'Snack', 'Pre-workout', 'Post-workout']
    const mealTimes = ['07:30', '12:30', '18:30', '15:00', '16:30', '19:00']
    setMeals(
      Array.from({ length: preset.meals }, (_, i) => ({
        name: mealNames[i] || `Maaltijd ${i + 1}`,
        time: mealTimes[i] || '12:00',
        items: [],
      }))
    )
  }

  function addMeal() {
    setMeals(prev => [...prev, {
      name: `Maaltijd ${prev.length + 1}`,
      time: '12:00',
      items: [],
    }])
  }

  function removeMeal(index: number) {
    setMeals(prev => prev.filter((_, i) => i !== index))
  }

  function updateMeal(index: number, field: keyof Meal, value: any) {
    setMeals(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m))
  }

  function addItemToMeal(mealIndex: number) {
    setMeals(prev => prev.map((m, i) => {
      if (i !== mealIndex) return m
      return {
        ...m,
        items: [...m.items, { name: '', description: '', calories: 0, protein: 0, carbs: 0, fat: 0 }],
      }
    }))
  }

  function updateMealItem(mealIndex: number, itemIndex: number, field: keyof MealItem, value: any) {
    setMeals(prev => prev.map((m, i) => {
      if (i !== mealIndex) return m
      return {
        ...m,
        items: m.items.map((item, j) => j === itemIndex ? { ...item, [field]: value } : item),
      }
    }))
  }

  function removeMealItem(mealIndex: number, itemIndex: number) {
    setMeals(prev => prev.map((m, i) => {
      if (i !== mealIndex) return m
      return { ...m, items: m.items.filter((_, j) => j !== itemIndex) }
    }))
  }

  function handleFoodSelected(food: FoodItem, grams: number, mealIndex: number) {
    const item: MealItem = {
      name: food.name,
      description: food.brand ? `${food.brand} — ${grams}g` : `${grams}g`,
      calories: Math.round((food.per100g.calories * grams) / 100),
      protein: Math.round((food.per100g.protein * grams) / 100),
      carbs: Math.round((food.per100g.carbs * grams) / 100),
      fat: Math.round((food.per100g.fat * grams) / 100),
      grams,
      per100g: {
        calories: food.per100g.calories,
        protein: food.per100g.protein,
        carbs: food.per100g.carbs,
        fat: food.per100g.fat,
      },
      image: food.image_small || null,
    }
    setMeals(prev => prev.map((m, i) => {
      if (i !== mealIndex) return m
      return { ...m, items: [...m.items, item] }
    }))
    setShowFoodSearch(null)
  }

  async function savePlan() {
    if (!title.trim()) return
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const clientId = isTemplate ? user.id : selectedClient
      if (!clientId) return

      const planTitle = isTemplate ? `${title} — Template` : title

      const { error } = await supabase.from('nutrition_plans').insert({
        client_id: clientId,
        title: planTitle,
        calories_target: caloriesTarget,
        protein_g: proteinG,
        carbs_g: carbsG,
        fat_g: fatG,
        meals: meals.map((m, mIdx) => ({
          id: `meal-${mIdx}-${m.name.toLowerCase().replace(/\s+/g, '-')}`,
          name: m.name,
          time: m.time,
          items: m.items.filter(it => it.name.trim()),
          // Also save as foods array for client nutrition page compatibility
          foods: m.items.filter(it => it.name.trim()).map((it, fIdx) => ({
            id: `food-${mIdx}-${fIdx}`,
            name: it.name,
            brand: null,
            image: it.image || null,
            grams: it.grams || 100,
            per100g: it.per100g || {
              calories: it.calories,
              protein: it.protein,
              carbs: it.carbs,
              fat: it.fat,
            },
          })),
        })),
        guidelines: guidelines.trim() || null,
        is_active: !isTemplate, // Templates are stored under coach ID, not active for client
        valid_from: new Date().toISOString().split('T')[0],
      })

      if (error) {
        console.error('Save error:', error)
        return
      }

      if (isTemplate) {
        router.push('/coach/nutrition')
      } else {
        router.push(`/coach/clients/${clientId}/nutrition`)
      }
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setSaving(false)
    }
  }

  // Calculate totals from meal items
  const totalFromItems = meals.reduce((acc, meal) => {
    meal.items.forEach(item => {
      acc.calories += item.calories || 0
      acc.protein += item.protein || 0
      acc.carbs += item.carbs || 0
      acc.fat += item.fat || 0
    })
    return acc
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 })

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <div className="border-b border-[#E8E4DC]">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <button
            onClick={() => router.push('/coach/nutrition')}
            className="flex items-center gap-2 text-[13px] font-medium text-[#8E8E93] hover:text-[#1A1A18] transition-colors mb-6"
          >
            <ChevronLeft className="w-4 h-4" />
            Terug naar voeding
          </button>
          <h1 className="text-[32px] font-[family-name:var(--font-display)] text-[#1A1A18]">
            Nieuw voedingsplan
          </h1>
          <p className="text-[15px] text-[#8E8E93] mt-1">
            Maak een template of wijs direct toe aan een cliënt
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Template or Direct */}
        <div className="bg-white rounded-2xl p-6 border border-[#E8E4DC] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setIsTemplate(true)}
              className={`flex-1 py-3 rounded-xl text-[14px] font-semibold transition-all border ${
                isTemplate
                  ? 'bg-[#1A1917] text-white border-[#1A1917]'
                  : 'bg-white text-[#8E8E93] border-[#E8E4DC] hover:border-[#1A1917]'
              }`}
            >
              Template opslaan
            </button>
            <button
              onClick={() => { setIsTemplate(false); loadClients() }}
              className={`flex-1 py-3 rounded-xl text-[14px] font-semibold transition-all border ${
                !isTemplate
                  ? 'bg-[#1A1917] text-white border-[#1A1917]'
                  : 'bg-white text-[#8E8E93] border-[#E8E4DC] hover:border-[#1A1917]'
              }`}
            >
              Direct toewijzen
            </button>
          </div>

          {/* Client selector */}
          {!isTemplate && (
            <div className="mb-6">
              <label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wide block mb-2">Cliënt</label>
              {loadingClients ? (
                <div className="flex items-center gap-2 text-[13px] text-[#8E8E93]">
                  <Loader2 className="w-4 h-4 animate-spin" /> Laden...
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {clients.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedClient(c.id)}
                      className={`text-left px-4 py-3 rounded-xl border text-[13px] font-medium transition-all ${
                        selectedClient === c.id
                          ? 'border-[#1A1917] bg-[#F5F2EC] text-[#1A1917]'
                          : 'border-[#E8E4DC] text-[#1A1A18] hover:border-[#1A1917]'
                      }`}
                    >
                      {c.full_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick presets */}
          <div>
            <label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wide block mb-2">Snel starten met preset</label>
            <div className="flex flex-wrap gap-2">
              {TEMPLATE_PRESETS.map(preset => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="px-3 py-2 rounded-lg text-[12px] font-medium border border-[#E8E4DC] text-[#1A1A18] hover:border-[#1A1917] hover:bg-[#F5F2EC] transition-all"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-2xl p-6 border border-[#E8E4DC] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-[17px] font-semibold text-[#1A1A18] mb-5">Basisgegevens</h2>

          <div className="space-y-4">
            <div>
              <label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wide block mb-1.5">Naam</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="bv. Afvallen — Calorie deficit"
                className="w-full px-4 py-3 border border-[#E8E4DC] rounded-xl text-[14px] text-[#1A1A18] placeholder-[#C7C7CC] focus:outline-none focus:border-[#1A1917]"
              />
            </div>

            {/* Macro targets */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                  <Flame className="w-3.5 h-3.5 text-[#FF9500]" /> Calorieën
                </label>
                <input
                  type="number"
                  value={caloriesTarget}
                  onChange={(e) => setCaloriesTarget(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 border border-[#E8E4DC] rounded-xl text-[14px] text-[#1A1A18] focus:outline-none focus:border-[#1A1917]"
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                  <Beef className="w-3.5 h-3.5 text-[#FF3B30]" /> Eiwit (g)
                </label>
                <input
                  type="number"
                  value={proteinG}
                  onChange={(e) => setProteinG(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 border border-[#E8E4DC] rounded-xl text-[14px] text-[#1A1A18] focus:outline-none focus:border-[#1A1917]"
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                  <Wheat className="w-3.5 h-3.5 text-[#FF9500]" /> Koolh (g)
                </label>
                <input
                  type="number"
                  value={carbsG}
                  onChange={(e) => setCarbsG(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 border border-[#E8E4DC] rounded-xl text-[14px] text-[#1A1A18] focus:outline-none focus:border-[#1A1917]"
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                  <Droplet className="w-3.5 h-3.5 text-[#007AFF]" /> Vet (g)
                </label>
                <input
                  type="number"
                  value={fatG}
                  onChange={(e) => setFatG(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 border border-[#E8E4DC] rounded-xl text-[14px] text-[#1A1A18] focus:outline-none focus:border-[#1A1917]"
                />
              </div>
            </div>

            {/* Macro bar visual */}
            <div className="flex h-3 rounded-full overflow-hidden bg-[#E8E4DC]">
              {(() => {
                const proteinCal = proteinG * 4
                const carbsCal = carbsG * 4
                const fatCal = fatG * 9
                const total = proteinCal + carbsCal + fatCal || 1
                return (
                  <>
                    <div className="bg-[#FF3B30]" style={{ width: `${(proteinCal / total) * 100}%` }} title={`Eiwit: ${Math.round((proteinCal / total) * 100)}%`} />
                    <div className="bg-[#FF9500]" style={{ width: `${(carbsCal / total) * 100}%` }} title={`Koolh: ${Math.round((carbsCal / total) * 100)}%`} />
                    <div className="bg-[#007AFF]" style={{ width: `${(fatCal / total) * 100}%` }} title={`Vet: ${Math.round((fatCal / total) * 100)}%`} />
                  </>
                )
              })()}
            </div>
            <div className="flex justify-between text-[10px] font-medium text-[#8E8E93]">
              <span>Eiwit {Math.round((proteinG * 4) / (caloriesTarget || 1) * 100)}%</span>
              <span>Koolh {Math.round((carbsG * 4) / (caloriesTarget || 1) * 100)}%</span>
              <span>Vet {Math.round((fatG * 9) / (caloriesTarget || 1) * 100)}%</span>
            </div>
          </div>
        </div>

        {/* Meals */}
        <div className="bg-white rounded-2xl p-6 border border-[#E8E4DC] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[17px] font-semibold text-[#1A1A18]">Maaltijden</h2>
            <button
              onClick={addMeal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-[#EDEAE4] text-[#1A1917] hover:bg-[#EDE5D4] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Maaltijd toevoegen
            </button>
          </div>

          <div className="space-y-4">
            {meals.map((meal, mealIndex) => (
              <div key={mealIndex} className="border border-[#E8E4DC] rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <UtensilsCrossed className="w-4 h-4 text-[#1A1917]" />
                  <input
                    type="text"
                    value={meal.name}
                    onChange={(e) => updateMeal(mealIndex, 'name', e.target.value)}
                    className="flex-1 text-[14px] font-semibold text-[#1A1A18] bg-transparent focus:outline-none border-b border-transparent focus:border-[#1A1917]"
                  />
                  <input
                    type="time"
                    value={meal.time}
                    onChange={(e) => updateMeal(mealIndex, 'time', e.target.value)}
                    className="text-[12px] text-[#8E8E93] bg-transparent focus:outline-none"
                  />
                  <button
                    onClick={() => removeMeal(mealIndex)}
                    className="p-1.5 rounded-lg text-[#C7C7CC] hover:text-[#FF3B30] hover:bg-[#FF3B30]/5 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Meal items */}
                {meal.items.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {meal.items.map((item, itemIndex) => (
                      <div key={itemIndex}>
                        {item.per100g ? (
                          /* Food from database — nice display */
                          <div className="flex items-center gap-2 pl-7 bg-[#FAFAFA] rounded-lg p-2.5">
                            <div className="w-8 h-8 rounded-lg bg-white border border-[#E8E4DC] flex items-center justify-center overflow-hidden shrink-0">
                              {item.image ? (
                                <img src={item.image} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[14px]">🍽️</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-medium text-[#1A1A18] truncate">{item.name}</p>
                              <p className="text-[11px] text-[#8E8E93]">{item.grams}g</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[11px] font-semibold text-[#FF9500]">{item.calories}</span>
                              <span className="text-[10px] text-[#8E8E93]">kcal</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 text-[10px]">
                              <span className="text-[#FF3B30] font-medium">{item.protein}P</span>
                              <span className="text-[#FF9500] font-medium">{item.carbs}K</span>
                              <span className="text-[#007AFF] font-medium">{item.fat}V</span>
                            </div>
                            <button
                              onClick={() => removeMealItem(mealIndex, itemIndex)}
                              className="p-1 text-[#C7C7CC] hover:text-[#FF3B30] shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          /* Manual entry — editable fields */
                          <div className="flex items-center gap-2 pl-7">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => updateMealItem(mealIndex, itemIndex, 'name', e.target.value)}
                              placeholder="Voedingsmiddel"
                              className="flex-1 text-[13px] text-[#1A1A18] px-2 py-1.5 border border-[#E8E4DC] rounded-lg focus:outline-none focus:border-[#1A1917] placeholder-[#C7C7CC]"
                            />
                            <input
                              type="number"
                              value={item.calories || ''}
                              onChange={(e) => updateMealItem(mealIndex, itemIndex, 'calories', parseInt(e.target.value) || 0)}
                              placeholder="kcal"
                              className="w-16 text-[12px] text-[#1A1A18] px-2 py-1.5 border border-[#E8E4DC] rounded-lg focus:outline-none focus:border-[#1A1917] placeholder-[#C7C7CC] text-center"
                            />
                            <input
                              type="number"
                              value={item.protein || ''}
                              onChange={(e) => updateMealItem(mealIndex, itemIndex, 'protein', parseInt(e.target.value) || 0)}
                              placeholder="P"
                              className="w-12 text-[12px] text-[#FF3B30] px-2 py-1.5 border border-[#E8E4DC] rounded-lg focus:outline-none focus:border-[#1A1917] placeholder-[#C7C7CC] text-center"
                            />
                            <input
                              type="number"
                              value={item.carbs || ''}
                              onChange={(e) => updateMealItem(mealIndex, itemIndex, 'carbs', parseInt(e.target.value) || 0)}
                              placeholder="K"
                              className="w-12 text-[12px] text-[#FF9500] px-2 py-1.5 border border-[#E8E4DC] rounded-lg focus:outline-none focus:border-[#1A1917] placeholder-[#C7C7CC] text-center"
                            />
                            <input
                              type="number"
                              value={item.fat || ''}
                              onChange={(e) => updateMealItem(mealIndex, itemIndex, 'fat', parseInt(e.target.value) || 0)}
                              placeholder="V"
                              className="w-12 text-[12px] text-[#007AFF] px-2 py-1.5 border border-[#E8E4DC] rounded-lg focus:outline-none focus:border-[#1A1917] placeholder-[#C7C7CC] text-center"
                            />
                            <button
                              onClick={() => removeMealItem(mealIndex, itemIndex)}
                              className="p-1 text-[#C7C7CC] hover:text-[#FF3B30]"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Food Search Panel */}
                {showFoodSearch === mealIndex && (
                  <div className="ml-7 mb-3">
                    <FoodSearch
                      onSelect={(food, grams) => handleFoodSelected(food, grams, mealIndex)}
                      onClose={() => setShowFoodSearch(null)}
                    />
                  </div>
                )}

                {/* Add buttons: search or manual */}
                <div className="ml-7 flex items-center gap-3">
                  <button
                    onClick={() => setShowFoodSearch(showFoodSearch === mealIndex ? null : mealIndex)}
                    className="flex items-center gap-1.5 text-[12px] font-semibold text-[#1A1917] px-3 py-1.5 rounded-lg bg-[#EDEAE4] hover:bg-[#EDE5D4] transition-colors"
                  >
                    <Search className="w-3.5 h-3.5" />
                    Zoek voedingsmiddel
                  </button>
                  <button
                    onClick={() => addItemToMeal(mealIndex)}
                    className="text-[12px] font-medium text-[#8E8E93] hover:text-[#1A1917] transition-colors"
                  >
                    + Handmatig toevoegen
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Items total */}
          {totalFromItems.calories > 0 && (
            <div className="mt-4 pt-4 border-t border-[#E8E4DC] flex items-center gap-4 text-[12px]">
              <span className="text-[#8E8E93] font-medium">Totaal items:</span>
              <span className="font-semibold text-[#1A1A18]">{totalFromItems.calories} kcal</span>
              <span className="text-[#FF3B30]">{totalFromItems.protein}g P</span>
              <span className="text-[#FF9500]">{totalFromItems.carbs}g K</span>
              <span className="text-[#007AFF]">{totalFromItems.fat}g V</span>
            </div>
          )}
        </div>

        {/* Guidelines */}
        <div className="bg-white rounded-2xl p-6 border border-[#E8E4DC] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-[17px] font-semibold text-[#1A1A18] mb-4">Richtlijnen</h2>
          <textarea
            value={guidelines}
            onChange={(e) => setGuidelines(e.target.value)}
            placeholder="Voeg richtlijnen toe voor de cliënt, bijv. waterdoel, timing, supplementen..."
            className="w-full px-4 py-3 border border-[#E8E4DC] rounded-xl text-[14px] text-[#1A1A18] placeholder-[#C7C7CC] focus:outline-none focus:border-[#1A1917] resize-none h-28"
          />
        </div>

        {/* Save */}
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/coach/nutrition')}
            className="px-6 py-3 rounded-xl text-[14px] font-semibold border border-[#E8E4DC] text-[#8E8E93] hover:text-[#1A1A18] hover:bg-white transition-colors"
          >
            Annuleren
          </button>
          <button
            onClick={savePlan}
            disabled={saving || !title.trim() || (!isTemplate && !selectedClient)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-semibold bg-[#1A1A18] text-white hover:bg-[#2A2A28] transition-colors disabled:opacity-50"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Opslaan...</>
            ) : (
              <><Save className="w-4 h-4" /> {isTemplate ? 'Template opslaan' : 'Plan toewijzen'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
