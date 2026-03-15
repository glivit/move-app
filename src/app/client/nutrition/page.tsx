'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Check, ChevronLeft, ChevronRight, MessageSquare,
  Pencil, ChevronDown, ChevronUp
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

// ─── Helpers ────────────────────────────────────────

function getFoodEmoji(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('kip') || n.includes('chicken')) return '🍗'
  if (n.includes('rijst') || n.includes('rice')) return '🍚'
  if (n.includes('haver') || n.includes('oat')) return '🥣'
  if (n.includes('ei') || n.includes('egg')) return '🥚'
  if (n.includes('yoghurt')) return '🥛'
  if (n.includes('zalm') || n.includes('vis')) return '🐟'
  if (n.includes('aardappel')) return '🥔'
  if (n.includes('whey') || n.includes('shake')) return '🥤'
  if (n.includes('brood')) return '🍞'
  if (n.includes('avocado')) return '🥑'
  if (n.includes('banaan')) return '🍌'
  if (n.includes('amandel') || n.includes('noot')) return '🥜'
  return '🍽️'
}

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
  { key: 'great', emoji: '😄', label: 'Super' },
  { key: 'good', emoji: '🙂', label: 'Goed' },
  { key: 'ok', emoji: '😐', label: 'Oké' },
  { key: 'bad', emoji: '😕', label: 'Minder' },
  { key: 'terrible', emoji: '😫', label: 'Slecht' },
]

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
  const completionPct = meals.length > 0 ? Math.round((completedCount / meals.length) * 100) : 0

  const actualCal = summary?.total_calories || 0
  const actualProt = summary?.total_protein || 0
  const actualCarbs = summary?.total_carbs || 0
  const actualFat = summary?.total_fat || 0

  const targetCal = plan?.calories_target || 0
  const targetProt = plan?.protein_g || 0
  const targetCarbs = plan?.carbs_g || 0
  const targetFat = plan?.fat_g || 0

  // ─── Render ───────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        <div className="max-w-lg mx-auto px-5 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#8B6914] border-t-transparent" />
          </div>
        </div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        <div className="max-w-lg mx-auto px-5 py-8 pb-28">
          <h1 className="text-[28px] font-[family-name:var(--font-display)] text-[#1A1A18] mb-2">
            Voeding
          </h1>
          <div className="bg-white rounded-2xl p-10 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] text-center mt-6">
            <span className="text-[40px] block mb-3">🍎</span>
            <h2 className="text-[17px] font-semibold text-[#1A1A18] mb-2">
              Nog geen voedingsplan
            </h2>
            <p className="text-[13px] text-[#8E8E93]">
              Je coach maakt binnenkort een voedingsplan voor je aan.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-lg mx-auto px-5 py-8 pb-28">
        {/* Header */}
        <h1 className="text-[28px] font-[family-name:var(--font-display)] text-[#1A1A18] mb-1">
          Voeding
        </h1>
        <p className="text-[13px] text-[#8E8E93] mb-6">{plan.title}</p>

        {/* Date Navigator */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigateDate(-1)}
            className="p-2 rounded-xl hover:bg-white transition-colors"
          >
            <ChevronLeft strokeWidth={1.5} className="w-5 h-5 text-[#8E8E93]" />
          </button>
          <p className="text-[15px] font-semibold text-[#1A1A18]">
            {formatDate(selectedDate)}
          </p>
          <button
            onClick={() => navigateDate(1)}
            className="p-2 rounded-xl hover:bg-white transition-colors"
          >
            <ChevronRight strokeWidth={1.5} className="w-5 h-5 text-[#8E8E93]" />
          </button>
        </div>

        {/* Progress Ring + Macros */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] mb-4">
          <div className="flex items-center gap-5">
            {/* Completion circle */}
            <div className="relative w-20 h-20 shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="16" fill="none" stroke="#F0F0ED" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="16" fill="none"
                  stroke={completionPct === 100 ? '#34C759' : '#8B6914'}
                  strokeWidth="3"
                  strokeDasharray={`${completionPct} 100`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                {completionPct === 100 ? (
                  <Check strokeWidth={2.5} className="w-6 h-6 text-[#34C759]" />
                ) : (
                  <span className="text-[15px] font-bold text-[#1A1A18]">{completionPct}%</span>
                )}
              </div>
            </div>

            {/* Macro bars */}
            <div className="flex-1 space-y-2">
              {[
                { label: 'Kcal', actual: actualCal, target: targetCal, color: '#FF9500' },
                { label: 'Eiwit', actual: actualProt, target: targetProt, color: '#007AFF', unit: 'g' },
                { label: 'Koolh', actual: actualCarbs, target: targetCarbs, color: '#34C759', unit: 'g' },
                { label: 'Vet', actual: actualFat, target: targetFat, color: '#AF52DE', unit: 'g' },
              ].map(({ label, actual, target, color, unit }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-[11px] text-[#8E8E93] w-10 shrink-0">{label}</span>
                  <div className="flex-1 h-2 bg-[#F0F0ED] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min((actual / (target || 1)) * 100, 100)}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-[#1A1A18] w-20 text-right shrink-0">
                    {actual}/{target}{unit || ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Meal List */}
        <div className="space-y-3 mb-6">
          {meals.map((meal) => {
            const log = logs.get(meal.id)
            const isCompleted = log?.completed || false
            const isExpanded = expandedMeal === meal.id
            const isSaving = savingMeal === meal.id
            const hasNotes = log?.client_notes

            const foods = meal.foods || []
            const mealCal = foods.reduce((s, f) => s + calcMacro(f, 'calories'), 0)

            return (
              <div
                key={meal.id}
                className={`rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border overflow-hidden transition-all ${
                  isCompleted
                    ? 'bg-[#34C759]/5 border-[#34C759]/20'
                    : 'bg-white border-[#F0F0ED]'
                }`}
              >
                {/* Meal header */}
                <div className="flex items-center gap-3 px-4 py-3.5">
                  {/* Checkmark button */}
                  <button
                    onClick={() => toggleMealComplete(meal)}
                    disabled={isSaving}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      isCompleted
                        ? 'bg-[#34C759] border-[#34C759]'
                        : 'border-[#C7C7CC] hover:border-[#8B6914]'
                    } ${isSaving ? 'opacity-50' : ''}`}
                  >
                    {isCompleted && <Check strokeWidth={2.5} className="w-4 h-4 text-white" />}
                    {isSaving && (
                      <div className="w-4 h-4 border-2 border-[#8B6914] border-t-transparent rounded-full animate-spin" />
                    )}
                  </button>

                  {/* Meal info */}
                  <button
                    onClick={() => setExpandedMeal(isExpanded ? null : meal.id)}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="flex items-center gap-2">
                      <p className={`text-[15px] font-medium truncate ${
                        isCompleted ? 'text-[#34C759] line-through' : 'text-[#1A1A18]'
                      }`}>
                        {meal.name}
                      </p>
                      {hasNotes && (
                        <MessageSquare strokeWidth={1.5} className="w-3.5 h-3.5 text-[#8B6914] shrink-0" />
                      )}
                    </div>
                    <p className="text-[12px] text-[#C7C7CC] mt-0.5">
                      {meal.time} · {mealCal} kcal · {foods.length} items
                    </p>
                  </button>

                  {/* Expand arrow */}
                  <button
                    onClick={() => setExpandedMeal(isExpanded ? null : meal.id)}
                    className="p-1"
                  >
                    {isExpanded ? (
                      <ChevronUp strokeWidth={1.5} className="w-4 h-4 text-[#C7C7CC]" />
                    ) : (
                      <ChevronDown strokeWidth={1.5} className="w-4 h-4 text-[#C7C7CC]" />
                    )}
                  </button>
                </div>

                {/* Expanded: food details + notes */}
                {isExpanded && (
                  <div className="border-t border-[#F0F0ED]">
                    {/* Foods list */}
                    <div className="divide-y divide-[#F0F0ED]">
                      {foods.map((food) => (
                        <div key={food.id} className="px-4 py-2.5 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#F5F5F3] flex items-center justify-center overflow-hidden shrink-0">
                            {food.image ? (
                              <img src={food.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[14px]">{getFoodEmoji(food.name)}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-[#1A1A18] truncate">{food.name}</p>
                            <p className="text-[11px] text-[#C7C7CC]">{food.grams}g</p>
                          </div>
                          <div className="text-right text-[11px] text-[#8E8E93] shrink-0">
                            <span className="text-[#FF9500] font-medium">{calcMacro(food, 'calories')}</span> kcal
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Notes section */}
                    <div className="px-4 py-3 border-t border-[#F0F0ED] bg-[#FAFAFA]">
                      {editingNotes === meal.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Aanpassing of opmerking... bijv. 'Vervangen door cottage cheese'"
                            rows={2}
                            autoFocus
                            className="w-full px-3 py-2 rounded-xl border border-[#F0F0ED] text-[13px] text-[#1A1A18] bg-white placeholder-[#C7C7CC] focus:outline-none focus:border-[#8B6914] resize-none"
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setEditingNotes(null)}
                              className="px-3 py-1.5 rounded-lg text-[12px] text-[#8E8E93]"
                            >
                              Annuleer
                            </button>
                            <button
                              onClick={() => saveNotes(meal.id)}
                              className="px-3 py-1.5 rounded-lg bg-[#8B6914] text-white text-[12px] font-medium"
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
                          className="flex items-center gap-2 text-[12px] text-[#8E8E93] hover:text-[#8B6914] transition-colors"
                        >
                          <Pencil strokeWidth={1.5} className="w-3.5 h-3.5" />
                          {hasNotes ? (
                            <span className="text-[#8B6914]">{log?.client_notes}</span>
                          ) : (
                            <span>Notitie toevoegen (vervangen, aanpassing...)</span>
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

        {/* Daily Summary Panel */}
        <button
          onClick={() => setShowDailyPanel(!showDailyPanel)}
          className="w-full bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] flex items-center justify-between mb-4"
        >
          <div className="flex items-center gap-3">
            <span className="text-[20px]">📝</span>
            <div className="text-left">
              <p className="text-[14px] font-medium text-[#1A1A18]">Dagnotitie &amp; gevoel</p>
              <p className="text-[12px] text-[#C7C7CC]">
                {mood ? MOODS.find(m => m.key === mood)?.emoji : ''} {dailyNote ? dailyNote.slice(0, 40) + (dailyNote.length > 40 ? '...' : '') : 'Hoe ging je dag?'}
              </p>
            </div>
          </div>
          {showDailyPanel ? (
            <ChevronUp strokeWidth={1.5} className="w-4 h-4 text-[#C7C7CC]" />
          ) : (
            <ChevronDown strokeWidth={1.5} className="w-4 h-4 text-[#C7C7CC]" />
          )}
        </button>

        {showDailyPanel && (
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] mb-4 space-y-5">
            {/* Mood */}
            <div>
              <p className="text-[12px] text-[#8E8E93] uppercase font-medium tracking-wide mb-2">
                Hoe voel je je vandaag?
              </p>
              <div className="flex gap-2">
                {MOODS.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => { setMood(m.key); setTimeout(saveDailySummary, 100) }}
                    className={`flex-1 py-2.5 rounded-xl text-center transition-all border ${
                      mood === m.key
                        ? 'border-[#8B6914] bg-[#8B6914]/5'
                        : 'border-[#F0F0ED] hover:border-[#C7C7CC]'
                    }`}
                  >
                    <span className="text-[20px] block">{m.emoji}</span>
                    <span className="text-[10px] text-[#8E8E93] mt-0.5 block">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Water */}
            <div>
              <p className="text-[12px] text-[#8E8E93] uppercase font-medium tracking-wide mb-2">
                Water (liter)
              </p>
              <div className="flex items-center gap-2">
                {[0.5, 1, 1.5, 2, 2.5, 3].map((l) => (
                  <button
                    key={l}
                    onClick={() => { setWater(l); setTimeout(saveDailySummary, 100) }}
                    className={`flex-1 py-2 rounded-xl text-center text-[13px] font-medium transition-all border ${
                      water === l
                        ? 'border-[#007AFF] bg-[#007AFF]/5 text-[#007AFF]'
                        : 'border-[#F0F0ED] text-[#8E8E93] hover:border-[#C7C7CC]'
                    }`}
                  >
                    {l}L
                  </button>
                ))}
              </div>
            </div>

            {/* Daily note */}
            <div>
              <p className="text-[12px] text-[#8E8E93] uppercase font-medium tracking-wide mb-2">
                Dagnotitie voor je coach
              </p>
              <textarea
                value={dailyNote}
                onChange={(e) => setDailyNote(e.target.value)}
                onBlur={saveDailySummary}
                placeholder="Hoe ging het vandaag? Honger gehad? Iets vervangen?"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-[#F0F0ED] text-[13px] text-[#1A1A18] bg-white placeholder-[#C7C7CC] focus:outline-none focus:border-[#8B6914] resize-none"
              />
            </div>
          </div>
        )}

        {/* Guidelines reminder */}
        {plan.guidelines && (
          <div className="bg-[#8B6914]/5 rounded-2xl p-4 border border-[#8B6914]/10">
            <p className="text-[12px] text-[#8B6914] font-medium mb-1">Richtlijnen van je coach</p>
            <p className="text-[12px] text-[#8E8E93] leading-relaxed whitespace-pre-wrap">
              {plan.guidelines}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
