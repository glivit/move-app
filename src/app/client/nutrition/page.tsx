'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import {
  ChevronLeft, ChevronRight, Plus, X, Search,
  Check, Trash2, ShoppingCart, ChevronDown
} from 'lucide-react'
import { invalidateCache } from '@/lib/fetcher'
import { optimisticMutate } from '@/lib/optimistic'

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
      { key: 'supplements', label: 'Supplementen', items: supplements },
      { key: 'snacks', label: 'Snacks', items: snacks },
      { key: 'maaltijden', label: 'Maaltijden', items: maaltijden },
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
    <div className="v6-card-dark">
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShoppingCart strokeWidth={1.5} size={16} style={{ color: '#C0FC01' }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#FDFDFE', letterSpacing: '-0.01em' }}>
            Boodschappenlijst
          </span>
          <span style={{ fontSize: 11, color: 'rgba(253,253,254,0.52)', fontWeight: 500 }}>
            {checkedCount > 0 ? `${checkedCount}/${totalItems}` : `${totalItems} items`}
          </span>
        </div>
        <ChevronDown
          strokeWidth={1.5}
          size={16}
          style={{
            color: 'rgba(253,253,254,0.52)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 200ms',
          }}
        />
      </button>

      {open && (
        <div style={{ marginTop: 16 }}>
          <p style={{
            fontSize: 10, color: 'rgba(253,253,254,0.52)',
            textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 14px',
          }}>
            Weekoverzicht — 7 dagen
          </p>

          {categories.map((cat, ci) => (
            <div key={cat.key} style={{ marginBottom: ci < categories.length - 1 ? 18 : 0 }}>
              <div style={{
                fontSize: 11, fontWeight: 600, color: 'rgba(253,253,254,0.62)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                marginBottom: 8,
              }}>
                {cat.label}
              </div>
              <div>
                {cat.items.map((item, ii) => {
                  const key = `${item.name}||${item.brand || ''}`
                  const isChecked = checkedItems.has(key)
                  const { amount, unit } = gramsToUnit(item.totalGrams, item.name)

                  return (
                    <button
                      key={key}
                      onClick={() => toggleItem(key)}
                      style={{
                        width: '100%',
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 2px',
                        borderTop: ii === 0 ? 'none' : '1px solid rgba(253,253,254,0.08)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        WebkitTapHighlightColor: 'transparent',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: 5,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        background: isChecked ? '#2FA65A' : 'transparent',
                        border: isChecked ? 'none' : '1.5px solid rgba(253,253,254,0.28)',
                        transition: 'all 160ms',
                      }}>
                        {isChecked && <Check strokeWidth={3} size={11} style={{ color: '#FDFDFE' }} />}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 13, margin: 0, lineHeight: 1.2,
                          color: isChecked ? 'rgba(253,253,254,0.40)' : '#FDFDFE',
                          textDecoration: isChecked ? 'line-through' : 'none',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {item.name}
                        </p>
                        {item.brand && (
                          <p style={{
                            fontSize: 11, margin: '2px 0 0',
                            color: 'rgba(253,253,254,0.44)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {item.brand}
                          </p>
                        )}
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span style={{
                          fontSize: 13, fontWeight: 500,
                          color: isChecked ? 'rgba(253,253,254,0.40)' : '#FDFDFE',
                          fontVariantNumeric: 'tabular-nums',
                        }}>{amount}</span>
                        <span style={{
                          fontSize: 11, marginLeft: 2,
                          color: isChecked ? 'rgba(253,253,254,0.30)' : 'rgba(253,253,254,0.52)',
                        }}>{unit}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {checkedCount > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{
                height: 4, borderRadius: 999, overflow: 'hidden',
                background: 'rgba(253,253,254,0.10)',
              }}>
                <div
                  style={{
                    height: '100%',
                    width: `${(checkedCount / totalItems) * 100}%`,
                    background: '#2FA65A',
                    transition: 'width 300ms',
                  }}
                />
              </div>
              <p style={{
                fontSize: 11, color: 'rgba(253,253,254,0.52)',
                margin: '8px 0 0', textAlign: 'center',
              }}>
                {checkedCount === totalItems ? 'Alles ingekocht' : `${checkedCount} van ${totalItems} ingekocht`}
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
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [editGrams, setEditGrams] = useState<number>(100)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const sheetRef = useRef<HTMLDivElement>(null)

  // Reset expanded row when closing
  useEffect(() => {
    if (!isOpen) {
      setExpandedKey(null)
      setEditGrams(100)
    }
  }, [isOpen])

  function openEditor(key: string, defaultGrams: number) {
    if (expandedKey === key) {
      setExpandedKey(null)
    } else {
      setExpandedKey(key)
      setEditGrams(defaultGrams)
    }
  }

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

    const prevLogs = logs
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

    let justAddedTimer: ReturnType<typeof setTimeout> | null = null

    try {
      // ── Optimistic add: instant UI + rollback on commit failure ──────
      await optimisticMutate({
        key: `meal-add-food:${meal.id}:${key}`,
        apply: () => {
          setLogs(upd)
          setJustAdded(prev => new Set(prev).add(key))
          justAddedTimer = setTimeout(() => {
            setJustAdded(prev => { const n = new Set(prev); n.delete(key); return n })
          }, 1000)
        },
        rollback: () => {
          if (justAddedTimer) clearTimeout(justAddedTimer)
          setLogs(prevLogs)
          setJustAdded(prev => { const n = new Set(prev); n.delete(key); return n })
        },
        commit: async () => {
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
          if (!res.ok) throw new Error(`add-food failed: ${res.status}`)
          return res
        },
        onSuccess: () => {
          invalidateCache('/api/dashboard')
        },
        onError: (err) => {
          console.error('[optimistic:add-food] commit failed:', err)
        },
      })
    } catch {
      // Rollback al gedaan; we slikken zodat de UI niet crasht.
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
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.52)',
          opacity: isOpen ? 1 : 0,
          transition: 'opacity 300ms',
        }}
      />

      {/* Sheet — v6 dark card style */}
      <div
        ref={sheetRef}
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: '#474B48',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 -4px 24px rgba(0,0,0,0.32)',
          height: '75%',
          display: isOpen ? 'flex' : 'none',
          flexDirection: 'column',
          transform: 'translateY(0)',
          transition: 'transform 300ms',
        }}
      >
        {/* Drag handle */}
        <div
          onTouchStart={handleDragDown}
          style={{
            display: 'flex', justifyContent: 'center',
            padding: '12px 0',
            cursor: 'grab',
          }}
        >
          <div style={{
            width: 40, height: 4,
            borderRadius: 999,
            background: 'rgba(253,253,254,0.22)',
          }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px 14px',
          borderBottom: '1px solid rgba(253,253,254,0.08)',
        }}>
          <h2 style={{
            fontSize: 15, fontWeight: 600, color: '#FDFDFE',
            margin: 0, letterSpacing: '-0.01em',
          }}>
            {meal.name} toevoegen
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: 6,
              background: 'transparent',
              border: 'none',
              color: 'rgba(253,253,254,0.52)',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <X strokeWidth={1.5} size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 8,
          padding: '14px 20px',
          borderBottom: '1px solid rgba(253,253,254,0.08)',
        }}>
          {(['recent', 'search'] as const).map(t => {
            const active = tab === t
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  fontSize: 13, fontWeight: 500,
                  background: active ? '#FDFDFE' : 'rgba(253,253,254,0.08)',
                  color: active ? '#FDFDFE' : 'rgba(253,253,254,0.62)',
                  border: 'none',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'all 160ms',
                }}
              >
                {t === 'recent' ? 'Recent' : 'Zoeken'}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {tab === 'recent' && (
            <div>
              {recentFoods.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: 'rgba(253,253,254,0.52)', margin: 0 }}>
                    Geen recente items
                  </p>
                </div>
              ) : (
                recentFoods.map((food, idx) => {
                  const key = food.name
                  const isAdding = addingProduct === key
                  const wasAdded = justAdded.has(key)
                  const isExpanded = expandedKey === key
                  const currentGrams = isExpanded ? editGrams : 100
                  const displayCal = Math.round((food.per100g.calories * currentGrams) / 100)

                  return (
                    <div
                      key={idx}
                      style={{
                        borderBottom: '1px solid rgba(253,253,254,0.06)',
                        background: isExpanded ? 'rgba(253,253,254,0.04)' : 'transparent',
                        transition: 'background 160ms',
                      }}
                    >
                      <div
                        onClick={() => openEditor(key, 100)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '12px 20px',
                          cursor: 'pointer',
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            fontSize: 14, fontWeight: 500, color: '#FDFDFE',
                            margin: 0, lineHeight: 1.25,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {food.name}
                          </p>
                          <p style={{
                            fontSize: 12, color: 'rgba(253,253,254,0.52)',
                            margin: '3px 0 0',
                          }}>
                            {displayCal} kcal · {currentGrams}g{food.brand && <span> · {food.brand}</span>}
                          </p>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (isExpanded) {
                              addFood(food, editGrams)
                              setExpandedKey(null)
                            } else {
                              openEditor(key, 100)
                            }
                          }}
                          disabled={isAdding}
                          style={{
                            height: 36,
                            minWidth: 36,
                            padding: isExpanded ? '0 14px' : 0,
                            borderRadius: isExpanded ? 18 : '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: 6,
                            flexShrink: 0,
                            background: wasAdded ? '#2FA65A' : isExpanded ? '#C0FC01' : 'rgba(253,253,254,0.10)',
                            color: isExpanded && !wasAdded ? '#FDFDFE' : '#FDFDFE',
                            fontSize: 13, fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                            WebkitTapHighlightColor: 'transparent',
                            transition: 'all 160ms',
                          }}
                        >
                          {isAdding ? (
                            <div style={{
                              width: 14, height: 14,
                              border: '1.5px solid rgba(253,253,254,0.30)',
                              borderTopColor: '#FDFDFE',
                              borderRadius: '50%',
                              animation: 'spin 800ms linear infinite',
                            }} />
                          ) : wasAdded ? (
                            <Check strokeWidth={2} size={16} />
                          ) : isExpanded ? (
                            <>Toevoegen</>
                          ) : (
                            <Plus strokeWidth={2} size={16} />
                          )}
                        </button>
                      </div>

                      {/* Inline grams editor */}
                      {isExpanded && (
                        <div style={{
                          padding: '0 20px 14px',
                          display: 'flex', flexDirection: 'column', gap: 10,
                        }}>
                          {/* Quick chips */}
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {[25, 50, 100, 150, 200, 250].map(g => {
                              const active = editGrams === g
                              return (
                                <button
                                  key={g}
                                  onClick={(e) => { e.stopPropagation(); setEditGrams(g) }}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: 10,
                                    fontSize: 12, fontWeight: 500,
                                    background: active ? '#FDFDFE' : 'rgba(253,253,254,0.08)',
                                    color: active ? '#FDFDFE' : 'rgba(253,253,254,0.78)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    WebkitTapHighlightColor: 'transparent',
                                  }}
                                >
                                  {g}g
                                </button>
                              )
                            })}
                          </div>

                          {/* Stepper */}
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            background: 'rgba(253,253,254,0.06)',
                            borderRadius: 12,
                            padding: '6px 8px',
                          }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditGrams(Math.max(5, editGrams - 5)) }}
                              style={{
                                width: 32, height: 32, borderRadius: 10,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'rgba(253,253,254,0.10)',
                                color: '#FDFDFE',
                                border: 'none', cursor: 'pointer',
                                WebkitTapHighlightColor: 'transparent',
                              }}
                            >
                              <span style={{ fontSize: 18, fontWeight: 400, lineHeight: 1 }}>−</span>
                            </button>
                            <input
                              type="number"
                              inputMode="numeric"
                              value={editGrams}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                const v = parseInt(e.target.value)
                                setEditGrams(Number.isFinite(v) && v > 0 ? v : 1)
                              }}
                              style={{
                                flex: 1, textAlign: 'center',
                                fontSize: 16, fontWeight: 600, color: '#FDFDFE',
                                background: 'transparent', border: 'none', outline: 'none',
                                fontVariantNumeric: 'tabular-nums',
                                padding: '6px 0',
                              }}
                            />
                            <span style={{ fontSize: 13, color: 'rgba(253,253,254,0.52)', marginRight: 4 }}>g</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditGrams(editGrams + 5) }}
                              style={{
                                width: 32, height: 32, borderRadius: 10,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'rgba(253,253,254,0.10)',
                                color: '#FDFDFE',
                                border: 'none', cursor: 'pointer',
                                WebkitTapHighlightColor: 'transparent',
                              }}
                            >
                              <span style={{ fontSize: 18, fontWeight: 400, lineHeight: 1 }}>+</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}

          {tab === 'search' && (
            <div style={{ padding: '14px 20px' }}>
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <Search strokeWidth={1.5} size={16} style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  color: 'rgba(253,253,254,0.44)',
                }} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Zoek voedingsmiddel..."
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 36px',
                    background: 'rgba(253,253,254,0.08)',
                    borderRadius: 12,
                    fontSize: 14, color: '#FDFDFE',
                    border: 'none',
                    outline: 'none',
                  }}
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      padding: 4,
                      background: 'transparent', border: 'none',
                      cursor: 'pointer', color: 'rgba(253,253,254,0.44)',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <X strokeWidth={1.5} size={14} />
                  </button>
                )}
              </div>

              {loading && (
                <div>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 0', opacity: 0.5,
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ height: 14, width: 128, background: 'rgba(253,253,254,0.10)', borderRadius: 4, marginBottom: 6 }} />
                        <div style={{ height: 10, width: 192, background: 'rgba(253,253,254,0.08)', borderRadius: 4 }} />
                      </div>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(253,253,254,0.10)' }} />
                    </div>
                  ))}
                </div>
              )}

              {!loading && results.length === 0 && query && (
                <div style={{ padding: '48px 0', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: 'rgba(253,253,254,0.52)', margin: 0 }}>
                    Geen resultaten
                  </p>
                </div>
              )}

              {!loading && results.map((product, idx) => {
                const key = product.barcode || product.name
                const isAdding = addingProduct === key
                const wasAdded = justAdded.has(key)
                const isExpanded = expandedKey === key
                let defaultGrams = 100
                if (product.serving_size) {
                  const match = product.serving_size.match(/(\d+)\s*g/i)
                  if (match) defaultGrams = parseInt(match[1])
                }
                const currentGrams = isExpanded ? editGrams : defaultGrams
                const displayCal = Math.round((product.per100g.calories * currentGrams) / 100)

                return (
                  <div
                    key={idx}
                    style={{
                      borderBottom: '1px solid rgba(253,253,254,0.06)',
                      background: isExpanded ? 'rgba(253,253,254,0.04)' : 'transparent',
                      transition: 'background 160ms',
                      margin: '0 -20px',
                      padding: '0 20px',
                    }}
                  >
                    <div
                      onClick={() => openEditor(key, defaultGrams)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 0',
                        cursor: 'pointer',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 14, color: '#FDFDFE', margin: 0, lineHeight: 1.25,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {product.name}
                        </p>
                        <p style={{
                          fontSize: 12, color: 'rgba(253,253,254,0.52)', margin: '3px 0 0',
                        }}>
                          {displayCal} kcal{product.brand && <span> · {product.brand}</span>}
                          <span style={{ color: 'rgba(253,253,254,0.32)' }}> · {currentGrams}g</span>
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (isExpanded) {
                            addFood(product, editGrams)
                            setExpandedKey(null)
                          } else {
                            openEditor(key, defaultGrams)
                          }
                        }}
                        disabled={isAdding}
                        style={{
                          height: 36,
                          minWidth: 36,
                          padding: isExpanded ? '0 14px' : 0,
                          borderRadius: isExpanded ? 18 : '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                          background: wasAdded ? '#2FA65A' : isExpanded ? '#C0FC01' : 'rgba(253,253,254,0.10)',
                          color: isExpanded && !wasAdded ? '#FDFDFE' : '#FDFDFE',
                          fontSize: 13, fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                          WebkitTapHighlightColor: 'transparent',
                          transition: 'all 160ms',
                        }}
                      >
                        {isAdding ? (
                          <div style={{
                            width: 14, height: 14,
                            border: '1.5px solid rgba(253,253,254,0.30)',
                            borderTopColor: '#FDFDFE',
                            borderRadius: '50%',
                            animation: 'spin 800ms linear infinite',
                          }} />
                        ) : wasAdded ? (
                          <Check strokeWidth={2} size={16} />
                        ) : isExpanded ? (
                          <>Toevoegen</>
                        ) : (
                          <Plus strokeWidth={2} size={16} />
                        )}
                      </button>
                    </div>

                    {/* Inline grams editor */}
                    {isExpanded && (
                      <div style={{
                        padding: '0 0 14px',
                        display: 'flex', flexDirection: 'column', gap: 10,
                      }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {[25, 50, 100, 150, 200, 250].map(g => {
                            const active = editGrams === g
                            return (
                              <button
                                key={g}
                                onClick={(e) => { e.stopPropagation(); setEditGrams(g) }}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: 10,
                                  fontSize: 12, fontWeight: 500,
                                  background: active ? '#FDFDFE' : 'rgba(253,253,254,0.08)',
                                  color: active ? '#FDFDFE' : 'rgba(253,253,254,0.78)',
                                  border: 'none',
                                  cursor: 'pointer',
                                  WebkitTapHighlightColor: 'transparent',
                                }}
                              >
                                {g}g
                              </button>
                            )
                          })}
                        </div>

                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          background: 'rgba(253,253,254,0.06)',
                          borderRadius: 12,
                          padding: '6px 8px',
                        }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditGrams(Math.max(5, editGrams - 5)) }}
                            style={{
                              width: 32, height: 32, borderRadius: 10,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: 'rgba(253,253,254,0.10)',
                              color: '#FDFDFE',
                              border: 'none', cursor: 'pointer',
                              WebkitTapHighlightColor: 'transparent',
                            }}
                          >
                            <span style={{ fontSize: 18, fontWeight: 400, lineHeight: 1 }}>−</span>
                          </button>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={editGrams}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const v = parseInt(e.target.value)
                              setEditGrams(Number.isFinite(v) && v > 0 ? v : 1)
                            }}
                            style={{
                              flex: 1, textAlign: 'center',
                              fontSize: 16, fontWeight: 600, color: '#FDFDFE',
                              background: 'transparent', border: 'none', outline: 'none',
                              fontVariantNumeric: 'tabular-nums',
                              padding: '6px 0',
                            }}
                          />
                          <span style={{ fontSize: 13, color: 'rgba(253,253,254,0.52)', marginRight: 4 }}>g</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditGrams(editGrams + 5) }}
                            style={{
                              width: 32, height: 32, borderRadius: 10,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: 'rgba(253,253,254,0.10)',
                              color: '#FDFDFE',
                              border: 'none', cursor: 'pointer',
                              WebkitTapHighlightColor: 'transparent',
                            }}
                          >
                            <span style={{ fontSize: 18, fontWeight: 400, lineHeight: 1 }}>+</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
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
  const [editingFood, setEditingFood] = useState<{ mealId: string; foodId: string; grams: number } | null>(null)

  const dateStr = selectedDate.toISOString().split('T')[0]

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      function ensureFoodIds(foods: any[], prefix: string): FoodEntry[] {
        return (foods || []).map((f: any, fi: number) => ({
          ...f,
          id: f.id && !f.id.startsWith('plan-') ? f.id : `${prefix}-${fi}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        }))
      }

      const [planRes, logsRes] = await Promise.all([
        supabase.from('nutrition_plans').select('*')
          .eq('client_id', user.id).eq('is_active', true).single(),
        fetch(`/api/nutrition-log?date=${dateStr}`).then(r => r.json()),
      ])

      const planData = planRes.data
      let fixedPlan: NutritionPlan | null = null

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
        fixedPlan = { ...planData, meals: fixedMeals }
        setPlan(fixedPlan)
      }

      const logMap = new Map<string, MealLog>()
      for (const log of logsRes.logs || []) {
        log.foods_eaten = ensureFoodIds(log.foods_eaten, `log-${log.meal_id}`)
        logMap.set(log.meal_id, log)
      }

      setLogs(logMap)
      setSummary(logsRes.summary || null)
      setLoading(false)

      if (logMap.size === 0 && planData && fixedPlan) {
        const yesterday = new Date(dateStr)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]
        try {
          const yData = await fetch(`/api/nutrition-log?date=${yesterdayStr}`).then(r => r.json())

          const yFixedMeals = (planData.meals || []).map((m: any, i: number) => ({
            ...m,
            id: ensureMealId(m, i),
            foods: (m.foods || []).map((f: any, fi: number) => ({
              ...f,
              id: f.id || `yplan-${i}-food-${fi}-${(f.name || '').replace(/\s+/g, '-').toLowerCase()}`,
              checked: false,
            })),
          }))

          const updatedLogMap = new Map(logMap)
          for (const yLog of yData.logs || []) {
            const meal = yFixedMeals.find((m: any) => m.id === yLog.meal_id)
            if (!meal) continue
            const planFoodNames = new Set((meal.foods || []).map((f: FoodEntry) => f.name))
            const extras = ensureFoodIds(
              (yLog.foods_eaten || []).filter((f: FoodEntry) => !planFoodNames.has(f.name)),
              `extra-${meal.id}`
            ).map((f: FoodEntry) => ({ ...f, checked: false }))
            if (extras.length > 0) {
              updatedLogMap.set(meal.id, {
                meal_id: meal.id, meal_name: meal.name, completed: false,
                foods_eaten: [...(meal.foods || []), ...extras],
                client_notes: null, completed_at: null,
              })
            }
          }
          if (updatedLogMap.size > 0) setLogs(updatedLogMap)
        } catch {}
      }

      try {
        const today = new Date(dateStr)
        const datePromises = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(today)
          d.setDate(d.getDate() - i)
          return fetch(`/api/nutrition-log?date=${d.toISOString().split('T')[0]}`)
            .then(r => r.json()).catch(() => ({ logs: [] }))
        })
        const recentResults = await Promise.all(datePromises)
        const recentMap = new Map<string, { frequency: number; per100g: any; brand?: string }>()
        for (const rData of recentResults) {
          for (const log of rData.logs || []) {
            for (const food of log.foods_eaten || []) {
              const existing = recentMap.get(food.name)
              if (existing) { existing.frequency += 1 }
              else { recentMap.set(food.name, { frequency: 1, per100g: food.per100g, brand: food.brand }) }
            }
          }
        }
        setRecentFoods(
          Array.from(recentMap.entries())
            .map(([name, d]) => ({ name, brand: d.brand, frequency: d.frequency, per100g: d.per100g }))
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, 20)
        )
      } catch {}
    } catch (err) {
      console.error('Load error:', err)
      setLoading(false)
    }
  }, [dateStr])

  useEffect(() => {
    loadData()
  }, [loadData])

  function navigateDate(offset: number) {
    setBottomSheetOpen(false)
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

  // ────────────────────────────────────────────────────────────
  // Fase 4 — Optimistic meal-food updates (toggle/delete/grams)
  //
  //   Vóór: setLogs synchroon → fire-and-forget POST.
  //   Na  : optimisticMutate met snapshot-rollback. Als de POST faalt
  //         (offline, 5xx) wordt de food-checkbox automatisch terug-
  //         geflipt zodat UI consistent blijft met server.
  //
  //   Dashboard-cache wordt na succes geïnvalideerd zodat de homepage
  //   bij volgende mount de hertelde mealsCompleted/macros ziet.
  // ────────────────────────────────────────────────────────────
  function updateMealFoods(meal: MealMoment, newFoods: FoodEntry[]) {
    if (!plan) return
    const existing = logs.get(meal.id)
    const prevLogs = logs

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

    optimisticMutate({
      key: `meal-foods:${meal.id}`,
      apply: () => setLogs(upd),
      rollback: () => setLogs(prevLogs),
      commit: async () => {
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
        if (!res.ok) throw new Error(`meal-foods save failed: ${res.status}`)
        return res
      },
      onSuccess: () => {
        invalidateCache('/api/dashboard')
      },
      onError: (err) => {
        console.error('[optimistic:meal-foods] commit failed:', err)
      },
    }).catch(() => {
      // Rollback al gedaan; we slikken de error zodat React niets afhandelt.
    })
  }

  function toggleFoodChecked(meal: MealMoment, foodId: string) {
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

  function updateFoodGrams(meal: MealMoment, foodId: string, grams: number) {
    const existing = logs.get(meal.id)
    const foods = existing?.foods_eaten || meal.foods || []
    const newFoods = foods.map(f =>
      f.id === foodId ? { ...f, grams: Math.max(1, Math.round(grams)) } : f
    )
    updateMealFoods(meal, newFoods)
  }

  if (loading) {
    return (
      <div className="pb-28" style={{ animation: 'pulse 1.8s ease-in-out infinite' }}>
        <div className="v6-card-dark" style={{ marginBottom: 14, minHeight: 260 }} />
        <div className="v6-card-dark" style={{ marginBottom: 14, minHeight: 160 }} />
        <div className="v6-card-dark" style={{ minHeight: 120 }} />
        <style jsx>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.65; }
          }
        `}</style>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="pb-28">
        <button
          onClick={() => window.history.back()}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            marginTop: 8, marginBottom: 18,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'rgba(253,253,254,0.62)',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <ChevronLeft strokeWidth={1.5} size={18} />
          <span style={{ fontSize: 14 }}>Home</span>
        </button>
        <div className="v6-card" style={{ textAlign: 'center', padding: '48px 22px' }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#FDFDFE', margin: '0 0 6px' }}>
            Nog geen plan
          </p>
          <p style={{ fontSize: 13, color: 'rgba(253,253,254,0.62)', margin: 0 }}>
            Je coach bereidt je voedingsplan voor.
          </p>
        </div>
      </div>
    )
  }

  const currentMeal = meals.find(m => m.id === bottomSheetMealId)
  const ringColor = allMealsComplete ? '#2FA65A' : '#C0FC01'

  return (
    <div className="pb-28">
      {/* Back button */}
      <button
        onClick={() => window.history.back()}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          marginTop: 8, marginBottom: 14,
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'rgba(253,253,254,0.62)',
          WebkitTapHighlightColor: 'transparent',
          padding: 0,
        }}
      >
        <ChevronLeft strokeWidth={1.5} size={18} />
        <span style={{ fontSize: 14 }}>Home</span>
      </button>

      {/* ── HERO CARD: date nav + ring + macros ── */}
      <div className="v6-card-dark animate-slide-up" style={{ marginBottom: 14 }}>
        {/* Date nav */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 16, marginBottom: 18,
        }}>
          <button
            onClick={() => navigateDate(-1)}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(253,253,254,0.08)',
              border: 'none', cursor: 'pointer',
              color: 'rgba(253,253,254,0.62)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <ChevronLeft strokeWidth={1.5} size={16} />
          </button>
          <span style={{
            fontSize: 15, fontWeight: 600, color: '#FDFDFE',
            letterSpacing: '-0.01em', minWidth: 88, textAlign: 'center',
          }}>
            {formatDate(selectedDate)}
          </span>
          <button
            onClick={() => navigateDate(1)}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(253,253,254,0.08)',
              border: 'none', cursor: 'pointer',
              color: 'rgba(253,253,254,0.62)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <ChevronRight strokeWidth={1.5} size={16} />
          </button>
        </div>

        {/* Calorie ring */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ position: 'relative', width: 176, height: 176 }}>
            <svg viewBox="0 0 176 176" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle cx="88" cy="88" r="76" fill="none" stroke="rgba(253,253,254,0.10)" strokeWidth="8" />
              <circle
                cx="88" cy="88" r="76" fill="none"
                stroke={ringColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(calPct / 100) * 477.52} 477.52`}
                style={{ transition: 'stroke-dasharray 700ms cubic-bezier(0.16, 1, 0.3, 1), stroke 300ms' }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontSize: 38, fontWeight: 700,
                lineHeight: 1, letterSpacing: '-0.03em',
                color: allMealsComplete ? '#2FA65A' : '#FDFDFE',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {actualCal}
              </span>
              <span style={{
                fontSize: 11, color: 'rgba(253,253,254,0.52)',
                marginTop: 4, letterSpacing: '0.02em',
              }}>
                / {targetCal} kcal
              </span>
            </div>
          </div>
        </div>

        {/* Macro pills */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 8,
        }}>
          {[
            { label: 'Eiwit', actual: actualProt, target: targetProt },
            { label: 'Koolh', actual: actualCarbs, target: targetCarbs },
            { label: 'Vet', actual: actualFat, target: targetFat },
          ].map(macro => {
            const pct = macro.target > 0 ? Math.min((macro.actual / macro.target) * 100, 100) : 0
            return (
              <div
                key={macro.label}
                style={{
                  background: 'rgba(253,253,254,0.06)',
                  borderRadius: 14,
                  padding: '12px 10px 10px',
                  textAlign: 'center',
                }}
              >
                <div style={{
                  fontSize: 15, fontWeight: 600, color: '#FDFDFE',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {macro.actual}
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(253,253,254,0.52)' }}>g</span>
                </div>
                <div style={{
                  fontSize: 10, color: 'rgba(253,253,254,0.44)',
                  marginTop: 2, fontVariantNumeric: 'tabular-nums',
                }}>
                  / {macro.target}g
                </div>
                <div style={{
                  marginTop: 8,
                  height: 3, borderRadius: 999,
                  background: 'rgba(253,253,254,0.10)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: ringColor,
                    transition: 'width 500ms, background 300ms',
                  }} />
                </div>
                <div style={{
                  fontSize: 10, fontWeight: 500,
                  color: 'rgba(253,253,254,0.62)',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  marginTop: 8,
                }}>
                  {macro.label}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── MEAL CARDS · one card per meal, per design-system/08-dieet-detail.html ── */}
      {meals.map((meal) => {
        const log = logs.get(meal.id)
        const foods = log?.foods_eaten || meal.foods || []
        const allChecked = foods.length > 0 && foods.every(f => f.checked === true)
        const cal = mealCalories(foods)

        return (
          <div
            key={meal.id}
            className="v6-card-dark animate-slide-up"
            style={{
              marginBottom: 14,
              padding: '18px 22px 0',
              overflow: 'hidden',
            }}
          >
            {/* Meal header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 10,
              marginBottom: foods.length > 0 ? 8 : 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                <span style={{
                  fontSize: 15, fontWeight: 600,
                  color: allChecked ? 'rgba(253,253,254,0.52)' : '#FDFDFE',
                  letterSpacing: '-0.01em',
                }}>
                  {meal.name}
                </span>
                {allChecked && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: '#2FA65A',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                  }}>
                    Voltooid
                  </span>
                )}
              </div>
              <span style={{
                fontSize: 12, color: 'rgba(253,253,254,0.52)',
                fontVariantNumeric: 'tabular-nums',
                flexShrink: 0,
              }}>
                {cal} kcal
              </span>
            </div>

            {/* Foods */}
            {foods.length > 0 ? (
                <div>
                  {foods.map(food => {
                    const isChecked = food.checked === true
                    const isEditingThis = editingFood?.mealId === meal.id && editingFood?.foodId === food.id
                    const displayGrams = isEditingThis ? editingFood.grams : food.grams
                    const foodCal = Math.round((food.per100g.calories * displayGrams) / 100)

                    return (
                      <div key={food.id}>
                        <div
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '8px 0',
                          }}
                        >
                          <button
                            onClick={() => toggleFoodChecked(meal, food.id)}
                            style={{
                              width: 20, height: 20, borderRadius: '50%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                              background: isChecked ? '#2FA65A' : 'transparent',
                              border: isChecked ? 'none' : '1.5px solid rgba(253,253,254,0.28)',
                              cursor: 'pointer',
                              WebkitTapHighlightColor: 'transparent',
                              transition: 'all 160ms',
                            }}
                          >
                            {isChecked && <Check strokeWidth={2.5} size={11} style={{ color: '#FDFDFE' }} />}
                          </button>

                          <div
                            onClick={() => {
                              if (isEditingThis) {
                                setEditingFood(null)
                              } else {
                                setEditingFood({ mealId: meal.id, foodId: food.id, grams: food.grams })
                              }
                            }}
                            style={{ flex: 1, minWidth: 0, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
                          >
                            <p style={{
                              fontSize: 14, margin: 0, lineHeight: 1.2,
                              color: isChecked ? 'rgba(253,253,254,0.44)' : '#FDFDFE',
                              textDecoration: isChecked ? 'line-through' : 'none',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                              {food.name}
                            </p>
                            <p style={{
                              fontSize: 12, margin: '3px 0 0',
                              color: isChecked ? 'rgba(253,253,254,0.30)' : isEditingThis ? '#C0FC01' : 'rgba(253,253,254,0.52)',
                              fontVariantNumeric: 'tabular-nums',
                            }}>
                              {displayGrams}g · {foodCal} kcal
                            </p>
                          </div>

                          <button
                            onClick={() => deleteFood(meal, food.id)}
                            style={{
                              padding: 6,
                              background: 'transparent', border: 'none', cursor: 'pointer',
                              color: 'rgba(253,253,254,0.28)',
                              WebkitTapHighlightColor: 'transparent',
                              flexShrink: 0,
                            }}
                          >
                            <Trash2 strokeWidth={1.5} size={14} />
                          </button>
                        </div>

                        {/* Inline grams editor for existing food */}
                        {isEditingThis && (
                          <div style={{
                            padding: '8px 0 12px 32px',
                            display: 'flex', flexDirection: 'column', gap: 10,
                          }}>
                            {/* Stepper */}
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              background: 'rgba(253,253,254,0.06)',
                              borderRadius: 12,
                              padding: '6px 8px',
                            }}>
                              <button
                                onClick={() => setEditingFood({ ...editingFood!, grams: Math.max(1, editingFood!.grams - 5) })}
                                style={{
                                  width: 32, height: 32, borderRadius: 10,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  background: 'rgba(253,253,254,0.10)',
                                  color: '#FDFDFE',
                                  border: 'none', cursor: 'pointer',
                                  WebkitTapHighlightColor: 'transparent',
                                }}
                              >
                                <span style={{ fontSize: 18, fontWeight: 400, lineHeight: 1 }}>−</span>
                              </button>
                              <input
                                type="number"
                                inputMode="numeric"
                                value={editingFood!.grams}
                                onChange={(e) => {
                                  const v = parseInt(e.target.value)
                                  setEditingFood({ ...editingFood!, grams: Number.isFinite(v) && v > 0 ? v : 1 })
                                }}
                                style={{
                                  flex: 1, textAlign: 'center',
                                  fontSize: 16, fontWeight: 600, color: '#FDFDFE',
                                  background: 'transparent', border: 'none', outline: 'none',
                                  fontVariantNumeric: 'tabular-nums',
                                  padding: '6px 0',
                                }}
                              />
                              <span style={{ fontSize: 13, color: 'rgba(253,253,254,0.52)', marginRight: 4 }}>g</span>
                              <button
                                onClick={() => setEditingFood({ ...editingFood!, grams: editingFood!.grams + 5 })}
                                style={{
                                  width: 32, height: 32, borderRadius: 10,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  background: 'rgba(253,253,254,0.10)',
                                  color: '#FDFDFE',
                                  border: 'none', cursor: 'pointer',
                                  WebkitTapHighlightColor: 'transparent',
                                }}
                              >
                                <span style={{ fontSize: 18, fontWeight: 400, lineHeight: 1 }}>+</span>
                              </button>
                            </div>

                            {/* Save / cancel */}
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                onClick={() => setEditingFood(null)}
                                style={{
                                  flex: 1, padding: '10px 12px',
                                  borderRadius: 12,
                                  fontSize: 13, fontWeight: 500,
                                  background: 'rgba(253,253,254,0.08)',
                                  color: 'rgba(253,253,254,0.62)',
                                  border: 'none', cursor: 'pointer',
                                  WebkitTapHighlightColor: 'transparent',
                                }}
                              >
                                Annuleren
                              </button>
                              <button
                                onClick={() => {
                                  updateFoodGrams(meal, food.id, editingFood!.grams)
                                  setEditingFood(null)
                                }}
                                style={{
                                  flex: 1, padding: '10px 12px',
                                  borderRadius: 12,
                                  fontSize: 13, fontWeight: 600,
                                  background: '#C0FC01',
                                  color: '#FDFDFE',
                                  border: 'none', cursor: 'pointer',
                                  WebkitTapHighlightColor: 'transparent',
                                }}
                              >
                                Opslaan
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
            ) : (
              <p style={{
                fontSize: 12, color: 'rgba(253,253,254,0.32)',
                margin: '6px 0 14px', fontStyle: 'italic',
              }}>
                Geen items
              </p>
            )}

            {/* Ghost add-food row — per design-system/08-dieet-detail.html */}
            <button
              onClick={() => { setBottomSheetMealId(meal.id); setBottomSheetOpen(true) }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8,
                width: 'calc(100% + 44px)',
                marginLeft: -22,
                marginRight: -22,
                marginTop: 14,
                padding: '13px 22px',
                background: 'transparent',
                borderTop: '1px dashed rgba(253,253,254,0.18)',
                borderRight: 'none',
                borderBottom: 'none',
                borderLeft: 'none',
                borderBottomLeftRadius: 24,
                borderBottomRightRadius: 24,
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 400,
                color: 'rgba(253,253,254,0.62)',
                letterSpacing: '-0.003em',
                transition: 'background 140ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(253,253,254,0.04)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <Plus strokeWidth={2} size={12} />
              Voedingsmiddel toevoegen
            </button>
          </div>
        )
      })}

      {/* ── Submit day ── */}
      {meals.length > 0 && (
        <button
          onClick={submitDay}
          disabled={daySubmitted}
          className="animate-slide-up"
          style={{
            width: '100%',
            padding: '14px 20px',
            borderRadius: 16,
            fontSize: 13, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            border: 'none',
            cursor: daySubmitted ? 'default' : 'pointer',
            WebkitTapHighlightColor: 'transparent',
            transition: 'all 200ms',
            marginBottom: 14,
            background: daySubmitted
              ? '#2FA65A'
              : allMealsComplete
                ? '#C0FC01'
                : 'rgba(253,253,254,0.10)',
            color: daySubmitted
              ? '#FDFDFE'
              : allMealsComplete
                ? '#FDFDFE'
                : '#FDFDFE',
          }}
        >
          {daySubmitted ? 'Ingediend ✓' : 'Dag indienen'}
        </button>
      )}

      {/* ── Shopping list ── */}
      <div className="animate-slide-up" style={{ marginBottom: 14 }}>
        <WeeklyShoppingList meals={meals} />
      </div>

      {/* ── Guidelines ── */}
      {plan.guidelines && (
        <div className="v6-card-dark animate-slide-up">
          <p style={{
            fontSize: 10, color: 'rgba(253,253,254,0.52)',
            textTransform: 'uppercase', letterSpacing: '0.1em',
            margin: '0 0 8px',
          }}>
            Richtlijnen
          </p>
          <p style={{
            fontSize: 13, lineHeight: 1.55,
            color: 'rgba(253,253,254,0.78)',
            margin: 0, whiteSpace: 'pre-wrap',
          }}>
            {plan.guidelines}
          </p>
        </div>
      )}

      {/* Bottom Sheet */}
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
    </div>
  )
}
