'use client'

import { Card } from '@/components/ui/Card'
import { CheckCircle, Clock, TrendingDown, TrendingUp, Minus } from 'lucide-react'

interface TimelineCheckIn {
  id: string
  date: string
  weight_kg: number | null
  body_fat_pct: number | null
  muscle_mass_kg: number | null
  waist_cm: number | null
  coach_reviewed: boolean
  coach_notes: string | null
}

interface Props {
  checkins: TimelineCheckIn[]
}

function Delta({ current, previous, unit, inverse = false }: { current: number | null; previous: number | null; unit: string; inverse?: boolean }) {
  if (current === null || previous === null) return <span className="text-xs text-text-muted">—</span>
  const diff = +(current - previous).toFixed(1)
  if (diff === 0) return <span className="text-xs text-text-muted flex items-center gap-0.5"><Minus className="w-3 h-3" /> 0 {unit}</span>
  const isPositive = diff > 0
  const isGood = inverse ? !isPositive : isPositive
  return (
    <span className={`text-xs flex items-center gap-0.5 ${isGood ? 'text-green-600' : 'text-red-500'}`}>
      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isPositive ? '+' : ''}{diff} {unit}
    </span>
  )
}

export function CheckInTimeline({ checkins }: Props) {
  if (checkins.length === 0) {
    return (
      <div className="text-center py-12 text-text-muted">
        <Clock className="w-8 h-8 mx-auto mb-3 opacity-50" />
        <p className="text-sm">Nog geen check-ins</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {checkins.map((checkin, index) => {
        const prev = index < checkins.length - 1 ? checkins[index + 1] : null
        const dateStr = new Date(checkin.date).toLocaleDateString('nl-BE', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })

        return (
          <Card key={checkin.id} padding="md">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-text-primary">{dateStr}</p>
              </div>
              {checkin.coach_reviewed ? (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle className="w-3.5 h-3.5" /> Beoordeeld
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-amber-600">
                  <Clock className="w-3.5 h-3.5" /> In afwachting
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {checkin.weight_kg !== null && (
                <div>
                  <p className="text-xs text-text-muted">Gewicht</p>
                  <p className="text-sm font-medium">{checkin.weight_kg} kg</p>
                  <Delta current={checkin.weight_kg} previous={prev?.weight_kg ?? null} unit="kg" inverse />
                </div>
              )}
              {checkin.body_fat_pct !== null && (
                <div>
                  <p className="text-xs text-text-muted">Vetpercentage</p>
                  <p className="text-sm font-medium">{checkin.body_fat_pct}%</p>
                  <Delta current={checkin.body_fat_pct} previous={prev?.body_fat_pct ?? null} unit="%" inverse />
                </div>
              )}
              {checkin.muscle_mass_kg !== null && (
                <div>
                  <p className="text-xs text-text-muted">Spiermassa</p>
                  <p className="text-sm font-medium">{checkin.muscle_mass_kg} kg</p>
                  <Delta current={checkin.muscle_mass_kg} previous={prev?.muscle_mass_kg ?? null} unit="kg" />
                </div>
              )}
              {checkin.waist_cm !== null && (
                <div>
                  <p className="text-xs text-text-muted">Taille</p>
                  <p className="text-sm font-medium">{checkin.waist_cm} cm</p>
                  <Delta current={checkin.waist_cm} previous={prev?.waist_cm ?? null} unit="cm" inverse />
                </div>
              )}
            </div>

            {checkin.coach_notes && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-text-muted mb-1">Coach notities</p>
                <p className="text-sm text-text-primary">{checkin.coach_notes}</p>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
