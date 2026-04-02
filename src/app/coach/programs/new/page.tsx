'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ProgramTemplate {
  id: string
  name: string
  description: string | null
  duration_weeks: number
  days_per_week: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  tags: string[] | null
  is_system_template: boolean
  is_archived: boolean
}

export default function NewProgramPage() {
  const router = useRouter()
  const supabase = createClient()

  const [templates, setTemplates] = useState<ProgramTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [templatesLoading, setTemplatesLoading] = useState(true)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration_weeks: 8,
    days_per_week: 4,
    difficulty: 'intermediate' as 'beginner' | 'intermediate' | 'advanced',
    tags: '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch system templates on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setTemplatesLoading(true)
        const { data, error: fetchError } = await supabase
          .from('program_templates')
          .select('*')
          .eq('is_system_template', true)
          .eq('is_archived', false)
          .order('name')

        if (fetchError) throw fetchError

        setTemplates(data || [])
      } catch (err) {
        console.error('Failed to fetch templates:', err)
      } finally {
        setTemplatesLoading(false)
      }
    }

    fetchTemplates()
  }, [supabase])

  // Handle template selection
  const handleSelectTemplate = (template: ProgramTemplate) => {
    setSelectedTemplateId(template.id)
    setFormData({
      name: template.name,
      description: template.description || '',
      duration_weeks: template.duration_weeks,
      days_per_week: template.days_per_week,
      difficulty: template.difficulty,
      tags: template.tags ? template.tags.join(', ') : '',
    })
    setError(null)
  }

  // Handle form input change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'duration_weeks' || name === 'days_per_week'
          ? parseInt(value) || 0
          : value,
    }))
  }

  // Clone template days and exercises
  const cloneTemplateContent = async (
    templateId: string,
    newProgramId: string
  ): Promise<void> => {
    // Fetch template days with their exercises
    const { data: templateDays, error: daysError } = await supabase
      .from('program_template_days')
      .select('*, program_template_exercises(*)')
      .eq('template_id', templateId)

    if (daysError) throw daysError

    if (!templateDays || templateDays.length === 0) return

    // Clone each day and its exercises
    for (const templateDay of templateDays) {
      const { exercises, ...dayData } = templateDay
      const newDayData = {
        ...dayData,
        program_id: newProgramId,
        template_id: undefined,
      }

      const { data: newDay, error: dayInsertError } = await supabase
        .from('program_days')
        .insert(newDayData)
        .select()

      if (dayInsertError) throw dayInsertError

      if (newDay && newDay.length > 0) {
        const newDayId = newDay[0].id

        // Clone exercises for this day
        if (exercises && exercises.length > 0) {
          const newExercises = exercises.map((exercise: any) => ({
            ...exercise,
            day_id: newDayId,
            template_exercise_id: undefined,
          }))

          const { error: exerciseInsertError } = await supabase
            .from('program_exercises')
            .insert(newExercises)

          if (exerciseInsertError) throw exerciseInsertError
        }
      }
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      setError('Programmanaam is verplicht')
      return
    }

    if (formData.duration_weeks < 1) {
      setError('Duur moet minimaal 1 week zijn')
      return
    }

    if (formData.days_per_week < 1) {
      setError('Minimaal 1 dag per week nodig')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const tags = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)

      const { data, error: insertError } = await supabase
        .from('program_templates')
        .insert({
          name: formData.name,
          description: formData.description || null,
          duration_weeks: formData.duration_weeks,
          days_per_week: formData.days_per_week,
          difficulty: formData.difficulty,
          tags: tags,
          is_archived: false,
          is_system_template: false,
        })
        .select()

      if (insertError) throw insertError

      if (data && data.length > 0) {
        const newProgramId = data[0].id

        // If template was selected, clone its days and exercises
        if (selectedTemplateId) {
          await cloneTemplateContent(selectedTemplateId, newProgramId)
        }

        router.push(`/coach/programs/${newProgramId}`)
      }
    } catch (err) {
      console.error('Failed to create program:', err)
      setError('Fout bij het maken van programma')
    } finally {
      setLoading(false)
    }
  }

  const getDifficultyLabel = (difficulty: string): string => {
    const labels: { [key: string]: string } = {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Gevorderd',
    }
    return labels[difficulty] || difficulty
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/coach/programs" className="inline-flex items-center gap-2 text-[#1A1917] mb-6 hover:text-[#1A1917] transition-colors opacity-70 hover:opacity-100">
            <ChevronLeft strokeWidth={1.5} className="w-5 h-5" />
            <span className="text-[15px] font-medium" style={{ fontFamily: 'var(--font-body)' }}>
              Terug
            </span>
          </Link>

          <h1
            className="text-[32px] font-semibold text-[#1A1917]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Nieuw Programma
          </h1>
        </div>

        {/* Template Picker Section */}
        <div className="mb-8">
          <label
            className="block text-[12px] font-medium text-[#B0B0B0] uppercase mb-6"
            style={{
              fontFamily: 'var(--font-body)',
              letterSpacing: '1.5px',
            }}
          >
            Start vanuit template
          </label>

          {templatesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#1A1917]" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 mb-8">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleSelectTemplate(template)}
                  className={`p-4 rounded-2xl border-2 transition-all text-left ${
                    selectedTemplateId === template.id
                      ? 'border-[#D46A3A] bg-[#FFF9F6]'
                      : 'border-[#F0F0EE] bg-white hover:border-[#E0E0DE]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3
                      className="text-[15px] font-medium text-[#1A1917]"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {template.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[12px] px-2.5 py-1 rounded-full bg-[#F0F0EE] text-[#1A1917]"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {getDifficultyLabel(template.difficulty)}
                    </span>
                    <span
                      className="text-[12px] text-[#ACACAC]"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {template.days_per_week}d • {template.duration_weeks}w
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 border-t border-[#F0F0EE]" />
            <span
              className="text-[12px] text-[#B0B0B0]"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              of begin leeg
            </span>
            <div className="flex-1 border-t border-[#F0F0EE]" />
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div
            className="bg-white rounded-2xl border border-[#F0F0EE] p-6"
            style={{
              fontFamily: 'var(--font-body)',
            }}
          >
            {/* Name */}
            <div className="mb-6">
              <label
                htmlFor="name"
                className="block text-[13px] font-medium text-[#B0B0B0] mb-2"
              >
                Programmanaam <span className="text-[#D46A3A]">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="bijv. Fullbody Strength"
                className="w-full px-4 py-3 bg-white border border-[#F0F0EE] rounded-2xl text-[15px] text-[#1A1917] placeholder:text-[#C0C0C0] focus:outline-none focus:ring-2 focus:ring-[#D46A3A] focus:ring-offset-1 transition-all"
              />
            </div>

            {/* Description */}
            <div className="mb-6">
              <label
                htmlFor="description"
                className="block text-[13px] font-medium text-[#B0B0B0] mb-2"
              >
                Beschrijving (optioneel)
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Beschrijf het doel en focus van dit programma..."
                rows={4}
                className="w-full px-4 py-3 bg-white border border-[#F0F0EE] rounded-2xl text-[15px] text-[#1A1917] placeholder:text-[#C0C0C0] focus:outline-none focus:ring-2 focus:ring-[#D46A3A] focus:ring-offset-1 transition-all resize-none"
              />
            </div>

            {/* Duration */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label
                  htmlFor="duration_weeks"
                  className="block text-[13px] font-medium text-[#B0B0B0] mb-2"
                >
                  Duur (weken)
                </label>
                <input
                  type="number"
                  id="duration_weeks"
                  name="duration_weeks"
                  min="1"
                  value={formData.duration_weeks}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white border border-[#F0F0EE] rounded-2xl text-[15px] text-[#1A1917] focus:outline-none focus:ring-2 focus:ring-[#D46A3A] focus:ring-offset-1 transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="days_per_week"
                  className="block text-[13px] font-medium text-[#B0B0B0] mb-2"
                >
                  Dagen per week
                </label>
                <input
                  type="number"
                  id="days_per_week"
                  name="days_per_week"
                  min="1"
                  value={formData.days_per_week}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white border border-[#F0F0EE] rounded-2xl text-[15px] text-[#1A1917] focus:outline-none focus:ring-2 focus:ring-[#D46A3A] focus:ring-offset-1 transition-all"
                />
              </div>
            </div>

            {/* Difficulty */}
            <div className="mb-6">
              <label
                htmlFor="difficulty"
                className="block text-[13px] font-medium text-[#B0B0B0] mb-2"
              >
                Moeilijkheidsgraad
              </label>
              <select
                id="difficulty"
                name="difficulty"
                value={formData.difficulty}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white border border-[#F0F0EE] rounded-2xl text-[15px] text-[#1A1917] focus:outline-none focus:ring-2 focus:ring-[#D46A3A] focus:ring-offset-1 transition-all"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Gevorderd</option>
              </select>
            </div>

            {/* Tags */}
            <div>
              <label
                htmlFor="tags"
                className="block text-[13px] font-medium text-[#B0B0B0] mb-2"
              >
                Tags (optioneel)
              </label>
              <input
                type="text"
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="Voer tags in gescheiden door komma's (bijv. 'Bulk, Hypertrophy')"
                className="w-full px-4 py-3 bg-white border border-[#F0F0EE] rounded-2xl text-[15px] text-[#1A1917] placeholder:text-[#C0C0C0] focus:outline-none focus:ring-2 focus:ring-[#D46A3A] focus:ring-offset-1 transition-all"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-[#FEF2F0] border border-[#F4D4CA] rounded-2xl">
              <p className="text-[13px] text-[#C85A34]" style={{ fontFamily: 'var(--font-body)' }}>
                {error}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Link href="/coach/programs" className="flex-1">
              <Button variant="secondary" fullWidth>
                Annuleren
              </Button>
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#1A1917] text-white px-6 py-3 rounded-2xl font-medium text-[15px] hover:bg-[#2d2520] focus:outline-none focus:ring-2 focus:ring-[#D46A3A] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {loading ? 'Maken...' : 'Programma maken'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
