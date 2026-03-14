'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { createClient } from '@/lib/supabase'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

export interface WorkoutDay {
  day: string
  exercises: WorkoutExercise[]
}

export interface WorkoutExercise {
  id: string
  name: string
  sets: number
  reps: string
  restSeconds: number
  notes?: string
  videoUrl?: string
}

interface ManualProgramFormProps {
  clientId: string
  onSave?: () => void
}

const DAYS_OF_WEEK = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag']

export function ManualProgramForm({ clientId, onSave }: ManualProgramFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [days, setDays] = useState<WorkoutDay[]>([])
  const [expandedDayIndex, setExpandedDayIndex] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const addDay = () => {
    const availableDays = DAYS_OF_WEEK.filter(
      (d) => !days.some((day) => day.day === d)
    )
    if (availableDays.length > 0) {
      setDays([...days, { day: availableDays[0], exercises: [] }])
    }
  }

  const removeDay = (index: number) => {
    setDays(days.filter((_, i) => i !== index))
  }

  const addExercise = (dayIndex: number) => {
    const newDays = [...days]
    newDays[dayIndex].exercises.push({
      id: `ex-${Date.now()}`,
      name: '',
      sets: 3,
      reps: '8-10',
      restSeconds: 90,
      notes: '',
      videoUrl: '',
    })
    setDays(newDays)
  }

  const removeExercise = (dayIndex: number, exerciseIndex: number) => {
    const newDays = [...days]
    newDays[dayIndex].exercises = newDays[dayIndex].exercises.filter(
      (_, i) => i !== exerciseIndex
    )
    setDays(newDays)
  }

  const updateExercise = (
    dayIndex: number,
    exerciseIndex: number,
    field: keyof WorkoutExercise,
    value: string | number
  ) => {
    const newDays = [...days]
    const exercise = newDays[dayIndex].exercises[exerciseIndex]
    if (field === 'sets' || field === 'restSeconds') {
      exercise[field] = Number(value)
    } else {
      exercise[field] = value as string
    }
    setDays(newDays)
  }

  const updateDayName = (index: number, newDay: string) => {
    const newDays = [...days]
    newDays[index].day = newDay
    setDays(newDays)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      if (!title.trim()) {
        setError('Programmanaam is vereist')
        setLoading(false)
        return
      }

      const supabase = createClient()

      // Create program with exercises as JSON in description
      const programContent = {
        weeks: 4,
        days,
      }

      const { data, error: insertError } = await supabase
        .from('programs')
        .insert({
          client_id: clientId,
          title: title.trim(),
          description: description.trim() || JSON.stringify(programContent),
          is_active: true,
        })
        .select()

      if (insertError) {
        setError(`Fout bij opslaan: ${insertError.message}`)
        setLoading(false)
        return
      }

      // Also update description with full content
      if (data && data[0]) {
        await supabase
          .from('programs')
          .update({
            description: JSON.stringify(programContent),
          })
          .eq('id', data[0].id)
      }

      setSuccess(true)
      setTitle('')
      setDescription('')
      setDays([])
      setExpandedDayIndex(null)

      if (onSave) onSave()

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Onbekende fout')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <form onSubmit={handleSave} className="space-y-6">
          {/* Program Details */}
          <div className="space-y-4">
            <Input
              label="Programmanaam"
              placeholder="Bijv. Bovenlichaamssterkte"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
            />
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Beschrijving
              </label>
              <textarea
                placeholder="Voeg programmanotities toe..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                rows={3}
              />
            </div>
          </div>

          {/* Weekly Schedule */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Wekelijks schema</h3>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addDay}
                disabled={loading || days.length >= DAYS_OF_WEEK.length}
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Dag toevoegen
              </Button>
            </div>

            {days.length === 0 ? (
              <div className="text-center py-8 bg-surface-muted rounded-lg">
                <p className="text-text-muted text-sm">Nog geen trainingsdagen toegevoegd</p>
              </div>
            ) : (
              <div className="space-y-2">
                {days.map((day, dayIndex) => (
                  <Card key={dayIndex} padding="sm" variant="muted">
                    <div className="space-y-3">
                      {/* Day Header */}
                      <div className="flex items-center justify-between">
                        <select
                          value={day.day}
                          onChange={(e) => updateDayName(dayIndex, e.target.value)}
                          disabled={loading}
                          className="px-3 py-1.5 rounded-lg bg-surface border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
                        >
                          {DAYS_OF_WEEK.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              setExpandedDayIndex(expandedDayIndex === dayIndex ? null : dayIndex)
                            }
                            disabled={loading}
                          >
                            {expandedDayIndex === dayIndex ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => removeDay(dayIndex)}
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Exercises */}
                      {expandedDayIndex === dayIndex && (
                        <div className="space-y-3 pt-2 border-t border-border">
                          {day.exercises.length === 0 ? (
                            <p className="text-xs text-text-muted italic">Geen oefeningen</p>
                          ) : (
                            day.exercises.map((exercise, exerciseIndex) => (
                              <Card key={exercise.id} padding="sm" variant="default">
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <Input
                                      label="Oefening"
                                      placeholder="Bijv. Bench Press"
                                      value={exercise.name}
                                      onChange={(e) =>
                                        updateExercise(dayIndex, exerciseIndex, 'name', e.target.value)
                                      }
                                      disabled={loading}
                                      className="flex-1"
                                    />
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => removeExercise(dayIndex, exerciseIndex)}
                                      disabled={loading}
                                      className="mt-5"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="block text-xs font-medium text-text-secondary mb-1">
                                        Sets
                                      </label>
                                      <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={exercise.sets}
                                        onChange={(e) =>
                                          updateExercise(dayIndex, exerciseIndex, 'sets', e.target.value)
                                        }
                                        disabled={loading}
                                        className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-text-secondary mb-1">
                                        Reps
                                      </label>
                                      <input
                                        type="text"
                                        placeholder="8-10"
                                        value={exercise.reps}
                                        onChange={(e) =>
                                          updateExercise(dayIndex, exerciseIndex, 'reps', e.target.value)
                                        }
                                        disabled={loading}
                                        className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-xs font-medium text-text-secondary mb-1">
                                      Rustperiode (seconden)
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="15"
                                      value={exercise.restSeconds}
                                      onChange={(e) =>
                                        updateExercise(
                                          dayIndex,
                                          exerciseIndex,
                                          'restSeconds',
                                          e.target.value
                                        )
                                      }
                                      disabled={loading}
                                      className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-medium text-text-secondary mb-1">
                                      Video URL (optioneel)
                                    </label>
                                    <input
                                      type="url"
                                      placeholder="https://..."
                                      value={exercise.videoUrl || ''}
                                      onChange={(e) =>
                                        updateExercise(dayIndex, exerciseIndex, 'videoUrl', e.target.value)
                                      }
                                      disabled={loading}
                                      className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-medium text-text-secondary mb-1">
                                      Notities (optioneel)
                                    </label>
                                    <textarea
                                      placeholder="Bijv. Zware dag, focus op vorm"
                                      value={exercise.notes || ''}
                                      onChange={(e) =>
                                        updateExercise(dayIndex, exerciseIndex, 'notes', e.target.value)
                                      }
                                      disabled={loading}
                                      className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
                                      rows={2}
                                    />
                                  </div>
                                </div>
                              </Card>
                            ))
                          )}

                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => addExercise(dayIndex)}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-1"
                          >
                            <Plus className="h-4 w-4" />
                            Oefening toevoegen
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Messages */}
          {error && (
            <div className="p-4 rounded-lg bg-error/10 border border-error/20">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}
          {success && (
            <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
              <p className="text-sm text-accent">Programma succesvol opgeslagen!</p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={loading}
            disabled={loading || !title.trim()}
          >
            {loading ? 'Opslaan...' : 'Programma opslaan'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
