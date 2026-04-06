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

// ─── Helpers ────────────────────────────────────────

function calcMacro(food: FoodEntry, key: 'calories' | 'protein' | 'carbs' | 'fat') {
  return Math.round((food.per100g[key] * food.grams) / 100)
}

function ensureMealId(meal: any, index: number): string {
  return meal.id || `meal-${index}-${(meal.name || '').toLowerCase().replace(/\s+/g, '-')}`
}

// ─── Shopping List Component ──────────────────────────────────

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
  // Items typically sold in pieces
  if (n.includes('banaan')) return { amount: String(Math.ceil(grams / 120)), unit: 'stuks' }
  if (n.includes('appel')) return { amount: String(Math.ceil(grams / 150)), unit: 'stuks' }
  if (n.includes('ei ') || n === 'ei') return { amount: String(Math.ceil(grams / 60)), unit: 'stuks' }
  if (n.includes('wrap')) return { amount: String(Math.ceil(grams / 60)), unit: 'stuks' }
  if (n.includes('broodje') || n.includes('brood')) return { amount: String(Math.ceil(grams / 35)), unit: 'sneden' }
  if (n.includes('stoommaaltijd')) return { amount: String(Math.ceil(grams / 450)), unit: 'stuks' }
  if (n.includes('bar') || n.includes('reep')) return { amount: String(Math.ceil(grams / 50)), unit: 'stuks' }
  if (n.includes('pudding') && (n.includes('ehrmann') || n.includes('melkunie'))) return { amount: String(Math.ceil(grams / 200)), unit: 'bakjes' }
  // Kg for large amounts
  if (grams >= 1000) return { amount: (grams / 1000).toFixed(1).replace('.0', ''), unit: 'kg' }
  return { amount: String(Math.round(grams)), unit: 'g' }
}

function WeeklyShoppingList({ meals }: { meals: MealMoment[] }) {
  const [open, setOpen] = useState(false)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())

  const shoppingItems = useMemo(() => {
    // Aggregate all foods across all meals, multiply by 7 for weekly
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
          {/* Week indicator */}
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
                      {/* Checkbox */}
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                        isChecked
                          ? 'bg-[#3D8B5C] border-[#3D8B5C]'
                          : 'border-[#D5D5D5]'
                      }`}>
                        {isChecked && <Check strokeWidth={3} className="w-3 h-3 text-white" />}
                      </div>

                      {/* Product info */}
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

                      {/* Amount */}
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

          {/* Progress bar */}
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

// ─── FoodSearchModal (fullscreen) ───────────────────

function FoodSearchModal({
  isOpen,
  onClose,
  meals,
  initialMealId,
  plan,
  dateStr,
  logs,
  setLogs,
  setSummary,
}: {
  isOpen: boolean
  onClose: () => void
  meals: MealMoment[]
  initialMealId: string | null
  plan: NutritionPlan | null
  dateStr: string
  logs: Map<string, MealLog>
  setLogs: (logs: Map<string, MealLog>) => void
  setSummary: (summary: DailySummary | null) => void
}) {
  const [activeMealId, setActiveMealId] = useState<string>(initialMealId || '')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'search' | 'custom'>('search')
  const [addingProduct, setAddingProduct] = useState<string | null>(null) // product name being added
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set())
  const [selectedProduct, setSelectedProduct] = useState<SearchProduct | null>(null)
  const [portionGrams, setPortionGrams] = useState('100')
  const [selectedPortion, setSelectedPortion] = useState<string | null>(null)
  const [savingConfirm, setSavingConfirm] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [customForm, setCustomForm] = useState({ name: '', brand: '', barcode: '', calories: '', protein: '', carbs: '', fat: '' })
  const [savingCustom, setSavingCustom] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setActiveMealId(initialMealId || meals[0]?.id || '')
      setQuery('')
      setResults([])
      setTab('search')
      setJustAdded(new Set())
      setSelectedProduct(null)
      setPortionGrams('100')
      setSelectedPortion(null)
      setScanning(false)
      setCustomForm({ name: '', brand: '', barcode: '', calories: '', protein: '', carbs: '', fat: '' })
      // Load popular on open
      setLoading(true)
      fetch('/api/food-search?popular=true')
        .then(r => r.json())
        .then(d => { setResults(d.products || []); setLoading(false) })
        .catch(() => setLoading(false))
    }
  }, [isOpen, initialMealId, meals])

  // Autofocus search
  useEffect(() => {
    if (isOpen && tab === 'search' && !scanning) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, tab, scanning])

  // Debounced search
  useEffect(() => {
    if (!isOpen || tab !== 'search') return
    clearTimeout(debounceRef.current)

    if (query.trim() === '') {
      setLoading(true)
      fetch('/api/food-search?popular=true')
        .then(r => r.json())
        .then(d => { setResults(d.products || []); setLoading(false) })
        .catch(() => setLoading(false))
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

  // Quick-add: one tap adds at default serving
  async function quickAdd(product: SearchProduct) {
    if (!plan || !activeMealId || addingProduct) return
    const key = product.barcode || product.name
    setAddingProduct(key)

    // Determine default grams from serving_size
    let defaultGrams = 100
    if (product.serving_size) {
      const match = product.serving_size.match(/(\d+)\s*g/i)
      if (match) defaultGrams = parseInt(match[1])
    }

    const meal = plan.meals.find(m => m.id === activeMealId)
    if (!meal) { setAddingProduct(null); return }

    const existing = logs.get(activeMealId)
    const currentFoods = existing?.foods_eaten || meal.foods || []

    const newFood: FoodEntry = {
      id: `${product.barcode || product.name}-${Date.now()}`,
      name: product.name,
      brand: product.brand,
      image: product.image,
      grams: defaultGrams,
      per100g: {
        calories: product.per100g.calories,
        protein: product.per100g.protein,
        carbs: product.per100g.carbs,
        fat: product.per100g.fat,
      },
    }

    const newFoods = [...currentFoods, newFood]

    try {
      const res = await fetch('/api/nutrition-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: plan.id,
          date: dateStr,
          meal_id: activeMealId,
          meal_name: meal.name,
          completed: existing?.completed || false,
          foods_eaten: newFoods,
          client_notes: existing?.client_notes || null,
        }),
      })

      if (res.ok) {
        const newLog: MealLog = {
          meal_id: activeMealId,
          meal_name: meal.name,
          completed: existing?.completed || false,
          foods_eaten: newFoods,
          client_notes: existing?.client_notes || null,
          completed_at: existing?.completed_at || null,
        }
        const upd = new Map(logs)
        upd.set(activeMealId, newLog)
        setLogs(upd)

        // Show check animation
        setJustAdded(prev => new Set(prev).add(key))
        setTimeout(() => setJustAdded(prev => { const n = new Set(prev); n.delete(key); return n }), 1500)

        // Refresh summary
        const sumRes = await fetch(`/api/nutrition-log?date=${dateStr}`)
        const sumData = await sumRes.json()
        if (sumData.summary) setSummary(sumData.summary)
        invalidateCache('/api/dashboard')
      }
    } catch (err) {
      console.error('Quick add error:', err)
    } finally {
      setAddingProduct(null)
    }
  }

  // Confirm add with custom grams from portion picker
  async function confirmAdd() {
    if (!selectedProduct || !plan || !activeMealId || savingConfirm) return
    setSavingConfirm(true)

    const grams = parseInt(portionGrams) || 100
    const meal = plan.meals.find(m => m.id === activeMealId)
    if (!meal) { setSavingConfirm(false); return }

    const existing = logs.get(activeMealId)
    const currentFoods = existing?.foods_eaten || meal.foods || []

    const newFood: FoodEntry = {
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

    const newFoods = [...currentFoods, newFood]

    try {
      const res = await fetch('/api/nutrition-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: plan.id,
          date: dateStr,
          meal_id: activeMealId,
          meal_name: meal.name,
          completed: existing?.completed || false,
          foods_eaten: newFoods,
          client_notes: existing?.client_notes || null,
        }),
      })

      if (res.ok) {
        const newLog: MealLog = {
          meal_id: activeMealId,
          meal_name: meal.name,
          completed: existing?.completed || false,
          foods_eaten: newFoods,
          client_notes: existing?.client_notes || null,
          completed_at: existing?.completed_at || null,
        }
        const upd = new Map(logs)
        upd.set(activeMealId, newLog)
        setLogs(upd)

        const key = selectedProduct.barcode || selectedProduct.name
        setJustAdded(prev => new Set(prev).add(key))
        setTimeout(() => setJustAdded(prev => { const n = new Set(prev); n.delete(key); return n }), 1500)

        setSelectedProduct(null)

        const sumRes = await fetch(`/api/nutrition-log?date=${dateStr}`)
        const sumData = await sumRes.json()
        if (sumData.summary) setSummary(sumData.summary)
        invalidateCache('/api/dashboard')
      }
    } catch (err) {
      console.error('Confirm add error:', err)
    } finally {
      setSavingConfirm(false)
    }
  }

  async function lookupBarcode(code: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/food-search?barcode=${encodeURIComponent(code.trim())}`)
      const data = await res.json()
      if (data.products?.length > 0) {
        setResults(data.products)
        setScanning(false)
      } else {
        setResults([])
        setScanning(false)
        setTab('custom')
        setCustomForm(prev => ({ ...prev, barcode: code.trim() }))
      }
    } catch {
      setScanning(false)
    }
    setLoading(false)
  }

  // Barcode scanner effect
  useEffect(() => {
    if (!scanning) return
    let html5QrCode: any = null
    let stopped = false

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        if (stopped) return

        let attempts = 0
        while (!document.getElementById('barcode-reader') && attempts < 20) {
          await new Promise(r => setTimeout(r, 50))
          attempts++
        }
        if (stopped || !document.getElementById('barcode-reader')) return

        html5QrCode = new Html5Qrcode('barcode-reader')
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 150 }, aspectRatio: 1.7777 },
          (decodedText: string) => {
            html5QrCode.stop().catch(() => {})
            lookupBarcode(decodedText)
          },
          () => {}
        )
      } catch (err: any) {
        setScanning(false)
        if (err?.message?.includes('Permission') || err?.name === 'NotAllowedError') {
          const code = prompt('Camera-toegang geweigerd. Voer de barcode handmatig in:')
          if (code) lookupBarcode(code)
        } else {
          const code = prompt('Camera niet beschikbaar. Voer barcode in:')
          if (code) lookupBarcode(code)
        }
      }
    }

    startScanner()
    return () => {
      stopped = true
      if (html5QrCode) { try { html5QrCode.stop().catch(() => {}) } catch {} }
    }
  }, [scanning])

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
          // Switch to search and auto-add the new product
          setTab('search')
          setResults([data.product])
          setCustomForm({ name: '', brand: '', barcode: '', calories: '', protein: '', carbs: '', fat: '' })
        }
      }
    } catch (err) {
      console.error('Save custom product error:', err)
    }
    setSavingCustom(false)
  }

  if (!isOpen) return null

  const confirmGrams = parseInt(portionGrams) || 0

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col" style={{ animation: 'slideUp 0.25s ease-out', paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-2 pb-2 border-b border-[#F0F0EE]">
        <button onClick={() => { if (selectedProduct) { setSelectedProduct(null) } else { onClose() } }} className="p-2.5 -ml-2 text-[#1A1917] active:bg-[#F5F5F3] rounded-full">
          {selectedProduct ? <ArrowLeft strokeWidth={1.5} className="w-5 h-5" /> : <X strokeWidth={1.5} className="w-5 h-5" />}
        </button>
        <h2 className="text-[15px] font-semibold text-[#1A1917]">{selectedProduct ? selectedProduct.name : 'Voedsel toevoegen'}</h2>
        <div className="w-10" /> {/* spacer */}
      </div>

      {/* Meal selector */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {meals.map(m => (
            <button
              key={m.id}
              onClick={() => setActiveMealId(m.id)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                activeMealId === m.id
                  ? 'bg-[#1A1917] text-white'
                  : 'bg-[#F5F5F3] text-[#8A8A8A] hover:bg-[#EBEBEA]'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tab bar + search */}
      <div className="px-4 pb-2">
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => { setTab('search'); setScanning(false) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
              tab === 'search' && !scanning ? 'bg-[#F5F5F3] text-[#1A1917]' : 'text-[#B0B0B0]'
            }`}
          >
            <Search strokeWidth={1.8} className="w-3.5 h-3.5" />
            Zoeken
          </button>
          <button
            onClick={() => { setTab('search'); setScanning(s => !s) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
              scanning ? 'bg-[#FFF3EE] text-[#D46A3A]' : 'text-[#B0B0B0]'
            }`}
          >
            <ScanBarcode strokeWidth={1.8} className="w-3.5 h-3.5" />
            Scan
          </button>
          <button
            onClick={() => { setTab('custom'); setScanning(false) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
              tab === 'custom' ? 'bg-[#F5F5F3] text-[#1A1917]' : 'text-[#B0B0B0]'
            }`}
          >
            <Plus strokeWidth={1.8} className="w-3.5 h-3.5" />
            Nieuw
          </button>
        </div>

        {tab === 'search' && !scanning && (
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
        )}
      </div>

      {/* Scanner */}
      {scanning && (
        <div className="px-4 py-4 bg-[#1A1917]">
          <div id="barcode-reader" className="w-full rounded-xl overflow-hidden" style={{ minHeight: 200 }} />
          <p className="text-center text-[12px] text-[#808080] mt-2">Richt de camera op de barcode</p>
          <button onClick={() => setScanning(false)} className="w-full mt-2 py-2 text-[13px] text-[#D46A3A] font-medium">
            Annuleren
          </button>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        {/* ── Product detail / portion picker ── */}
        {selectedProduct && tab === 'search' && (
          <div className="px-4 py-5">
            {/* Macro preview for selected grams */}
            <div className="bg-[#FAFAF8] rounded-xl px-4 py-3 mb-5">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-[20px] font-bold text-[#1A1917]">
                  {Math.round((selectedProduct.per100g.calories * confirmGrams) / 100)}
                </span>
                <span className="text-[13px] text-[#B0B0B0]">kcal</span>
              </div>
              <div className="flex gap-3 text-[12px] text-[#8A8A8A]">
                <span>E {Math.round((selectedProduct.per100g.protein * confirmGrams) / 100)}g</span>
                <span>K {Math.round((selectedProduct.per100g.carbs * confirmGrams) / 100)}g</span>
                <span>V {Math.round((selectedProduct.per100g.fat * confirmGrams) / 100)}g</span>
              </div>
            </div>

            {/* Portion presets */}
            <p className="text-[11px] font-semibold text-[#B0B0B0] uppercase tracking-[0.1em] mb-2">Portie</p>
            <div className="flex gap-2 flex-wrap mb-4">
              {(() => {
                const portions: { label: string; grams: number }[] = []
                if (selectedProduct.serving_size) {
                  const match = selectedProduct.serving_size.match(/(\d+)\s*g/i)
                  if (match) portions.push({ label: '1 portie', grams: parseInt(match[1]) })
                }
                if (selectedProduct.quantity) {
                  const match = selectedProduct.quantity.match(/(\d+)\s*g/i)
                  if (match && !portions.some(p => p.grams === parseInt(match[1])))
                    portions.push({ label: 'Verpakking', grams: parseInt(match[1]) })
                }
                if (!portions.some(p => p.grams === 100)) portions.push({ label: '100g', grams: 100 })
                if (!portions.some(p => p.grams === 150)) portions.push({ label: '150g', grams: 150 })
                if (!portions.some(p => p.grams === 200)) portions.push({ label: '200g', grams: 200 })
                portions.sort((a, b) => a.grams - b.grams)

                return portions.map(p => (
                  <button
                    key={p.label}
                    onClick={() => { setPortionGrams(String(p.grams)); setSelectedPortion(p.label) }}
                    className={`px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all border ${
                      selectedPortion === p.label && confirmGrams === p.grams
                        ? 'border-[#D46A3A] bg-[rgba(212,106,58,0.06)] text-[#D46A3A]'
                        : 'border-[#F0F0EE] text-[#8A8A8A] hover:border-[#C0C0C0]'
                    }`}
                  >
                    {p.label}
                    {p.label !== `${p.grams}g` && <span className="text-[10px] ml-1 opacity-60">{p.grams}g</span>}
                  </button>
                ))
              })()}
            </div>

            {/* Custom gram input */}
            <div className="flex items-center gap-3 mb-6">
              <input
                type="number"
                value={portionGrams}
                onChange={(e) => { setPortionGrams(e.target.value.replace(/[^0-9]/g, '')); setSelectedPortion(null) }}
                className="w-24 px-3 py-2.5 bg-[#F5F5F3] rounded-xl text-[15px] text-[#1A1917] text-center focus:outline-none focus:ring-2 focus:ring-[#1A1917]/10"
              />
              <span className="text-[14px] text-[#B0B0B0]">gram</span>
            </div>

            {/* Confirm button */}
            <button
              onClick={confirmAdd}
              disabled={savingConfirm || confirmGrams < 1}
              className="w-full py-3.5 bg-[#1A1917] text-white rounded-xl text-[14px] font-semibold transition-colors hover:bg-[#333] disabled:opacity-40"
            >
              {savingConfirm ? 'Toevoegen...' : 'Toevoegen'}
            </button>
          </div>
        )}

        {/* ── Search results list ── */}
        {!selectedProduct && tab === 'search' && !scanning && (
          <>
            {/* Section label */}
            {!loading && results.length > 0 && (
              <p className="px-4 pt-3 pb-1 text-[11px] font-semibold text-[#B0B0B0] uppercase tracking-[0.1em]">
                {query ? 'Resultaten' : 'Populair'}
              </p>
            )}

            {/* Loading shimmer */}
            {loading && (
              <div className="px-4 pt-3 space-y-1">
                {[1,2,3,4,5].map(i => (
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
                <p className="text-[13px] text-[#B0B0B0] mb-3">Geen resultaten voor &ldquo;{query}&rdquo;</p>
                <button
                  onClick={() => { setTab('custom'); setCustomForm(prev => ({ ...prev, name: query })) }}
                  className="text-[13px] font-medium text-[#D46A3A]"
                >
                  Handmatig toevoegen
                </button>
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
                  className="flex items-center gap-3 px-4 py-3 border-b border-[#F8F8F6] hover:bg-[#FAFAF8] transition-colors"
                >
                  {/* Product info — tap to open portion picker */}
                  <button
                    onClick={() => {
                      setSelectedProduct(product)
                      setPortionGrams(String(displayGrams))
                      setSelectedPortion(displayGrams === 100 ? '100g' : '1 portie')
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

                  {/* Quick-add button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); quickAdd(product) }}
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
          </>
        )}

        {/* Custom product form */}
        {tab === 'custom' && (
          <div className="px-4 py-4 space-y-4">
            <p className="text-[13px] text-[#B0B0B0]">
              Nieuw product toevoegen. Vul voedingswaarden per 100g in.
            </p>

            <div>
              <label className="text-[11px] font-semibold text-[#B0B0B0] uppercase tracking-[0.1em] block mb-1.5">Naam *</label>
              <input
                type="text"
                value={customForm.name}
                onChange={(e) => setCustomForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="bijv. Griekse yoghurt 0%"
                className="w-full px-3 py-2.5 bg-[#F5F5F3] rounded-xl text-[14px] text-[#1A1917] placeholder-[#C0C0C0] focus:outline-none focus:ring-2 focus:ring-[#1A1917]/10"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-[#B0B0B0] uppercase tracking-[0.1em] block mb-1.5">Merk</label>
                <input
                  type="text" value={customForm.brand}
                  onChange={(e) => setCustomForm(prev => ({ ...prev, brand: e.target.value }))}
                  placeholder="optioneel"
                  className="w-full px-3 py-2.5 bg-[#F5F5F3] rounded-xl text-[14px] text-[#1A1917] placeholder-[#C0C0C0] focus:outline-none focus:ring-2 focus:ring-[#1A1917]/10"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#B0B0B0] uppercase tracking-[0.1em] block mb-1.5">Barcode</label>
                <input
                  type="text" value={customForm.barcode}
                  onChange={(e) => setCustomForm(prev => ({ ...prev, barcode: e.target.value }))}
                  placeholder="optioneel"
                  className="w-full px-3 py-2.5 bg-[#F5F5F3] rounded-xl text-[14px] text-[#1A1917] placeholder-[#C0C0C0] focus:outline-none focus:ring-2 focus:ring-[#1A1917]/10"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#F0F0EE]">
              <p className="text-[11px] font-semibold text-[#B0B0B0] uppercase tracking-[0.1em] mb-3">Per 100g</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'calories', label: 'Calorieën (kcal) *' },
                  { key: 'protein', label: 'Eiwit (g)' },
                  { key: 'carbs', label: 'Koolhydraten (g)' },
                  { key: 'fat', label: 'Vet (g)' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-[12px] text-[#B0B0B0] block mb-1">{f.label}</label>
                    <input
                      type="number"
                      value={customForm[f.key as keyof typeof customForm]}
                      onChange={(e) => setCustomForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder="0"
                      className="w-full px-3 py-2.5 bg-[#F5F5F3] rounded-xl text-[14px] text-[#1A1917] placeholder-[#C0C0C0] focus:outline-none focus:ring-2 focus:ring-[#1A1917]/10"
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleSaveCustomProduct}
              disabled={savingCustom || !customForm.name || !customForm.calories}
              className="w-full py-3 bg-[#1A1917] text-white font-semibold text-[13px] uppercase tracking-[0.06em] hover:bg-[#333] transition-colors disabled:opacity-40 rounded-xl mt-2"
            >
              {savingCustom ? 'Opslaan...' : 'Opslaan & selecteren'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── MealDetailPanel (fullscreen overlay) ───────────

function MealDetailPanel({
  meal,
  log,
  plan,
  dateStr,
  logs,
  setLogs,
  setSummary,
  onClose,
  onOpenSearch,
}: {
  meal: MealMoment
  log: MealLog | undefined
  plan: NutritionPlan
  dateStr: string
  logs: Map<string, MealLog>
  setLogs: (logs: Map<string, MealLog>) => void
  setSummary: (summary: DailySummary | null) => void
  onClose: () => void
  onOpenSearch: (mealId: string) => void
}) {
  const [saving, setSaving] = useState(false)
  const [editingGrams, setEditingGrams] = useState<string | null>(null)
  const [gramsValue, setGramsValue] = useState('')
  const [copyingSaving, setCopyingSaving] = useState(false)

  const foods = log?.foods_eaten || meal.foods || []
  const isCompleted = log?.completed || false
  const totalCal = foods.reduce((s, f) => s + calcMacro(f, 'calories'), 0)
  const totalProt = foods.reduce((s, f) => s + calcMacro(f, 'protein'), 0)
  const totalCarbs = foods.reduce((s, f) => s + calcMacro(f, 'carbs'), 0)
  const totalFat = foods.reduce((s, f) => s + calcMacro(f, 'fat'), 0)

  async function saveFoods(newFoods: FoodEntry[], completed?: boolean) {
    setSaving(true)
    try {
      const res = await fetch('/api/nutrition-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: plan.id,
          date: dateStr,
          meal_id: meal.id,
          meal_name: meal.name,
          completed: completed !== undefined ? completed : (log?.completed || false),
          foods_eaten: newFoods,
          client_notes: log?.client_notes || null,
        }),
      })

      if (res.ok) {
        const newLog: MealLog = {
          meal_id: meal.id,
          meal_name: meal.name,
          completed: completed !== undefined ? completed : (log?.completed || false),
          foods_eaten: newFoods,
          client_notes: log?.client_notes || null,
          completed_at: (completed !== undefined ? completed : log?.completed)
            ? (log?.completed_at || new Date().toISOString())
            : null,
        }
        const upd = new Map(logs)
        upd.set(meal.id, newLog)
        setLogs(upd)

        const sumRes = await fetch(`/api/nutrition-log?date=${dateStr}`)
        const sumData = await sumRes.json()
        if (sumData.summary) setSummary(sumData.summary)
        invalidateCache('/api/dashboard')
      }
    } catch (err) {
      console.error('Save foods error:', err)
    } finally {
      setSaving(false)
    }
  }

  async function toggleComplete() {
    await saveFoods(foods, !isCompleted)
  }

  function deleteFood(foodId: string) {
    const newFoods = foods.filter(f => f.id !== foodId)
    saveFoods(newFoods)
  }

  function updateGrams(foodId: string) {
    const newGrams = parseInt(gramsValue) || 0
    if (newGrams < 1) return
    const newFoods = foods.map(f => f.id === foodId ? { ...f, grams: newGrams } : f)
    saveFoods(newFoods)
    setEditingGrams(null)
  }

  async function copyYesterday() {
    setCopyingSaving(true)
    try {
      const yesterday = new Date(dateStr)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      const res = await fetch(`/api/nutrition-log?date=${yesterdayStr}`)
      const data = await res.json()
      const yesterdayLog = (data.logs || []).find((l: any) => l.meal_id === meal.id)

      if (!yesterdayLog || !yesterdayLog.foods_eaten?.length) {
        alert('Geen voeding gevonden voor gisteren bij deze maaltijd.')
        setCopyingSaving(false)
        return
      }

      await saveFoods(yesterdayLog.foods_eaten)
    } catch (err) {
      console.error('Copy yesterday error:', err)
    } finally {
      setCopyingSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col" style={{ animation: 'slideUp 0.2s ease-out', paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-2 pb-3 border-b border-[#F0F0EE]">
        <button onClick={onClose} className="p-2.5 -ml-2 text-[#1A1917] active:bg-[#F5F5F3] rounded-full">
          <ArrowLeft strokeWidth={1.5} className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-[16px] font-semibold text-[#1A1917] truncate">{meal.name}</h2>
          <p className="text-[12px] text-[#B0B0B0]">{meal.time}</p>
        </div>
      </div>

      {/* Macro summary strip */}
      <div className="px-4 py-3 bg-[#FAFAF8] border-b border-[#F0F0EE] flex items-center gap-4 text-[13px]">
        <span className="font-semibold text-[#1A1917]">{totalCal} kcal</span>
        <span className="text-[#B0B0B0]">E {totalProt}g</span>
        <span className="text-[#B0B0B0]">K {totalCarbs}g</span>
        <span className="text-[#B0B0B0]">V {totalFat}g</span>
      </div>

      {/* Food list */}
      <div className="flex-1 overflow-y-auto">
        {foods.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-[14px] text-[#B0B0B0] mb-1">Nog geen items</p>
            <p className="text-[12px] text-[#D0D0D0]">Voeg voedsel toe aan deze maaltijd</p>
          </div>
        )}

        {foods.map(food => {
          const cal = calcMacro(food, 'calories')
          const isEditingThis = editingGrams === food.id

          return (
            <div key={food.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-[#F8F8F6]">
              <div className="flex-1 min-w-0">
                <p className="text-[14px] text-[#1A1917] truncate">{food.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {isEditingThis ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={gramsValue}
                        onChange={(e) => setGramsValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') updateGrams(food.id) }}
                        autoFocus
                        className="w-16 px-2 py-1 bg-[#F5F5F3] rounded-lg text-[13px] text-[#1A1917] focus:outline-none focus:ring-2 focus:ring-[#1A1917]/10"
                      />
                      <span className="text-[12px] text-[#B0B0B0]">g</span>
                      <button onClick={() => updateGrams(food.id)} className="text-[12px] font-medium text-[#3D8B5C] ml-1">OK</button>
                      <button onClick={() => setEditingGrams(null)} className="text-[12px] text-[#B0B0B0] ml-1">Annuleer</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingGrams(food.id); setGramsValue(String(food.grams)) }}
                      className="text-[12px] text-[#B0B0B0] hover:text-[#1A1917] transition-colors"
                    >
                      {food.grams}g · {cal} kcal
                    </button>
                  )}
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={() => deleteFood(food.id)}
                className="p-2 text-[#D0D0D0] hover:text-[#E53935] transition-colors shrink-0"
              >
                <Trash2 strokeWidth={1.5} className="w-4 h-4" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Bottom actions */}
      <div className="border-t border-[#F0F0EE] px-4 py-3 space-y-2" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        {/* Complete toggle — big and obvious */}
        <button
          onClick={toggleComplete}
          disabled={saving}
          className={`w-full py-3.5 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 transition-all ${
            isCompleted
              ? 'bg-[#E8F5E9] text-[#3D8B5C]'
              : 'bg-[#3D8B5C] text-white hover:bg-[#347A4F]'
          }`}
        >
          <Check strokeWidth={2} className="w-4.5 h-4.5" />
          {isCompleted ? 'Voltooid' : 'Maaltijd voltooien'}
        </button>

        {/* Add + copy row */}
        <div className="flex gap-2">
          <button
            onClick={() => onOpenSearch(meal.id)}
            className="flex-1 py-3 bg-[#F5F5F3] rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-[#EBEBEA] transition-colors text-[#1A1917]"
          >
            <Plus strokeWidth={2} className="w-4 h-4" />
            Voeg item toe
          </button>
          <button
            onClick={copyYesterday}
            disabled={copyingSaving}
            className="py-3 px-4 bg-[#F5F5F3] rounded-xl text-[13px] font-medium text-[#8A8A8A] hover:bg-[#EBEBEA] transition-colors flex items-center gap-1.5"
          >
            <Copy strokeWidth={1.5} className="w-3.5 h-3.5" />
            {copyingSaving ? '...' : 'Gisteren'}
          </button>
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
  const [activeMealId, setActiveMealId] = useState<string | null>(null) // open MealDetailPanel
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchMealId, setSearchMealId] = useState<string | null>(null)
  const [daySubmitted, setDaySubmitted] = useState(false)

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
        }))
        setPlan({ ...planData, meals: fixedMeals })
      }

      const res = await fetch(`/api/nutrition-log?date=${dateStr}`)
      const data = await res.json()

      const logMap = new Map<string, MealLog>()
      for (const log of data.logs || []) {
        logMap.set(log.meal_id, log)
      }
      setLogs(logMap)
      setSummary(data.summary || null)
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
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + offset)
    setSelectedDate(d)
    setActiveMealId(null)
  }

  const meals = plan?.meals || []

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

  // Resolve active meal for detail panel
  const activeMeal = meals.find(m => m.id === activeMealId)

  // ─── Loading skeleton ─────────────────────────────

  if (loading) {
    return (
      <div className="pb-28 animate-pulse">
        <div className="h-4 w-12 bg-[#F0F0EE] rounded mb-6 mt-2" />
        {/* Date nav skeleton */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-4 h-4 bg-[#F0F0EE] rounded" />
          <div className="h-5 w-24 bg-[#F0F0EE] rounded" />
          <div className="w-4 h-4 bg-[#F0F0EE] rounded" />
        </div>
        {/* Calorie ring skeleton */}
        <div className="flex justify-center mb-6">
          <div className="w-40 h-40 rounded-full bg-[#F0F0EE]" />
        </div>
        {/* Macro row */}
        <div className="flex justify-center gap-6 mb-10">
          {[1,2,3].map(i => <div key={i} className="h-10 w-16 bg-[#F0F0EE] rounded-lg" />)}
        </div>
        {/* Meal rows */}
        {[1,2,3].map(i => (
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

  return (
    <div className="pb-28">
      {/* ── Header ── */}
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
            {/* Background ring */}
            <circle cx="80" cy="80" r="68" fill="none" stroke="#F0F0EE" strokeWidth="8" />
            {/* Progress ring */}
            <circle
              cx="80" cy="80" r="68" fill="none"
              stroke={allDone ? '#3D8B5C' : '#D46A3A'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(calPct / 100) * 427.26} 427.26`}
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-[32px] font-bold leading-none tracking-tight"
              style={{ color: allDone ? '#3D8B5C' : '#1A1917' }}
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
      <div className="animate-slide-up stagger-4">
        <p className="text-[11px] font-semibold text-[#B0B0B0] uppercase tracking-[0.12em] mb-3">Maaltijden</p>

        {meals.map(meal => {
          const log = logs.get(meal.id)
          const isCompleted = log?.completed || false
          const foods = log?.foods_eaten || meal.foods || []
          const cal = mealCalories(foods)

          return (
            <button
              key={meal.id}
              onClick={() => setActiveMealId(meal.id)}
              className="w-full flex items-center gap-3 py-4 border-t border-[#F0F0EE] hover:bg-[#FAFAF8] transition-colors text-left"
            >
              {/* Completion indicator */}
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                isCompleted ? 'bg-[#3D8B5C]' : 'border-[1.5px] border-[#E0E0DE]'
              }`}>
                {isCompleted && (
                  <Check strokeWidth={2.5} className="w-3 h-3 text-white" />
                )}
              </div>

              {/* Meal info */}
              <div className="flex-1 min-w-0">
                <p className={`text-[15px] font-medium truncate ${isCompleted ? 'text-[#B0B0B0]' : 'text-[#1A1917]'}`}>
                  {meal.name}
                </p>
                <p className="text-[12px] text-[#C0C0C0] mt-0.5">
                  {meal.time} · {foods.length} {foods.length === 1 ? 'item' : 'items'}
                </p>
              </div>

              {/* Kcal + arrow */}
              <div className="shrink-0 flex items-center gap-2">
                <span className={`text-[14px] font-semibold ${isCompleted ? 'text-[#C0C0C0]' : 'text-[#1A1917]'}`}>
                  {cal}
                </span>
                <span className="text-[11px] text-[#C0C0C0]">kcal</span>
                <ChevronRight strokeWidth={1.5} className="w-4 h-4 text-[#D5D5D5]" />
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Add food row (inline in meals section) ── */}
      <div className="animate-slide-up stagger-5">
        <button
          onClick={() => { setSearchMealId(meals[0]?.id || null); setSearchOpen(true) }}
          className="w-full flex items-center gap-3 py-4 border-t border-[#F0F0EE] text-left hover:bg-[#FAFAF8] transition-colors"
        >
          <div className="w-5 h-5 rounded-full bg-[#F5F5F3] flex items-center justify-center shrink-0">
            <Plus strokeWidth={2} className="w-3 h-3 text-[#8A8A8A]" />
          </div>
          <span className="text-[14px] font-medium text-[#D46A3A]">Voeg item toe</span>
        </button>
      </div>

      {/* ── Submit day (inline, not floating) ── */}
      {meals.length > 0 && (
        <div className="mt-8 mb-4 animate-slide-up stagger-6">
          <button
            onClick={submitDay}
            disabled={daySubmitted}
            className={`w-full py-3 rounded-xl font-semibold text-[13px] uppercase tracking-[0.06em] transition-all ${
              daySubmitted
                ? 'bg-[#E8F5E9] text-[#3D8B5C]'
                : allDone
                  ? 'bg-[#3D8B5C] text-white hover:bg-[#347A4F]'
                  : 'bg-[#F5F5F3] text-[#1A1917] hover:bg-[#EBEBEA]'
            }`}
          >
            {daySubmitted ? 'Ingediend ✓' : `Dag indienen (${completedCount}/${meals.length})`}
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

      {/* ── Meal Detail Panel ── */}
      {activeMeal && (
        <MealDetailPanel
          meal={activeMeal}
          log={logs.get(activeMeal.id)}
          plan={plan}
          dateStr={dateStr}
          logs={logs}
          setLogs={setLogs}
          setSummary={setSummary}
          onClose={() => setActiveMealId(null)}
          onOpenSearch={(mealId) => {
            setActiveMealId(null)
            setTimeout(() => { setSearchMealId(mealId); setSearchOpen(true) }, 100)
          }}
        />
      )}

      {/* ── Food Search Modal ── */}
      <FoodSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        meals={meals}
        initialMealId={searchMealId}
        plan={plan}
        dateStr={dateStr}
        logs={logs}
        setLogs={setLogs}
        setSummary={setSummary}
      />

      {/* Inline animation keyframes */}
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
