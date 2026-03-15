'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { FoodSearch, type FoodItem } from '@/components/coach/FoodSearch'
import {
  ArrowLeft, Plus, Trash2, Check, ChevronDown, ChevronUp,
  Clock, GripVertical, Copy, Search, Eye, CheckCircle,
  ChevronLeft, ChevronRight, Droplets, MessageSquare, Pencil
} from 'lucide-react'
import Link from 'next/link'

// ─── Types ──────────────────────────────────────────────────

interface FoodEntry {
  id: string
  name: string
  brand: string | null
  image: string | null
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
  is_active: boolean
  valid_from: string | null
  valid_until: string | null
  created_at: string
}

interface Profile {
  full_name: string
}

interface NutritionLog {
  id: string
  meal_id: string
  meal_name: string
  completed: boolean
  foods_eaten: any[]
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
  coach_seen: boolean
}

const MOOD_EMOJI: Record<string, string> = {
  great: '😄',
  good: '🙂',
  ok: '😐',
  bad: '😞',
  terrible: '😢',
}

// ─── Helpers ────────────────────────────────────────────────

function generateId() {
  return Math.random().toString(36).substring(2, 10)
}

function calcMacro(food: FoodEntry, key: 'calories' | 'protein' | 'carbs' | 'fat') {
  return Math.round((food.per100g[key] * food.grams) / 100)
}

function totalMealMacro(meal: MealMoment, key: 'calories' | 'protein' | 'carbs' | 'fat') {
  return (meal.foods || []).reduce((sum, f) => sum + calcMacro(f, key), 0)
}

function totalPlanMacro(meals: MealMoment[], key: 'calories' | 'protein' | 'carbs' | 'fat') {
  return meals.reduce((sum, m) => sum + totalMealMacro(m, key), 0)
}

// Food emoji helper
function getFoodEmoji(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('kip') || n.includes('chicken')) return '🍗'
  if (n.includes('rijst') || n.includes('rice')) return '🍚'
  if (n.includes('haver') || n.includes('oat')) return '🥣'
  if (n.includes('ei') || n.includes('egg')) return '🥚'
  if (n.includes('yoghurt') || n.includes('yogurt')) return '🥛'
  if (n.includes('zalm') || n.includes('salmon') || n.includes('vis')) return '🐟'
  if (n.includes('aardappel') || n.includes('potato')) return '🥔'
  if (n.includes('whey') || n.includes('protein') || n.includes('shake')) return '🥤'
  if (n.includes('brood') || n.includes('bread')) return '🍞'
  if (n.includes('avocado')) return '🥑'
  if (n.includes('banaan') || n.includes('banana')) return '🍌'
  if (n.includes('amandel') || n.includes('noot')) return '🥜'
  return '🍽️'
}

// Default meal moments
const DEFAULT_MEALS: () => MealMoment[] = () => [
  { id: generateId(), name: 'Ontbijt', time: '07:30', foods: [] },
  { id: generateId(), name: 'Tussendoor (ochtend)', time: '10:00', foods: [] },
  { id: generateId(), name: 'Lunch', time: '12:30', foods: [] },
  { id: generateId(), name: 'Tussendoor (middag)', time: '15:00', foods: [] },
  { id: generateId(), name: 'Avondeten', time: '18:30', foods: [] },
  { id: generateId(), name: 'Avondsnack', time: '21:00', foods: [] },
]

const MEAL_PRESETS = [
  'Ontbijt', 'Tussendoor (ochtend)', 'Lunch', 'Tussendoor (middag)',
  'Avondeten', 'Avondsnack', 'Pre-workout', 'Post-workout'
]

// ─── Component ──────────────────────────────────────────────

export default function NutritionPage() {
  const params = useParams() as unknown as { id: string }
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [activePlan, setActivePlan] = useState<NutritionPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Plan editing state
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [meals, setMeals] = useState<MealMoment[]>(DEFAULT_MEALS())
  const [guidelines, setGuidelines] = useState('')
  const [validFrom, setValidFrom] = useState('')
  const [validUntil, setValidUntil] = useState('')

  // UI state
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set())
  const [searchingMealId, setSearchingMealId] = useState<string | null>(null)
  const [showAddMeal, setShowAddMeal] = useState(false)
  const [newMealName, setNewMealName] = useState('')
  const [newMealTime, setNewMealTime] = useState('12:00')
  const [activeTab, setActiveTab] = useState<'plan' | 'compliance'>('plan')

  // Compliance state
  const [complianceDate, setComplianceDate] = useState(new Date().toISOString().split('T')[0])
  const [complianceLogs, setComplianceLogs] = useState<NutritionLog[]>([])
  const [complianceSummary, setComplianceSummary] = useState<DailySummary | null>(null)
  const [complianceLoading, setComplianceLoading] = useState(false)
  const [weekHistory, setWeekHistory] = useState<{ date: string; completed: number; planned: number }[]>([])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', params.id)
        .single()

      const { data: planData } = await supabase
        .from('nutrition_plans')
        .select('*')
        .eq('client_id', params.id)
        .eq('is_active', true)
        .single()

      setProfile(profileData)

      if (planData) {
        setActivePlan(planData)
        loadPlanIntoState(planData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fout bij laden')
    } finally {
      setLoading(false)
    }
  }

  // Load compliance data when tab or date changes
  useEffect(() => {
    if (activeTab === 'compliance') {
      loadComplianceData()
    }
  }, [activeTab, complianceDate])

  async function loadComplianceData() {
    try {
      setComplianceLoading(true)
      const res = await fetch(`/api/nutrition-log?client_id=${params.id}&date=${complianceDate}`)
      const data = await res.json()
      setComplianceLogs(data.logs || [])
      setComplianceSummary(data.summary || null)

      // Mark as coach seen
      if (data.summary && !data.summary.coach_seen) {
        fetch('/api/nutrition-log', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: params.id,
            date: complianceDate,
            coach_seen: true,
          }),
        })
      }

      // Load week history
      const days: { date: string; completed: number; planned: number }[] = []
      const supabase = createClient()
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 6)
      const weekAgoStr = weekAgo.toISOString().split('T')[0]
      const todayStr = new Date().toISOString().split('T')[0]

      const { data: weekData } = await supabase
        .from('nutrition_daily_summary')
        .select('date, meals_planned, meals_completed')
        .eq('client_id', params.id)
        .gte('date', weekAgoStr)
        .lte('date', todayStr)
        .order('date')

      // Fill in all 7 days
      for (let i = 0; i < 7; i++) {
        const d = new Date()
        d.setDate(d.getDate() - 6 + i)
        const dateStr = d.toISOString().split('T')[0]
        const entry = weekData?.find((w: any) => w.date === dateStr)
        days.push({
          date: dateStr,
          completed: entry?.meals_completed || 0,
          planned: entry?.meals_planned || 0,
        })
      }
      setWeekHistory(days)
    } catch (err) {
      console.error('Error loading compliance:', err)
    } finally {
      setComplianceLoading(false)
    }
  }

  function navigateComplianceDate(direction: number) {
    const d = new Date(complianceDate)
    d.setDate(d.getDate() + direction)
    setComplianceDate(d.toISOString().split('T')[0])
  }

  function formatDateLabel(dateStr: string) {
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    if (dateStr === today) return 'Vandaag'
    if (dateStr === yesterdayStr) return 'Gisteren'
    return new Date(dateStr).toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  function loadPlanIntoState(plan: any) {
    setTitle(plan.title || '')
    setGuidelines(plan.guidelines || '')
    setValidFrom(plan.valid_from?.split('T')[0] || '')
    setValidUntil(plan.valid_until?.split('T')[0] || '')

    // Convert old format (with suggestions) to new format (with foods)
    if (Array.isArray(plan.meals)) {
      const converted: MealMoment[] = plan.meals.map((m: any) => ({
        id: m.id || generateId(),
        name: m.name || m.moment || 'Maaltijd',
        time: m.time || '12:00',
        foods: Array.isArray(m.foods) ? m.foods : [],
      }))
      setMeals(converted.length > 0 ? converted : DEFAULT_MEALS())
    } else {
      setMeals(DEFAULT_MEALS())
    }
  }

  function toggleMealExpanded(mealId: string) {
    const next = new Set(expandedMeals)
    if (next.has(mealId)) next.delete(mealId)
    else next.add(mealId)
    setExpandedMeals(next)
  }

  function handleAddFoodToMeal(mealId: string, food: FoodItem, grams: number) {
    const entry: FoodEntry = {
      id: generateId(),
      name: food.name,
      brand: food.brand,
      image: food.image_small,
      grams,
      per100g: {
        calories: food.per100g.calories,
        protein: food.per100g.protein,
        carbs: food.per100g.carbs,
        fat: food.per100g.fat,
      },
    }

    setMeals((prev) =>
      prev.map((m) =>
        m.id === mealId ? { ...m, foods: [...m.foods, entry] } : m
      )
    )
    setSearchingMealId(null)

    // Auto-expand the meal
    setExpandedMeals((prev) => new Set([...prev, mealId]))
  }

  function handleRemoveFood(mealId: string, foodId: string) {
    setMeals((prev) =>
      prev.map((m) =>
        m.id === mealId
          ? { ...m, foods: (m.foods || []).filter((f) => f.id !== foodId) }
          : m
      )
    )
  }

  function handleUpdateFoodGrams(mealId: string, foodId: string, grams: number) {
    setMeals((prev) =>
      prev.map((m) =>
        m.id === mealId
          ? {
              ...m,
              foods: (m.foods || []).map((f) =>
                f.id === foodId ? { ...f, grams } : f
              ),
            }
          : m
      )
    )
  }

  function handleAddMeal() {
    if (!newMealName.trim()) return
    const newMeal: MealMoment = {
      id: generateId(),
      name: newMealName.trim(),
      time: newMealTime,
      foods: [],
    }
    setMeals((prev) => [...prev, newMeal])
    setExpandedMeals((prev) => new Set([...prev, newMeal.id]))
    setNewMealName('')
    setShowAddMeal(false)
  }

  function handleRemoveMeal(mealId: string) {
    setMeals((prev) => prev.filter((m) => m.id !== mealId))
  }

  function handleUpdateMealTime(mealId: string, time: string) {
    setMeals((prev) =>
      prev.map((m) => (m.id === mealId ? { ...m, time } : m))
    )
  }

  async function handleSave() {
    if (!title.trim()) {
      setError('Geef het plan een titel')
      return
    }

    try {
      setSaving(true)
      setError(null)

      // Deactivate old plan
      if (activePlan) {
        await supabase
          .from('nutrition_plans')
          .update({ is_active: false })
          .eq('id', activePlan.id)
      }

      // Calculate totals from meals
      const totalCal = totalPlanMacro(meals, 'calories')
      const totalProt = totalPlanMacro(meals, 'protein')
      const totalCarbs = totalPlanMacro(meals, 'carbs')
      const totalFat = totalPlanMacro(meals, 'fat')

      const { error: insertError } = await supabase
        .from('nutrition_plans')
        .insert({
          client_id: params.id,
          title: title.trim(),
          calories_target: totalCal || 2000,
          protein_g: totalProt || 150,
          carbs_g: totalCarbs || 200,
          fat_g: totalFat || 70,
          meals: meals,
          guidelines: guidelines.trim() || null,
          is_active: true,
          valid_from: validFrom || null,
          valid_until: validUntil || null,
        })

      if (insertError) throw insertError

      setSuccessMsg('Voedingsplan opgeslagen!')
      setTimeout(() => setSuccessMsg(null), 3000)

      await loadData()
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fout bij opslaan')
    } finally {
      setSaving(false)
    }
  }

  // ─── Loading State ─────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#8B6914] border-t-transparent" />
          </div>
        </div>
      </div>
    )
  }

  const clientName = profile?.full_name || 'Client'
  const hasActivePlan = activePlan && !isEditing
  const showEditor = isEditing || !activePlan

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Back Link */}
        <Link
          href={`/coach/clients/${params.id}`}
          className="inline-flex items-center gap-1 text-[#8E8E93] hover:text-[#1A1A18] transition-colors mb-6"
        >
          <ArrowLeft strokeWidth={1.5} className="w-4 h-4" />
          <span className="text-sm font-medium">Terug naar {clientName}</span>
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-[32px] font-[family-name:var(--font-display)] text-[#1A1A18] mb-2">
              Voedingsplan
            </h1>
            <p className="text-[13px] text-[#8E8E93]">
              {clientName} — {isEditing ? 'bewerken' : 'beheer voedingsplan'}
            </p>
          </div>
          {hasActivePlan && (
            <button
              onClick={() => { setIsEditing(true); loadPlanIntoState(activePlan) }}
              className="px-5 py-2.5 rounded-xl font-semibold text-white transition-all hover:opacity-90 flex items-center gap-2 bg-[#8B6914]"
            >
              <Copy strokeWidth={1.5} className="w-4 h-4" />
              Bewerken
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        {activePlan && (
          <div className="flex gap-1 mb-6 bg-[#F5F5F3] rounded-xl p-1">
            <button
              onClick={() => setActiveTab('plan')}
              className="flex-1 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all"
              style={{
                backgroundColor: activeTab === 'plan' ? 'white' : 'transparent',
                color: activeTab === 'plan' ? '#1A1A18' : '#8E8E93',
                boxShadow: activeTab === 'plan' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              Voedingsplan
            </button>
            <button
              onClick={() => setActiveTab('compliance')}
              className="flex-1 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all flex items-center justify-center gap-2"
              style={{
                backgroundColor: activeTab === 'compliance' ? 'white' : 'transparent',
                color: activeTab === 'compliance' ? '#1A1A18' : '#8E8E93',
                boxShadow: activeTab === 'compliance' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <Eye strokeWidth={1.5} className="w-4 h-4" />
              Compliance
            </button>
          </div>
        )}

        {/* Success / Error Messages */}
        {successMsg && (
          <div className="rounded-2xl p-4 mb-6 bg-[#34C759]/10 border border-[#34C759]/20">
            <p className="text-[13px] text-[#34C759] font-medium flex items-center gap-2">
              <Check strokeWidth={2} className="w-4 h-4" />
              {successMsg}
            </p>
          </div>
        )}
        {error && (
          <div className="rounded-2xl p-4 mb-6 bg-[#FF3B30]/10 border border-[#FF3B30]/20">
            <p className="text-[13px] text-[#FF3B30]">{error}</p>
          </div>
        )}

        {/* ─── COMPLIANCE VIEW ─────────────────────────── */}
        {activeTab === 'compliance' && activePlan && (
          <div className="space-y-4">
            {/* Date Navigator */}
            <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED]">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => navigateComplianceDate(-1)}
                  className="p-2 rounded-xl hover:bg-[#F5F5F3] transition-colors"
                >
                  <ChevronLeft strokeWidth={1.5} className="w-5 h-5 text-[#8E8E93]" />
                </button>
                <div className="text-center">
                  <p className="text-[15px] font-semibold text-[#1A1A18] capitalize">
                    {formatDateLabel(complianceDate)}
                  </p>
                  <p className="text-[12px] text-[#C7C7CC]">{complianceDate}</p>
                </div>
                <button
                  onClick={() => navigateComplianceDate(1)}
                  disabled={complianceDate >= new Date().toISOString().split('T')[0]}
                  className="p-2 rounded-xl hover:bg-[#F5F5F3] transition-colors disabled:opacity-30"
                >
                  <ChevronRight strokeWidth={1.5} className="w-5 h-5 text-[#8E8E93]" />
                </button>
              </div>

              {/* Week mini bar chart */}
              {weekHistory.length > 0 && (
                <div className="flex items-end justify-center gap-2 mt-4 pt-4 border-t border-[#F0F0ED]">
                  {weekHistory.map((day) => {
                    const pct = day.planned > 0 ? (day.completed / day.planned) * 100 : 0
                    const isSelected = day.date === complianceDate
                    const dayLabel = new Date(day.date).toLocaleDateString('nl-BE', { weekday: 'narrow' })
                    return (
                      <button
                        key={day.date}
                        onClick={() => setComplianceDate(day.date)}
                        className="flex flex-col items-center gap-1 group"
                      >
                        <div
                          className="w-8 rounded-lg transition-all"
                          style={{
                            height: `${Math.max(4, pct * 0.4)}px`,
                            backgroundColor: pct >= 80 ? '#34C759' : pct >= 50 ? '#FF9500' : pct > 0 ? '#FF3B30' : '#F0F0ED',
                            opacity: isSelected ? 1 : 0.5,
                          }}
                        />
                        <span
                          className="text-[10px] font-medium"
                          style={{ color: isSelected ? '#1A1A18' : '#C7C7CC' }}
                        >
                          {dayLabel}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {complianceLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#8B6914] border-t-transparent" />
              </div>
            ) : complianceLogs.length === 0 && !complianceSummary ? (
              <div className="bg-white rounded-2xl p-12 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] text-center">
                <Eye strokeWidth={1.5} className="w-10 h-10 mx-auto mb-3 text-[#C7C7CC]" />
                <p className="text-[15px] font-medium text-[#8E8E93] mb-1">Geen tracking data</p>
                <p className="text-[13px] text-[#C7C7CC]">
                  {clientName} heeft op deze dag nog niets gelogd.
                </p>
              </div>
            ) : (
              <>
                {/* Summary Card */}
                {complianceSummary && (
                  <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[15px] font-semibold text-[#1A1A18]">Dagelijkse samenvatting</h3>
                      {complianceSummary.meals_planned > 0 && (
                        <span
                          className="text-[13px] font-bold px-3 py-1 rounded-full"
                          style={{
                            backgroundColor:
                              (complianceSummary.meals_completed / complianceSummary.meals_planned) >= 0.8
                                ? '#34C759' + '15'
                                : (complianceSummary.meals_completed / complianceSummary.meals_planned) >= 0.5
                                  ? '#FF9500' + '15'
                                  : '#FF3B30' + '15',
                            color:
                              (complianceSummary.meals_completed / complianceSummary.meals_planned) >= 0.8
                                ? '#34C759'
                                : (complianceSummary.meals_completed / complianceSummary.meals_planned) >= 0.5
                                  ? '#FF9500'
                                  : '#FF3B30',
                          }}
                        >
                          {complianceSummary.meals_completed}/{complianceSummary.meals_planned} maaltijden
                        </span>
                      )}
                    </div>

                    {/* Macro Bars */}
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      {[
                        { label: 'Kcal', value: complianceSummary.total_calories, target: activePlan.calories_target, color: '#FF9500', unit: '' },
                        { label: 'Eiwit', value: complianceSummary.total_protein, target: activePlan.protein_g, color: '#007AFF', unit: 'g' },
                        { label: 'Koolh', value: complianceSummary.total_carbs, target: activePlan.carbs_g, color: '#34C759', unit: 'g' },
                        { label: 'Vet', value: complianceSummary.total_fat, target: activePlan.fat_g, color: '#AF52DE', unit: 'g' },
                      ].map((m) => {
                        const pct = m.target > 0 ? Math.min(100, (m.value / m.target) * 100) : 0
                        return (
                          <div key={m.label} className="text-center">
                            <p className="text-[11px] text-[#8E8E93] uppercase font-medium">{m.label}</p>
                            <p className="text-[18px] font-bold mt-1" style={{ color: m.color }}>
                              {m.value}{m.unit}
                            </p>
                            <div className="w-full h-1.5 bg-[#F0F0ED] rounded-full mt-1.5 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${pct}%`, backgroundColor: m.color }}
                              />
                            </div>
                            <p className="text-[10px] text-[#C7C7CC] mt-1">
                              / {m.target}{m.unit}
                            </p>
                          </div>
                        )
                      })}
                    </div>

                    {/* Mood, Water, Note */}
                    <div className="flex items-center gap-4 pt-3 border-t border-[#F0F0ED] flex-wrap">
                      {complianceSummary.mood && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[18px]">{MOOD_EMOJI[complianceSummary.mood] || '😐'}</span>
                          <span className="text-[12px] text-[#8E8E93] capitalize">{complianceSummary.mood}</span>
                        </div>
                      )}
                      {complianceSummary.water_liters && (
                        <div className="flex items-center gap-1.5">
                          <Droplets strokeWidth={1.5} className="w-4 h-4 text-[#007AFF]" />
                          <span className="text-[12px] text-[#8E8E93]">{complianceSummary.water_liters}L water</span>
                        </div>
                      )}
                    </div>
                    {complianceSummary.daily_note && (
                      <div className="mt-3 p-3 rounded-xl bg-[#F5F5F3]">
                        <div className="flex items-start gap-2">
                          <MessageSquare strokeWidth={1.5} className="w-4 h-4 text-[#8E8E93] mt-0.5 shrink-0" />
                          <p className="text-[13px] text-[#1A1A18] leading-relaxed">{complianceSummary.daily_note}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Meal Logs */}
                {complianceLogs.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-[13px] font-medium text-[#8E8E93] uppercase tracking-wide px-1">
                      Maaltijden
                    </h3>
                    {complianceLogs.map((log) => (
                      <div
                        key={log.id}
                        className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] overflow-hidden"
                      >
                        <div className="px-5 py-4 flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: log.completed ? '#34C759' + '15' : '#F0F0ED',
                            }}
                          >
                            {log.completed ? (
                              <CheckCircle strokeWidth={2} className="w-5 h-5 text-[#34C759]" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-[#C7C7CC]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-[14px] font-medium"
                              style={{
                                color: log.completed ? '#1A1A18' : '#8E8E93',
                                textDecoration: log.completed ? 'none' : 'none',
                              }}
                            >
                              {log.meal_name}
                            </p>
                            {log.completed_at && (
                              <p className="text-[11px] text-[#C7C7CC]">
                                Afgevinkt om {new Date(log.completed_at).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Foods eaten */}
                        {log.foods_eaten && log.foods_eaten.length > 0 && (
                          <div className="border-t border-[#F0F0ED] divide-y divide-[#F0F0ED]">
                            {log.foods_eaten.map((food: any, idx: number) => (
                              <div key={idx} className="px-5 py-2.5 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#F5F5F3] flex items-center justify-center overflow-hidden shrink-0">
                                  {food.image ? (
                                    <img src={food.image} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-[14px]">{getFoodEmoji(food.name || '')}</span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[12px] font-medium text-[#1A1A18] truncate">{food.name}</p>
                                  <p className="text-[11px] text-[#C7C7CC]">{food.grams}g</p>
                                </div>
                                <div className="text-right text-[11px] text-[#8E8E93]">
                                  {food.per100g ? Math.round(food.per100g.calories * (food.grams || 100) / 100) : food.calories || 0} kcal
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Client note */}
                        {log.client_notes && (
                          <div className="border-t border-[#F0F0ED] px-5 py-3">
                            <div className="flex items-start gap-2">
                              <Pencil strokeWidth={1.5} className="w-3.5 h-3.5 text-[#8B6914] mt-0.5 shrink-0" />
                              <p className="text-[12px] text-[#8E8E93] italic">{log.client_notes}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ─── PLAN VIEW (readonly) ─────────────────────── */}
        {hasActivePlan && activeTab === 'plan' && (
          <div className="space-y-4">
            {/* Macro Summary Card */}
            <div className="bg-white rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[17px] font-semibold text-[#1A1A18]">{activePlan.title}</h2>
                <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-[#8B6914]/10 text-[#8B6914]">
                  Actief
                </span>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-[#FF9500]/5 rounded-xl p-4 text-center">
                  <p className="text-[11px] text-[#8E8E93] uppercase font-medium">Calorieën</p>
                  <p className="text-[22px] font-bold text-[#FF9500] mt-1">{activePlan.calories_target}</p>
                  <p className="text-[11px] text-[#C7C7CC]">kcal</p>
                </div>
                <div className="bg-[#007AFF]/5 rounded-xl p-4 text-center">
                  <p className="text-[11px] text-[#8E8E93] uppercase font-medium">Eiwitten</p>
                  <p className="text-[22px] font-bold text-[#007AFF] mt-1">{activePlan.protein_g}</p>
                  <p className="text-[11px] text-[#C7C7CC]">gram</p>
                </div>
                <div className="bg-[#34C759]/5 rounded-xl p-4 text-center">
                  <p className="text-[11px] text-[#8E8E93] uppercase font-medium">Koolhydraten</p>
                  <p className="text-[22px] font-bold text-[#34C759] mt-1">{activePlan.carbs_g}</p>
                  <p className="text-[11px] text-[#C7C7CC]">gram</p>
                </div>
                <div className="bg-[#AF52DE]/5 rounded-xl p-4 text-center">
                  <p className="text-[11px] text-[#8E8E93] uppercase font-medium">Vetten</p>
                  <p className="text-[22px] font-bold text-[#AF52DE] mt-1">{activePlan.fat_g}</p>
                  <p className="text-[11px] text-[#C7C7CC]">gram</p>
                </div>
              </div>
            </div>

            {/* Meal Cards (readonly) */}
            {Array.isArray(activePlan.meals) && activePlan.meals.map((meal: any, idx: number) => (
              <div key={idx} className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FAFAFA] flex items-center justify-center">
                      <Clock strokeWidth={1.5} className="w-5 h-5 text-[#8B6914]" />
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold text-[#1A1A18]">{meal.name || meal.moment}</p>
                      <p className="text-[12px] text-[#8E8E93]">{meal.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[14px] font-semibold text-[#FF9500]">
                      {meal.foods ? meal.foods.reduce((s: number, f: any) => s + Math.round((f.per100g?.calories || 0) * (f.grams || 100) / 100), 0) : (meal.calories || 0)} kcal
                    </p>
                  </div>
                </div>
                {meal.foods && meal.foods.length > 0 && (
                  <div className="border-t border-[#F0F0ED] divide-y divide-[#F0F0ED]">
                    {meal.foods.map((food: any, fIdx: number) => (
                      <div key={fIdx} className="px-5 py-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#F5F5F3] flex items-center justify-center overflow-hidden shrink-0">
                          {food.image ? (
                            <img src={food.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[16px]">{getFoodEmoji(food.name)}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-[#1A1A18] truncate">{food.name}</p>
                          <p className="text-[11px] text-[#C7C7CC]">{food.grams}g</p>
                        </div>
                        <div className="text-right text-[12px] text-[#8E8E93] shrink-0">
                          {Math.round(food.per100g.calories * food.grams / 100)} kcal ·
                          E{Math.round(food.per100g.protein * food.grams / 100)} ·
                          K{Math.round(food.per100g.carbs * food.grams / 100)} ·
                          V{Math.round(food.per100g.fat * food.grams / 100)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Guidelines */}
            {activePlan.guidelines && (
              <div className="bg-white rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED]">
                <h3 className="text-[15px] font-semibold text-[#1A1A18] mb-3">Richtlijnen</h3>
                <p className="text-[13px] text-[#8E8E93] whitespace-pre-wrap leading-relaxed">
                  {activePlan.guidelines}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ─── EDITOR ────────────────────────────────────── */}
        {showEditor && activeTab === 'plan' && (
          <div className="space-y-6">
            {/* Plan Title */}
            <div className="bg-white rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED]">
              <label className="block text-[13px] font-medium text-[#1A1A18] mb-2">
                Plan titel
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="bijv. Bulkfase voedingsplan, Cutting schema..."
                className="w-full px-4 py-3 rounded-xl border border-[#F0F0ED] text-[15px] text-[#1A1A18] bg-white placeholder-[#C7C7CC] focus:outline-none focus:border-[#8B6914] focus:ring-1 focus:ring-[#8B6914]/20"
              />

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#1A1A18] mb-2">Geldig van</label>
                  <input
                    type="date"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#F0F0ED] text-[14px] text-[#1A1A18] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#1A1A18] mb-2">Geldig tot</label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#F0F0ED] text-[14px] text-[#1A1A18] bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Live Macro Totals */}
            <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED]">
              <p className="text-[12px] text-[#8E8E93] uppercase font-medium tracking-wide mb-3">
                Dagelijks totaal (berekend)
              </p>
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-[#FF9500]/5 rounded-xl p-3 text-center">
                  <p className="text-[20px] font-bold text-[#FF9500]">{totalPlanMacro(meals, 'calories')}</p>
                  <p className="text-[11px] text-[#8E8E93]">kcal</p>
                </div>
                <div className="bg-[#007AFF]/5 rounded-xl p-3 text-center">
                  <p className="text-[20px] font-bold text-[#007AFF]">{totalPlanMacro(meals, 'protein')}g</p>
                  <p className="text-[11px] text-[#8E8E93]">eiwit</p>
                </div>
                <div className="bg-[#34C759]/5 rounded-xl p-3 text-center">
                  <p className="text-[20px] font-bold text-[#34C759]">{totalPlanMacro(meals, 'carbs')}g</p>
                  <p className="text-[11px] text-[#8E8E93]">koolh</p>
                </div>
                <div className="bg-[#AF52DE]/5 rounded-xl p-3 text-center">
                  <p className="text-[20px] font-bold text-[#AF52DE]">{totalPlanMacro(meals, 'fat')}g</p>
                  <p className="text-[11px] text-[#8E8E93]">vet</p>
                </div>
              </div>
            </div>

            {/* Meal Moments */}
            {meals.map((meal) => {
              const isExpanded = expandedMeals.has(meal.id)
              const mealCal = totalMealMacro(meal, 'calories')
              const mealProt = totalMealMacro(meal, 'protein')
              const mealCarbs = totalMealMacro(meal, 'carbs')
              const mealFat = totalMealMacro(meal, 'fat')

              return (
                <div
                  key={meal.id}
                  className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] overflow-hidden"
                >
                  {/* Meal Header */}
                  <button
                    onClick={() => toggleMealExpanded(meal.id)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#FAFAFA] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#8B6914]/10 flex items-center justify-center">
                        <Clock strokeWidth={1.5} className="w-5 h-5 text-[#8B6914]" />
                      </div>
                      <div className="text-left">
                        <p className="text-[15px] font-semibold text-[#1A1A18]">{meal.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <input
                            type="time"
                            value={meal.time}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleUpdateMealTime(meal.id, e.target.value)}
                            className="text-[12px] text-[#8E8E93] bg-transparent border-none p-0 focus:outline-none w-16"
                          />
                          <span className="text-[12px] text-[#C7C7CC]">·</span>
                          <span className="text-[12px] text-[#8E8E93]">{(meal.foods || []).length} items</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <span className="text-[13px] font-semibold text-[#FF9500]">{mealCal} kcal</span>
                        <p className="text-[11px] text-[#C7C7CC]">
                          E{mealProt} · K{mealCarbs} · V{mealFat}
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp strokeWidth={1.5} className="w-5 h-5 text-[#C7C7CC]" />
                      ) : (
                        <ChevronDown strokeWidth={1.5} className="w-5 h-5 text-[#C7C7CC]" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-[#F0F0ED]">
                      {/* Food Items */}
                      {(meal.foods || []).length > 0 && (
                        <div className="divide-y divide-[#F0F0ED]">
                          {(meal.foods || []).map((food) => (
                            <div key={food.id} className="px-5 py-3 flex items-center gap-3 group">
                              {/* Food Image */}
                              <div className="w-10 h-10 rounded-lg bg-[#F5F5F3] border border-[#F0F0ED] flex items-center justify-center overflow-hidden shrink-0">
                                {food.image ? (
                                  <img
                                    src={food.image}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none'
                                      ;(e.target as HTMLImageElement).parentElement!.innerHTML = `<span style="font-size:18px">${getFoodEmoji(food.name)}</span>`
                                    }}
                                  />
                                ) : (
                                  <span className="text-[18px]">{getFoodEmoji(food.name)}</span>
                                )}
                              </div>

                              {/* Food Info */}
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-medium text-[#1A1A18] truncate">
                                  {food.name}
                                </p>
                                {food.brand && (
                                  <p className="text-[11px] text-[#C7C7CC] truncate">{food.brand}</p>
                                )}
                              </div>

                              {/* Grams Control */}
                              <div className="flex items-center gap-1 shrink-0">
                                <input
                                  type="number"
                                  value={food.grams}
                                  onChange={(e) =>
                                    handleUpdateFoodGrams(meal.id, food.id, parseInt(e.target.value) || 0)
                                  }
                                  className="w-16 px-2 py-1 rounded-lg border border-[#F0F0ED] text-[13px] text-center text-[#1A1A18] bg-white"
                                  min={1}
                                />
                                <span className="text-[11px] text-[#C7C7CC]">g</span>
                              </div>

                              {/* Macros */}
                              <div className="text-right text-[11px] text-[#8E8E93] shrink-0 hidden sm:block w-32">
                                <span className="text-[#FF9500] font-medium">{calcMacro(food, 'calories')}</span>
                                {' · E'}
                                {calcMacro(food, 'protein')}
                                {' · K'}
                                {calcMacro(food, 'carbs')}
                                {' · V'}
                                {calcMacro(food, 'fat')}
                              </div>

                              {/* Delete */}
                              <button
                                onClick={() => handleRemoveFood(meal.id, food.id)}
                                className="p-1.5 rounded-lg text-[#C7C7CC] hover:text-[#FF3B30] hover:bg-[#FF3B30]/5 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                              >
                                <Trash2 strokeWidth={1.5} className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Food Button / Search */}
                      <div className="p-4">
                        {searchingMealId === meal.id ? (
                          <FoodSearch
                            onSelect={(food, grams) => handleAddFoodToMeal(meal.id, food, grams)}
                            onClose={() => setSearchingMealId(null)}
                          />
                        ) : (
                          <button
                            onClick={() => setSearchingMealId(meal.id)}
                            className="w-full px-4 py-3 rounded-xl border-2 border-dashed border-[#F0F0ED] text-[13px] font-medium text-[#8E8E93] hover:border-[#8B6914]/30 hover:text-[#8B6914] hover:bg-[#8B6914]/5 transition-all flex items-center justify-center gap-2"
                          >
                            <Search strokeWidth={1.5} className="w-4 h-4" />
                            Voedingsmiddel toevoegen
                          </button>
                        )}
                      </div>

                      {/* Remove Meal */}
                      <div className="px-4 pb-4">
                        <button
                          onClick={() => handleRemoveMeal(meal.id)}
                          className="text-[12px] text-[#C7C7CC] hover:text-[#FF3B30] transition-colors"
                        >
                          Maaltijdmoment verwijderen
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Add Meal Moment */}
            {showAddMeal ? (
              <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED]">
                <p className="text-[13px] font-medium text-[#1A1A18] mb-3">Nieuw maaltijdmoment</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {MEAL_PRESETS.filter((p) => !meals.some((m) => m.name === p)).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setNewMealName(preset)}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors"
                      style={{
                        backgroundColor: newMealName === preset ? '#8B6914' : 'white',
                        color: newMealName === preset ? 'white' : '#8E8E93',
                        borderColor: newMealName === preset ? '#8B6914' : '#F0F0ED',
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newMealName}
                    onChange={(e) => setNewMealName(e.target.value)}
                    placeholder="Naam maaltijdmoment"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-[#F0F0ED] text-[14px] text-[#1A1A18] bg-white"
                  />
                  <input
                    type="time"
                    value={newMealTime}
                    onChange={(e) => setNewMealTime(e.target.value)}
                    className="px-3 py-2.5 rounded-xl border border-[#F0F0ED] text-[14px] text-[#1A1A18] bg-white w-28"
                  />
                  <button
                    onClick={handleAddMeal}
                    disabled={!newMealName.trim()}
                    className="px-4 py-2.5 rounded-xl bg-[#8B6914] text-white text-[13px] font-semibold hover:bg-[#6F5612] transition-colors disabled:opacity-40"
                  >
                    Toevoegen
                  </button>
                  <button
                    onClick={() => setShowAddMeal(false)}
                    className="px-4 py-2.5 rounded-xl border border-[#F0F0ED] text-[13px] font-medium text-[#8E8E93] bg-white hover:bg-[#FAFAFA] transition-colors"
                  >
                    Annuleer
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddMeal(true)}
                className="w-full px-4 py-4 rounded-2xl border-2 border-dashed border-[#F0F0ED] text-[14px] font-medium text-[#8E8E93] hover:border-[#8B6914]/30 hover:text-[#8B6914] hover:bg-white transition-all flex items-center justify-center gap-2"
              >
                <Plus strokeWidth={1.5} className="w-5 h-5" />
                Maaltijdmoment toevoegen
              </button>
            )}

            {/* Guidelines */}
            <div className="bg-white rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED]">
              <label className="block text-[13px] font-medium text-[#1A1A18] mb-2">
                Richtlijnen voor {clientName}
              </label>
              <textarea
                value={guidelines}
                onChange={(e) => setGuidelines(e.target.value)}
                placeholder="Bijv. Drink minimaal 2.5L water per dag. Eet 30 min voor de training een snack..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-[#F0F0ED] text-[14px] text-[#1A1A18] bg-white placeholder-[#C7C7CC] focus:outline-none focus:border-[#8B6914] focus:ring-1 focus:ring-[#8B6914]/20 resize-none"
              />
            </div>

            {/* Save Actions */}
            <div className="flex gap-3 sticky bottom-4 z-10">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-6 py-4 rounded-2xl font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 bg-[#8B6914] shadow-lg"
              >
                <Check strokeWidth={2} className="w-5 h-5" />
                {saving ? 'Opslaan...' : 'Voedingsplan opslaan'}
              </button>
              {isEditing && (
                <button
                  onClick={() => { setIsEditing(false); loadPlanIntoState(activePlan) }}
                  className="px-6 py-4 rounded-2xl font-semibold border border-[#F0F0ED] text-[#8E8E93] bg-white hover:bg-[#FAFAFA] transition-colors shadow-lg"
                >
                  Annuleren
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
