'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { MacroDashboard } from '@/components/client/MacroDashboard'
import { DayPicker } from '@/components/client/DayPicker'
import { MealCard } from '@/components/client/MealCard'
import { FileText, UtensilsCrossed } from 'lucide-react'

interface Meal {
  name: string
  type: string
  calories: number
  protein: number
  carbs: number
  fat: number
  description?: string
}

interface Day {
  name: string
  meals: Meal[]
}

interface MealPlanContent {
  daily_calories: number
  daily_macros: {
    protein: number
    carbs: number
    fat: number
  }
  days: Day[]
}

interface MealPlan {
  id: string
  title: string
  content: MealPlanContent | null
  pdf_url: string | null
  is_active: boolean
  start_date: string | null
  end_date: string | null
  created_at: string
}

export default function ClientMealPlanPage() {
  const supabase = createClient()
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDayIndex, setSelectedDayIndex] = useState(0)

  useEffect(() => {
    loadMealPlan()
  }, [])

  async function loadMealPlan() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('Je bent niet ingelogd')
        return
      }

      const { data, error: queryError } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('client_id', user.id)
        .eq('is_active', true)
        .single()

      if (queryError && queryError.code !== 'PGRST116') {
        throw queryError
      }

      setMealPlan(data || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meal plan')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-text-primary">Voeding</h1>
        <div className="flex items-center justify-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-text-primary">Voeding</h1>
        <div className="bg-white rounded-2xl px-5 py-4 border border-[#F0F0EE]">
          <p className="text-data-red text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!mealPlan) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-text-primary">Voeding</h1>
        <div className="bg-white rounded-2xl px-5 py-8 border border-[#F0F0EE] text-center">
          <UtensilsCrossed
            size={40}
            strokeWidth={1.5}
            className="text-client-text-muted mx-auto mb-3"
          />
          <p className="text-text-primary font-medium mb-1">
            Je voedingsplan wordt opgesteld door je coach
          </p>
          <p className="text-client-text-secondary text-sm">
            Je ontvangt een bericht zodra het klaar is
          </p>
        </div>
      </div>
    )
  }

  // If no content but has PDF, show PDF card
  if (!mealPlan.content && mealPlan.pdf_url) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Voeding</h1>
          <p className="text-sm text-client-text-secondary mt-1">
            {mealPlan.title}
          </p>
        </div>
        <div className="bg-white rounded-2xl px-5 py-8 border border-[#F0F0EE] text-center">
          <FileText
            size={40}
            strokeWidth={1.5}
            className="text-accent mx-auto mb-3"
          />
          <p className="text-text-primary font-medium mb-4">
            Je voedingsplan is beschikbaar als PDF
          </p>
          <a
            href={mealPlan.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Download Voedingsplan
          </a>
        </div>
      </div>
    )
  }

  // Full meal plan with content
  if (!mealPlan.content || !mealPlan.content.days || mealPlan.content.days.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-text-primary">Voeding</h1>
        <div className="bg-white rounded-2xl px-5 py-4 border border-[#F0F0EE] text-center">
          <p className="text-client-text-secondary text-sm">
            Geen maaltijden ingepland
          </p>
        </div>
      </div>
    )
  }

  const days = mealPlan.content.days
  const selectedDay = days[selectedDayIndex]

  // Calculate totals for selected day
  const dayTotals = {
    calories: selectedDay.meals.reduce((sum, meal) => sum + meal.calories, 0),
    protein: selectedDay.meals.reduce((sum, meal) => sum + meal.protein, 0),
    carbs: selectedDay.meals.reduce((sum, meal) => sum + meal.carbs, 0),
    fat: selectedDay.meals.reduce((sum, meal) => sum + meal.fat, 0),
  }

  const dayNames = days.map((day) => day.name)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Voeding</h1>
        <p className="text-sm text-client-text-secondary mt-1">
          {mealPlan.title}
        </p>
      </div>

      {/* Macro Dashboard */}
      <div className="bg-white rounded-2xl">
        <MacroDashboard
          calories={{
            consumed: dayTotals.calories,
            target: mealPlan.content.daily_calories,
          }}
          protein={{
            current: dayTotals.protein,
            target: mealPlan.content.daily_macros.protein,
          }}
          carbs={{
            current: dayTotals.carbs,
            target: mealPlan.content.daily_macros.carbs,
          }}
          fat={{
            current: dayTotals.fat,
            target: mealPlan.content.daily_macros.fat,
          }}
          meals={selectedDay.meals.length}
        />
      </div>

      {/* Day Picker */}
      <DayPicker
        days={dayNames}
        activeDay={selectedDayIndex}
        onDayChange={setSelectedDayIndex}
      />

      {/* Meals Section */}
      <div>
        <h2 className="text-[15px] font-semibold text-text-primary mb-3">
          Maaltijden
        </h2>
        <div className="space-y-3">
          {selectedDay.meals.map((meal, index) => (
            <MealCard key={index} meal={meal} />
          ))}
        </div>
      </div>
    </div>
  )
}
