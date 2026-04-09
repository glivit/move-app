'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import {
  ChevronLeft, ChevronRight, Plus, X, Search, ScanBarcode,
  Check, Trash2, Copy, ArrowLeft, ShoppingCart, ChevronDown
} from 'lucide-react'
import { invalidateCache } from '@/lib/fetcher'

// ─── Types ──────────────────────────────────────────

interface FoodEntry {
  id: string
  name: string
  brand?: string | null
  image?: string | null
  grams: number
  checked?: boolean
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
}

interface SearchProduct {
  barcode: string | null
  name: string
  brand: string | null
  image_small: string | null
  image: string | null
  serving_size: string | null
  serving_label: string | null
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

interface RecentFood {
  name: string
  brand?: string | null
  frequency: number
  per100g: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
}

// ─── Helpers ────────────────────────────────────────

function calcMacro(food: FoodEntry, key: 'calories' | 'protein' | 'carbs' | 'fat') {
  return Math.round((food.per100g[key] * food.grams) / 100)
}

function ensureMealId(meal: any, index: number): string {
  return meal.id || `meal-${index}-${(meal.name || '').toLowerCase().replace(/\s+/g, '-')}`
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
  return date.toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' })
}

function mealCalories(foods: FoodEntry[]) {
  return foods.reduce((s, f) => s + calcMacro(f, 'calories'), 0)
}

// ─── Shopping List Component ──────────────────────────────

interface ShoppingItem {
  name: string
  brand?: string | null
  weeklyGrams: number
  unit: string
  category: 'supplements' | 'snacks' | 'maaltijden'
  checked: boolean
}

const SUPPLEMENT_KEYWORDS = ['whey', 'isoclear', 'creatine', 'casein', 'protein powder', 'pre-workout', 'bcaa', 'eaa']
const SNACK_KEYWORDS = ['noten', 'cashew', 'amandel', 'walnot', 'pinda', 'granola', 'bar', 'reep', 'rijstwafel', 'pudding', 'banaan', 'appel', 'fruit', 'yoghurt', 'skyr', 'hüttenkäse', 'borrelnoot']

function categorizeFood(name: string, brand?: string | null): 'supplements' | 'snacks' | 'maaltijden' {
  const n = `${name} ${brand || ''}`.toLowerCase()
  if (SUPPLEMENT_KEYWORDS.some(k => n.includes(k))) return 'supplements'
  if (SNACK_KEYWORDS.some(k => n.includes(k))) return 'snacks'
  return 'maaltijden'
}

function gramsToUnit(grams: number, name: string): { amount: string; unit: string } {
  const n = name.toLowerCase()
  if (n.includes('banaan')) return { amount: String(Math.ceil(grams / 120)), unit: 'stuks' }
  if (n.includes('appel')) return { amount: String(Math.ceil(grams / 150)), unit: 'stuks' }
  if (n.includes('ei ') || n === 'ei') return { amount: String(Math.ceil(grams / 60)), unit: 'stuks' }
  if (n.includes('wrap')) return { amount: String(Math.ceil(grams / 60)), unit: 'stuks' }
  if (n.includes('broodje') || n.includes('brood')) return { amount: String(Math.ceil(grams / 35)), unit: 'sneden' }
  if (n.includes('stoommaaltijd')) return { amount: String(Math.ceil(grams / 450)), unit: 'stuks' }
  if (n.includes('bar') || n.includes('reep')) return { amount: String(Math.ceil(grams / 50)), unit: 'stuks' }
  if (n.includes('pudding') && (n.includes('ehrmann') || n.includes('melkunie'))) return { amount: String(Math.ceil(grams / 200)), unit: 'bakjes' }
  if (grams >= 1000) return { amount: (grams / 1000).toFixed(1).replace('.0', ''), unit: 'kg' }
  return { amount: String(Math.round(grams)), unit: 'g' }
}

function WeeklyShoppingList({ meals }: { meals: MealMoment[] }) {
  const [open, setOpen] = useState(false)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())

  const shoppingItems = useMemo(() => {
    const foodMap = new Map<string, { name: string; brand?: string | null; totalGrams: number; category: 'supplements' | 'snacks' | 'maaltijden' }>()

    meals.forEach(meal => {
      (meal.foods || []).forEach(food => {
        const key = `${food.name}||${food.brand || ''}`
        const existing = foodMap.get(key)
        if (existing) {
          existing.totalGrams += food.grams * 7
        } else {
          foodMap.set(key, {
            name: food.name,
            brand: food.brand,
            totalGrams: food.grams * 7,
            category: categorizeFood(food.name, food.brand),
          })
        }
      })
    })

    return Array.from(foodMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'nl'))
  }, [meals])

  const categories = useMemo(() => {
    const supplements = shoppingItems.filter(i => i.category === 'supplements')
    const snacks = shoppingItems.filter(i => i.category === 'snacks')
    const maaltijden = shoppingItems.filter(i => i.category === 'maaltijden')
    return [
      { key: 'supplements', label: 'Supplementen', icon: '💊', items: supplements },
      { key: 'snacks', label: 'Snacks', icon: '🥜', items: snacks },
      { key: 'maaltijden', label: 'Maaltijden', icon: '🍽️', items: maaltijden },
    ].filter(c => c.items.length > 0)
  }, [shoppingItems])

  const totalItems = shoppingItems.length
  const checkedCount = checkedItems.size

  function toggleItem(key: string) {
    setCheckedItems(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (meals.length === 0) return null

  return (
    <div className="border-t border-[#F0F0EE] pt-5 mt-6">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-2 group"
      >
        <div className="flex items-center gap-2.5">
          <ShoppingCart strokeWidth={1.5} className="w-4 h-4 text-[#D46A3A]" />
          <span className="text-[13px] font-semibold text-[#1A1917] tracking-tight">Boodschappenlijst</span>
          <span className="text-[11px] text-[#B0B0B0] font-medium">
            {checkedCount > 0 ? `${checkedCount}/${totalItems}` : `${totalItems} items`}
          </span>
        </div>
        <ChevronDown
          strokeWidth={1.5}
          className={`w-4 h-4 text-[#C0C0C0] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="mt-3 space-y-5 pb-4">
          <p className="text-[11px] text-[#B0B0B0] uppercase tracking-[0.1em]">
            Weekoverzicht — 7 dagen
          </p>

          {categories.map(cat => (
            <div key={cat.key}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[13px]">{cat.icon}</span>
                <span className="text-[12px] font-semibold text-[#8A8A8A] uppercase tracking-[0.06em]">{cat.label}</span>
              </div>
              <div className="space-y-0.5">
                {cat.items.map(item => {
                  const key = `${item.name}||${item.brand || ''}`
                  const isChecked = checkedItems.has(key)
                  const { amount, unit } = gramsToUnit(item.totalGrams, item.name)

                  return (
                    <button
                      key={key}
                      onClick={() => toggleItem(key)}
                      className={`w-full flex items-center gap-3 py-2.5 px-2 rounded-lg text-left transition-colors ${
                        isChecked ? 'bg-[#F5F5F3]' : 'hover:bg-[#FAFAF8]'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                        isChecked
                          ? 'bg-[#3D8B5C] border-[#3D8B5C]'
                          : 'border-[#D5D5D5]'
                      }`}>
                        {isChecked && <Check strokeWidth={3} className="w-3 h-3 text-white" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] leading-tight truncate ${
                          isChecked ? 'line-through text-[#B0B0B0]' : 'text-[#1A1917]'
                        }`}>
                          {item.name}
                        </p>
                        {item.brand && (
                          <p className="text-[11px] text-[#B0B0B0] truncate">{item.brand}</p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-[13px] font-medium tabular-nums ${
                          isChecked ? 'text-[#C0C0C0]' : 'text-[#1A1917]'
                        }`}>{amount}</span>
                        <span className={`text-[11px] ml-0.5 ${
                          isChecked ? 'text-[#D5D5D5]' : 'text-[#B0B0B0]'
                        }`}>{unit}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {checkedCount > 0 && (
            <div className="pt-2">
              <div className="h-1.5 bg-[#F0F0EE] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#3D8B5C] rounded-full transition-all duration-300"
                  style={{ width: `${(checkedCount / totalItems) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-[#B0B0B0] mt-1.5 text-center">
                {checkedCount === totalItems ? 'Alles ingekocht! ✓' : `${checkedCount} van ${totalItems} ingekocht`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Bottom Sheet Component ──────────────────────────

function AddFoodBottomSheet({
  isOpen,
  onClose,
  meal,
  plan,
  dateStr,
  logs,
  setLogs,
  setSummary,
  recentFoods,
}: {
  isOpen: boolean
  onClose: () => void
  meal: MealMoment | null
  plan: NutritionPlan | null
  dateStr: string
  logs: Map<string, MealLog>
  setLogs: (logs: Map<string, MealLog>) => void
  setSummary: (summary: DailySummary | null) => void
  recentFoods: RecentFood[]
}) {
  const [tab, setTab] = useState<'recent' | 'search'>('recent')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [addingProduct, setAddingProduct] = useState<string | null>(null)
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set())
  const [selectedProduct, setSelectedProduct] = useState<SearchProduct | null>(null)
  const [portionGrams, setPortionGrams] = useState('100')
  const [scanning, setScanning] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const sheetRef = useRef<HTMLDivElement>(null)

  // No auto-focus on search tab — prevents keyboard from resizing the sheet on iOS
  // User taps the input field themselves when ready

  useEffect(() => {
    if (!isOpen || tab !== 'search') return
    clearTimeout(debounceRef.current)

    if (query.trim() === '') {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(() => {
      setLoading(true)
      fetch(`/api/food-search?q=${encodeURIComponent(query)}`)
        .then(r => r.json())
        .then(d => { setResults(d.products || []); setLoading(false) })
        .catch(() => setLoading(false))
    }, 250)

    return () => clearTimeout(debounceRef.current)
  }, [query, isOpen, tab])

  async function addFood(product: SearchProduct | RecentFood, grams: number) {
    if (!plan || !meal || addingProduct) return
    const key = 'barcode' in product ? (product.barcode || product.name) : product.name
    setAddingProduct(key)

    const existing = logs.get(meal.id)
    const currentFoods = existing?.foods_eaten || meal.foods || []

    const newFood: FoodEntry = {
      id: `${key}-${Date.now()}`,
      name: product.name,
      brand: product.brand,
      image: 'image' in product ? product.image : undefined,
      grams,
      checked: false,
      per100g: {
        calories: product.per100g.calories,
        protein: product.per100g.protein,
        carbs: product.per100g.carbs,
        fat: product.per100g.fat,
      },
    }

    const newFoods = [...currentFoods, newFood]

    // Optimistic update: show the food immediately
    const newLog: MealLog = {
      meal_id: meal.id,
      meal_name: meal.name,
      completed: existing?.completed || false,
      foods_eaten: newFoods,
      client_notes: existing?.client_notes || null,
      completed_at: existing?.completed_at || null,
    }
    const upd = new Map(logs)
    upd.set(meal.id, newLog)
    setLogs(upd)

    setJustAdded(prev => new Set(prev).add(key))
    setTimeout(() => setJustAdded(prev => { const n = new Set(prev); n.delete(key); return n }), 1000)

    try {
      const res = await fetch('/api/nutrition-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: plan.id,
          date: dateStr,
          meal_id: meal.id,
          meal_name: meal.name,
          completed: existing?.completed || false,
          foods_eaten: newFoods,
          client_notes: existing?.client_notes || null,
        }),
      })

      if (res.ok) {
        invalidateCache('/api/dashboard')
      }
    } catch (err) {
      console.error('Add food error:', err)
    } finally {
      setAddingProduct(null)
    }
  }

  async function handleDragDown(e: React.TouchEvent) {
    const startY = e.touches[0].clientY
    const startTransform = sheetRef.current?.style.transform || 'translateY(0)'

    const handleTouchMove = (moveEvent: TouchEvent) => {
      const currentY = moveEvent.touches[0].clientY
      const diff = currentY - startY
      if (diff > 0) {
        if (sheetRef.current) {
          sheetRef.current.style.transform = `translateY(${diff}px)`
        }
      }
    }

    const handleTouchEnd = (endEvent: TouchEvent) => {
      const endY = endEvent.changedTouches[0].clientY
      const diff = endY - startY
      if (diff > 100) {
        onClose()
      } else if (sheetRef.current) {
        sheetRef.current.style.transform = startTransform
      }
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }

    document.addEventListener('touchmove', handleTouchMove)
    document.addEventListener('touchend', handleTouchEnd)
  }

  if (!isOpen || !meal) return null

  return (
    <div className="fixed inset-0 z-50" style={{ pointerEvents: isOpen ? 'auto' : 'none', touchAction: 'none' }}>
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/20 transition-opacity duration-300"
        onClick={onClose}
        style={{ opacity: isOpen ? 1 : 0 }}
      />

      {/* Sheet — fixed 75% height, doesn't jump with keyboard */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl transition-transform duration-300"
        style={{
          height: '75%',
          display: isOpen ? 'flex' : 'none',
          flexDirection: 'column',
          transform: 'translateY(0)',
        }}
      >
        {/* Drag handle */}
        <div
          onTouchStart={handleDragDown}
          className="flex justify-center py-3 cursor-grab active:cursor-grabbing"
        >
          <div className="w-10 h-1 bg-[#D0D0D0] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-[#F0F0EE]">
          <h2 className="text-[15px] font-semibold text-[#1A1917]">{meal.name} toevoegen</h2>
          <button onClick={onClose} className="p-1.5 text-[#C0C0C0] hover:text-[#1A1917] transition-colors">
            <X strokeWidth={1.5} className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-4 py-3 border-b border-[#F0F0EE]">
          <button
            onClick={() => setTab('recent')}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
              tab === 'recent'
                ? 'bg-[#F5F5F3] text-[#1A1917]'
                : 'text-[#B0B0B0]'
            }`}
          >
            Recent
          </button>
          <button
            onClick={() => setTab('search')}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
              tab === 'search'
                ? 'bg-[#F5F5F3] text-[#1A1917]'
                : 'text-[#B0B0B0]'
            }`}
          >
            Zoeken
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'recent' && (
            <div className="divide-y divide-[#F0F0EE]">
              {recentFoods.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-[13px] text-[#B0B0B0]">Geen recente items</p>
                </div>
              ) : (
                recentFoods.map((food, idx) => {
                  const key = food.name
                  const isAdding = addingProduct === key
                  const wasAdded = justAdded.has(key)
                  const displayCal = Math.round(food.per100g.calories)

                  return (
                    <div key={idx} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] text-[#1A1917] font-medium truncate">{food.name}</p>
                        <p className="text-[12px] text-[#B0B0B0] mt-0.5">
                          {displayCal} kcal
                          {food.brand && <span> · {food.brand}</span>}
                        </p>
                      </div>

                      <button
                        onClick={() => addFood(food, 100)}
                        disabled={isAdding}
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                          wasAdded
                            ? 'bg-[#E8F5E9] text-[#3D8B5C]'
                            : 'bg-[#F5F5F3] text-[#1A1917] hover:bg-[#EBEBEA] active:scale-95'
                        }`}
                      >
                        {isAdding ? (
                          <div className="w-3.5 h-3.5 border-[1.5px] border-[#C0C0C0] border-t-[#1A1917] rounded-full animate-spin" />
                        ) : wasAdded ? (
                          <Check strokeWidth={2} className="w-4 h-4" />
                        ) : (
                          <Plus strokeWidth={2} className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {tab === 'search' && (
            <div className="px-4 py-3 space-y-3">
              <div className="relative">
                <Search strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C0C0C0]" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Zoek voedingsmiddel..."
                  className="w-full pl-9 pr-3 py-2.5 bg-[#F5F5F3] rounded-xl text-[14px] text-[#1A1917] placeholder-[#C0C0C0] focus:outline-none focus:ring-2 focus:ring-[#1A1917]/10"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5">
                    <X strokeWidth={1.5} className="w-3.5 h-3.5 text-[#C0C0C0]" />
                  </button>
                )}
              </div>

              {/* Loading shimmer */}
              {loading && (
                <div className="space-y-1">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center justify-between py-3 animate-pulse">
                      <div className="flex-1">
                        <div className="h-3.5 w-32 bg-[#F0F0EE] rounded mb-1.5" />
                        <div className="h-2.5 w-48 bg-[#F0F0EE] rounded" />
                      </div>
                      <div className="w-8 h-8 rounded-full bg-[#F0F0EE]" />
                    </div>
                  ))}
                </div>
              )}

              {/* No results */}
              {!loading && results.length === 0 && query && (
                <div className="py-12 text-center">
                  <p className="text-[13px] text-[#B0B0B0]">Geen resultaten gevonden</p>
                </div>
              )}

              {/* Results */}
              {!loading && results.map((product, idx) => {
                const key = product.barcode || product.name
                const isAdding = addingProduct === key
                const wasAdded = justAdded.has(key)
                let displayGrams = 100
                if (product.serving_size) {
                  const match = product.serving_size.match(/(\d+)\s*g/i)
                  if (match) displayGrams = parseInt(match[1])
                }
                const displayCal = Math.round((product.per100g.calories * displayGrams) / 100)

                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 py-3 border-b border-[#F0F0EE]"
                  >
                    <button
                      onClick={() => {
                        setSelectedProduct(product)
                        setPortionGrams(String(displayGrams))
                      }}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="text-[14px] text-[#1A1917] truncate leading-tight">{product.name}</p>
                      <p className="text-[12px] text-[#B0B0B0] mt-0.5">
                        {displayCal} kcal
                        {product.brand && <span> · {product.brand}</span>}
                        <span className="text-[#D0D0D0]"> · {displayGrams}g</span>
                      </p>
                    </button>

                    <button
                      onClick={(e) => { e.stopPropagation(); addFood(product, displayGrams) }}
                      disabled={isAdding}
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        wasAdded
                          ? 'bg-[#E8F5E9] text-[#3D8B5C]'
                          : 'bg-[#F5F5F3] text-[#1A1917] hover:bg-[#EBEBEA] active:scale-95'
                      }`}
                    >
                      {isAdding ? (
                        <div className="w-3.5 h-3.5 border-[1.5px] border-[#C0C0C0] border-t-[#1A1917] rounded-full animate-spin" />
                      ) : wasAdded ? (
                        <Check strokeWidth={2} className="w-4 h-4" />
                      ) : (
                        <Plus strokeWidth={2} className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────

export default function ClientNutritionPage() {
  const [plan, setPlan] = useState<NutritionPlan | null>(null)
  const [logs, setLogs] = useState<Map<string, MealLog>>(new Map())
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false)
  const [bottomSheetMealId, setBottomSheetMealId] = useState<string | null>(null)
  const [daySubmitted, setDaySubmitted] = useState(false)
  const [recentFoods, setRecentFoods] = useState<RecentFood[]>([])

  const dateStr = selectedDate.toISOString().split('T')[0]

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: planData } = await supabase
        .from('nutrition_plans')
        .select('*')
        .eq('client_id', user.id)
        .eq('is_active', true)
        .single()

      if (planData) {
        const fixedMeals = (planData.meals || []).map((m: any, i: number) => ({
          ...m,
          id: ensureMealId(m, i),
          foods: (m.foods || []).map((f: any, fi: number) => ({
            ...f,
            id: f.id || `plan-${i}-food-${fi}-${(f.name || '').replace(/\s+/g, '-').toLowerCase()}`,
            checked: f.checked ?? false,
          })),
        }))
        setPlan({ ...planData, meals: fixedMeals })
      }

      const res = await fetch(`/api/nutrition-log?date=${dateStr}`)
      const data = await res.json()

      // Helper: ensure every food in an array has a unique id
      function ensureFoodIds(foods: any[], prefix: string): FoodEntry[] {
        return (foods || []).map((f: any, fi: number) => ({
          ...f,
          id: f.id && !f.id.startsWith('plan-') ? f.id : `${prefix}-${fi}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        }))
      }

      const logMap = new Map<string, MealLog>()
      for (const log of data.logs || []) {
        log.foods_eaten = ensureFoodIds(log.foods_eaten, `log-${log.meal_id}`)
        logMap.set(log.meal_id, log)
      }

      if (logMap.size === 0 && planData) {
        const yesterday = new Date(dateStr)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]
        const yRes = await fetch(`/api/nutrition-log?date=${yesterdayStr}`)
        const yData = await yRes.json()

        const fixedMeals = (planData.meals || []).map((m: any, i: number) => ({
          ...m,
          id: ensureMealId(m, i),
          foods: (m.foods || []).map((f: any, fi: number) => ({
            ...f,
            id: f.id || `yplan-${i}-food-${fi}-${(f.name || '').replace(/\s+/g, '-').toLowerCase()}`,
            checked: false, // Always unchecked for new day
          })),
        }))

        for (const yLog of yData.logs || []) {
          const meal = fixedMeals.find((m: any) => m.id === yLog.meal_id)
          if (!meal) continue

          const planFoodNames = new Set((meal.foods || []).map((f: FoodEntry) => f.name))
          const extras = ensureFoodIds(
            (yLog.foods_eaten || []).filter((f: FoodEntry) => !planFoodNames.has(f.name)),
            `extra-${meal.id}`
          ).map((f: FoodEntry) => ({ ...f, checked: false }))

          if (extras.length > 0) {
            const mergedFoods = [...(meal.foods || []), ...extras]
            logMap.set(meal.id, {
              meal_id: meal.id,
              meal_name: meal.name,
              completed: false,
              foods_eaten: mergedFoods,
              client_notes: null,
              completed_at: null,
            })
          }
        }
      }

      setLogs(logMap)
      setSummary(data.summary || null)

      // Load recent foods from last 7 days (parallel fetch for performance)
      const recentMap = new Map<string, { frequency: number; per100g: any; brand?: string }>()
      const today = new Date(dateStr)
      const datePromises = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        return fetch(`/api/nutrition-log?date=${d.toISOString().split('T')[0]}`)
          .then(r => r.json())
          .catch(() => ({ logs: [] }))
      })
      const recentResults = await Promise.all(datePromises)
      for (const rData of recentResults) {
        for (const log of rData.logs || []) {
          for (const food of log.foods_eaten || []) {
            const key = food.name
            const existing = recentMap.get(key)
            if (existing) {
              existing.frequency += 1
            } else {
              recentMap.set(key, {
                frequency: 1,
                per100g: food.per100g,
                brand: food.brand,
              })
            }
          }
        }
      }

      const sortedRecent = Array.from(recentMap.entries())
        .map(([name, data]) => ({
          name,
          brand: data.brand,
          frequency: data.frequency,
          per100g: data.per100g,
        }))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 20)

      setRecentFoods(sortedRecent)
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }, [dateStr])

  useEffect(() => {
    loadData()
  }, [loadData])

  function navigateDate(offset: number) {
    setBottomSheetOpen(false) // Close bottom sheet when changing day
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + offset)
    setSelectedDate(d)
  }

  const meals = plan?.meals || []

  const allMealsComplete = useMemo(() => {
    if (meals.length === 0) return false
    return meals.every(meal => {
      const log = logs.get(meal.id)
      const foods = log?.foods_eaten || meal.foods || []
      return foods.every(f => f.checked === true)
    })
  }, [meals, logs])

  // Calculate macros client-side from checked items for instant feedback
  const { checkedCal, checkedProt, checkedCarbs, checkedFat } = useMemo(() => {
    let cal = 0, prot = 0, carbs = 0, fat = 0
    for (const meal of meals) {
      const log = logs.get(meal.id)
      const foods = log?.foods_eaten || meal.foods || []
      for (const f of foods) {
        if (f.checked === true) {
          cal += calcMacro(f, 'calories')
          prot += calcMacro(f, 'protein')
          carbs += calcMacro(f, 'carbs')
          fat += calcMacro(f, 'fat')
        }
      }
    }
    return { checkedCal: cal, checkedProt: prot, checkedCarbs: carbs, checkedFat: fat }
  }, [meals, logs])

  const actualCal = checkedCal
  const actualProt = checkedProt
  const actualCarbs = checkedCarbs
  const actualFat = checkedFat

  const targetCal = plan?.calories_target || 0
  const targetProt = plan?.protein_g || 0
  const targetCarbs = plan?.carbs_g || 0
  const targetFat = plan?.fat_g || 0

  const calPct = targetCal > 0 ? Math.min((actualCal / targetCal) * 100, 100) : 0

  async function submitDay() {
    try {
      await fetch('/api/nutrition-log', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr }),
      })
      setDaySubmitted(true)
      setTimeout(() => setDaySubmitted(false), 3000)
    } catch (err) {
      console.error('Submit day error:', err)
    }
  }

  // Save meal foods to API (background, non-blocking)
  const saveMealToAPI = useCallback(async (meal: MealMoment, newFoods: FoodEntry[]) => {
    const existing = logs.get(meal.id)
    try {
      const res = await fetch('/api/nutrition-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: plan!.id,
          date: dateStr,
          meal_id: meal.id,
          meal_name: meal.name,
          completed: existing?.completed || false,
          foods_eaten: newFoods,
          client_notes: existing?.client_notes || null,
        }),
      })
      if (res.ok) {
        invalidateCache('/api/dashboard')
      }
    } catch (err) {
      console.error('Save meal foods error:', err)
    }
  }, [logs, plan, dateStr])

  // Optimistic update: update state FIRST, then save to API in background
  function updateMealFoods(meal: MealMoment, newFoods: FoodEntry[]) {
    const existing = logs.get(meal.id)
    const newLog: MealLog = {
      meal_id: meal.id,
      meal_name: meal.name,
      completed: existing?.completed || false,
      foods_eaten: newFoods,
      client_notes: existing?.client_notes || null,
      completed_at: existing?.completed_at || null,
    }
    const upd = new Map(logs)
    upd.set(meal.id, newLog)
    setLogs(upd)
    // Fire API save in background (don't await)
    saveMealToAPI(meal, newFoods)
  }

  function toggleFoodChecked(meal: MealMoment, foodId: string) {
    // Read latest foods from current logs state
    const existing = logs.get(meal.id)
    const foods = existing?.foods_eaten || meal.foods || []
    const newFoods = foods.map(f =>
      f.id === foodId ? { ...f, checked: !f.checked } : f
    )
    updateMealFoods(meal, newFoods)
  }

  function deleteFood(meal: MealMoment, foodId: string) {
    const existing = logs.get(meal.id)
    const foods = existing?.foods_eaten || meal.foods || []
    const newFoods = foods.filter(f => f.id !== foodId)
    updateMealFoods(meal, newFoods)
  }

  if (loading) {
    return (
      <div className="pb-28 animate-pulse">
        <div className="h-4 w-12 bg-[#F0F0EE] rounded mb-6 mt-2" />
        <div className="flex items-center gap-3 mb-8">
          <div className="w-4 h-4 bg-[#F0F0EE] rounded" />
          <div className="h-5 w-24 bg-[#F0F0EE] rounded" />
          <div className="w-4 h-4 bg-[#F0F0EE] rounded" />
        </div>
        <div className="flex justify-center mb-6">
          <div className="w-40 h-40 rounded-full bg-[#F0F0EE]" />
        </div>
        <div className="flex justify-center gap-6 mb-10">
          {[1, 2, 3].map(i => <div key={i} className="h-10 w-16 bg-[#F0F0EE] rounded-lg" />)}
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center justify-between py-4 border-t border-[#F0F0EE]">
            <div>
              <div className="h-4 w-28 bg-[#F0F0EE] rounded mb-1.5" />
              <div className="h-3 w-20 bg-[#F0F0EE] rounded" />
            </div>
            <div className="h-4 w-14 bg-[#F0F0EE] rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="pb-28">
        <h1 className="text-[22px] font-semibold text-[#1A1917] mt-4 mb-6">Voeding</h1>
        <div className="py-16 text-center">
          <p className="text-[18px] font-semibold text-[#1A1917] mb-2">Nog geen plan</p>
          <p className="text-[14px] text-[#B0B0B0]">Je coach bereidt je voedingsplan voor.</p>
        </div>
      </div>
    )
  }

  const currentMeal = meals.find(m => m.id === bottomSheetMealId)

  return (
    <div className="pb-28">
      {/* ── Back button ── */}
      <div className="animate-slide-up">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-1 mb-4 mt-2 group"
        >
          <ChevronLeft strokeWidth={1.5} className="w-[18px] h-[18px] text-[#C0C0C0] group-hover:text-[#1A1917] transition-colors" />
          <span className="text-[14px] text-[#C0C0C0] group-hover:text-[#1A1917] transition-colors">Home</span>
        </button>
      </div>

      {/* ── Date nav ── */}
      <div className="flex items-center gap-4 mb-8 animate-slide-up">
        <button onClick={() => navigateDate(-1)} className="p-1.5 text-[#D0D0D0] hover:text-[#1A1917] transition-colors">
          <ChevronLeft strokeWidth={1.5} className="w-4 h-4" />
        </button>
        <span className="text-[15px] font-semibold text-[#1A1917]">{formatDate(selectedDate)}</span>
        <button onClick={() => navigateDate(1)} className="p-1.5 text-[#D0D0D0] hover:text-[#1A1917] transition-colors">
          <ChevronRight strokeWidth={1.5} className="w-4 h-4" />
        </button>
      </div>

      {/* ── Calorie ring ── */}
      <div className="flex justify-center mb-6 animate-slide-up stagger-2">
        <div className="relative w-[160px] h-[160px]">
          <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
            <circle cx="80" cy="80" r="68" fill="none" stroke="#F0F0EE" strokeWidth="8" />
            <circle
              cx="80" cy="80" r="68" fill="none"
              stroke={allMealsComplete ? '#3D8B5C' : '#D46A3A'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(calPct / 100) * 427.26} 427.26`}
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-[32px] font-bold leading-none tracking-tight"
              style={{ color: allMealsComplete ? '#3D8B5C' : '#1A1917' }}
            >
              {actualCal}
            </span>
            <span className="text-[12px] text-[#B0B0B0] mt-1">/ {targetCal} kcal</span>
          </div>
        </div>
      </div>

      {/* ── Macro pills ── */}
      <div className="flex justify-center gap-3 mb-10 animate-slide-up stagger-3">
        {[
          { label: 'Eiwit', actual: actualProt, target: targetProt, color: '#4A90D9' },
          { label: 'Koolh', actual: actualCarbs, target: targetCarbs, color: '#D4A03A' },
          { label: 'Vet', actual: actualFat, target: targetFat, color: '#D46A3A' },
        ].map(macro => (
          <div key={macro.label} className="flex flex-col items-center bg-[#FAFAF8] rounded-xl px-4 py-2.5 min-w-[80px]">
            <span className="text-[15px] font-semibold text-[#1A1917]">{macro.actual}g</span>
            <span className="text-[11px] text-[#B0B0B0] mt-0.5">/ {macro.target}g</span>
            <span className="text-[10px] font-medium mt-1" style={{ color: macro.color }}>{macro.label}</span>
          </div>
        ))}
      </div>

      {/* ── Meals ── */}
      <div className="animate-slide-up stagger-4 space-y-5">
        {meals.map(meal => {
          const log = logs.get(meal.id)
          const foods = log?.foods_eaten || meal.foods || []
          const allChecked = foods.length > 0 && foods.every(f => f.checked === true)
          const cal = mealCalories(foods)

          return (
            <div key={meal.id}>
              {/* Category header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <span className={`text-[15px] font-semibold ${allChecked ? 'text-[#B0B0B0]' : 'text-[#1A1917]'}`}>
                    {meal.name}
                  </span>
                  {allChecked && <span className="text-[11px] text-[#3D8B5C] font-medium">✓ Voltooid</span>}
                  <span className="text-[12px] text-[#C0C0C0]">{cal} kcal</span>
                </div>
                <button
                  onClick={() => { setBottomSheetMealId(meal.id); setBottomSheetOpen(true) }}
                  className="w-7 h-7 rounded-full bg-[#F5F5F3] flex items-center justify-center hover:bg-[#EBEBEA] active:scale-95 transition-all"
                >
                  <Plus strokeWidth={2} className="w-3.5 h-3.5 text-[#8A8A8A]" />
                </button>
              </div>

              {/* Food items */}
              {foods.length > 0 ? (
                <div className="space-y-0.5">
                  {foods.map(food => {
                    const foodCal = calcMacro(food, 'calories')
                    const isChecked = food.checked === true

                    return (
                      <div
                        key={food.id}
                        className={`flex items-center gap-3 py-2 px-2 rounded-lg group transition-colors ${
                          isChecked ? 'bg-[#F5F5F3]' : 'hover:bg-[#FAFAF8]'
                        }`}
                      >
                        {/* Checkbox on left */}
                        <button
                          onClick={() => toggleFoodChecked(meal, food.id)}
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                            isChecked
                              ? 'bg-[#3D8B5C]'
                              : 'border-[1.5px] border-[#E0E0DE] hover:border-[#3D8B5C]'
                          }`}
                        >
                          {isChecked && <Check strokeWidth={2.5} className="w-3 h-3 text-white" />}
                        </button>

                        {/* Food name + grams */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-[14px] leading-tight truncate ${
                            isChecked ? 'line-through text-[#B0B0B0]' : 'text-[#1A1917]'
                          }`}>
                            {food.name}
                          </p>
                          <p className={`text-[12px] mt-0.5 ${
                            isChecked ? 'text-[#D0D0D0]' : 'text-[#C0C0C0]'
                          }`}>
                            {food.grams}g · {foodCal} kcal
                          </p>
                        </div>

                        {/* Delete button — visible on mobile */}
                        <button
                          onClick={() => deleteFood(meal, food.id)}
                          className="p-1.5 text-[#E0E0DE] hover:text-[#E53935] transition-colors shrink-0"
                        >
                          <Trash2 strokeWidth={1.5} className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-2">
                  <p className="text-[13px] text-[#D0D0D0]">Geen items</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Submit day ── */}
      {meals.length > 0 && (
        <div className="mt-8 mb-4 animate-slide-up stagger-6">
          <button
            onClick={submitDay}
            disabled={daySubmitted}
            className={`w-full py-3 rounded-xl font-semibold text-[13px] uppercase tracking-[0.06em] transition-all ${
              daySubmitted
                ? 'bg-[#E8F5E9] text-[#3D8B5C]'
                : allMealsComplete
                  ? 'bg-[#3D8B5C] text-white hover:bg-[#347A4F]'
                  : 'bg-[#F5F5F3] text-[#1A1917] hover:bg-[#EBEBEA]'
            }`}
          >
            {daySubmitted ? 'Ingediend ✓' : 'Dag indienen'}
          </button>
        </div>
      )}

      {/* ── Weekly Shopping List ── */}
      <div className="animate-slide-up stagger-7">
        <WeeklyShoppingList meals={meals} />
      </div>

      {/* ── Guidelines ── */}
      {plan.guidelines && (
        <div className="border-t border-[#F0F0EE] pt-5 mt-6 animate-slide-up stagger-8">
          <p className="text-[11px] text-[#B0B0B0] uppercase tracking-[0.1em] mb-2">Richtlijnen</p>
          <p className="text-[13px] text-[#8A8A8A] leading-relaxed whitespace-pre-wrap">{plan.guidelines}</p>
        </div>
      )}

      {/* ── Bottom Sheet ── */}
      <AddFoodBottomSheet
        isOpen={bottomSheetOpen}
        onClose={() => setBottomSheetOpen(false)}
        meal={currentMeal || null}
        plan={plan}
        dateStr={dateStr}
        logs={logs}
        setLogs={setLogs}
        setSummary={setSummary}
        recentFoods={recentFoods}
      />

      {/* ── Animations ── */}
      <style jsx global>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
