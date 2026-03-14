'use client'

import { CalorieGauge } from '@/components/client/CalorieGauge'
import { MacroRings } from '@/components/client/MacroRings'

interface MacroDashboardProps {
  calories: {
    consumed: number
    target: number
  }
  protein: {
    current: number
    target: number
  }
  carbs: {
    current: number
    target: number
  }
  fat: {
    current: number
    target: number
  }
  meals: number
}

export function MacroDashboard({
  calories,
  protein,
  carbs,
  fat,
  meals,
}: MacroDashboardProps) {
  return (
    <div className="py-4">
      <CalorieGauge
        consumed={calories.consumed}
        target={calories.target}
        meals={meals}
      />
      <div className="mt-6">
        <MacroRings protein={protein} carbs={carbs} fat={fat} />
      </div>
    </div>
  )
}
