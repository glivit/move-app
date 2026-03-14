'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { ChevronDown } from 'lucide-react'

interface Macro {
  cal?: number
  protein?: number
  carbs?: number
  fat?: number
}

interface Meal {
  type: string
  name: string
  description: string
  macros?: Macro
}

interface Day {
  day: string
  meals: Meal[]
}

interface MealPlanViewProps {
  content: {
    days: Day[]
  }
}

const MACRO_COLORS: Record<string, string> = {
  cal: 'bg-orange-100 text-orange-700',
  protein: 'bg-blue-100 text-blue-700',
  carbs: 'bg-purple-100 text-purple-700',
  fat: 'bg-pink-100 text-pink-700',
}

const MACRO_LABELS: Record<string, string> = {
  cal: 'kcal',
  protein: 'g protein',
  carbs: 'g koolh.',
  fat: 'g vet',
}

export function MealPlanView({ content }: MealPlanViewProps) {
  const [expandedDay, setExpandedDay] = useState(0)

  if (!content.days || content.days.length === 0) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-text-secondary text-sm">Geen maaltijden ingepland</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {content.days.map((day: Day, index: number) => (
        <Card
          key={day.day}
          padding="md"
          variant={expandedDay === index ? 'elevated' : 'default'}
          className="transition-all cursor-pointer"
        >
          <button
            onClick={() => setExpandedDay(expandedDay === index ? -1 : index)}
            className="w-full flex items-center justify-between gap-3 text-left"
          >
            <div>
              <h3 className="font-semibold text-text-primary">{day.day}</h3>
              <p className="text-xs text-text-muted mt-1">
                {day.meals.length} {day.meals.length === 1 ? 'maaltijd' : 'maaltijden'}
              </p>
            </div>
            <ChevronDown
              className={`h-5 w-5 text-text-muted transition-transform duration-200 flex-shrink-0 ${
                expandedDay === index ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Expanded content */}
          {expandedDay === index && (
            <div className="mt-4 pt-4 border-t border-border space-y-4">
              {day.meals.map((meal: Meal, mealIndex: number) => (
                <div key={mealIndex} className="bg-surface-muted rounded-lg p-4">
                  {/* Meal header with type and name */}
                  <div className="mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-accent-dark bg-accent/20 px-2 py-1 rounded">
                        {meal.type}
                      </span>
                    </div>
                    <h4 className="text-base font-semibold text-text-primary">{meal.name}</h4>
                  </div>

                  {/* Description */}
                  {meal.description && (
                    <p className="text-sm text-text-secondary mb-3">{meal.description}</p>
                  )}

                  {/* Macros */}
                  {meal.macros && Object.keys(meal.macros).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(meal.macros).map(([key, value]) => {
                        if (value === undefined || value === null) return null
                        const colorClass = MACRO_COLORS[key] || 'bg-gray-100 text-gray-700'
                        const label = MACRO_LABELS[key] || key
                        return (
                          <span key={key} className={`text-xs font-medium px-2.5 py-1 rounded-full ${colorClass}`}>
                            {value} {label}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}

      {/* Daily Summary */}
      <div className="grid grid-cols-7 gap-2 mt-8">
        {content.days.map((day: Day, index: number) => {
          const dailyCalories = day.meals.reduce((sum: number, meal: Meal) => {
            return sum + (meal.macros?.cal || 0)
          }, 0)

          return (
            <div
              key={day.day}
              onClick={() => setExpandedDay(expandedDay === index ? -1 : index)}
              className={`p-3 rounded-lg text-center cursor-pointer transition-all ${
                expandedDay === index
                  ? 'bg-accent/20 border border-accent'
                  : 'bg-surface-muted border border-border hover:border-accent'
              }`}
            >
              <p className="text-xs font-bold text-text-primary mb-1">{day.day.slice(0, 2)}</p>
              {dailyCalories > 0 && (
                <p className="text-sm font-semibold text-accent-dark">{dailyCalories} kcal</p>
              )}
              <p className="text-xs text-text-muted mt-1">
                {day.meals.length} {day.meals.length === 1 ? 'meal' : 'meals'}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
