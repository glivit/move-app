'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, Plus, X, Loader2 } from 'lucide-react'

export interface FoodItem {
  barcode: string | null
  name: string
  brand: string | null
  image_small: string | null
  image: string | null
  serving_size: string | null
  quantity: string | null
  nutriscore: string | null
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

// Common coaching foods — shown as quick-add presets
const PRESET_FOODS: FoodItem[] = [
  {
    barcode: null, name: 'Kipfilet (gebakken)', brand: null,
    image_small: null, image: null, serving_size: '150g', quantity: null, nutriscore: null,
    per100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, salt: 0.7 },
  },
  {
    barcode: null, name: 'Witte rijst (gekookt)', brand: null,
    image_small: null, image: null, serving_size: '200g', quantity: null, nutriscore: null,
    per100g: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, sugar: 0, salt: 0 },
  },
  {
    barcode: null, name: 'Havermout', brand: null,
    image_small: null, image: null, serving_size: '80g', quantity: null, nutriscore: null,
    per100g: { calories: 379, protein: 13.5, carbs: 67, fat: 6.5, fiber: 10, sugar: 1, salt: 0 },
  },
  {
    barcode: null, name: 'Eieren (gekookt)', brand: null,
    image_small: null, image: null, serving_size: '2 stuks (120g)', quantity: null, nutriscore: null,
    per100g: { calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0, sugar: 1.1, salt: 0.4 },
  },
  {
    barcode: null, name: 'Griekse yoghurt 0%', brand: null,
    image_small: null, image: null, serving_size: '170g', quantity: null, nutriscore: null,
    per100g: { calories: 59, protein: 10, carbs: 3.6, fat: 0.4, fiber: 0, sugar: 3.6, salt: 0.1 },
  },
  {
    barcode: null, name: 'Zalm (gebakken)', brand: null,
    image_small: null, image: null, serving_size: '150g', quantity: null, nutriscore: null,
    per100g: { calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0, sugar: 0, salt: 0.6 },
  },
  {
    barcode: null, name: 'Zoete aardappel (gekookt)', brand: null,
    image_small: null, image: null, serving_size: '200g', quantity: null, nutriscore: null,
    per100g: { calories: 86, protein: 1.6, carbs: 20, fat: 0.1, fiber: 3, sugar: 4.2, salt: 0 },
  },
  {
    barcode: null, name: 'Whey Protein shake', brand: null,
    image_small: null, image: null, serving_size: '1 scoop (30g)', quantity: null, nutriscore: null,
    per100g: { calories: 400, protein: 80, carbs: 8, fat: 5, fiber: 0, sugar: 4, salt: 0.5 },
  },
  {
    barcode: null, name: 'Volkoren brood', brand: null,
    image_small: null, image: null, serving_size: '2 sneetjes (80g)', quantity: null, nutriscore: null,
    per100g: { calories: 247, protein: 13, carbs: 41, fat: 3.4, fiber: 7, sugar: 4.4, salt: 1.0 },
  },
  {
    barcode: null, name: 'Avocado', brand: null,
    image_small: null, image: null, serving_size: '½ stuks (80g)', quantity: null, nutriscore: null,
    per100g: { calories: 160, protein: 2, carbs: 8.5, fat: 14.7, fiber: 6.7, sugar: 0.7, salt: 0 },
  },
  {
    barcode: null, name: 'Banaan', brand: null,
    image_small: null, image: null, serving_size: '1 stuk (120g)', quantity: null, nutriscore: null,
    per100g: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, sugar: 12, salt: 0 },
  },
  {
    barcode: null, name: 'Amandelen (ongezouten)', brand: null,
    image_small: null, image: null, serving_size: '30g', quantity: null, nutriscore: null,
    per100g: { calories: 579, protein: 21, carbs: 22, fat: 49, fiber: 12, sugar: 4.4, salt: 0 },
  },
]

// Emoji icons for food categories
function getFoodEmoji(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('kip') || n.includes('chicken')) return '🍗'
  if (n.includes('rijst') || n.includes('rice')) return '🍚'
  if (n.includes('haver') || n.includes('oat')) return '🥣'
  if (n.includes('ei') || n.includes('egg')) return '🥚'
  if (n.includes('yoghurt') || n.includes('yogurt')) return '🥛'
  if (n.includes('zalm') || n.includes('salmon') || n.includes('vis') || n.includes('fish')) return '🐟'
  if (n.includes('aardappel') || n.includes('potato')) return '🥔'
  if (n.includes('whey') || n.includes('protein') || n.includes('shake')) return '🥤'
  if (n.includes('brood') || n.includes('bread')) return '🍞'
  if (n.includes('avocado')) return '🥑'
  if (n.includes('banaan') || n.includes('banana')) return '🍌'
  if (n.includes('amandel') || n.includes('almond') || n.includes('noot') || n.includes('nut')) return '🥜'
  if (n.includes('melk') || n.includes('milk')) return '🥛'
  if (n.includes('kaas') || n.includes('cheese')) return '🧀'
  if (n.includes('pasta') || n.includes('spaghetti')) return '🍝'
  if (n.includes('salade') || n.includes('salad') || n.includes('sla')) return '🥗'
  if (n.includes('fruit') || n.includes('appel') || n.includes('apple')) return '🍎'
  if (n.includes('vlees') || n.includes('meat') || n.includes('rund') || n.includes('beef')) return '🥩'
  if (n.includes('tonijn') || n.includes('tuna')) return '🐟'
  if (n.includes('chocola') || n.includes('cacao')) return '🍫'
  return '🍽️'
}

// Nutri-Score badge colors
function nutriscoreColor(grade: string | null): { bg: string; text: string } {
  switch (grade?.toLowerCase()) {
    case 'a': return { bg: '#1B8539', text: 'white' }
    case 'b': return { bg: '#85BB2F', text: 'white' }
    case 'c': return { bg: '#FECB02', text: '#1A1A18' }
    case 'd': return { bg: '#EE8100', text: 'white' }
    case 'e': return { bg: '#E63E11', text: 'white' }
    default: return { bg: '#F0F0ED', text: '#8E8E93' }
  }
}

interface FoodSearchProps {
  onSelect: (food: FoodItem, grams: number) => void
  onClose?: () => void
}

export function FoodSearch({ onSelect, onClose }: FoodSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodItem[]>([])
  const [loading, setLoading] = useState(false)
  const [showPresets, setShowPresets] = useState(true)
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null)
  const [grams, setGrams] = useState(100)
  const searchTimer = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const searchFood = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([])
      setShowPresets(true)
      return
    }

    setLoading(true)
    setShowPresets(false)

    try {
      const res = await fetch(`/api/food-search?q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      setResults(data.products || [])
    } catch (err) {
      console.error('Search error:', err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  function handleQueryChange(value: string) {
    setQuery(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => searchFood(value), 400)
  }

  function handleSelectFood(food: FoodItem) {
    setSelectedFood(food)
    // Default grams from serving size or 100g
    const servingMatch = food.serving_size?.match(/(\d+)\s*g/i)
    setGrams(servingMatch ? parseInt(servingMatch[1]) : 100)
  }

  function handleConfirm() {
    if (selectedFood) {
      onSelect(selectedFood, grams)
      setSelectedFood(null)
      setQuery('')
      setResults([])
      setShowPresets(true)
    }
  }

  const calcForGrams = (value: number) => Math.round((value * grams) / 100)

  return (
    <div className="rounded-2xl border border-[#F0F0ED] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.08)] overflow-hidden">
      {/* Search Header */}
      <div className="p-4 border-b border-[#F0F0ED] bg-[#FAFAFA]">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C7C7CC]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Zoek voedingsmiddel... (bijv. kipfilet, havermout, AH yoghurt)"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#F0F0ED] text-[14px] bg-white text-[#1A1A18] placeholder-[#C7C7CC] focus:outline-none focus:border-[#8B6914] focus:ring-1 focus:ring-[#8B6914]/20"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B6914] animate-spin" />
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[#F0F0ED] text-[#8E8E93] transition-colors"
            >
              <X strokeWidth={1.5} className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Selected Food Detail */}
      {selectedFood && (
        <div className="p-5 border-b border-[#F0F0ED] bg-[#FAFAFA]">
          <div className="flex items-start gap-4">
            {/* Food Image or Emoji */}
            <div className="w-16 h-16 rounded-xl bg-white border border-[#F0F0ED] flex items-center justify-center overflow-hidden shrink-0">
              {selectedFood.image_small ? (
                <img
                  src={selectedFood.image_small}
                  alt={selectedFood.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                    ;(e.target as HTMLImageElement).parentElement!.innerHTML = `<span style="font-size:28px">${getFoodEmoji(selectedFood.name)}</span>`
                  }}
                />
              ) : (
                <span className="text-[28px]">{getFoodEmoji(selectedFood.name)}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-[#1A1A18] truncate">{selectedFood.name}</p>
              {selectedFood.brand && (
                <p className="text-[12px] text-[#8E8E93] mt-0.5">{selectedFood.brand}</p>
              )}

              {/* Grams Input */}
              <div className="flex items-center gap-3 mt-3">
                <label className="text-[13px] text-[#8E8E93] shrink-0">Hoeveelheid:</label>
                <div className="flex items-center gap-2">
                  {[50, 100, 150, 200].map((g) => (
                    <button
                      key={g}
                      onClick={() => setGrams(g)}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors"
                      style={{
                        backgroundColor: grams === g ? '#8B6914' : 'white',
                        color: grams === g ? 'white' : '#8E8E93',
                        borderColor: grams === g ? '#8B6914' : '#F0F0ED',
                      }}
                    >
                      {g}g
                    </button>
                  ))}
                  <input
                    type="number"
                    value={grams}
                    onChange={(e) => setGrams(parseInt(e.target.value) || 0)}
                    className="w-20 px-3 py-1.5 rounded-lg border border-[#F0F0ED] text-[13px] text-center text-[#1A1A18] bg-white"
                    min={1}
                  />
                  <span className="text-[12px] text-[#8E8E93]">gram</span>
                </div>
              </div>

              {/* Calculated Macros */}
              <div className="grid grid-cols-4 gap-3 mt-3">
                <div className="bg-white rounded-lg p-2 border border-[#F0F0ED] text-center">
                  <p className="text-[10px] text-[#8E8E93] uppercase font-medium">Kcal</p>
                  <p className="text-[15px] font-bold text-[#FF9500]">
                    {calcForGrams(selectedFood.per100g.calories)}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-2 border border-[#F0F0ED] text-center">
                  <p className="text-[10px] text-[#8E8E93] uppercase font-medium">Eiwit</p>
                  <p className="text-[15px] font-bold text-[#007AFF]">
                    {calcForGrams(selectedFood.per100g.protein)}g
                  </p>
                </div>
                <div className="bg-white rounded-lg p-2 border border-[#F0F0ED] text-center">
                  <p className="text-[10px] text-[#8E8E93] uppercase font-medium">Koolh</p>
                  <p className="text-[15px] font-bold text-[#34C759]">
                    {calcForGrams(selectedFood.per100g.carbs)}g
                  </p>
                </div>
                <div className="bg-white rounded-lg p-2 border border-[#F0F0ED] text-center">
                  <p className="text-[10px] text-[#8E8E93] uppercase font-medium">Vet</p>
                  <p className="text-[15px] font-bold text-[#AF52DE]">
                    {calcForGrams(selectedFood.per100g.fat)}g
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Confirm Button */}
          <button
            onClick={handleConfirm}
            className="w-full mt-4 px-4 py-3 rounded-xl bg-[#8B6914] text-white text-[14px] font-semibold hover:bg-[#6F5612] transition-colors flex items-center justify-center gap-2"
          >
            <Plus strokeWidth={1.5} className="w-4 h-4" />
            Toevoegen aan maaltijd
          </button>
        </div>
      )}

      {/* Results List */}
      <div className="max-h-[400px] overflow-y-auto">
        {/* Presets (when no search query) */}
        {showPresets && !selectedFood && (
          <div className="p-4">
            <p className="text-[12px] text-[#8E8E93] uppercase font-medium tracking-wide mb-3">
              Populaire voedingsmiddelen
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_FOODS.map((food, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectFood(food)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-[#F0F0ED] bg-white hover:bg-[#FAFAFA] hover:border-[#8B6914]/30 transition-all text-left group"
                >
                  <span className="text-[22px] shrink-0">{getFoodEmoji(food.name)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-[#1A1A18] truncate group-hover:text-[#8B6914] transition-colors">
                      {food.name}
                    </p>
                    <p className="text-[11px] text-[#C7C7CC] mt-0.5">
                      {food.per100g.calories} kcal · {food.per100g.protein}g eiwit
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        {!showPresets && !selectedFood && results.length > 0 && (
          <div className="divide-y divide-[#F0F0ED]">
            {results.map((food, index) => {
              const ns = nutriscoreColor(food.nutriscore)
              return (
                <button
                  key={index}
                  onClick={() => handleSelectFood(food)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-[#FAFAFA] transition-colors text-left group"
                >
                  {/* Image */}
                  <div className="w-12 h-12 rounded-lg bg-[#F5F5F3] border border-[#F0F0ED] flex items-center justify-center overflow-hidden shrink-0">
                    {food.image_small ? (
                      <img
                        src={food.image_small}
                        alt={food.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                          ;(e.target as HTMLImageElement).parentElement!.innerHTML = `<span style="font-size:20px">${getFoodEmoji(food.name)}</span>`
                        }}
                      />
                    ) : (
                      <span className="text-[20px]">{getFoodEmoji(food.name)}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-medium text-[#1A1A18] truncate group-hover:text-[#8B6914] transition-colors">
                        {food.name}
                      </p>
                      {food.nutriscore && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 uppercase"
                          style={{ backgroundColor: ns.bg, color: ns.text }}
                        >
                          {food.nutriscore}
                        </span>
                      )}
                    </div>
                    {food.brand && (
                      <p className="text-[12px] text-[#8E8E93] truncate">{food.brand}</p>
                    )}
                  </div>

                  {/* Quick Macros */}
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-semibold text-[#1A1A18]">
                      {food.per100g.calories} kcal
                    </p>
                    <p className="text-[11px] text-[#8E8E93]">
                      E{food.per100g.protein} · K{food.per100g.carbs} · V{food.per100g.fat}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* No Results */}
        {!showPresets && !selectedFood && !loading && results.length === 0 && query.length >= 2 && (
          <div className="p-8 text-center">
            <p className="text-[14px] text-[#8E8E93]">Geen resultaten voor &quot;{query}&quot;</p>
            <p className="text-[12px] text-[#C7C7CC] mt-1">Probeer een andere zoekterm</p>
          </div>
        )}

        {/* Loading State */}
        {loading && !selectedFood && (
          <div className="p-8 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 text-[#8B6914] animate-spin" />
            <p className="text-[13px] text-[#8E8E93]">Zoeken in voedingsdatabank...</p>
          </div>
        )}
      </div>
    </div>
  )
}
