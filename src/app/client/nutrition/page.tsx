'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Check, ChevronLeft, ChevronRight, MessageSquare,
  Pencil, ChevronDown, ChevronUp, ArrowLeftRight
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────

interface FoodEntry {
  id: string
  name: string
  brand?: string | null
  image?: string | null
  grams: number
  per100g: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
}

interface MealMoment {
  id: string
  name: string
  time: string
  foods: FoodEntry[]
}

interface NutritionPlan {
  id: string
  title: string
  calories_target: number
  protein_g: number
  carbs_g: number
  fat_g: number
  meals: MealMoment[]
  guidelines: string | null
}

interface MealLog {
  meal_id: string
  meal_name: string
  completed: boolean
  foods_eaten: FoodEntry[]
  client_notes: string | null
  completed_at: string | null
}

interface DailySummary {
  meals_planned: number
  meals_completed: number
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
  daily_note: string | null
  mood: string | null
  water_liters: number | null
}

interface SearchProduct {
  barcode: string | null
  name: string
  brand: string | null
  image_small: string | null
  image: string | null
  serving_size: string | null
  quantity: string | null
  source: 'local' | 'openfoodfacts'
  per100g: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
    sugar: number
    salt: number
  }
}

interface SearchResponse {
  products: SearchProduct[]
}

// ─── Helpers ────────────────────────────────────────

function calcMacro(food: FoodEntry, key: 'calories' | 'protein' | 'carbs' | 'fat') {
  return Math.round((food.per100g[key] * food.grams) / 100)
}

function formatDate(date: Date) {
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)

  if (date.toDateString() === today.toDateString()) return 'Vandaag'
  if (date.toDateString() === yesterday.toDateString()) return 'Gisteren'
  if (date.toDateString() === tomorrow.toDateString()) return 'Morgen'
  return date.toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' })
}

const MOODS = [
  { key: 'great', label: 'Super' },
  { key: 'good', label: 'Goed' },
  { key: 'ok', label: 'Oké' },
  { key: 'bad', label: 'Minder' },
  { key: 'terrible', label: 'Slecht' },
]

// ─── Food Search Modal Component ────────────────────

function FoodSearchModal({
  isOpen,
  onClose,
  mode,
  originalGrams,
  mealId,
  foodId,
  plan,
  dateStr,
  logs,
  setLogs,
  setSummary,
}: {
  isOpen: boolean
  onClose: () => void
  mode: 'swap' | 'add'
  originalGrams?: number
  mealId: string
  foodId?: string
  plan: NutritionPlan | null
  dateStr: string
  logs: Map<string, MealLog>
  setLogs: (logs: Map<string, MealLog>) => void
  setSummary: (summary: DailySummary | null) => void
}) {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([])
  const [selectedProduct, setSelectedProduct] = useState<SearchProduct | null>(null)
  const [grams, setGrams] = useState(originalGrams || 100)
  const [loading, setLoading] = useState(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setSearchResults([])
      setSelectedProduct(null)
      setGrams(originalGrams || 100)
    }
  }, [isOpen, originalGrams])

  useEffect(() => {
    if (!isOpen) return

    clearTimeout(debounceTimer.current)

    if (query.trim() === '') {
      // Show popular products
      setLoading(true)
      fetch('/api/food-search?popular=true')
        .then(r => r.json())
        .then((data: SearchResponse) => {
          setSearchResults(data.products || [])
          setLoading(false)
        })
        .catch(err => {
          console.error('Popular search error:', err)
          setLoading(false)
        })
    } else {
      // Debounced search
      debounceTimer.current = setTimeout(() => {
        setLoading(true)
        fetch(`/api/food-search?q=${encodeURIComponent(query)}`)
          .then(r => r.json())
          .then((data: SearchResponse) => {
            setSearchResults(data.products || [])
            setLoading(false)
          })
          .catch(err => {
            console.error('Search error:', err)
            setLoading(false)
          })
      }, 300)
    }

    return () => clearTimeout(debounceTimer.current)
  }, [query, isOpen])

  async function handleConfirm() {
    if (!selectedProduct || !plan) return

    const meal = plan.meals.find(m => m.id === mealId)
    if (!meal) return

    const existing = logs.get(mealId)
    const currentFoods = existing?.foods_eaten || meal.foods || []

    let newFoods: FoodEntry[]
    if (mode === 'swap' && foodId) {
      newFoods = currentFoods.map(f => {
        if (f.id === foodId) {
          return {
            id: `${selectedProduct.barcode || selectedProduct.name}-${Date.now()}`,
            name: selectedProduct.name,
            brand: selectedProduct.brand,
            image: selectedProduct.image,
            grams,
            per100g: {
              calories: selectedProduct.per100g.calories,
              protein: selectedProduct.per100g.protein,
              carbs: selectedProduct.per100g.carbs,
              fat: selectedProduct.per100g.fat,
            },
          }
        }
        return f
      })
    } else {
      // add mode
      newFoods = [
        ...currentFoods,
        {
          id: `${selectedProduct.barcode || selectedProduct.name}-${Date.now()}`,
          name: selectedProduct.name,
          brand: selectedProduct.brand,
          image: selectedProduct.image,
          grams,
          per100g: {
            calories: selectedProduct.per100g.calories,
            protein: selectedProduct.per100g.protein,
            carbs: selectedProduct.per100g.carbs,
            fat: selectedProduct.per100g.fat,
          },
        },
      ]
    }

    try {
      const res = await fetch('/api/nutrition-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: plan.id,
          date: dateStr,
          meal_id: mealId,
          meal_name: meal.name,
          completed: existing?.completed || false,
          foods_eaten: newFoods,
          client_notes: existing?.client_notes || null,
        }),
      })

      if (res.ok) {
        const newLog: MealLog = {
          meal_id: mealId,
          meal_name: meal.name,
          completed: existing?.completed || false,
          foods_eaten: newFoods,
          client_notes: existing?.client_notes || null,
          completed_at: existing?.completed_at || null,
        }
        setLogs(new Map(logs.set(mealId, newLog)))

        // Refresh summary
        const sumRes = await fetch(`/api/nutrition-log?date=${dateStr}`)
        const sumData = await sumRes.json()
        if (sumData.summary) setSummary(sumData.summary)

        onClose()
      }
    } catch (err) {
      console.error('Save food error:', err)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl rounded-b-none flex flex-col max-h-[90vh] z-50">
        {/* Search input */}
        <div className="px-4 py-4 border-b border-[#F0F0EE]">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek voedingsmiddel..."
            autoFocus
            className="w-full px-3 py-2.5 border border-[#F0F0EE] rounded-xl text-[13px] text-[#1A1917] bg-white placeholder-[#C0C0C0] focus:outline-none focus:border-[#1A1917]"
            style={{ fontFamily: 'var(--font-body)' }}
          />
        </div>

        {/* Results list */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#C0C0C0] border-t-[#1A1917]" />
            </div>
          )}

          {!loading && searchResults.length === 0 && query && (
            <div className="py-8 text-center">
              <p className="text-[13px] text-[#ACACAC]" style={{ fontFamily: 'var(--font-body)' }}>
                Geen resultaten gevonden
              </p>
            </div>
          )}

          {!loading && searchResults.length > 0 && (
            <div>
              {searchResults.map((product, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedProduct(product)}
                  className={`w-full px-4 py-3 border-t border-[#F0F0EE] flex flex-col gap-1 transition-colors ${
                    selectedProduct === product ? 'bg-[rgba(212,106,58,0.06)]' : 'hover:bg-[#FAFAF8]'
                  }`}
                >
                  <div className="flex items-center gap-2 justify-between">
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-[14px] text-[#1A1917] truncate" style={{ fontFamily: 'var(--font-body)' }}>
                        {product.name}
                      </p>
                      {product.brand && (
                        <p className="text-[12px] text-[#ACACAC] truncate" style={{ fontFamily: 'var(--font-body)' }}>
                          {product.brand}
                        </p>
                      )}
                    </div>
                    {product.source === 'local' && (
                      <span className="px-2 py-0.5 bg-[#F0F0EE] text-[#ACACAC] rounded text-[10px] font-medium shrink-0" style={{ fontFamily: 'var(--font-body)' }}>
                        DB
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 text-[11px] text-[#C0C0C0]" style={{ fontFamily: 'var(--font-display)' }}>
                    <span>{Math.round(product.per100g.calories)} kcal</span>
                    <span>·</span>
                    <span>P {product.per100g.protein}g</span>
                    <span>·</span>
                    <span>K {product.per100g.carbs}g</span>
                    <span>·</span>
                    <span>V {product.per100g.fat}g</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selection and gram input */}
        {selectedProduct && (
          <div className="border-t border-[#F0F0EE] px-4 py-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-[12px] text-[#ACACAC] mb-1" style={{ fontFamily: 'var(--font-body)' }}>
                  Hoeveelheid (gram)
                </p>
                <input
                  type="number"
                  value={grams}
                  onChange={(e) => setGrams(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 border border-[#F0F0EE] rounded-xl text-[13px] text-[#1A1917] bg-white focus:outline-none focus:border-[#1A1917]"
                  style={{ fontFamily: 'var(--font-body)' }}
                />
              </div>
              <button
                onClick={handleConfirm}
                className="px-6 py-2.5 bg-[#1A1917] text-white rounded-xl text-[13px] font-medium"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Bevestigen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Component ──────────────────────────────────────

export default function ClientNutritionPage() {
  const [plan, setPlan] = useState<NutritionPlan | null>(null)
  const [logs, setLogs] = useState<Map<string, MealLog>>(new Map())
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)
  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [dailyNote, setDailyNote] = useState('')
  const [mood, setMood] = useState<string | null>(null)
  const [water, setWater] = useState<number>(0)
  const [savingMeal, setSavingMeal] = useState<string | null>(null)
  const [showDailyPanel, setShowDailyPanel] = useState(false)
  const [foodSearchModal, setFoodSearchModal] = useState<{
    isOpen: boolean
    mode: 'swap' | 'add'
    mealId: string | null
    foodId?: string
    originalGrams?: number
  }>({ isOpen: false, mode: 'add', mealId: null })

  const dateStr = selectedDate.toISOString().split('T')[0]

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load active plan
      const { data: planData } = await supabase
        .from('nutrition_plans')
        .select('*')
        .eq('client_id', user.id)
        .eq('is_active', true)
        .single()

      if (planData) {
        setPlan(planData)
      }

      // Load logs for this date
      const res = await fetch(`/api/nutrition-log?date=${dateStr}`)
      const data = await res.json()

      const logMap = new Map<string, MealLog>()
      for (const log of data.logs || []) {
        logMap.set(log.meal_id, log)
      }
      setLogs(logMap)

      if (data.summary) {
        setSummary(data.summary)
        setDailyNote(data.summary.daily_note || '')
        setMood(data.summary.mood || null)
        setWater(data.summary.water_liters || 0)
      } else {
        setSummary(null)
        setDailyNote('')
        setMood(null)
        setWater(0)
      }
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }, [dateStr])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function toggleMealComplete(meal: MealMoment) {
    const existing = logs.get(meal.id)
    const nowCompleted = !existing?.completed

    setSavingMeal(meal.id)

    try {
      const res = await fetch('/api/nutrition-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: plan?.id,
          date: dateStr,
          meal_id: meal.id,
          meal_name: meal.name,
          completed: nowCompleted,
          foods_eaten: existing?.foods_eaten || meal.foods || [],
          client_notes: existing?.client_notes || null,
        }),
      })

      if (res.ok) {
        const newLog: MealLog = {
          meal_id: meal.id,
          meal_name: meal.name,
          completed: nowCompleted,
          foods_eaten: existing?.foods_eaten || meal.foods || [],
          client_notes: existing?.client_notes || null,
          completed_at: nowCompleted ? new Date().toISOString() : null,
        }
        setLogs(new Map(logs.set(meal.id, newLog)))

        // Refresh summary
        const sumRes = await fetch(`/api/nutrition-log?date=${dateStr}`)
        const sumData = await sumRes.json()
        if (sumData.summary) setSummary(sumData.summary)
      }
    } catch (err) {
      console.error('Toggle error:', err)
    } finally {
      setSavingMeal(null)
    }
  }

  async function saveNotes(mealId: string) {
    const meal = plan?.meals.find(m => m.id === mealId)
    if (!meal) return

    const existing = logs.get(mealId)

    try {
      await fetch('/api/nutrition-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: plan?.id,
          date: dateStr,
          meal_id: mealId,
          meal_name: meal.name,
          completed: existing?.completed || false,
          foods_eaten: existing?.foods_eaten || meal.foods || [],
          client_notes: noteText.trim() || null,
        }),
      })

      const newLog: MealLog = {
        ...(existing || { meal_id: mealId, meal_name: meal.name, completed: false, foods_eaten: meal.foods || [], completed_at: null }),
        client_notes: noteText.trim() || null,
      }
      setLogs(new Map(logs.set(mealId, newLog)))
      setEditingNotes(null)
    } catch (err) {
      console.error('Save notes error:', err)
    }
  }

  async function saveDailySummary() {
    try {
      await fetch('/api/nutrition-log', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateStr,
          daily_note: dailyNote.trim() || null,
          mood,
          water_liters: water || null,
        }),
      })
    } catch (err) {
      console.error('Save daily error:', err)
    }
  }

  function navigateDate(offset: number) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + offset)
    setSelectedDate(d)
  }

  // ─── Calculations ─────────────────────────────────

  const meals = plan?.meals || []
  const completedCount = Array.from(logs.values()).filter(l => l.completed).length
  const allDone = meals.length > 0 && completedCount === meals.length

  const actualCal = summary?.total_calories || 0
  const actualProt = summary?.total_protein || 0
  const actualCarbs = summary?.total_carbs || 0
  const actualFat = summary?.total_fat || 0

  const targetCal = plan?.calories_target || 0
  const targetProt = plan?.protein_g || 0
  const targetCarbs = plan?.carbs_g || 0
  const targetFat = plan?.fat_g || 0

  const calPct = targetCal > 0 ? Math.min((actualCal / targetCal) * 100, 100) : 0

  // ─── Render ───────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#C0C0C0] border-t-[#1A1917]" />
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="pb-28">
        <h1
          className="text-[28px] tracking-[-0.5px] leading-[1.1] text-[#1A1917] mb-6"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
        >
          Voeding
        </h1>
        <div className="py-16 text-center">
          <p
            className="text-[36px] tracking-[-1px] leading-[1.1] text-[#1A1917] mb-3"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
          >
            Nog geen plan
          </p>
          <p className="text-[14px] text-[#ACACAC]" style={{ fontFamily: 'var(--font-body)' }}>
            Je coach bereidt je voedingsplan voor.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-28">

      {/* ── Hero Section ── */}
      <div className="animate-slide-up mb-10">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-1.5 mb-4 mt-2 group"
        >
          <ChevronLeft strokeWidth={1.5} className="w-[18px] h-[18px] text-[#C0C0C0] group-hover:text-[#1A1917] transition-colors" />
          <span className="text-[14px] text-[#C0C0C0] group-hover:text-[#1A1917] transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
            Home
          </span>
        </button>

        <p className="text-label mb-2">Voeding</p>
        <h1 className="page-title">
          Voeding
        </h1>

        {/* ── Date nav ── */}
        <div className="flex items-center gap-4">
        <button onClick={() => navigateDate(-1)} className="p-1 text-[#D0D0D0] hover:text-[#1A1917] transition-colors">
          <ChevronLeft strokeWidth={1.5} className="w-4 h-4" />
        </button>
        <span
          className="text-[14px] font-medium text-[#1A1917]"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {formatDate(selectedDate)}
        </span>
        <button onClick={() => navigateDate(1)} className="p-1 text-[#D0D0D0] hover:text-[#1A1917] transition-colors">
          <ChevronRight strokeWidth={1.5} className="w-4 h-4" />
        </button>
        </div>
      </div>

      {/* ── HERO: Calorie number ── */}
      <div className="mb-9 animate-slide-up stagger-2">
        <p
          className="text-[52px] leading-[0.9] tracking-[-2px]"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            color: allDone ? '#3D8B5C' : '#1A1917',
          }}
        >
          {actualCal.toLocaleString('nl-NL')}
        </p>
        <p
          className="text-[16px] font-light text-[#ACACAC] mt-1.5 tracking-[0.01em]"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          / {targetCal.toLocaleString('nl-NL')} kcal
        </p>

        {/* Thin progress bar */}
        <div className="w-full h-[3px] bg-[#F0F0EE] rounded-full mt-5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${calPct}%`,
              backgroundColor: allDone ? '#3D8B5C' : '#D46A3A',
            }}
          />
        </div>
      </div>

      {/* ── Macro row ── */}
      <div className="flex border-t border-[#F0F0EE] pt-6 mb-12 animate-slide-up stagger-3">
        {[
          { label: 'EIWIT', actual: actualProt, target: targetProt, unit: 'g' },
          { label: 'KOOLH', actual: actualCarbs, target: targetCarbs, unit: 'g' },
          { label: 'VET', actual: actualFat, target: targetFat, unit: 'g' },
        ].map((macro, i) => (
          <div key={macro.label} className={`flex-1 ${i > 0 ? 'pl-5 border-l border-[#F0F0EE]' : ''}`}>
            <p
              className="text-[18px] tracking-[-0.5px]"
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                color: allDone && macro.actual >= macro.target * 0.9 ? '#3D8B5C' : '#1A1917',
              }}
            >
              {macro.actual}
            </p>
            <p className="text-[12px] text-[#C0C0C0] mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
              / {macro.target}{macro.unit}
            </p>
            <p
              className="text-[11px] text-[#C0C0C0] uppercase tracking-[0.5px] mt-1.5"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {macro.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Meals section ── */}
      <p
        className="text-[12px] font-medium text-[#B0B0B0] uppercase tracking-[1.5px] mb-4 animate-slide-up stagger-6"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        Maaltijden
      </p>

      <div className="mb-4 animate-slide-up stagger-7">
        {meals.map((meal) => {
          const log = logs.get(meal.id)
          const isCompleted = log?.completed || false
          const isExpanded = expandedMeal === meal.id
          const isSaving = savingMeal === meal.id
          const hasNotes = log?.client_notes

          const foods = meal.foods || []
          const mealCal = foods.reduce((s, f) => s + calcMacro(f, 'calories'), 0)

          return (
            <div key={meal.id}>
              {/* Meal row */}
              <div className="flex items-center gap-3.5 py-4 border-t border-[#F0F0EE]">
                {/* Circle checkbox */}
                <button
                  onClick={() => toggleMealComplete(meal)}
                  disabled={isSaving}
                  className={`w-7 h-7 rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition-all ${
                    isCompleted
                      ? 'bg-[#1A1917] border-[#1A1917]'
                      : 'border-[#E0E0E0] hover:border-[#1A1917]'
                  } ${isSaving ? 'opacity-50' : ''}`}
                >
                  {isCompleted && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {isSaving && (
                    <div className="w-3 h-3 border-[1.5px] border-[#C0C0C0] border-t-[#1A1917] rounded-full animate-spin" />
                  )}
                </button>

                {/* Meal info */}
                <button
                  onClick={() => setExpandedMeal(isExpanded ? null : meal.id)}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-[15px] font-medium truncate ${
                        isCompleted ? 'text-[#ACACAC] line-through decoration-[#D5D5D5]' : 'text-[#1A1917]'
                      }`}
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {meal.name}
                    </p>
                    {hasNotes && (
                      <MessageSquare strokeWidth={1.5} className="w-3 h-3 text-[#C0C0C0] shrink-0" />
                    )}
                  </div>
                  <p className="text-[12px] text-[#C0C0C0] mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                    {meal.time} · {foods.length} items
                  </p>
                </button>

                {/* Kcal on right */}
                <div className="shrink-0 text-right">
                  <span
                    className={`text-[14px] ${isCompleted ? 'text-[#C0C0C0]' : 'text-[#1A1917]'}`}
                    style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
                  >
                    {mealCal}
                  </span>
                  <span className="text-[11px] text-[#C0C0C0] ml-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                    kcal
                  </span>
                </div>
              </div>

              {/* Expanded: food details */}
              {isExpanded && (
                <div className="pl-[42px] pb-4 border-b border-[#F0F0EE]">
                  {foods.map((food) => (
                    <div key={food.id} className="flex items-center justify-between py-2 group">
                      <div className="flex items-center gap-1.5 flex-1">
                        <span className="text-[13px] text-[#1A1917]" style={{ fontFamily: 'var(--font-body)' }}>
                          {food.name}
                        </span>
                        <span className="text-[11px] text-[#C0C0C0]" style={{ fontFamily: 'var(--font-body)' }}>
                          {food.grams}g
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-[#ACACAC]" style={{ fontFamily: 'var(--font-body)' }}>
                          {calcMacro(food, 'calories')} kcal
                        </span>
                        <button
                          onClick={() => setFoodSearchModal({
                            isOpen: true,
                            mode: 'swap',
                            mealId: meal.id,
                            foodId: food.id,
                            originalGrams: food.grams,
                          })}
                          className="p-1 text-[#C0C0C0] hover:text-[#1A1917] transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <ArrowLeftRight strokeWidth={1.5} className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add food button */}
                  <button
                    onClick={() => setFoodSearchModal({
                      isOpen: true,
                      mode: 'add',
                      mealId: meal.id,
                      originalGrams: 100,
                    })}
                    className="mt-3 px-3 py-2 text-[13px] text-[#D46A3A] font-medium hover:bg-[rgba(212,106,58,0.06)] rounded-lg transition-colors"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    + Voeg item toe
                  </button>

                  {/* Notes in expanded view */}
                  <div className="mt-2">
                    {editingNotes === meal.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Notitie..."
                          rows={2}
                          autoFocus
                          className="w-full px-3 py-2 border border-[#F0F0EE] rounded-xl text-[13px] text-[#1A1917] bg-white placeholder-[#C0C0C0] focus:outline-none focus:border-[#1A1917] resize-none"
                          style={{ fontFamily: 'var(--font-body)' }}
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setEditingNotes(null)}
                            className="px-3 py-1.5 text-[12px] text-[#ACACAC]"
                            style={{ fontFamily: 'var(--font-body)' }}
                          >
                            Annuleer
                          </button>
                          <button
                            onClick={() => saveNotes(meal.id)}
                            className="px-3 py-1.5 rounded-xl bg-[#1A1917] text-white text-[12px] font-medium"
                            style={{ fontFamily: 'var(--font-body)' }}
                          >
                            Opslaan
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setNoteText(log?.client_notes || '')
                          setEditingNotes(meal.id)
                        }}
                        className="flex items-center gap-1.5 text-[12px] text-[#C0C0C0] hover:text-[#1A1917] transition-colors pt-1"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        <Pencil strokeWidth={1.5} className="w-3 h-3" />
                        {hasNotes ? (
                          <span className="text-[#1A1917]">{log?.client_notes}</span>
                        ) : (
                          <span>Notitie toevoegen</span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Daily note row ── */}
      <button
        onClick={() => setShowDailyPanel(!showDailyPanel)}
        className="w-full flex items-center gap-3 py-[18px] border-t border-[#F0F0EE] mt-3 hover:opacity-70 transition-opacity"
      >
        <div
          className="w-[6px] h-[6px] rounded-full shrink-0"
          style={{ backgroundColor: allDone ? '#3D8B5C' : '#D46A3A' }}
        />
        <div className="flex-1 text-left">
          <p className="text-[14px] font-medium text-[#1A1917]" style={{ fontFamily: 'var(--font-body)' }}>
            Dagnotitie
          </p>
          <p className="text-[12px] text-[#C0C0C0] mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
            {mood ? MOODS.find(m => m.key === mood)?.label : ''}
            {mood && dailyNote ? ' · ' : ''}
            {dailyNote ? dailyNote.slice(0, 40) + (dailyNote.length > 40 ? '...' : '') : (mood ? '' : 'Hoe ging je dag?')}
          </p>
        </div>
        <ChevronRight strokeWidth={1.5} className="w-4 h-4 text-[#D5D5D5] shrink-0" />
      </button>

      {/* ── Daily panel (expanded) ── */}
      {showDailyPanel && (
        <div className="border-t border-[#F0F0EE] pt-6 pb-4 space-y-6">
          {/* Mood */}
          <div>
            <p
              className="text-[11px] text-[#C0C0C0] uppercase tracking-[1px] mb-3"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Hoe voel je je vandaag?
            </p>
            <div className="flex gap-2">
              {MOODS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => { setMood(m.key); setTimeout(saveDailySummary, 100) }}
                  className={`flex-1 py-2.5 text-center text-[12px] font-medium transition-all border rounded-xl ${
                    mood === m.key
                      ? 'border-[#1A1917] bg-[#1A1917] text-white'
                      : 'border-[#F0F0EE] text-[#ACACAC] hover:border-[#C0C0C0]'
                  }`}
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Water */}
          <div>
            <p
              className="text-[11px] text-[#C0C0C0] uppercase tracking-[1px] mb-3"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Water (liter)
            </p>
            <div className="flex items-center gap-2">
              {[0.5, 1, 1.5, 2, 2.5, 3].map((l) => (
                <button
                  key={l}
                  onClick={() => { setWater(l); setTimeout(saveDailySummary, 100) }}
                  className={`flex-1 py-2 text-center text-[13px] font-medium transition-all border rounded-xl ${
                    water === l
                      ? 'border-[#D46A3A] bg-[rgba(212,106,58,0.06)] text-[#D46A3A]'
                      : 'border-[#F0F0EE] text-[#ACACAC] hover:border-[#C0C0C0]'
                  }`}
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {l}L
                </button>
              ))}
            </div>
          </div>

          {/* Daily note textarea */}
          <div>
            <p
              className="text-[11px] text-[#C0C0C0] uppercase tracking-[1px] mb-3"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Dagnotitie voor je coach
            </p>
            <textarea
              value={dailyNote}
              onChange={(e) => setDailyNote(e.target.value)}
              onBlur={saveDailySummary}
              placeholder="Hoe ging het vandaag? Honger gehad? Iets vervangen?"
              rows={3}
              className="w-full px-4 py-3 border border-[#F0F0EE] rounded-xl text-[13px] text-[#1A1917] bg-white placeholder-[#C0C0C0] focus:outline-none focus:border-[#1A1917] resize-none"
              style={{ fontFamily: 'var(--font-body)' }}
            />
          </div>
        </div>
      )}

      {/* ── Guidelines ── */}
      {plan.guidelines && (
        <div className="border-t border-[#F0F0EE] pt-5 mt-4">
          <p
            className="text-[11px] text-[#C0C0C0] uppercase tracking-[1px] mb-2"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Richtlijnen
          </p>
          <p
            className="text-[13px] text-[#ACACAC] leading-relaxed whitespace-pre-wrap"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {plan.guidelines}
          </p>
        </div>
      )}

      {/* Food Search Modal */}
      <FoodSearchModal
        isOpen={foodSearchModal.isOpen}
        onClose={() => setFoodSearchModal({ isOpen: false, mode: 'add', mealId: null })}
        mode={foodSearchModal.mode}
        originalGrams={foodSearchModal.originalGrams}
        mealId={foodSearchModal.mealId || ''}
        foodId={foodSearchModal.foodId}
        plan={plan}
        dateStr={dateStr}
        logs={logs}
        setLogs={setLogs}
        setSummary={setSummary}
      />
    </div>
  )
}
