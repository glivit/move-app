'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Plus, Trash2, Upload } from 'lucide-react'

interface Macro {
  cal?: number
  protein?: number
  carbs?: number
  fat?: number
}

interface Meal {
  type: 'Ontbijt' | 'Lunch' | 'Avondeten' | 'Tussendoortje'
  name: string
  description: string
  macros?: Macro
}

interface Day {
  day: string
  meals: Meal[]
}

interface MealPlanFormProps {
  clientId: string
  onSave: () => void
}

const DAYS = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag']
const MEAL_TYPES: Array<'Ontbijt' | 'Lunch' | 'Avondeten' | 'Tussendoortje'> = ['Ontbijt', 'Lunch', 'Avondeten', 'Tussendoortje']

export function MealPlanForm({ clientId, onSave }: MealPlanFormProps) {
  const supabase = createClient()

  const [formType, setFormType] = useState<'builder' | 'pdf'>('builder')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [validFrom, setValidFrom] = useState('')
  const [validUntil, setValidUntil] = useState('')

  // Builder state
  const [days, setDays] = useState<Day[]>(DAYS.map((day) => ({ day, meals: [] })))

  // PDF state
  const [pdfFile, setPdfFile] = useState<File | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addMeal(dayIndex: number, mealType: 'Ontbijt' | 'Lunch' | 'Avondeten' | 'Tussendoortje') {
    const newDays = [...days]
    newDays[dayIndex].meals.push({
      type: mealType,
      name: '',
      description: '',
    })
    setDays(newDays)
  }

  function removeMeal(dayIndex: number, mealIndex: number) {
    const newDays = [...days]
    newDays[dayIndex].meals.splice(mealIndex, 1)
    setDays(newDays)
  }

  function updateMeal(dayIndex: number, mealIndex: number, updates: Partial<Meal>) {
    const newDays = [...days]
    newDays[dayIndex].meals[mealIndex] = {
      ...newDays[dayIndex].meals[mealIndex],
      ...updates,
    }
    setDays(newDays)
  }

  function updateMacro(dayIndex: number, mealIndex: number, key: keyof Macro, value: number | null) {
    const newDays = [...days]
    const meal = newDays[dayIndex].meals[mealIndex]
    if (!meal.macros) meal.macros = {}
    if (value === null) {
      delete meal.macros[key]
    } else {
      meal.macros[key] = value
    }
    setDays(newDays)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Titel is verplicht')
      return
    }

    try {
      setLoading(true)

      let pdfUrl = null

      // Upload PDF if provided
      if (formType === 'pdf' && pdfFile) {
        const fileName = `${clientId}/${Date.now()}_${pdfFile.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('meal_plans')
          .upload(fileName, pdfFile)

        if (uploadError) throw uploadError
        pdfUrl = supabase.storage.from('meal_plans').getPublicUrl(uploadData.path).data.publicUrl
      }

      // Prepare content based on form type
      const content = formType === 'builder' ? { days } : null

      // Save to database
      const { data, error: dbError } = await supabase
        .from('meal_plans')
        .insert({
          client_id: clientId,
          title: title.trim(),
          description: description.trim() || null,
          content,
          pdf_url: pdfUrl,
          is_active: false,
          valid_from: validFrom || null,
          valid_until: validUntil || null,
        })
        .select()

      if (dbError) throw dbError

      // Automatically activate if it's the first plan
      if (data && data.length > 0) {
        const { data: existingPlans } = await supabase
          .from('meal_plans')
          .select('id, is_active')
          .eq('client_id', clientId)

        const hasActivePlan = existingPlans?.some((p) => p.is_active)
        if (!hasActivePlan) {
          await supabase.from('meal_plans').update({ is_active: true }).eq('id', data[0].id)
        }
      }

      onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving meal plan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-error/10 border border-error rounded-lg text-error text-sm">{error}</div>
      )}

      {/* Title and Description */}
      <div className="space-y-4">
        <Input label="Titel" value={title} onChange={(e) => setTitle(e.target.value)} required />

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">Beschrijving</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Bijv. Voedingsplan voor massafase..."
            rows={3}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            type="date"
            label="Geldig van"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
          />
          <Input
            type="date"
            label="Geldig tot"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
          />
        </div>
      </div>

      {/* Form Type Toggle */}
      <div className="flex gap-4 border-b border-border pb-4">
        <button
          type="button"
          onClick={() => setFormType('builder')}
          className={`px-4 py-2 font-medium transition-colors ${
            formType === 'builder'
              ? 'text-accent-dark border-b-2 border-accent'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Plan opbouwen
        </button>
        <button
          type="button"
          onClick={() => setFormType('pdf')}
          className={`px-4 py-2 font-medium transition-colors ${
            formType === 'pdf'
              ? 'text-accent-dark border-b-2 border-accent'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          PDF upload
        </button>
      </div>

      {/* Builder */}
      {formType === 'builder' && (
        <div className="space-y-4">
          {days.map((dayData, dayIndex) => (
            <Card key={dayData.day} padding="md" variant="muted">
              <h3 className="font-semibold text-text-primary mb-3">{dayData.day}</h3>

              <div className="space-y-3">
                {dayData.meals.map((meal, mealIndex) => (
                  <div key={`${dayIndex}-${mealIndex}`} className="bg-surface rounded-lg p-3 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <select
                            value={meal.type}
                            onChange={(e) =>
                              updateMeal(dayIndex, mealIndex, {
                                type: e.target.value as 'Ontbijt' | 'Lunch' | 'Avondeten' | 'Tussendoortje',
                              })
                            }
                            className="px-3 py-1.5 bg-surface-muted border border-border rounded text-sm font-medium"
                          >
                            {MEAL_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                          <span className="text-xs text-text-muted">
                            {meal.name ? `— ${meal.name}` : ''}
                          </span>
                        </div>

                        <input
                          type="text"
                          placeholder="Maalnaam"
                          value={meal.name}
                          onChange={(e) => updateMeal(dayIndex, mealIndex, { name: e.target.value })}
                          className="w-full px-2 py-1.5 border border-border rounded text-sm bg-white"
                        />

                        <input
                          type="text"
                          placeholder="Beschrijving (ingrediënten, bereiding...)"
                          value={meal.description}
                          onChange={(e) => updateMeal(dayIndex, mealIndex, { description: e.target.value })}
                          className="w-full px-2 py-1.5 border border-border rounded text-sm bg-white"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeMeal(dayIndex, mealIndex)}
                        className="p-2 text-text-muted hover:text-error transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Macros */}
                    <details className="text-xs text-text-secondary">
                      <summary className="cursor-pointer font-medium hover:text-text-primary">
                        Macronutriënten (optioneel)
                      </summary>
                      <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-border">
                        <input
                          type="number"
                          placeholder="Cal"
                          value={meal.macros?.cal ?? ''}
                          onChange={(e) =>
                            updateMacro(dayIndex, mealIndex, 'cal', e.target.value ? parseInt(e.target.value) : null)
                          }
                          className="px-2 py-1 border border-border rounded text-xs bg-white"
                        />
                        <input
                          type="number"
                          placeholder="Protein"
                          value={meal.macros?.protein ?? ''}
                          onChange={(e) =>
                            updateMacro(dayIndex, mealIndex, 'protein', e.target.value ? parseInt(e.target.value) : null)
                          }
                          className="px-2 py-1 border border-border rounded text-xs bg-white"
                        />
                        <input
                          type="number"
                          placeholder="Carbs"
                          value={meal.macros?.carbs ?? ''}
                          onChange={(e) =>
                            updateMacro(dayIndex, mealIndex, 'carbs', e.target.value ? parseInt(e.target.value) : null)
                          }
                          className="px-2 py-1 border border-border rounded text-xs bg-white"
                        />
                        <input
                          type="number"
                          placeholder="Vet"
                          value={meal.macros?.fat ?? ''}
                          onChange={(e) =>
                            updateMacro(dayIndex, mealIndex, 'fat', e.target.value ? parseInt(e.target.value) : null)
                          }
                          className="px-2 py-1 border border-border rounded text-xs bg-white"
                        />
                      </div>
                    </details>
                  </div>
                ))}
              </div>

              {/* Add Meal Buttons */}
              <div className="mt-3 flex flex-wrap gap-2">
                {MEAL_TYPES.filter(
                  (type) => !dayData.meals.some((m) => m.type === type)
                ).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addMeal(dayIndex, type)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white border border-accent text-accent-dark rounded hover:bg-accent/5 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    {type}
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* PDF Upload */}
      {formType === 'pdf' && (
        <Card padding="md" variant="muted">
          <label className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-accent transition-colors">
            <div className="text-center">
              <Upload className="h-8 w-8 mx-auto text-text-muted mb-2" />
              <p className="text-sm font-medium text-text-primary">PDF uploaden</p>
              <p className="text-xs text-text-muted mt-1">Klik om een PDF te selecteren</p>
            </div>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              className="hidden"
              required
            />
          </label>
          {pdfFile && (
            <div className="mt-3 flex items-center justify-between bg-accent/10 px-3 py-2 rounded">
              <span className="text-sm text-accent-dark font-medium">{pdfFile.name}</span>
              <button
                type="button"
                onClick={() => setPdfFile(null)}
                className="text-accent-dark hover:text-accent"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </Card>
      )}

      {/* Submit Button */}
      <div className="flex gap-3">
        <Button type="submit" variant="primary" loading={loading} disabled={loading}>
          Plan opslaan
        </Button>
      </div>
    </form>
  )
}
