'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import {
  ChevronLeft, Save, Loader2, Plus, Trash2,
  UtensilsCrossed, Flame, Beef, Wheat, Droplet,
  Search
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

export default function EditNutritionPlanPage() {
  const router = useRouter()
  const params = useParams()
  const planId = params.id as string
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [caloriesTarget, setCaloriesTarget] = useState(2200)
  const [proteinG, setProteinG] = useState(160)
  const [carbsG, setCarbsG] = useState(220)
  const [fatG, setFatG] = useState(70)
  const [guidelines, setGuidelines] = useState('')
  const [meals, setMeals] = useState<Meal[]>([])
  const [saving, setSaving] = useState(false)
  const [showFoodSearch, setShowFoodSearch] = useState<number | null>(null)

  // Load existing plan
  useEffect(() => {
    async function loadPlan() {
      try {
        const { data, error } = await supabase
          .from('nutrition_plans')
          .select('*')
          .eq('id', planId)
          .single()

        if (error || !data) {
          console.error('Failed to load plan:', error)
          router.push('/coach/nutrition')
          return
        }

        // Strip "— Template" suffix for editing
        const displayTitle = (data.title || '').replace(/\s*—\s*Template$/, '')
        setTitle(displayTitle)
        setCaloriesTarget(data.calories_target || 2200)
        setProteinG(data.protein_g || 160)
        setCarbsG(data.carbs_g || 220)
        setFatG(data.fat_g || 70)
        setGuidelines(data.guidelines || '')

        // Parse meals
        if (data.meals && Array.isArray(data.meals)) {
          const parsedMeals: Meal[] = data.meals.map((m: any) => ({
            name: m.name || '',
            time: m.time || '12:00',
            items: (m.items && m.items.length > 0
              ? m.items
              : (m.foods || []).map((f: any) => ({
                  name: f.name || '',
                  description: f.brand ? `${f.brand} — ${f.grams}g` : `${f.grams || 100}g`,
                  calories: f.per100g ? Math.round((f.per100g.calories * (f.grams || 100)) / 100) : 0,
                  protein: f.per100g ? Math.round((f.per100g.protein * (f.grams || 100)) / 100) : 0,
                  carbs: f.per100g ? Math.round((f.per100g.carbs * (f.grams || 100)) / 100) : 0,
                  fat: f.per100g ? Math.round((f.per100g.fat * (f.grams || 100)) / 100) : 0,
                  grams: f.grams || 100,
                  per100g: f.per100g || undefined,
                  image: f.image || null,
                }))
            ) as MealItem[],
          }))
          setMeals(parsedMeals)
        }
      } catch (err) {
        console.error('Load error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadPlan()
  }, [planId, supabase, router])

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
      const planTitle = `${title} — Template`

      const { error } = await supabase
        .from('nutrition_plans')
        .update({
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
        })
        .eq('id', planId)

      if (error) {
        console.error('Update error:', error)
        return
      }

      router.push('/coach/nutrition')
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#A6ADA7]">
        <div className="border-b border-[#A6ADA7]">
          <div className="max-w-3xl mx-auto px-6 py-12 animate-pulse">
            <div className="h-4 w-32 bg-[#A6ADA7] rounded mb-6" />
            <div className="h-9 w-56 bg-[#A6ADA7] rounded-xl mb-2" />
            <div className="h-4 w-44 bg-[#A6ADA7] rounded" />
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6 animate-pulse">
          <div className="bg-[#A6ADA7] rounded-2xl p-6 border border-[#A6ADA7]">
            <div className="h-5 w-32 bg-[#A6ADA7] rounded mb-5" />
            <div className="h-11 w-full bg-[#A6ADA7]/30 rounded-xl mb-4" />
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 bg-[#A6ADA7]/30 rounded-xl" />
              ))}
            </div>
          </div>
          <div className="bg-[#A6ADA7] rounded-2xl p-6 border border-[#A6ADA7]">
            <div className="h-5 w-24 bg-[#A6ADA7] rounded mb-5" />
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 bg-[#A6ADA7]/30 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#A6ADA7]">
      {/* Header */}
      <div className="border-b border-[#A6ADA7]">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <button
            onClick={() => router.push('/coach/nutrition')}
            className="flex items-center gap-2 text-[13px] font-medium text-[#D6D9D6] hover:text-[#FDFDFE] transition-colors mb-6"
          >
            <ChevronLeft className="w-4 h-4" />
            Terug naar voeding
          </button>
          <h1 className="text-[32px] font-[family-name:var(--font-display)] text-[#FDFDFE]">
            Template bewerken
          </h1>
          <p className="text-[15px] text-[#D6D9D6] mt-1">
            Wijzig de template en sla op
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Basic Info */}
        <div className="bg-[#A6ADA7] rounded-2xl p-6 border border-[#A6ADA7] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-[17px] font-semibold text-[#FDFDFE] mb-5">Basisgegevens</h2>

          <div className="space-y-4">
            <div>
              <label className="text-[12px] font-semibold text-[#D6D9D6] uppercase tracking-wide block mb-1.5">Naam</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="bv. Afvallen — Calorie deficit"
                className="w-full px-4 py-3 border border-[#A6ADA7] rounded-xl text-[14px] text-[#FDFDFE] placeholder-[#CDD1CE] focus:outline-none focus:border-[#FDFDFE]"
              />
            </div>

            {/* Macro targets */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[12px] font-semibold text-[#D6D9D6] uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                  <Flame className="w-3.5 h-3.5 text-[#E8B948]" /> Calorieën
                </label>
                <input
                  type="number"
                  value={caloriesTarget}
                  onChange={(e) => setCaloriesTarget(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 border border-[#A6ADA7] rounded-xl text-[14px] text-[#FDFDFE] focus:outline-none focus:border-[#FDFDFE]"
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-[#D6D9D6] uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                  <Beef className="w-3.5 h-3.5 text-[#B55A4A]" /> Eiwit (g)
                </label>
                <input
                  type="number"
                  value={proteinG}
                  onChange={(e) => setProteinG(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 border border-[#A6ADA7] rounded-xl text-[14px] text-[#FDFDFE] focus:outline-none focus:border-[#FDFDFE]"
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-[#D6D9D6] uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                  <Wheat className="w-3.5 h-3.5 text-[#E8B948]" /> Koolh (g)
                </label>
                <input
                  type="number"
                  value={carbsG}
                  onChange={(e) => setCarbsG(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 border border-[#A6ADA7] rounded-xl text-[14px] text-[#FDFDFE] focus:outline-none focus:border-[#FDFDFE]"
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-[#D6D9D6] uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                  <Droplet className="w-3.5 h-3.5 text-[#5A7FB5]" /> Vet (g)
                </label>
                <input
                  type="number"
                  value={fatG}
                  onChange={(e) => setFatG(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 border border-[#A6ADA7] rounded-xl text-[14px] text-[#FDFDFE] focus:outline-none focus:border-[#FDFDFE]"
                />
              </div>
            </div>

            {/* Macro bar visual */}
            <div className="flex h-3 rounded-full overflow-hidden bg-[#A6ADA7]">
              {(() => {
                const proteinCal = proteinG * 4
                const carbsCal = carbsG * 4
                const fatCal = fatG * 9
                const total = proteinCal + carbsCal + fatCal || 1
                return (
                  <>
                    <div className="bg-[#B55A4A]" style={{ width: `${(proteinCal / total) * 100}%` }} title={`Eiwit: ${Math.round((proteinCal / total) * 100)}%`} />
                    <div className="bg-[#E8B948]" style={{ width: `${(carbsCal / total) * 100}%` }} title={`Koolh: ${Math.round((carbsCal / total) * 100)}%`} />
                    <div className="bg-[#5A7FB5]" style={{ width: `${(fatCal / total) * 100}%` }} title={`Vet: ${Math.round((fatCal / total) * 100)}%`} />
                  </>
                )
              })()}
            </div>
            <div className="flex justify-between text-[10px] font-medium text-[#D6D9D6]">
              <span>Eiwit {Math.round((proteinG * 4) / (caloriesTarget || 1) * 100)}%</span>
              <span>Koolh {Math.round((carbsG * 4) / (caloriesTarget || 1) * 100)}%</span>
              <span>Vet {Math.round((fatG * 9) / (caloriesTarget || 1) * 100)}%</span>
            </div>
          </div>
        </div>

        {/* Meals */}
        <div className="bg-[#A6ADA7] rounded-2xl p-6 border border-[#A6ADA7] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[17px] font-semibold text-[#FDFDFE]">Maaltijden</h2>
            <button
              onClick={addMeal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-[#A6ADA7] text-[#FDFDFE] hover:bg-[#A6ADA7] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Maaltijd toevoegen
            </button>
          </div>

          <div className="space-y-4">
            {meals.map((meal, mealIndex) => (
              <div key={mealIndex} className="border border-[#A6ADA7] rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <UtensilsCrossed className="w-4 h-4 text-[#FDFDFE]" />
                  <input
                    type="text"
                    value={meal.name}
                    onChange={(e) => updateMeal(mealIndex, 'name', e.target.value)}
                    className="flex-1 text-[14px] font-semibold text-[#FDFDFE] bg-transparent focus:outline-none border-b border-transparent focus:border-[#FDFDFE]"
                  />
                  <input
                    type="time"
                    value={meal.time}
                    onChange={(e) => updateMeal(mealIndex, 'time', e.target.value)}
                    className="text-[12px] text-[#D6D9D6] bg-transparent focus:outline-none"
                  />
                  <button
                    onClick={() => removeMeal(mealIndex)}
                    className="p-1.5 rounded-lg text-[#CDD1CE] hover:text-[#B55A4A] hover:bg-[#B55A4A]/5 transition-all"
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
                          <div className="flex items-center gap-2 pl-7 bg-[#A6ADA7] rounded-lg p-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#A6ADA7] border border-[#A6ADA7] flex items-center justify-center overflow-hidden shrink-0">
                              {item.image ? (
                                <Image src={item.image} alt="" width={32} height={32} className="w-full h-full object-cover" unoptimized loading="lazy" />
                              ) : (
                                <span className="text-[14px]">🍽️</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-medium text-[#FDFDFE] truncate">{item.name}</p>
                              <p className="text-[11px] text-[#D6D9D6]">{item.grams}g</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[11px] font-semibold text-[#E8B948]">{item.calories}</span>
                              <span className="text-[10px] text-[#D6D9D6]">kcal</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 text-[10px]">
                              <span className="text-[#B55A4A] font-medium">{item.protein}P</span>
                              <span className="text-[#E8B948] font-medium">{item.carbs}K</span>
                              <span className="text-[#5A7FB5] font-medium">{item.fat}V</span>
                            </div>
                            <button
                              onClick={() => removeMealItem(mealIndex, itemIndex)}
                              className="p-1 text-[#CDD1CE] hover:text-[#B55A4A] shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 pl-7">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => updateMealItem(mealIndex, itemIndex, 'name', e.target.value)}
                              placeholder="Voedingsmiddel"
                              className="flex-1 text-[13px] text-[#FDFDFE] px-2 py-1.5 border border-[#A6ADA7] rounded-lg focus:outline-none focus:border-[#FDFDFE] placeholder-[#CDD1CE]"
                            />
                            <input
                              type="number"
                              value={item.calories || ''}
                              onChange={(e) => updateMealItem(mealIndex, itemIndex, 'calories', parseInt(e.target.value) || 0)}
                              placeholder="kcal"
                              className="w-16 text-[12px] text-[#FDFDFE] px-2 py-1.5 border border-[#A6ADA7] rounded-lg focus:outline-none focus:border-[#FDFDFE] placeholder-[#CDD1CE] text-center"
                            />
                            <input
                              type="number"
                              value={item.protein || ''}
                              onChange={(e) => updateMealItem(mealIndex, itemIndex, 'protein', parseInt(e.target.value) || 0)}
                              placeholder="P"
                              className="w-12 text-[12px] text-[#B55A4A] px-2 py-1.5 border border-[#A6ADA7] rounded-lg focus:outline-none focus:border-[#FDFDFE] placeholder-[#CDD1CE] text-center"
                            />
                            <input
                              type="number"
                              value={item.carbs || ''}
                              onChange={(e) => updateMealItem(mealIndex, itemIndex, 'carbs', parseInt(e.target.value) || 0)}
                              placeholder="K"
                              className="w-12 text-[12px] text-[#E8B948] px-2 py-1.5 border border-[#A6ADA7] rounded-lg focus:outline-none focus:border-[#FDFDFE] placeholder-[#CDD1CE] text-center"
                            />
                            <input
                              type="number"
                              value={item.fat || ''}
                              onChange={(e) => updateMealItem(mealIndex, itemIndex, 'fat', parseInt(e.target.value) || 0)}
                              placeholder="V"
                              className="w-12 text-[12px] text-[#5A7FB5] px-2 py-1.5 border border-[#A6ADA7] rounded-lg focus:outline-none focus:border-[#FDFDFE] placeholder-[#CDD1CE] text-center"
                            />
                            <button
                              onClick={() => removeMealItem(mealIndex, itemIndex)}
                              className="p-1 text-[#CDD1CE] hover:text-[#B55A4A]"
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

                {/* Add buttons */}
                <div className="ml-7 flex items-center gap-3">
                  <button
                    onClick={() => setShowFoodSearch(showFoodSearch === mealIndex ? null : mealIndex)}
                    className="flex items-center gap-1.5 text-[12px] font-semibold text-[#FDFDFE] px-3 py-1.5 rounded-lg bg-[#A6ADA7] hover:bg-[#A6ADA7] transition-colors"
                  >
                    <Search className="w-3.5 h-3.5" />
                    Zoek voedingsmiddel
                  </button>
                  <button
                    onClick={() => addItemToMeal(mealIndex)}
                    className="text-[12px] font-medium text-[#D6D9D6] hover:text-[#FDFDFE] transition-colors"
                  >
                    + Handmatig toevoegen
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Items total */}
          {totalFromItems.calories > 0 && (
            <div className="mt-4 pt-4 border-t border-[#A6ADA7] flex items-center gap-4 text-[12px]">
              <span className="text-[#D6D9D6] font-medium">Totaal items:</span>
              <span className="font-semibold text-[#FDFDFE]">{totalFromItems.calories} kcal</span>
              <span className="text-[#B55A4A]">{totalFromItems.protein}g P</span>
              <span className="text-[#E8B948]">{totalFromItems.carbs}g K</span>
              <span className="text-[#5A7FB5]">{totalFromItems.fat}g V</span>
            </div>
          )}
        </div>

        {/* Guidelines */}
        <div className="bg-[#A6ADA7] rounded-2xl p-6 border border-[#A6ADA7] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h2 className="text-[17px] font-semibold text-[#FDFDFE] mb-4">Richtlijnen</h2>
          <textarea
            value={guidelines}
            onChange={(e) => setGuidelines(e.target.value)}
            placeholder="Voeg richtlijnen toe voor de cliënt, bijv. waterdoel, timing, supplementen..."
            className="w-full px-4 py-3 border border-[#A6ADA7] rounded-xl text-[14px] text-[#FDFDFE] placeholder-[#CDD1CE] focus:outline-none focus:border-[#FDFDFE] resize-none h-28"
          />
        </div>

        {/* Save */}
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/coach/nutrition')}
            className="px-6 py-3 rounded-xl text-[14px] font-semibold border border-[#A6ADA7] text-[#D6D9D6] hover:text-[#FDFDFE] hover:bg-[#A6ADA7] transition-colors"
          >
            Annuleren
          </button>
          <button
            onClick={savePlan}
            disabled={saving || !title.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-semibold bg-[#474B48] text-white hover:bg-[#2A2A28] transition-colors disabled:opacity-50"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Opslaan...</>
            ) : (
              <><Save className="w-4 h-4" /> Wijzigingen opslaan</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
