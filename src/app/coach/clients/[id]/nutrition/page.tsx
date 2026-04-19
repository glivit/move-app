'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { FoodSearch, type FoodItem } from '@/components/coach/FoodSearch'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Search,
  Eye,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Droplets,
  MessageSquare,
  Pencil,
  Zap,
  X,
  Utensils,
} from 'lucide-react'
import Link from 'next/link'

// ─── Types ──────────────────────────────────────────────────

interface TemplateSummary {
  id: string
  title: string
  description: string
  calories_target: number
  protein_g: number
  carbs_g: number
  fat_g: number
  tags: string[]
  mealsCount: number
}

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

interface LoggedFood {
  name?: string
  grams?: number
  image?: string
  calories?: number
  per100g?: { calories: number; protein: number; carbs: number; fat: number }
}

interface NutritionLog {
  id: string
  meal_id: string
  meal_name: string
  completed: boolean
  foods_eaten: LoggedFood[]
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

// ─── Design tokens (v3 Orion) ──────────────────────────────

const MACRO = {
  calories: { label: 'Kcal', unit: '', color: '#E8A93C', dot: '#E8A93C' },
  protein: { label: 'Eiwit', unit: 'g', color: '#A4C7F2', dot: '#A4C7F2' },
  carbs: { label: 'Koolh.', unit: 'g', color: '#C0FC01', dot: '#C0FC01' },
  fat: { label: 'Vet', unit: 'g', color: '#CBB0D6', dot: '#CBB0D6' },
} as const

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

function calcMacro(
  food: FoodEntry,
  key: 'calories' | 'protein' | 'carbs' | 'fat'
) {
  return Math.round((food.per100g[key] * food.grams) / 100)
}

function totalMealMacro(
  meal: MealMoment,
  key: 'calories' | 'protein' | 'carbs' | 'fat'
) {
  return (meal.foods || []).reduce((sum, f) => sum + calcMacro(f, key), 0)
}

function totalPlanMacro(
  meals: MealMoment[],
  key: 'calories' | 'protein' | 'carbs' | 'fat'
) {
  return meals.reduce((sum, m) => sum + totalMealMacro(m, key), 0)
}

function getFoodEmoji(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('kip') || n.includes('chicken')) return '🍗'
  if (n.includes('rijst') || n.includes('rice')) return '🍚'
  if (n.includes('haver') || n.includes('oat')) return '🥣'
  if (n.includes('ei') || n.includes('egg')) return '🥚'
  if (n.includes('yoghurt') || n.includes('yogurt')) return '🥛'
  if (n.includes('zalm') || n.includes('salmon') || n.includes('vis')) return '🐟'
  if (n.includes('aardappel') || n.includes('potato')) return '🥔'
  if (n.includes('whey') || n.includes('protein') || n.includes('shake'))
    return '🥤'
  if (n.includes('brood') || n.includes('bread')) return '🍞'
  if (n.includes('avocado')) return '🥑'
  if (n.includes('banaan') || n.includes('banana')) return '🍌'
  if (n.includes('amandel') || n.includes('noot')) return '🥜'
  return '🍽️'
}

const DEFAULT_MEALS: () => MealMoment[] = () => [
  { id: generateId(), name: 'Ontbijt', time: '07:30', foods: [] },
  { id: generateId(), name: 'Tussendoor (ochtend)', time: '10:00', foods: [] },
  { id: generateId(), name: 'Lunch', time: '12:30', foods: [] },
  { id: generateId(), name: 'Tussendoor (middag)', time: '15:00', foods: [] },
  { id: generateId(), name: 'Avondeten', time: '18:30', foods: [] },
  { id: generateId(), name: 'Avondsnack', time: '21:00', foods: [] },
]

const MEAL_PRESETS = [
  'Ontbijt',
  'Tussendoor (ochtend)',
  'Lunch',
  'Tussendoor (middag)',
  'Avondeten',
  'Avondsnack',
  'Pre-workout',
  'Post-workout',
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
  const [showTemplates, setShowTemplates] = useState(false)
  const [templates, setTemplates] = useState<TemplateSummary[]>([])
  const [assigningTemplate, setAssigningTemplate] = useState<string | null>(
    null
  )

  // Compliance state
  const [complianceDate, setComplianceDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [complianceLogs, setComplianceLogs] = useState<NutritionLog[]>([])
  const [complianceSummary, setComplianceSummary] =
    useState<DailySummary | null>(null)
  const [complianceLoading, setComplianceLoading] = useState(false)
  const [weekHistory, setWeekHistory] = useState<
    { date: string; completed: number; planned: number }[]
  >([])

  const loadPlanIntoState = useCallback((plan: NutritionPlan | null) => {
    if (!plan) {
      setTitle('')
      setGuidelines('')
      setValidFrom('')
      setValidUntil('')
      setMeals(DEFAULT_MEALS())
      return
    }
    setTitle(plan.title || '')
    setGuidelines(plan.guidelines || '')
    setValidFrom(plan.valid_from?.split('T')[0] || '')
    setValidUntil(plan.valid_until?.split('T')[0] || '')

    if (Array.isArray(plan.meals)) {
      const converted: MealMoment[] = plan.meals.map(
        (m: Partial<MealMoment> & { moment?: string }) => ({
          id: m.id || generateId(),
          name: m.name || m.moment || 'Maaltijd',
          time: m.time || '12:00',
          foods: Array.isArray(m.foods) ? m.foods : [],
        })
      )
      setMeals(converted.length > 0 ? converted : DEFAULT_MEALS())
    } else {
      setMeals(DEFAULT_MEALS())
    }
  }, [])

  const loadData = useCallback(async () => {
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
      } else {
        setActivePlan(null)
        loadPlanIntoState(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fout bij laden')
    } finally {
      setLoading(false)
    }
  }, [supabase, params.id, loadPlanIntoState])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Load compliance data when tab or date changes
  const loadComplianceData = useCallback(async () => {
    try {
      setComplianceLoading(true)
      const res = await fetch(
        `/api/nutrition-log?client_id=${params.id}&date=${complianceDate}`
      )
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
      const supa = createClient()
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 6)
      const weekAgoStr = weekAgo.toISOString().split('T')[0]
      const todayStr = new Date().toISOString().split('T')[0]

      const { data: weekData } = await supa
        .from('nutrition_daily_summary')
        .select('date, meals_planned, meals_completed')
        .eq('client_id', params.id)
        .gte('date', weekAgoStr)
        .lte('date', todayStr)
        .order('date')

      for (let i = 0; i < 7; i++) {
        const d = new Date()
        d.setDate(d.getDate() - 6 + i)
        const dateStr = d.toISOString().split('T')[0]
        const entry = (
          weekData as
            | { date: string; meals_completed: number; meals_planned: number }[]
            | null
        )?.find((w) => w.date === dateStr)
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
  }, [params.id, complianceDate])

  useEffect(() => {
    if (activeTab === 'compliance') {
      loadComplianceData()
    }
  }, [activeTab, loadComplianceData])

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
    return new Date(dateStr).toLocaleDateString('nl-BE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  }

  async function loadTemplates() {
    try {
      const res = await fetch('/api/template-diets')
      if (res.ok) setTemplates(await res.json())
    } catch {
      /* silent */
    }
  }

  async function handleAssignTemplate(templateId: string) {
    try {
      setAssigningTemplate(templateId)
      const res = await fetch('/api/template-diets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, clientId: params.id }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Fout bij toewijzen')
      }
      setShowTemplates(false)
      setSuccessMsg('Template toegewezen!')
      setTimeout(() => setSuccessMsg(null), 3000)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fout bij toewijzen')
    } finally {
      setAssigningTemplate(null)
    }
  }

  function openTemplates() {
    setShowTemplates(true)
    if (templates.length === 0) loadTemplates()
  }

  function toggleMealExpanded(mealId: string) {
    const next = new Set(expandedMeals)
    if (next.has(mealId)) next.delete(mealId)
    else next.add(mealId)
    setExpandedMeals(next)
  }

  function handleAddFoodToMeal(
    mealId: string,
    food: FoodItem,
    grams: number
  ) {
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

  function handleUpdateFoodGrams(
    mealId: string,
    foodId: string,
    grams: number
  ) {
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

      if (activePlan) {
        await supabase
          .from('nutrition_plans')
          .update({ is_active: false })
          .eq('id', activePlan.id)
      }

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

  const clientName = profile?.full_name || 'Client'
  const hasActivePlan = activePlan && !isEditing
  const showEditor = isEditing || !activePlan

  // ─── Loading State ─────────────────────────────────────────

  if (loading) {
    return (
      <div className="pb-32 flex items-center justify-center min-h-[60vh]">
        <div
          className="animate-spin rounded-full h-10 w-10 border-2 border-[rgba(253,253,254,0.20)] border-t-[#FDFDFE]"
          aria-label="Laden"
        />
      </div>
    )
  }

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="pb-32">
      {/* Back link */}
      <Link
        href={`/coach/clients/${params.id}`}
        className="inline-flex items-center gap-1.5 mb-5 text-[13px] text-[rgba(253,253,254,0.62)] hover:text-[#FDFDFE] transition-colors"
      >
        <ArrowLeft strokeWidth={1.5} size={16} />
        Terug naar {clientName}
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1
            className="text-[30px] font-light tracking-[-0.025em] leading-[1.1] text-[#FDFDFE]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Voedingsplan
          </h1>
          <p className="mt-1.5 text-[12px] tracking-[0.04em] text-[rgba(253,253,254,0.62)]">
            {clientName} · {isEditing ? 'bewerken' : 'beheer voedingsplan'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!showTemplates && !isEditing && (
            <button
              onClick={openTemplates}
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-medium bg-[rgba(192,252,1,0.14)] text-[#C0FC01] transition-opacity active:opacity-70"
            >
              <Zap strokeWidth={1.75} className="w-3.5 h-3.5" />
              Template
            </button>
          )}
          {hasActivePlan && (
            <button
              onClick={() => {
                setIsEditing(true)
                loadPlanIntoState(activePlan)
              }}
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-medium bg-[rgba(253,253,254,0.08)] text-[#FDFDFE] transition-opacity active:opacity-70"
            >
              <Copy strokeWidth={1.75} className="w-3.5 h-3.5" />
              Bewerken
            </button>
          )}
        </div>
      </div>

      {/* Success / Error Messages */}
      {successMsg && (
        <div className="mb-4 rounded-[16px] px-4 py-3 bg-[rgba(192,252,1,0.10)] border border-[rgba(192,252,1,0.22)]">
          <p className="text-[13px] text-[#C0FC01] font-medium inline-flex items-center gap-2">
            <Check strokeWidth={2} className="w-4 h-4" />
            {successMsg}
          </p>
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-[16px] px-4 py-3 bg-[rgba(232,154,143,0.10)] border border-[rgba(232,154,143,0.24)]">
          <p className="text-[13px] text-[#E89A8F]">{error}</p>
        </div>
      )}

      {/* Tab Navigation */}
      {activePlan && !isEditing && (
        <div className="mb-5 rounded-full p-1 flex gap-1 bg-[rgba(71,75,72,0.55)]">
          <button
            onClick={() => setActiveTab('plan')}
            className="flex-1 px-4 py-2 rounded-full text-[12.5px] font-medium transition-colors"
            style={{
              backgroundColor:
                activeTab === 'plan' ? '#474B48' : 'transparent',
              color:
                activeTab === 'plan' ? '#FDFDFE' : 'rgba(253,253,254,0.62)',
            }}
          >
            Voedingsplan
          </button>
          <button
            onClick={() => setActiveTab('compliance')}
            className="flex-1 px-4 py-2 rounded-full text-[12.5px] font-medium transition-colors inline-flex items-center justify-center gap-1.5"
            style={{
              backgroundColor:
                activeTab === 'compliance' ? '#474B48' : 'transparent',
              color:
                activeTab === 'compliance'
                  ? '#FDFDFE'
                  : 'rgba(253,253,254,0.62)',
            }}
          >
            <Eye strokeWidth={1.5} className="w-3.5 h-3.5" />
            Compliance
          </button>
        </div>
      )}

      {/* ─── COMPLIANCE VIEW ─────────────────────────── */}
      {activeTab === 'compliance' && activePlan && !isEditing && (
        <div className="flex flex-col gap-4">
          {/* Date Navigator */}
          <div className="rounded-[22px] bg-[#474B48] px-[18px] py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigateComplianceDate(-1)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[rgba(253,253,254,0.62)] hover:text-[#FDFDFE] hover:bg-[rgba(253,253,254,0.06)] transition-colors"
                aria-label="Vorige dag"
              >
                <ChevronLeft strokeWidth={1.5} className="w-4 h-4" />
              </button>
              <div className="text-center">
                <p className="text-[14.5px] font-medium text-[#FDFDFE] capitalize">
                  {formatDateLabel(complianceDate)}
                </p>
                <p className="text-[11px] text-[rgba(253,253,254,0.45)] mt-0.5">
                  {complianceDate}
                </p>
              </div>
              <button
                onClick={() => navigateComplianceDate(1)}
                disabled={
                  complianceDate >= new Date().toISOString().split('T')[0]
                }
                className="w-9 h-9 rounded-full flex items-center justify-center text-[rgba(253,253,254,0.62)] hover:text-[#FDFDFE] hover:bg-[rgba(253,253,254,0.06)] transition-colors disabled:opacity-30"
                aria-label="Volgende dag"
              >
                <ChevronRight strokeWidth={1.5} className="w-4 h-4" />
              </button>
            </div>

            {/* Week mini bar chart */}
            {weekHistory.length > 0 && (
              <div className="flex items-end justify-center gap-2 mt-4 pt-4 border-t border-[rgba(253,253,254,0.08)]">
                {weekHistory.map((day) => {
                  const pct =
                    day.planned > 0 ? (day.completed / day.planned) * 100 : 0
                  const isSelected = day.date === complianceDate
                  const dayLabel = new Date(day.date).toLocaleDateString(
                    'nl-BE',
                    { weekday: 'narrow' }
                  )
                  const barColor =
                    pct >= 80
                      ? '#C0FC01'
                      : pct >= 50
                      ? '#E8A93C'
                      : pct > 0
                      ? '#E89A8F'
                      : 'rgba(253,253,254,0.18)'
                  return (
                    <button
                      key={day.date}
                      onClick={() => setComplianceDate(day.date)}
                      className="flex flex-col items-center gap-1.5 group"
                    >
                      <div
                        className="w-7 rounded-lg transition-all"
                        style={{
                          height: `${Math.max(4, pct * 0.36)}px`,
                          backgroundColor: barColor,
                          opacity: isSelected ? 1 : 0.55,
                        }}
                      />
                      <span
                        className="text-[10px] font-medium"
                        style={{
                          color: isSelected
                            ? '#FDFDFE'
                            : 'rgba(253,253,254,0.45)',
                        }}
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
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[rgba(253,253,254,0.20)] border-t-[#FDFDFE]" />
            </div>
          ) : complianceLogs.length === 0 && !complianceSummary ? (
            <div className="rounded-[22px] bg-[rgba(71,75,72,0.55)] px-6 py-10 text-center">
              <div className="w-11 h-11 rounded-full bg-[rgba(253,253,254,0.06)] flex items-center justify-center mx-auto mb-3">
                <Eye
                  strokeWidth={1.5}
                  className="w-5 h-5 text-[rgba(253,253,254,0.62)]"
                />
              </div>
              <p className="text-[14.5px] font-medium text-[#FDFDFE] mb-1">
                Geen tracking data
              </p>
              <p className="text-[12.5px] text-[rgba(253,253,254,0.55)] leading-[1.45]">
                {clientName} heeft op deze dag nog niets gelogd.
              </p>
            </div>
          ) : (
            <>
              {/* Summary Card */}
              {complianceSummary && (
                <div className="rounded-[22px] bg-[#474B48] px-[18px] py-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[14px] font-medium text-[#FDFDFE]">
                      Dagelijkse samenvatting
                    </h3>
                    {complianceSummary.meals_planned > 0 && (() => {
                      const ratio =
                        complianceSummary.meals_completed /
                        complianceSummary.meals_planned
                      const col =
                        ratio >= 0.8
                          ? '#C0FC01'
                          : ratio >= 0.5
                          ? '#E8A93C'
                          : '#E89A8F'
                      return (
                        <span
                          className="text-[11.5px] font-medium px-2.5 py-1 rounded-full"
                          style={{
                            backgroundColor: `${col}1f`,
                            color: col,
                          }}
                        >
                          {complianceSummary.meals_completed}/
                          {complianceSummary.meals_planned} maaltijden
                        </span>
                      )
                    })()}
                  </div>

                  {/* Macro bars (v3 Orion — muted with dots) */}
                  <div className="grid grid-cols-4 gap-3">
                    {(
                      [
                        {
                          key: 'calories' as const,
                          value: complianceSummary.total_calories,
                          target: activePlan.calories_target,
                        },
                        {
                          key: 'protein' as const,
                          value: complianceSummary.total_protein,
                          target: activePlan.protein_g,
                        },
                        {
                          key: 'carbs' as const,
                          value: complianceSummary.total_carbs,
                          target: activePlan.carbs_g,
                        },
                        {
                          key: 'fat' as const,
                          value: complianceSummary.total_fat,
                          target: activePlan.fat_g,
                        },
                      ]
                    ).map(({ key, value, target }) => {
                      const m = MACRO[key]
                      const pct =
                        target > 0 ? Math.min(100, (value / target) * 100) : 0
                      return (
                        <div key={key} className="text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <span
                              className="inline-block w-[6px] h-[6px] rounded-full"
                              style={{ background: m.dot }}
                              aria-hidden
                            />
                            <p className="text-[10.5px] uppercase tracking-[0.08em] text-[rgba(253,253,254,0.55)]">
                              {m.label}
                            </p>
                          </div>
                          <p className="text-[17px] font-light tracking-[-0.015em] text-[#FDFDFE] mt-1.5 leading-none">
                            {value}
                            {m.unit}
                          </p>
                          <div className="w-full h-1 bg-[rgba(253,253,254,0.08)] rounded-full mt-2 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, backgroundColor: m.color }}
                            />
                          </div>
                          <p className="text-[10px] text-[rgba(253,253,254,0.45)] mt-1.5">
                            / {target}
                            {m.unit}
                          </p>
                        </div>
                      )
                    })}
                  </div>

                  {/* Mood, Water */}
                  {(complianceSummary.mood ||
                    complianceSummary.water_liters) && (
                    <div className="flex items-center gap-4 pt-4 mt-4 border-t border-[rgba(253,253,254,0.08)] flex-wrap">
                      {complianceSummary.mood && (
                        <div className="inline-flex items-center gap-1.5">
                          <span className="text-[16px]">
                            {MOOD_EMOJI[complianceSummary.mood] || '😐'}
                          </span>
                          <span className="text-[12px] text-[rgba(253,253,254,0.62)] capitalize">
                            {complianceSummary.mood}
                          </span>
                        </div>
                      )}
                      {complianceSummary.water_liters && (
                        <div className="inline-flex items-center gap-1.5">
                          <Droplets
                            strokeWidth={1.5}
                            className="w-3.5 h-3.5 text-[#A4C7F2]"
                          />
                          <span className="text-[12px] text-[rgba(253,253,254,0.62)]">
                            {complianceSummary.water_liters}L water
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {complianceSummary.daily_note && (
                    <div className="mt-3 p-3 rounded-[14px] bg-[rgba(253,253,254,0.05)]">
                      <div className="flex items-start gap-2">
                        <MessageSquare
                          strokeWidth={1.5}
                          className="w-3.5 h-3.5 text-[rgba(253,253,254,0.55)] mt-0.5 shrink-0"
                        />
                        <p className="text-[12.5px] text-[#FDFDFE] leading-[1.45]">
                          {complianceSummary.daily_note}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Meal Logs */}
              {complianceLogs.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="px-0.5 text-[11px] uppercase tracking-[0.14em] text-[rgba(253,253,254,0.45)]">
                    Maaltijden
                  </h3>
                  {complianceLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-[18px] bg-[#474B48] overflow-hidden"
                    >
                      <div className="px-[18px] py-[14px] flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: log.completed
                              ? 'rgba(192,252,1,0.12)'
                              : 'rgba(253,253,254,0.06)',
                          }}
                        >
                          {log.completed ? (
                            <CheckCircle
                              strokeWidth={1.75}
                              className="w-4 h-4 text-[#C0FC01]"
                            />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-[1.5px] border-[rgba(253,253,254,0.35)]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-medium text-[#FDFDFE] truncate">
                            {log.meal_name}
                          </p>
                          {log.completed_at && (
                            <p className="text-[11px] text-[rgba(253,253,254,0.45)] mt-0.5">
                              Afgevinkt om{' '}
                              {new Date(log.completed_at).toLocaleTimeString(
                                'nl-BE',
                                {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }
                              )}
                            </p>
                          )}
                        </div>
                      </div>

                      {log.foods_eaten && log.foods_eaten.length > 0 && (
                        <div className="border-t border-[rgba(253,253,254,0.06)] divide-y divide-[rgba(253,253,254,0.04)]">
                          {log.foods_eaten.map((food, idx) => (
                            <div
                              key={idx}
                              className="px-[18px] py-2.5 flex items-center gap-3"
                            >
                              <div className="w-8 h-8 rounded-lg bg-[rgba(253,253,254,0.06)] flex items-center justify-center overflow-hidden shrink-0">
                                {food.image ? (
                                  <Image
                                    src={food.image}
                                    alt=""
                                    width={32}
                                    height={32}
                                    className="w-full h-full object-cover"
                                    unoptimized
                                    loading="lazy"
                                  />
                                ) : (
                                  <span className="text-[14px]">
                                    {getFoodEmoji(food.name || '')}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[12.5px] font-medium text-[#FDFDFE] truncate">
                                  {food.name}
                                </p>
                                <p className="text-[11px] text-[rgba(253,253,254,0.45)]">
                                  {food.grams}g
                                </p>
                              </div>
                              <div className="text-right text-[11px] text-[rgba(253,253,254,0.55)] shrink-0">
                                {food.per100g
                                  ? Math.round(
                                      (food.per100g.calories * (food.grams || 100)) /
                                        100
                                    )
                                  : food.calories || 0}{' '}
                                kcal
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {log.client_notes && (
                        <div className="border-t border-[rgba(253,253,254,0.06)] px-[18px] py-3 bg-[rgba(253,253,254,0.03)]">
                          <div className="flex items-start gap-2">
                            <Pencil
                              strokeWidth={1.5}
                              className="w-3.5 h-3.5 text-[rgba(253,253,254,0.55)] mt-0.5 shrink-0"
                            />
                            <p className="text-[12px] text-[rgba(253,253,254,0.75)] italic leading-[1.45]">
                              {log.client_notes}
                            </p>
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
        <div className="flex flex-col gap-4">
          {/* Macro Summary Card */}
          <div className="rounded-[22px] bg-[#474B48] px-[22px] pt-5 pb-[22px]">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <h2 className="text-[17px] font-medium tracking-[-0.01em] text-[#FDFDFE] truncate">
                  {activePlan.title}
                </h2>
                <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[rgba(253,253,254,0.45)]">
                  Dagtarget
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-medium bg-[rgba(192,252,1,0.14)] text-[#C0FC01] shrink-0">
                <span
                  className="w-[6px] h-[6px] rounded-full bg-[#C0FC01]"
                  aria-hidden
                />
                Actief
              </span>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {(
                [
                  { key: 'calories' as const, value: activePlan.calories_target },
                  { key: 'protein' as const, value: activePlan.protein_g },
                  { key: 'carbs' as const, value: activePlan.carbs_g },
                  { key: 'fat' as const, value: activePlan.fat_g },
                ]
              ).map(({ key, value }) => {
                const m = MACRO[key]
                return (
                  <div key={key}>
                    <div className="inline-flex items-center gap-1.5">
                      <span
                        className="inline-block w-[6px] h-[6px] rounded-full"
                        style={{ background: m.dot }}
                        aria-hidden
                      />
                      <p className="text-[10.5px] uppercase tracking-[0.08em] text-[rgba(253,253,254,0.55)]">
                        {m.label}
                      </p>
                    </div>
                    <p className="mt-1.5 text-[22px] font-light tracking-[-0.02em] text-[#FDFDFE] leading-none">
                      {value}
                      <span className="text-[11px] text-[rgba(253,253,254,0.45)] ml-0.5">
                        {m.unit || 'kcal'}
                      </span>
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Meal Cards (readonly) */}
          {Array.isArray(activePlan.meals) &&
            (activePlan.meals as MealMoment[]).map((meal, idx) => {
              const mealCal = totalMealMacro(meal, 'calories')
              return (
                <div
                  key={meal.id || idx}
                  className="rounded-[18px] bg-[#474B48] overflow-hidden"
                >
                  <div className="px-[18px] py-[14px] flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[rgba(253,253,254,0.06)] flex items-center justify-center shrink-0">
                      <Clock
                        strokeWidth={1.5}
                        className="w-4 h-4 text-[rgba(253,253,254,0.62)]"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14.5px] font-medium text-[#FDFDFE] truncate">
                        {meal.name}
                      </p>
                      <p className="mt-0.5 text-[11.5px] text-[rgba(253,253,254,0.55)]">
                        {meal.time} ·{' '}
                        {(meal.foods || []).length}{' '}
                        {(meal.foods || []).length === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="inline-flex items-center gap-1.5 text-[12.5px] text-[#FDFDFE]">
                        <span
                          className="inline-block w-[6px] h-[6px] rounded-full"
                          style={{ background: MACRO.calories.dot }}
                          aria-hidden
                        />
                        {mealCal} kcal
                      </div>
                    </div>
                  </div>
                  {meal.foods && meal.foods.length > 0 && (
                    <div className="border-t border-[rgba(253,253,254,0.06)] divide-y divide-[rgba(253,253,254,0.04)]">
                      {meal.foods.map((food) => (
                        <div
                          key={food.id}
                          className="px-[18px] py-2.5 flex items-center gap-3"
                        >
                          <div className="w-9 h-9 rounded-lg bg-[rgba(253,253,254,0.06)] flex items-center justify-center overflow-hidden shrink-0">
                            {food.image ? (
                              <Image
                                src={food.image}
                                alt=""
                                width={36}
                                height={36}
                                className="w-full h-full object-cover"
                                unoptimized
                                loading="lazy"
                              />
                            ) : (
                              <span className="text-[16px]">
                                {getFoodEmoji(food.name)}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-[#FDFDFE] truncate">
                              {food.name}
                            </p>
                            <p className="text-[11px] text-[rgba(253,253,254,0.45)]">
                              {food.grams}g
                            </p>
                          </div>
                          <div className="text-right text-[11px] text-[rgba(253,253,254,0.62)] shrink-0">
                            {calcMacro(food, 'calories')} kcal
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

          {/* Guidelines */}
          {activePlan.guidelines && (
            <div className="rounded-[18px] bg-[#474B48] px-[22px] py-5">
              <h3 className="text-[11px] uppercase tracking-[0.14em] text-[rgba(253,253,254,0.45)] mb-2.5">
                Richtlijnen
              </h3>
              <p className="text-[13px] text-[rgba(253,253,254,0.85)] whitespace-pre-wrap leading-[1.55]">
                {activePlan.guidelines}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── EDITOR ────────────────────────────────────── */}
      {showEditor && (
        <div className="flex flex-col gap-4">
          {/* Plan Title + validity */}
          <div className="rounded-[22px] bg-[#474B48] px-[22px] py-5">
            <label className="block text-[11px] uppercase tracking-[0.12em] text-[rgba(253,253,254,0.45)] mb-2">
              Plan titel
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="bijv. Bulkfase voedingsplan, Cutting schema..."
              className="w-full px-3.5 py-2.5 rounded-[14px] text-[14.5px] text-[#FDFDFE] bg-[rgba(253,253,254,0.06)] border border-[rgba(253,253,254,0.06)] placeholder-[rgba(253,253,254,0.35)] focus:outline-none focus:border-[rgba(253,253,254,0.25)] transition-colors"
            />

            <div className="grid grid-cols-2 gap-3 mt-3.5">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.12em] text-[rgba(253,253,254,0.45)] mb-1.5">
                  Geldig van
                </label>
                <input
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[14px] text-[13.5px] text-[#FDFDFE] bg-[rgba(253,253,254,0.06)] border border-[rgba(253,253,254,0.06)] focus:outline-none focus:border-[rgba(253,253,254,0.25)] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.12em] text-[rgba(253,253,254,0.45)] mb-1.5">
                  Geldig tot
                </label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[14px] text-[13.5px] text-[#FDFDFE] bg-[rgba(253,253,254,0.06)] border border-[rgba(253,253,254,0.06)] focus:outline-none focus:border-[rgba(253,253,254,0.25)] transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Live Macro Totals */}
          <div className="rounded-[22px] bg-[#474B48] px-[22px] py-5">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[rgba(253,253,254,0.45)] mb-3">
              Dagelijks totaal (berekend)
            </p>
            <div className="grid grid-cols-4 gap-3">
              {(
                [
                  { key: 'calories' as const, value: totalPlanMacro(meals, 'calories') },
                  { key: 'protein' as const, value: totalPlanMacro(meals, 'protein') },
                  { key: 'carbs' as const, value: totalPlanMacro(meals, 'carbs') },
                  { key: 'fat' as const, value: totalPlanMacro(meals, 'fat') },
                ]
              ).map(({ key, value }) => {
                const m = MACRO[key]
                return (
                  <div key={key}>
                    <div className="inline-flex items-center gap-1.5">
                      <span
                        className="inline-block w-[6px] h-[6px] rounded-full"
                        style={{ background: m.dot }}
                        aria-hidden
                      />
                      <p className="text-[10.5px] uppercase tracking-[0.08em] text-[rgba(253,253,254,0.55)]">
                        {m.label}
                      </p>
                    </div>
                    <p className="mt-1.5 text-[19px] font-light tracking-[-0.02em] text-[#FDFDFE] leading-none">
                      {value}
                      <span className="text-[11px] text-[rgba(253,253,254,0.45)] ml-0.5">
                        {m.unit || 'kcal'}
                      </span>
                    </p>
                  </div>
                )
              })}
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
                className="rounded-[18px] bg-[#474B48] overflow-hidden"
              >
                <button
                  onClick={() => toggleMealExpanded(meal.id)}
                  className="w-full px-[18px] py-[14px] flex items-center gap-3 text-left transition-colors active:bg-[rgba(253,253,254,0.03)]"
                >
                  <div className="w-9 h-9 rounded-full bg-[rgba(253,253,254,0.06)] flex items-center justify-center shrink-0">
                    <Clock
                      strokeWidth={1.5}
                      className="w-4 h-4 text-[rgba(253,253,254,0.62)]"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14.5px] font-medium text-[#FDFDFE] truncate">
                      {meal.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <input
                        type="time"
                        value={meal.time}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          handleUpdateMealTime(meal.id, e.target.value)
                        }
                        className="text-[11.5px] text-[rgba(253,253,254,0.62)] bg-transparent border-none p-0 focus:outline-none w-16"
                      />
                      <span className="text-[11.5px] text-[rgba(253,253,254,0.35)]">
                        ·
                      </span>
                      <span className="text-[11.5px] text-[rgba(253,253,254,0.55)]">
                        {(meal.foods || []).length} items
                      </span>
                    </div>
                  </div>
                  <div className="hidden sm:block text-right shrink-0">
                    <div className="inline-flex items-center gap-1.5 text-[12.5px] text-[#FDFDFE]">
                      <span
                        className="inline-block w-[6px] h-[6px] rounded-full"
                        style={{ background: MACRO.calories.dot }}
                        aria-hidden
                      />
                      {mealCal} kcal
                    </div>
                    <p className="text-[10.5px] text-[rgba(253,253,254,0.45)] mt-0.5">
                      E{mealProt} · K{mealCarbs} · V{mealFat}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp
                      strokeWidth={1.5}
                      className="w-4 h-4 text-[rgba(253,253,254,0.45)] shrink-0"
                    />
                  ) : (
                    <ChevronDown
                      strokeWidth={1.5}
                      className="w-4 h-4 text-[rgba(253,253,254,0.45)] shrink-0"
                    />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-[rgba(253,253,254,0.06)]">
                    {(meal.foods || []).length > 0 && (
                      <div className="divide-y divide-[rgba(253,253,254,0.04)]">
                        {(meal.foods || []).map((food) => (
                          <div
                            key={food.id}
                            className="px-[18px] py-3 flex items-center gap-3 group"
                          >
                            <div className="w-9 h-9 rounded-lg bg-[rgba(253,253,254,0.06)] flex items-center justify-center overflow-hidden shrink-0">
                              {food.image ? (
                                <Image
                                  src={food.image}
                                  alt=""
                                  width={36}
                                  height={36}
                                  className="w-full h-full object-cover"
                                  unoptimized
                                  loading="lazy"
                                />
                              ) : (
                                <span className="text-[16px]">
                                  {getFoodEmoji(food.name)}
                                </span>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-medium text-[#FDFDFE] truncate">
                                {food.name}
                              </p>
                              {food.brand && (
                                <p className="text-[11px] text-[rgba(253,253,254,0.45)] truncate">
                                  {food.brand}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <input
                                type="number"
                                value={food.grams}
                                onChange={(e) =>
                                  handleUpdateFoodGrams(
                                    meal.id,
                                    food.id,
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="w-14 px-2 py-1 rounded-lg text-[12.5px] text-center text-[#FDFDFE] bg-[rgba(253,253,254,0.06)] border border-[rgba(253,253,254,0.06)] focus:outline-none focus:border-[rgba(253,253,254,0.25)]"
                                min={1}
                              />
                              <span className="text-[11px] text-[rgba(253,253,254,0.45)]">
                                g
                              </span>
                            </div>

                            <div className="hidden sm:block text-right text-[11px] shrink-0 w-36">
                              <span
                                className="font-medium"
                                style={{ color: MACRO.calories.color }}
                              >
                                {calcMacro(food, 'calories')}
                              </span>
                              <span className="text-[rgba(253,253,254,0.45)]">
                                {' · E'}
                                {calcMacro(food, 'protein')}
                                {' · K'}
                                {calcMacro(food, 'carbs')}
                                {' · V'}
                                {calcMacro(food, 'fat')}
                              </span>
                            </div>

                            <button
                              onClick={() => handleRemoveFood(meal.id, food.id)}
                              className="p-1.5 rounded-lg text-[rgba(253,253,254,0.45)] hover:text-[#E89A8F] hover:bg-[rgba(232,154,143,0.08)] transition-colors shrink-0"
                              aria-label="Verwijder"
                            >
                              <Trash2 strokeWidth={1.5} className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="p-3.5">
                      {searchingMealId === meal.id ? (
                        <FoodSearch
                          onSelect={(food, grams) =>
                            handleAddFoodToMeal(meal.id, food, grams)
                          }
                          onClose={() => setSearchingMealId(null)}
                        />
                      ) : (
                        <button
                          onClick={() => setSearchingMealId(meal.id)}
                          className="w-full px-4 py-2.5 rounded-[14px] border border-dashed border-[rgba(253,253,254,0.18)] text-[12.5px] font-medium text-[rgba(253,253,254,0.62)] hover:text-[#FDFDFE] hover:border-[rgba(253,253,254,0.35)] hover:bg-[rgba(253,253,254,0.03)] transition-all inline-flex items-center justify-center gap-2"
                        >
                          <Search strokeWidth={1.5} className="w-3.5 h-3.5" />
                          Voedingsmiddel toevoegen
                        </button>
                      )}
                    </div>

                    <div className="px-3.5 pb-3.5">
                      <button
                        onClick={() => handleRemoveMeal(meal.id)}
                        className="text-[11.5px] text-[rgba(253,253,254,0.45)] hover:text-[#E89A8F] transition-colors"
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
            <div className="rounded-[18px] bg-[#474B48] px-[18px] py-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[rgba(253,253,254,0.45)] mb-3">
                Nieuw maaltijdmoment
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {MEAL_PRESETS.filter(
                  (p) => !meals.some((m) => m.name === p)
                ).map((preset) => {
                  const selected = newMealName === preset
                  return (
                    <button
                      key={preset}
                      onClick={() => setNewMealName(preset)}
                      className="rounded-full px-3 py-1.5 text-[11.5px] font-medium transition-colors"
                      style={{
                        backgroundColor: selected
                          ? 'rgba(192,252,1,0.14)'
                          : 'rgba(253,253,254,0.05)',
                        color: selected ? '#C0FC01' : 'rgba(253,253,254,0.75)',
                      }}
                    >
                      {preset}
                    </button>
                  )
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={newMealName}
                  onChange={(e) => setNewMealName(e.target.value)}
                  placeholder="Naam maaltijdmoment"
                  className="flex-1 min-w-0 px-3.5 py-2.5 rounded-[14px] text-[13.5px] text-[#FDFDFE] bg-[rgba(253,253,254,0.06)] border border-[rgba(253,253,254,0.06)] placeholder-[rgba(253,253,254,0.35)] focus:outline-none focus:border-[rgba(253,253,254,0.25)]"
                />
                <input
                  type="time"
                  value={newMealTime}
                  onChange={(e) => setNewMealTime(e.target.value)}
                  className="px-3 py-2.5 rounded-[14px] text-[13.5px] text-[#FDFDFE] bg-[rgba(253,253,254,0.06)] border border-[rgba(253,253,254,0.06)] focus:outline-none focus:border-[rgba(253,253,254,0.25)] w-[110px]"
                />
                <button
                  onClick={handleAddMeal}
                  disabled={!newMealName.trim()}
                  className="px-4 py-2.5 rounded-full bg-[#C0FC01] text-[#1f1918] text-[12.5px] font-semibold transition-opacity active:opacity-70 disabled:opacity-40"
                >
                  Toevoegen
                </button>
                <button
                  onClick={() => setShowAddMeal(false)}
                  className="px-4 py-2.5 rounded-full bg-[rgba(253,253,254,0.08)] text-[#FDFDFE] text-[12.5px] font-medium transition-opacity active:opacity-70"
                >
                  Annuleer
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddMeal(true)}
              className="w-full px-4 py-4 rounded-[18px] border border-dashed border-[rgba(253,253,254,0.18)] text-[13px] font-medium text-[rgba(253,253,254,0.62)] hover:text-[#FDFDFE] hover:border-[rgba(253,253,254,0.35)] hover:bg-[rgba(253,253,254,0.03)] transition-all inline-flex items-center justify-center gap-2"
            >
              <Plus strokeWidth={1.75} className="w-4 h-4" />
              Maaltijdmoment toevoegen
            </button>
          )}

          {/* Guidelines */}
          <div className="rounded-[18px] bg-[#474B48] px-[22px] py-5">
            <label className="block text-[11px] uppercase tracking-[0.14em] text-[rgba(253,253,254,0.45)] mb-2.5">
              Richtlijnen voor {clientName}
            </label>
            <textarea
              value={guidelines}
              onChange={(e) => setGuidelines(e.target.value)}
              placeholder="Bijv. Drink minimaal 2.5L water per dag. Eet 30 min voor de training een snack..."
              rows={4}
              className="w-full px-3.5 py-3 rounded-[14px] text-[13.5px] text-[#FDFDFE] bg-[rgba(253,253,254,0.06)] border border-[rgba(253,253,254,0.06)] placeholder-[rgba(253,253,254,0.35)] focus:outline-none focus:border-[rgba(253,253,254,0.25)] resize-none leading-[1.5]"
            />
          </div>

          {/* Save Actions — sticky bottom */}
          <div className="flex gap-2 sticky bottom-4 z-10 mt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-5 py-3.5 rounded-full font-semibold text-[13.5px] text-[#1f1918] bg-[#C0FC01] transition-opacity active:opacity-70 disabled:opacity-60 inline-flex items-center justify-center gap-2 shadow-lg"
            >
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-[#1f1918] border-t-transparent rounded-full animate-spin" />
                  Opslaan...
                </>
              ) : (
                <>
                  <Check strokeWidth={2} className="w-4 h-4" />
                  Voedingsplan opslaan
                </>
              )}
            </button>
            {isEditing && (
              <button
                onClick={() => {
                  setIsEditing(false)
                  loadPlanIntoState(activePlan)
                }}
                className="px-5 py-3.5 rounded-full font-medium text-[13.5px] bg-[rgba(71,75,72,0.9)] text-[#FDFDFE] transition-opacity active:opacity-70 shadow-lg"
              >
                Annuleren
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── Template Selection (bottom sheet) ────────── */}
      {showTemplates && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40"
            onClick={() => setShowTemplates(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center pointer-events-none">
            <div className="pointer-events-auto w-full max-w-[480px] bg-[#474B48] rounded-t-[24px] shadow-2xl max-h-[82vh] overflow-hidden animate-slide-up">
              <div className="px-5 py-4 border-b border-[rgba(253,253,254,0.08)] flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-[16px] font-medium text-[#FDFDFE]">
                    Kies een template
                  </h2>
                  <p className="mt-0.5 text-[11.5px] text-[rgba(253,253,254,0.55)]">
                    High-protein templates — direct actief op het dashboard
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTemplates(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[rgba(253,253,254,0.62)] hover:text-[#FDFDFE] hover:bg-[rgba(253,253,254,0.06)] transition-colors shrink-0"
                  aria-label="Sluiten"
                >
                  <X strokeWidth={1.75} className="w-4 h-4" />
                </button>
              </div>
              <div className="px-4 py-4 overflow-y-auto max-h-[66vh] flex flex-col gap-2">
                {templates.length === 0 ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-[rgba(253,253,254,0.20)] border-t-[#FDFDFE]" />
                  </div>
                ) : (
                  templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => handleAssignTemplate(tpl.id)}
                      disabled={assigningTemplate !== null}
                      className="w-full rounded-[16px] bg-[rgba(253,253,254,0.05)] px-[16px] py-[13px] text-left transition-colors active:bg-[rgba(253,253,254,0.10)] disabled:opacity-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="inline-flex items-center gap-1.5">
                            <Utensils
                              strokeWidth={1.5}
                              className="w-3.5 h-3.5 text-[rgba(253,253,254,0.62)]"
                            />
                            <p className="text-[14px] font-medium text-[#FDFDFE] truncate">
                              {tpl.title}
                            </p>
                          </div>
                          {tpl.description && (
                            <p className="mt-1 text-[11.5px] text-[rgba(253,253,254,0.55)] line-clamp-2">
                              {tpl.description}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[rgba(253,253,254,0.55)]">
                            <span className="inline-flex items-center gap-1">
                              <span
                                className="inline-block w-[5px] h-[5px] rounded-full"
                                style={{ background: MACRO.calories.dot }}
                                aria-hidden
                              />
                              {tpl.calories_target} kcal
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <span
                                className="inline-block w-[5px] h-[5px] rounded-full"
                                style={{ background: MACRO.protein.dot }}
                                aria-hidden
                              />
                              E{tpl.protein_g}g
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <span
                                className="inline-block w-[5px] h-[5px] rounded-full"
                                style={{ background: MACRO.carbs.dot }}
                                aria-hidden
                              />
                              K{tpl.carbs_g}g
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <span
                                className="inline-block w-[5px] h-[5px] rounded-full"
                                style={{ background: MACRO.fat.dot }}
                                aria-hidden
                              />
                              V{tpl.fat_g}g
                            </span>
                          </div>
                        </div>
                        {assigningTemplate === tpl.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#C0FC01] border-t-transparent shrink-0 mt-1" />
                        ) : (
                          <span className="text-[12px] font-medium text-[#C0FC01] shrink-0 mt-0.5">
                            Kies →
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
