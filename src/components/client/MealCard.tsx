'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface MealCardProps {
  meal: {
    name: string
    type: string
    calories: number
    protein: number
    carbs: number
    fat: number
    description?: string
  }
}

const MEAL_TYPE_EMOJI: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
}

export function MealCard({ meal }: MealCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const emoji = MEAL_TYPE_EMOJI[meal.type] || '🍽️'

  // Parse description into ingredients
  const ingredients = meal.description
    ? meal.description
        .split(/[,\n]/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    : []

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-clean">
      {/* Header - always visible, clickable */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-client-surface-muted transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{emoji}</span>
          <span className="font-semibold text-[15px] text-text-primary">
            {meal.name}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[15px] font-medium text-accent-dark">
            {Math.round(meal.calories)} kcal
          </span>
          <ChevronDown
            size={20}
            strokeWidth={1.5}
            className={`text-client-text-secondary transition-transform duration-300 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* Macro pills - always visible */}
      <div className="px-5 pb-3 flex gap-1.5">
        <div className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FF9500]/15 text-[#FF9500]">
          {Math.round(meal.protein)}g
        </div>
        <div className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FF3B30]/15 text-[#FF3B30]">
          {Math.round(meal.carbs)}g
        </div>
        <div className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#AF52DE]/15 text-[#AF52DE]">
          {Math.round(meal.fat)}g
        </div>
      </div>

      {/* Expanded section - ingredients */}
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isExpanded ? 'max-h-96' : 'max-h-0'
        }`}
      >
        {ingredients.length > 0 && (
          <div className="bg-client-surface-muted px-5 py-4 border-t border-client-border">
            <ul className="space-y-2">
              {ingredients.map((ingredient, index) => (
                <li
                  key={index}
                  className="text-[14px] text-text-secondary flex items-start gap-2"
                >
                  <span className="mt-1">•</span>
                  <span>{ingredient}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
