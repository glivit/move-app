'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Clock, Dumbbell, CheckCircle2, Circle, ExternalLink } from 'lucide-react'

export interface Exercise {
  id: string
  name: string
  sets: number
  reps: string
  restSeconds: number
  notes?: string
  videoUrl?: string
}

export interface WorkoutDay {
  day: string
  exercises: Exercise[]
}

interface ProgramViewProps {
  title: string
  days: WorkoutDay[]
  programId?: string
}

export function ProgramView({ title, days, programId }: ProgramViewProps) {
  const [completedDays, setCompletedDays] = useState<Set<string>>(new Set())

  const toggleDayCompleted = (day: string) => {
    const newCompleted = new Set(completedDays)
    if (newCompleted.has(day)) {
      newCompleted.delete(day)
    } else {
      newCompleted.add(day)
    }
    setCompletedDays(newCompleted)
  }

  if (!days || days.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <Dumbbell className="h-12 w-12 text-text-muted mx-auto mb-3 opacity-50" />
          <p className="text-text-muted">Geen trainingsschema beschikbaar</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Program Title */}
      <div>
        <h2 className="text-2xl font-display font-semibold text-text-primary">{title}</h2>
        <p className="text-sm text-text-muted mt-1">Wekelijks trainingsschema</p>
      </div>

      {/* Days Grid */}
      <div className="space-y-4">
        {days.map((day, dayIndex) => {
          const isCompleted = completedDays.has(day.day)

          return (
            <Card
              key={dayIndex}
              padding="md"
              className={`transition-all ${isCompleted ? 'bg-accent/5 border-accent/30' : ''}`}
            >
              <div className="space-y-4">
                {/* Day Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-text-primary">{day.day}</h3>
                    <p className="text-sm text-text-muted mt-1">
                      {day.exercises.length} oefening
                      {day.exercises.length !== 1 ? 'en' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleDayCompleted(day.day)}
                    className="p-2 rounded-lg hover:bg-surface-muted transition-colors flex-shrink-0"
                    aria-label={
                      isCompleted ? 'Mark as incomplete' : 'Mark as complete'
                    }
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-6 w-6 text-accent" />
                    ) : (
                      <Circle className="h-6 w-6 text-text-muted" />
                    )}
                  </button>
                </div>

                {/* Exercises */}
                <div className="space-y-3 pt-2 border-t border-border">
                  {day.exercises.map((exercise, exIndex) => (
                    <div key={exercise.id} className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-text-primary flex items-center gap-2">
                            <span className="text-xs font-semibold text-accent bg-accent/10 px-2.5 py-1 rounded">
                              {exIndex + 1}
                            </span>
                            {exercise.name}
                          </h4>
                        </div>
                        {exercise.videoUrl && (
                          <a
                            href={exercise.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg hover:bg-surface-muted transition-colors flex-shrink-0"
                            aria-label="Watch video"
                          >
                            <ExternalLink className="h-4 w-4 text-text-muted hover:text-accent" />
                          </a>
                        )}
                      </div>

                      {/* Exercise Details */}
                      <div className="ml-9 space-y-1">
                        <div className="flex items-center gap-4 text-sm text-text-secondary">
                          <div className="flex items-center gap-1">
                            <Dumbbell className="h-4 w-4 text-text-muted" />
                            <span>{exercise.sets} sets × {exercise.reps} reps</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-text-muted" />
                            <span>{Math.round(exercise.restSeconds / 60)}m rest</span>
                          </div>
                        </div>

                        {exercise.notes && (
                          <p className="text-sm text-text-muted italic ml-5">
                            💡 {exercise.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Video Links */}
                {day.exercises.some((ex) => ex.videoUrl) && (
                  <div className="pt-2 border-t border-border flex flex-wrap gap-2">
                    {day.exercises
                      .filter((ex) => ex.videoUrl)
                      .map((ex) => (
                        <a
                          key={ex.id}
                          href={ex.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-muted hover:bg-surface-muted/80 transition-colors text-xs font-medium text-text-secondary hover:text-accent"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Video: {ex.name}
                        </a>
                      ))}
                  </div>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Summary */}
      <Card padding="sm" variant="muted">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-secondary">
              {completedDays.size} van {days.length} dagen afgerond
            </p>
            <div className="w-full bg-surface rounded-full h-2 mt-2">
              <div
                className="bg-accent h-2 rounded-full transition-all"
                style={{
                  width: `${(completedDays.size / days.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
