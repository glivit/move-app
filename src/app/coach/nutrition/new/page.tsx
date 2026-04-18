'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  UtensilsCrossed,
  Search,
} from 'lucide-react'
import { FoodSearch, type FoodItem } from '@/components/coach/FoodSearch'

// ─── Types ────────────────────────────────────────────────────────
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

// ─── v3 Orion tokens ──────────────────────────────────────────────
const INK = '#FDFDFE'
const INK_MUTED = 'rgba(253,253,254,0.62)'
const INK_DIM = 'rgba(253,253,254,0.44)'
const CARD = '#474B48'
const CARD_SOFT = 'rgba(71,75,72,0.55)'
const HAIR = 'rgba(253,253,254,0.08)'
const LIME = '#C0FC01'
const AMBER = '#E8A93C'
const BLUE = '#A4C7F2'
// Macro colors (v3 unified)
const MACRO = { protein: LIME, carbs: AMBER, fat: BLUE }

// ─── Primitives ───────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="block text-[10.5px] font-medium uppercase tracking-[0.08em] mb-1.5"
      style={{ color: INK_DIM }}
    >
      {children}
    </label>
  )
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', style, ...rest } = props
  return (
    <input
      {...rest}
      className={`w-full px-3 py-2.5 rounded-xl text-[13.5px] transition-colors ${className}`}
      style={{
        background: 'rgba(253,253,254,0.05)',
        color: INK,
        border: '1px solid rgba(253,253,254,0.06)',
        outline: 'none',
        ...style,
      }}
    />
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-2.5 px-0.5"
      style={{ color: INK_DIM }}
    >
      {children}
    </h2>
  )
}

/**
 * Coach · Nieuw voedingsplan (v3 Orion).
 * Template óf direct toewijzen. Presets, macro targets, meals met food-search.
 */
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
  const [showFoodSearch, setShowFoodSearch] = useState<number | null>(null)

  // ─── Data loaders ───────────────────────────────────────────────
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

  function applyPreset(preset: (typeof TEMPLATE_PRESETS)[0]) {
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
    setMeals((prev) => [
      ...prev,
      { name: `Maaltijd ${prev.length + 1}`, time: '12:00', items: [] },
    ])
  }

  function removeMeal(index: number) {
    setMeals((prev) => prev.filter((_, i) => i !== index))
  }

  function updateMeal(index: number, field: keyof Meal, value: string) {
    setMeals((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    )
  }

  function addItemToMeal(mealIndex: number) {
    setMeals((prev) =>
      prev.map((m, i) => {
        if (i !== mealIndex) return m
        return {
          ...m,
          items: [
            ...m.items,
            { name: '', description: '', calories: 0, protein: 0, carbs: 0, fat: 0 },
          ],
        }
      })
    )
  }

  function updateMealItem(
    mealIndex: number,
    itemIndex: number,
    field: keyof MealItem,
    value: string | number
  ) {
    setMeals((prev) =>
      prev.map((m, i) => {
        if (i !== mealIndex) return m
        return {
          ...m,
          items: m.items.map((item, j) =>
            j === itemIndex ? { ...item, [field]: value } : item
          ),
        }
      })
    )
  }

  function removeMealItem(mealIndex: number, itemIndex: number) {
    setMeals((prev) =>
      prev.map((m, i) => {
        if (i !== mealIndex) return m
        return { ...m, items: m.items.filter((_, j) => j !== itemIndex) }
      })
    )
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
    setMeals((prev) =>
      prev.map((m, i) => {
        if (i !== mealIndex) return m
        return { ...m, items: [...m.items, item] }
      })
    )
    setShowFoodSearch(null)
  }

  async function savePlan() {
    if (!title.trim()) return
    setSaving(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
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
          items: m.items.filter((it) => it.name.trim()),
          foods: m.items
            .filter((it) => it.name.trim())
            .map((it, fIdx) => ({
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
        is_active: !isTemplate,
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

  // ─── Derived values ─────────────────────────────────────────────
  const totalFromItems = meals.reduce(
    (acc, meal) => {
      meal.items.forEach((item) => {
        acc.calories += item.calories || 0
        acc.protein += item.protein || 0
        acc.carbs += item.carbs || 0
        acc.fat += item.fat || 0
      })
      return acc
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  const proteinCal = proteinG * 4
  const carbsCal = carbsG * 4
  const fatCal = fatG * 9
  const macroTotal = proteinCal + carbsCal + fatCal || 1
  const proteinPct = Math.round((proteinCal / macroTotal) * 100)
  const carbsPct = Math.round((carbsCal / macroTotal) * 100)
  const fatPct = Math.round((fatCal / macroTotal) * 100)

  const canSave = !saving && title.trim().length > 0 && (isTemplate || !!selectedClient)

  return (
    <div className="pb-32">
      {/* ═══ Header ═══ */}
      <div className="flex items-center gap-3 pb-4">
        <button
          onClick={() => router.push('/coach/nutrition')}
          className="flex items-center gap-1.5 transition-opacity active:opacity-70"
          style={{
            background: CARD,
            color: INK,
            padding: '7px 12px 7px 9px',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 500,
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.10)',
          }}
          aria-label="Terug"
        >
          <ArrowLeft strokeWidth={1.75} className="w-[15px] h-[15px]" />
          Terug
        </button>
      </div>

      {/* Title block */}
      <div className="mb-5 px-0.5">
        <h1
          className="text-[28px] font-light tracking-[-0.025em] leading-[1.1]"
          style={{ fontFamily: 'var(--font-display)', color: INK }}
        >
          Nieuw plan
        </h1>
        <div
          className="mt-1.5 text-[12px] tracking-[0.04em]"
          style={{ color: INK_MUTED }}
        >
          Template óf direct toewijzen aan een cliënt
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* ═══ Mode + preset ═══ */}
        <div
          className="rounded-[18px] p-4"
          style={{ background: CARD }}
        >
          {/* Mode toggle */}
          <SectionHeader>Type</SectionHeader>
          <div className="flex gap-1.5 mb-4">
            <button
              onClick={() => setIsTemplate(true)}
              className="flex-1 py-2.5 rounded-full text-[12.5px] font-medium transition-colors"
              style={
                isTemplate
                  ? {
                      background: LIME,
                      color: '#0A0E0B',
                      boxShadow:
                        'inset 0 1px 0 rgba(255,255,255,0.32), 0 1px 2px rgba(0,0,0,0.10)',
                    }
                  : { background: 'rgba(253,253,254,0.06)', color: INK_MUTED }
              }
            >
              Template
            </button>
            <button
              onClick={() => {
                setIsTemplate(false)
                loadClients()
              }}
              className="flex-1 py-2.5 rounded-full text-[12.5px] font-medium transition-colors"
              style={
                !isTemplate
                  ? {
                      background: LIME,
                      color: '#0A0E0B',
                      boxShadow:
                        'inset 0 1px 0 rgba(255,255,255,0.32), 0 1px 2px rgba(0,0,0,0.10)',
                    }
                  : { background: 'rgba(253,253,254,0.06)', color: INK_MUTED }
              }
            >
              Direct toewijzen
            </button>
          </div>

          {/* Client selector */}
          {!isTemplate && (
            <div className="mb-4">
              <FieldLabel>Cliënt</FieldLabel>
              {loadingClients ? (
                <div
                  className="flex items-center gap-2 text-[13px]"
                  style={{ color: INK_MUTED }}
                >
                  <Loader2 className="w-4 h-4 animate-spin" /> Laden...
                </div>
              ) : clients.length === 0 ? (
                <p className="text-[12.5px]" style={{ color: INK_DIM }}>
                  Geen cliënten gevonden
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {clients.map((c) => {
                    const selected = selectedClient === c.id
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedClient(c.id)}
                        className="rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors"
                        style={
                          selected
                            ? {
                                background: LIME,
                                color: '#0A0E0B',
                              }
                            : {
                                background: 'rgba(253,253,254,0.06)',
                                color: INK,
                              }
                        }
                      >
                        {c.full_name}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Presets */}
          <div>
            <FieldLabel>Snel starten</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="rounded-full px-3 py-1.5 text-[11.5px] font-medium transition-opacity active:opacity-70"
                  style={{
                    background: 'rgba(253,253,254,0.06)',
                    color: INK,
                  }}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ Basic info + macro targets ═══ */}
        <div
          className="rounded-[18px] p-4"
          style={{ background: CARD }}
        >
          <SectionHeader>Basis</SectionHeader>

          <div className="flex flex-col gap-3">
            <div>
              <FieldLabel>Naam</FieldLabel>
              <TextInput
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="bv. Afvallen — Calorie deficit"
              />
            </div>

            {/* Macro targets — 4 compact inputs */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <FieldLabel>
                  <span style={{ color: INK_DIM }}>kcal</span>
                </FieldLabel>
                <TextInput
                  type="number"
                  value={caloriesTarget}
                  onChange={(e) =>
                    setCaloriesTarget(parseInt(e.target.value) || 0)
                  }
                />
              </div>
              <div>
                <FieldLabel>
                  <span style={{ color: MACRO.protein }}>Eiwit (g)</span>
                </FieldLabel>
                <TextInput
                  type="number"
                  value={proteinG}
                  onChange={(e) => setProteinG(parseInt(e.target.value) || 0)}
                  style={{
                    background: 'rgba(192,252,1,0.06)',
                    border: '1px solid rgba(192,252,1,0.14)',
                  }}
                />
              </div>
              <div>
                <FieldLabel>
                  <span style={{ color: MACRO.carbs }}>Koolh (g)</span>
                </FieldLabel>
                <TextInput
                  type="number"
                  value={carbsG}
                  onChange={(e) => setCarbsG(parseInt(e.target.value) || 0)}
                  style={{
                    background: 'rgba(232,169,60,0.06)',
                    border: '1px solid rgba(232,169,60,0.14)',
                  }}
                />
              </div>
              <div>
                <FieldLabel>
                  <span style={{ color: MACRO.fat }}>Vet (g)</span>
                </FieldLabel>
                <TextInput
                  type="number"
                  value={fatG}
                  onChange={(e) => setFatG(parseInt(e.target.value) || 0)}
                  style={{
                    background: 'rgba(164,199,242,0.06)',
                    border: '1px solid rgba(164,199,242,0.14)',
                  }}
                />
              </div>
            </div>

            {/* Macro bar */}
            <div>
              <div
                className="flex h-2 rounded-full overflow-hidden"
                style={{ background: 'rgba(253,253,254,0.05)' }}
              >
                <div
                  style={{
                    width: `${(proteinCal / macroTotal) * 100}%`,
                    background: MACRO.protein,
                  }}
                />
                <div
                  style={{
                    width: `${(carbsCal / macroTotal) * 100}%`,
                    background: MACRO.carbs,
                  }}
                />
                <div
                  style={{
                    width: `${(fatCal / macroTotal) * 100}%`,
                    background: MACRO.fat,
                  }}
                />
              </div>
              <div
                className="flex justify-between text-[10.5px] mt-1.5 tabular-nums"
                style={{ color: INK_DIM }}
              >
                <span>
                  <span style={{ color: MACRO.protein }}>■</span> E {proteinPct}%
                </span>
                <span>
                  <span style={{ color: MACRO.carbs }}>■</span> K {carbsPct}%
                </span>
                <span>
                  <span style={{ color: MACRO.fat }}>■</span> V {fatPct}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ Meals ═══ */}
        <div>
          <div className="flex items-center justify-between mb-2 px-0.5">
            <h2
              className="text-[11px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: INK_DIM }}
            >
              Maaltijden
            </h2>
            <button
              onClick={addMeal}
              className="inline-flex items-center gap-1 rounded-full px-3 py-[5px] text-[11.5px] font-medium"
              style={{ background: 'rgba(192,252,1,0.14)', color: LIME }}
            >
              <Plus strokeWidth={1.75} className="w-3.5 h-3.5" />
              Maaltijd
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {meals.map((meal, mealIndex) => (
              <div
                key={mealIndex}
                className="rounded-[18px] p-3.5"
                style={{ background: CARD }}
              >
                {/* Meal header */}
                <div className="flex items-center gap-2 mb-2.5">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(253,253,254,0.06)' }}
                  >
                    <UtensilsCrossed
                      strokeWidth={1.75}
                      className="w-3.5 h-3.5"
                      style={{ color: INK_MUTED }}
                    />
                  </div>
                  <input
                    type="text"
                    value={meal.name}
                    onChange={(e) => updateMeal(mealIndex, 'name', e.target.value)}
                    className="flex-1 text-[13.5px] font-medium bg-transparent focus:outline-none"
                    style={{ color: INK }}
                  />
                  <input
                    type="time"
                    value={meal.time}
                    onChange={(e) => updateMeal(mealIndex, 'time', e.target.value)}
                    className="text-[11.5px] bg-transparent focus:outline-none tabular-nums"
                    style={{ color: INK_MUTED }}
                  />
                  <button
                    onClick={() => removeMeal(mealIndex)}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                    style={{ color: INK_DIM }}
                    aria-label="Verwijder maaltijd"
                  >
                    <Trash2 strokeWidth={1.75} className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Items */}
                {meal.items.length > 0 && (
                  <div className="flex flex-col gap-1.5 mb-2.5">
                    {meal.items.map((item, itemIndex) =>
                      item.per100g ? (
                        // Database food
                        <div
                          key={itemIndex}
                          className="flex items-center gap-2 p-2 rounded-xl"
                          style={{ background: 'rgba(253,253,254,0.05)' }}
                        >
                          <div
                            className="w-8 h-8 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
                            style={{ background: 'rgba(253,253,254,0.08)' }}
                          >
                            {item.image ? (
                              <Image
                                src={item.image}
                                alt=""
                                width={32}
                                height={32}
                                className="w-full h-full object-cover"
                                unoptimized
                                loading="lazy"
                              />
                            ) : (
                              <span className="text-[13px]">🍽️</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-[13px] font-medium truncate"
                              style={{ color: INK }}
                            >
                              {item.name}
                            </p>
                            <p
                              className="text-[10.5px] tabular-nums"
                              style={{ color: INK_DIM }}
                            >
                              {item.grams}g · {item.calories} kcal
                            </p>
                          </div>
                          <div
                            className="flex items-center gap-1 shrink-0 text-[10px] font-medium tabular-nums"
                          >
                            <span style={{ color: MACRO.protein }}>{item.protein}</span>
                            <span style={{ color: INK_DIM }}>·</span>
                            <span style={{ color: MACRO.carbs }}>{item.carbs}</span>
                            <span style={{ color: INK_DIM }}>·</span>
                            <span style={{ color: MACRO.fat }}>{item.fat}</span>
                          </div>
                          <button
                            onClick={() => removeMealItem(mealIndex, itemIndex)}
                            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                            style={{ color: INK_DIM }}
                          >
                            <Trash2 strokeWidth={1.75} className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        // Manual entry
                        <div
                          key={itemIndex}
                          className="flex flex-col gap-1.5 p-2 rounded-xl"
                          style={{ background: 'rgba(253,253,254,0.05)' }}
                        >
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) =>
                                updateMealItem(
                                  mealIndex,
                                  itemIndex,
                                  'name',
                                  e.target.value
                                )
                              }
                              placeholder="Voedingsmiddel"
                              className="flex-1 text-[13px] px-2 py-1.5 rounded-lg bg-transparent focus:outline-none"
                              style={{ color: INK }}
                            />
                            <button
                              onClick={() => removeMealItem(mealIndex, itemIndex)}
                              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                              style={{ color: INK_DIM }}
                            >
                              <Trash2 strokeWidth={1.75} className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="grid grid-cols-4 gap-1.5">
                            <input
                              type="number"
                              value={item.calories || ''}
                              onChange={(e) =>
                                updateMealItem(
                                  mealIndex,
                                  itemIndex,
                                  'calories',
                                  parseInt(e.target.value) || 0
                                )
                              }
                              placeholder="kcal"
                              className="text-[11.5px] px-2 py-1.5 rounded-lg focus:outline-none text-center tabular-nums"
                              style={{
                                background: 'rgba(253,253,254,0.05)',
                                color: INK,
                              }}
                            />
                            <input
                              type="number"
                              value={item.protein || ''}
                              onChange={(e) =>
                                updateMealItem(
                                  mealIndex,
                                  itemIndex,
                                  'protein',
                                  parseInt(e.target.value) || 0
                                )
                              }
                              placeholder="E"
                              className="text-[11.5px] px-2 py-1.5 rounded-lg focus:outline-none text-center tabular-nums"
                              style={{
                                background: 'rgba(192,252,1,0.08)',
                                color: MACRO.protein,
                              }}
                            />
                            <input
                              type="number"
                              value={item.carbs || ''}
                              onChange={(e) =>
                                updateMealItem(
                                  mealIndex,
                                  itemIndex,
                                  'carbs',
                                  parseInt(e.target.value) || 0
                                )
                              }
                              placeholder="K"
                              className="text-[11.5px] px-2 py-1.5 rounded-lg focus:outline-none text-center tabular-nums"
                              style={{
                                background: 'rgba(232,169,60,0.08)',
                                color: MACRO.carbs,
                              }}
                            />
                            <input
                              type="number"
                              value={item.fat || ''}
                              onChange={(e) =>
                                updateMealItem(
                                  mealIndex,
                                  itemIndex,
                                  'fat',
                                  parseInt(e.target.value) || 0
                                )
                              }
                              placeholder="V"
                              className="text-[11.5px] px-2 py-1.5 rounded-lg focus:outline-none text-center tabular-nums"
                              style={{
                                background: 'rgba(164,199,242,0.08)',
                                color: MACRO.fat,
                              }}
                            />
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* Food search */}
                {showFoodSearch === mealIndex && (
                  <div className="mb-2.5">
                    <FoodSearch
                      onSelect={(food, grams) =>
                        handleFoodSelected(food, grams, mealIndex)
                      }
                      onClose={() => setShowFoodSearch(null)}
                    />
                  </div>
                )}

                {/* Add buttons */}
                <div
                  className="flex items-center gap-2 pt-2"
                  style={{ borderTop: `1px solid ${HAIR}` }}
                >
                  <button
                    onClick={() =>
                      setShowFoodSearch(
                        showFoodSearch === mealIndex ? null : mealIndex
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11.5px] font-medium"
                    style={{
                      background: 'rgba(192,252,1,0.14)',
                      color: LIME,
                    }}
                  >
                    <Search strokeWidth={1.75} className="w-3.5 h-3.5" />
                    Zoeken
                  </button>
                  <button
                    onClick={() => addItemToMeal(mealIndex)}
                    className="inline-flex items-center gap-1 text-[11.5px] font-medium transition-opacity active:opacity-70"
                    style={{ color: INK_MUTED }}
                  >
                    <Plus strokeWidth={1.75} className="w-3.5 h-3.5" />
                    Handmatig
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          {totalFromItems.calories > 0 && (
            <div
              className="mt-3 rounded-[14px] px-4 py-3 flex items-center gap-3 text-[12px] tabular-nums"
              style={{ background: CARD_SOFT }}
            >
              <span style={{ color: INK_DIM }}>Totaal</span>
              <span className="font-semibold" style={{ color: INK }}>
                {totalFromItems.calories} kcal
              </span>
              <div className="flex-1" />
              <span style={{ color: MACRO.protein }}>
                {totalFromItems.protein}E
              </span>
              <span style={{ color: MACRO.carbs }}>
                {totalFromItems.carbs}K
              </span>
              <span style={{ color: MACRO.fat }}>{totalFromItems.fat}V</span>
            </div>
          )}
        </div>

        {/* ═══ Guidelines ═══ */}
        <div
          className="rounded-[18px] p-4"
          style={{ background: CARD }}
        >
          <SectionHeader>Richtlijnen</SectionHeader>
          <textarea
            value={guidelines}
            onChange={(e) => setGuidelines(e.target.value)}
            placeholder="Voeg richtlijnen toe voor de cliënt, bv. waterdoel, timing, supplementen..."
            rows={4}
            className="w-full px-3 py-2.5 rounded-xl text-[13.5px] resize-none"
            style={{
              background: 'rgba(253,253,254,0.05)',
              color: INK,
              border: '1px solid rgba(253,253,254,0.06)',
              outline: 'none',
            }}
          />
        </div>

        {/* ═══ Save bar ═══ */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => router.push('/coach/nutrition')}
            className="px-5 py-3 rounded-full text-[13px] font-medium transition-opacity active:opacity-70"
            style={{
              background: 'rgba(253,253,254,0.06)',
              color: INK_MUTED,
            }}
          >
            Annuleer
          </button>
          <button
            onClick={savePlan}
            disabled={!canSave}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-full text-[13px] font-semibold transition-opacity active:opacity-70 disabled:opacity-40"
            style={{
              background: LIME,
              color: '#0A0E0B',
              boxShadow:
                'inset 0 1px 0 rgba(255,255,255,0.32), 0 1px 2px rgba(0,0,0,0.10)',
            }}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Opslaan...
              </>
            ) : (
              <>
                <Save strokeWidth={2} className="w-4 h-4" />
                {isTemplate ? 'Template opslaan' : 'Plan toewijzen'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
