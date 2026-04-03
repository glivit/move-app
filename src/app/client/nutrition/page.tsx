'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
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
  const [modalTab, setModalTab] = useState<'search' | 'custom'>('search')
  const [customForm, setCustomForm] = useState({ name: '', brand: '', barcode: '', calories: '', protein: '', carbs: '', fat: '' })
  const [savingCustom, setSavingCustom] = useState(false)
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
        const _upd = new Map(logs); _upd.set(mealId, newLog); setLogs(_upd)

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

  async function handleBarcodeScan() {
    // Use the device camera to scan a barcode via the native input
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      // For now, prompt user to type the barcode manually
      // Full camera barcode scanning requires a library like html5-qrcode
      const code = prompt('Voer de barcode in (nummer onder de streepjes):')
      if (code) {
        setLoading(true)
        try {
          const res = await fetch(`/api/food-search?barcode=${encodeURIComponent(code)}`)
          const data: SearchResponse = await res.json()
          if (data.products?.length > 0) {
            setSearchResults(data.products)
            setSelectedProduct(data.products[0])
          } else {
            setSearchResults([])
            alert('Product niet gevonden. Voeg het handmatig toe via "Nieuw product".')
            setModalTab('custom')
            setCustomForm(prev => ({ ...prev, barcode: code }))
          }
        } catch {
          alert('Zoeken mislukt')
        }
        setLoading(false)
      }
    }
    // Fallback: just prompt for barcode number
    const code = prompt('Voer de barcode in (nummer onder de streepjes):')
    if (code) {
      setLoading(true)
      try {
        const res = await fetch(`/api/food-search?barcode=${encodeURIComponent(code)}`)
        const data: SearchResponse = await res.json()
        if (data.products?.length > 0) {
          setSearchResults(data.products)
          setSelectedProduct(data.products[0])
        } else {
          setSearchResults([])
          setModalTab('custom')
          setCustomForm(prev => ({ ...prev, barcode: code }))
        }
      } catch {
        // silent
      }
      setLoading(false)
    }
  }

  async function handleSaveCustomProduct() {
    if (!customForm.name || !customForm.calories) return
    setSavingCustom(true)
    try {
      const res = await fetch('/api/food-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customForm.name,
          brand: customForm.brand || null,
          barcode: customForm.barcode || null,
          per100g: {
            calories: parseFloat(customForm.calories) || 0,
            protein: parseFloat(customForm.protein) || 0,
            carbs: parseFloat(customForm.carbs) || 0,
            fat: parseFloat(customForm.fat) || 0,
          },
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.product) {
          setSelectedProduct(data.product)
          setModalTab('search')
          setSearchResults([data.product])
          setCustomForm({ name: '', brand: '', barcode: '', calories: '', protein: '', carbs: '', fat: '' })
        }
      }
    } catch (err) {
      console.error('Save custom product error:', err)
    }
    setSavingCustom(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white rounded-t-2xl rounded-b-none flex flex-col max-h-[90vh] z-[51]">
        {/* Tab bar: Search | Nieuw product */}
        <div className="flex border-b border-[#F0F0EE]">
          <button
            onClick={() => setModalTab('search')}
            className={`flex-1 py-3 text-[13px] font-semibold uppercase tracking-[0.06em] transition-all border-b-2 text-center ${
              modalTab === 'search' ? 'border-[#1A1917] text-[#1A1917]' : 'border-transparent text-[#C0C0C0]'
            }`}
          >
            Zoeken
          </button>
          <button
            onClick={() => setModalTab('custom')}
            className={`flex-1 py-3 text-[13px] font-semibold uppercase tracking-[0.06em] transition-all border-b-2 text-center ${
              modalTab === 'custom' ? 'border-[#1A1917] text-[#1A1917]' : 'border-transparent text-[#C0C0C0]'
            }`}
          >
            Nieuw product
          </button>
        </div>

        {modalTab === 'search' ? (
          <>
            {/* Search input + barcode button */}
            <div className="px-4 py-4 border-b border-[#F0F0EE]">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Zoek voedingsmiddel..."
                  autoFocus
                  className="flex-1 px-3 py-2.5 border border-[#F0F0EE] rounded-xl text-[13px] text-[#1A1917] bg-white placeholder-[#C0C0C0] focus:outline-none focus:border-[#1A1917]"
                />
                <button
                  onClick={handleBarcodeScan}
                  className="px-3 py-2.5 border border-[#F0F0EE] rounded-xl text-[#ACACAC] hover:text-[#1A1917] hover:border-[#1A1917] transition-colors"
                  title="Barcode scannen"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                    <line x1="7" y1="8" x2="7" y2="16" /><line x1="10" y1="8" x2="10" y2="16" /><line x1="13" y1="8" x2="13" y2="16" /><line x1="17" y1="8" x2="17" y2="16" />
                  </svg>
                </button>
              </div>
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
                  <p className="text-[13px] text-[#ACACAC] mb-3">
                    Geen resultaten voor &ldquo;{query}&rdquo;
                  </p>
                  <button
                    onClick={() => { setModalTab('custom'); setCustomForm(prev => ({ ...prev, name: query })) }}
                    className="text-[13px] font-medium text-[#D46A3A] hover:underline"
                  >
                    Voeg &ldquo;{query}&rdquo; handmatig toe
                  </button>
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
                          <p className="text-[14px] text-[#1A1917] truncate">
                            {product.name}
                          </p>
                          {product.brand && (
                            <p className="text-[12px] text-[#ACACAC] truncate">
                              {product.brand}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 text-[11px] text-[#C0C0C0]">
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
          </>
        ) : (
          /* Custom product form */
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <p className="text-[13px] text-[#ACACAC]">
              Voeg een product toe aan de database. Vul de voedingswaarden per 100g in.
            </p>

            <div>
              <label className="text-[11px] font-semibold text-[#ACACAC] uppercase tracking-[0.12em] block mb-1.5">Naam *</label>
              <input
                type="text"
                value={customForm.name}
                onChange={(e) => setCustomForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="bijv. Griekse yoghurt 0%"
                className="w-full px-3 py-2.5 border border-[#F0F0EE] rounded-xl text-[14px] text-[#1A1917] bg-white placeholder-[#C0C0C0] focus:outline-none focus:border-[#1A1917]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-[#ACACAC] uppercase tracking-[0.12em] block mb-1.5">Merk</label>
                <input
                  type="text"
                  value={customForm.brand}
                  onChange={(e) => setCustomForm(prev => ({ ...prev, brand: e.target.value }))}
                  placeholder="optioneel"
                  className="w-full px-3 py-2.5 border border-[#F0F0EE] rounded-xl text-[14px] text-[#1A1917] bg-white placeholder-[#C0C0C0] focus:outline-none focus:border-[#1A1917]"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#ACACAC] uppercase tracking-[0.12em] block mb-1.5">Barcode</label>
                <input
                  type="text"
                  value={customForm.barcode}
                  onChange={(e) => setCustomForm(prev => ({ ...prev, barcode: e.target.value }))}
                  placeholder="optioneel"
                  className="w-full px-3 py-2.5 border border-[#F0F0EE] rounded-xl text-[14px] text-[#1A1917] bg-white placeholder-[#C0C0C0] focus:outline-none focus:border-[#1A1917]"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-[#F0F0EE]">
              <p className="text-[11px] font-semibold text-[#ACACAC] uppercase tracking-[0.12em] mb-3">Per 100g</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] text-[#ACACAC] block mb-1">Calorieën (kcal) *</label>
                  <input
                    type="number"
                    value={customForm.calories}
                    onChange={(e) => setCustomForm(prev => ({ ...prev, calories: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2.5 border border-[#F0F0EE] rounded-xl text-[14px] text-[#1A1917] bg-white placeholder-[#C0C0C0] focus:outline-none focus:border-[#1A1917]"
                  />
                </div>
                <div>
                  <label className="text-[12px] text-[#ACACAC] block mb-1">Eiwit (g)</label>
                  <input
                    type="number"
                    value={customForm.protein}
                    onChange={(e) => setCustomForm(prev => ({ ...prev, protein: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2.5 border border-[#F0F0EE] rounded-xl text-[14px] text-[#1A1917] bg-white placeholder-[#C0C0C0] focus:outline-none focus:border-[#1A1917]"
                  />
                </div>
                <div>
                  <label className="text-[12px] text-[#ACACAC] block mb-1">Koolhydraten (g)</label>
                  <input
                    type="number"
                    value={customForm.carbs}
                    onChange={(e) => setCustomForm(prev => ({ ...prev, carbs: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2.5 border border-[#F0F0EE] rounded-xl text-[14px] text-[#1A1917] bg-white placeholder-[#C0C0C0] focus:outline-none focus:border-[#1A1917]"
                  />
                </div>
                <div>
                  <label className="text-[12px] text-[#ACACAC] block mb-1">Vet (g)</label>
                  <input
                    type="number"
                    value={customForm.fat}
                    onChange={(e) => setCustomForm(prev => ({ ...prev, fat: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2.5 border border-[#F0F0EE] rounded-xl text-[14px] text-[#1A1917] bg-white placeholder-[#C0C0C0] focus:outline-none focus:border-[#1A1917]"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveCustomProduct}
              disabled={savingCustom || !customForm.name || !customForm.calories}
              className="w-full py-3 bg-[#1A1917] text-white font-semibold text-[13px] uppercase tracking-[0.08em] hover:bg-[#333330] transition-colors disabled:opacity-50 rounded-xl mt-2"
            >
              {savingCustom ? 'Opslaan...' : 'Product opslaan & selecteren'}
            </button>
          </div>
        )}

        {/* Selection and gram input */}
        {selectedProduct && modalTab === 'search' && (
          <div className="border-t border-[#F0F0EE] px-4 py-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-[12px] text-[#ACACAC] mb-1">
                  Hoeveelheid (gram)
                </p>
                <input
                  type="number"
                  value={grams}
                  onChange={(e) => setGrams(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 border border-[#F0F0EE] rounded-xl text-[13px] text-[#1A1917] bg-white focus:outline-none focus:border-[#1A1917]"
                />
              </div>
              <button
                onClick={handleConfirm}
                className="px-6 py-2.5 bg-[#1A1917] text-white rounded-xl text-[13px] font-medium"
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
  const [daySubmitted, setDaySubmitted] = useState(false)
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
        const updated = new Map(logs)
        updated.set(meal.id, newLog)
        setLogs(updated)

        // Refresh summary
        const sumRes = await fetch(`/api/nutrition-log?date=${dateStr}`)
        const sumData = await sumRes.json()
        if (sumData.summary) setSummary(sumData.summary)
      } else {
        // Retry once on failure
        console.error('Nutrition toggle failed:', res.status)
        const retry = await fetch('/api/nutrition-log', {
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
        if (retry.ok) {
          const newLog: MealLog = {
            meal_id: meal.id,
            meal_name: meal.name,
            completed: nowCompleted,
            foods_eaten: existing?.foods_eaten || meal.foods || [],
            client_notes: existing?.client_notes || null,
            completed_at: nowCompleted ? new Date().toISOString() : null,
          }
          const updated = new Map(logs)
          updated.set(meal.id, newLog)
          setLogs(updated)

          const sumRes = await fetch(`/api/nutrition-log?date=${dateStr}`)
          const sumData = await sumRes.json()
          if (sumData.summary) setSummary(sumData.summary)
        }
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
      const _upd = new Map(logs); _upd.set(mealId, newLog); setLogs(_upd)
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

  // Memoize completion count calculation
  const completedCount = useMemo(
    () => Array.from(logs.values()).filter(l => l.completed).length,
    [logs]
  )

  const allDone = useMemo(
    () => meals.length > 0 && completedCount === meals.length,
    [meals.length, completedCount]
  )

  const actualCal = summary?.total_calories || 0
  const actualProt = summary?.total_protein || 0
  const actualCarbs = summary?.total_carbs || 0
  const actualFat = summary?.total_fat || 0

  const targetCal = plan?.calories_target || 0
  const targetProt = plan?.protein_g || 0
  const targetCarbs = plan?.carbs_g || 0
  const targetFat = plan?.fat_g || 0

  const calPct = useMemo(
    () => targetCal > 0 ? Math.min((actualCal / targetCal) * 100, 100) : 0,
    [actualCal, targetCal]
  )

  // Memoize toggle meal handler
  const handleToggleMealComplete = useCallback((meal: MealMoment) => {
    toggleMealComplete(meal)
  }, [])

  // Memoize food search modal open handlers
  const openAddFoodModal = useCallback((mealId: string) => {
    setFoodSearchModal({
      isOpen: true,
      mode: 'add',
      mealId,
      originalGrams: 100,
    })
  }, [])

  const openSwapFoodModal = useCallback((mealId: string, foodId: string, grams: number) => {
    setFoodSearchModal({
      isOpen: true,
      mode: 'swap',
      mealId,
      foodId,
      originalGrams: grams,
    })
  }, [])

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
        <h1 className="page-title-sm mb-6">
          Voeding
        </h1>
        <div className="py-16 text-center">
          <p className="text-editorial-h1 mb-3">
            Nog geen plan
          </p>
          <p className="text-[14px] text-[#ACACAC]">
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
          <span className="text-[14px] text-[#C0C0C0] group-hover:text-[#1A1917] transition-colors">
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
        >
          {formatDate(selectedDate)}
        </span>
        <button onClick={() => navigateDate(1)} className="p-1 text-[#D0D0D0] hover:text-[#1A1917] transition-colors">
          <ChevronRight strokeWidth={1.5} className="w-4 h-4" />
        </button>
        </div>
      </div>

      {/* ── HERO: Calorie number ── */}
      <div className="mb-14 animate-slide-up stagger-2">
        <p
          className="text-[52px] leading-[0.9] tracking-[-2px]"
          style={{
            fontWeight: 800,
            color: allDone ? '#3D8B5C' : '#1A1917',
          }}
        >
          {actualCal.toLocaleString('nl-NL')}
        </p>
        <p
          className="text-[16px] font-light text-[#ACACAC] mt-1.5 tracking-[0.01em]"
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
      <div className="mt-12 animate-slide-up stagger-3">
        <div className="border-t border-[#F0F0EE] pt-6 flex gap-3 text-[14px]">
          {[
            { label: 'Eiwit', actual: actualProt, target: targetProt, unit: 'g' },
            { label: 'Koolhydraten', actual: actualCarbs, target: targetCarbs, unit: 'g' },
            { label: 'Vet', actual: actualFat, target: targetFat, unit: 'g' },
          ].map((macro, i) => (
            <div key={macro.label} className="flex items-baseline gap-1">
              {i > 0 && <span className="text-[#C0C0C0]">·</span>}
              <span
                className="font-semibold"
                style={{
                  color: allDone && macro.actual >= macro.target * 0.9 ? '#3D8B5C' : '#1A1917',
                }}
              >
                {macro.actual}g
              </span>
              <span className="text-[#C0C0C0]">{macro.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Meals section ── */}
      <p
        className="text-[12px] font-medium text-[#B0B0B0] uppercase tracking-[1.5px] mb-4 mt-12 animate-slide-up stagger-6"
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
              {/* Meal row - flat with hover state */}
              <button
                onClick={() => setExpandedMeal(isExpanded ? null : meal.id)}
                className="w-full flex items-center justify-between py-5 border-t border-[#F0F0EE] hover:opacity-60 transition-opacity"
              >
                {/* Left: Meal name and time */}
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-[15px] font-medium truncate ${
                        isCompleted ? 'text-[#ACACAC] line-through decoration-[#D5D5D5]' : 'text-[#1A1917]'
                      }`}
                    >
                      {meal.name}
                    </p>
                    {hasNotes && (
                      <MessageSquare strokeWidth={1.5} className="w-3 h-3 text-[#C0C0C0] shrink-0" />
                    )}
                  </div>
                  <p className="text-[12px] text-[#C0C0C0] mt-0.5">
                    {meal.time} · {foods.length} items
                  </p>
                </div>

                {/* Right: Kcal + chevron */}
                <div className="shrink-0 flex items-center gap-2 ml-4">
                  <div className="text-right">
                    <span
                      className={`text-[14px] ${isCompleted ? 'text-[#C0C0C0]' : 'text-[#1A1917]'}`}
                      style={{ fontWeight: 600 }}
                    >
                      {mealCal}
                    </span>
                    <span className="text-[11px] text-[#C0C0C0] ml-0.5">
                      kcal
                    </span>
                  </div>
                  <ChevronRight strokeWidth={1.5} className="w-4 h-4 text-[#D5D5D5] shrink-0" />
                </div>
              </button>

              {/* Expanded: food details */}
              {isExpanded && (
                <div className="py-4 border-t border-[#F0F0EE] bg-[#FAFAF8]">
                  <div className="px-4 space-y-3">
                    {/* Complete meal checkbox */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleMealComplete(meal)}
                        disabled={isSaving}
                        className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition-all ${
                          isCompleted
                            ? 'bg-[#1A1917] border-[#1A1917]'
                            : 'border-[#E0E0E0] hover:border-[#1A1917]'
                        } ${isSaving ? 'opacity-50' : ''}`}
                      >
                        {isCompleted && (
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                            <path d="M2.5 6L5 8.5L9.5 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        {isSaving && (
                          <div className="w-2 h-2 border-[1px] border-[#C0C0C0] border-t-[#1A1917] rounded-full animate-spin" />
                        )}
                      </button>
                      <span className="text-[13px] text-[#C0C0C0]">Mark as complete</span>
                    </div>

                    {/* Foods list */}
                    <div className="space-y-2">
                      {foods.map((food) => (
                        <div key={food.id} className="flex items-center justify-between py-1 group">
                          <div className="flex items-center gap-1.5 flex-1">
                            <span className="text-[13px] text-[#1A1917]">
                              {food.name}
                            </span>
                            <span className="text-[11px] text-[#C0C0C0]">
                              {food.grams}g
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] text-[#ACACAC]">
                              {calcMacro(food, 'calories')} kcal
                            </span>
                            <button
                              onClick={() => openSwapFoodModal(meal.id, food.id, food.grams)}
                              className="p-1 text-[#C0C0C0] hover:text-[#1A1917] transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <ArrowLeftRight strokeWidth={1.5} className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add food button */}
                    <button
                      onClick={() => openAddFoodModal(meal.id)}
                      className="mt-3 px-3 py-2 text-[13px] text-[#D46A3A] font-medium hover:bg-[rgba(212,106,58,0.06)] rounded-lg transition-colors"
                    >
                      + Voeg item toe
                    </button>

                    {/* Notes in expanded view */}
                    <div className="pt-2">
                      {editingNotes === meal.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Notitie..."
                            rows={2}
                            autoFocus
                            className="w-full px-3 py-2 border border-[#F0F0EE] rounded-xl text-[13px] text-[#1A1917] bg-white placeholder-[#C0C0C0] focus:outline-none focus:border-[#1A1917] resize-none"
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setEditingNotes(null)}
                              className="px-3 py-1.5 text-[12px] text-[#ACACAC]"
                            >
                              Annuleer
                            </button>
                            <button
                              onClick={() => saveNotes(meal.id)}
                              className="px-3 py-1.5 rounded-xl bg-[#1A1917] text-white text-[12px] font-medium"
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
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Daily note row ── */}
      <button
        onClick={() => setShowDailyPanel(!showDailyPanel)}
        className="w-full flex items-center gap-3 py-5 border-t border-[#F0F0EE] mt-12 hover:opacity-60 transition-opacity"
      >
        <div
          className="w-[6px] h-[6px] rounded-full shrink-0"
          style={{ backgroundColor: allDone ? '#3D8B5C' : '#D46A3A' }}
        />
        <div className="flex-1 text-left">
          <p className="text-[14px] font-medium text-[#1A1917]">
            Dagnotitie
          </p>
          <p className="text-[12px] text-[#C0C0C0] mt-0.5">
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
            />
          </div>
        </div>
      )}

      {/* ── Guidelines ── */}
      {plan.guidelines && (
        <div className="border-t border-[#F0F0EE] pt-5 mt-12">
          <p
            className="text-[11px] text-[#C0C0C0] uppercase tracking-[1px] mb-2"
          >
            Richtlijnen
          </p>
          <p
            className="text-[13px] text-[#ACACAC] leading-relaxed whitespace-pre-wrap"
          >
            {plan.guidelines}
          </p>
        </div>
      )}

      {/* Dag indienen button */}
      {meals.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 px-4 z-30 pointer-events-none">
          <div className="max-w-lg mx-auto pointer-events-auto">
            <button
              onClick={async () => {
                await saveDailySummary()
                setDaySubmitted(true)
                setTimeout(() => setDaySubmitted(false), 3000)
              }}
              disabled={daySubmitted}
              className={"w-full py-4 rounded-2xl font-semibold text-[14px] uppercase tracking-[0.06em] transition-all shadow-lg " + (
                daySubmitted
                  ? "bg-[#3D8B5C] text-white"
                  : allDone
                    ? "bg-[#3D8B5C] text-white hover:bg-[#347A4F]"
                    : "bg-[#1A1917] text-white hover:bg-[#333330]"
              )}
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {daySubmitted ? 'Ingediend ✓' : ('Dag indienen (' + completedCount + '/' + meals.length + ')')}
            </button>
          </div>
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
