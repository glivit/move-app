'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function NewProgramPage() {
  const router = useRouter()
  const supabase = createClient()

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
        })
        .select()

      if (insertError) throw insertError

      if (data && data.length > 0) {
        router.push(`/coach/programs/${data[0].id}`)
      }
    } catch (err) {
      console.error('Failed to create program:', err)
      setError('Fout bij het maken van programma')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/coach/programs" className="inline-flex items-center gap-2 text-[#1A1917] mb-6 hover:text-[#1A1A18] transition-colors">
            <ChevronLeft strokeWidth={1.5} className="w-5 h-5" />
            <span className="text-[15px] font-medium">Terug</span>
          </Link>

          <h1
            className="text-[32px] font-display font-semibold text-[#1A1A18]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Nieuw Programma
          </h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC] p-6">
            {/* Name */}
            <div className="mb-6">
              <label htmlFor="name" className="block text-[13px] font-medium text-[#8E8E93] mb-2">
                Programmanaam <span className="text-error">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="bijv. Fullbody Strength"
                className="w-full px-4 py-3 bg-[#FAFAFA] border border-[#E8E4DC] rounded-2xl text-[15px] text-[#1A1A18] placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#1A1917] focus:bg-white transition-colors"
              />
            </div>

            {/* Description */}
            <div className="mb-6">
              <label
                htmlFor="description"
                className="block text-[13px] font-medium text-[#8E8E93] mb-2"
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
                className="w-full px-4 py-3 bg-[#FAFAFA] border border-[#E8E4DC] rounded-2xl text-[15px] text-[#1A1A18] placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#1A1917] focus:bg-white transition-colors resize-none"
              />
            </div>

            {/* Duration */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label
                  htmlFor="duration_weeks"
                  className="block text-[13px] font-medium text-[#8E8E93] mb-2"
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
                  className="w-full px-4 py-3 bg-[#FAFAFA] border border-[#E8E4DC] rounded-2xl text-[15px] text-[#1A1A18] focus:outline-none focus:ring-2 focus:ring-[#1A1917] focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="days_per_week"
                  className="block text-[13px] font-medium text-[#8E8E93] mb-2"
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
                  className="w-full px-4 py-3 bg-[#FAFAFA] border border-[#E8E4DC] rounded-2xl text-[15px] text-[#1A1A18] focus:outline-none focus:ring-2 focus:ring-[#1A1917] focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Difficulty */}
            <div className="mb-6">
              <label
                htmlFor="difficulty"
                className="block text-[13px] font-medium text-[#8E8E93] mb-2"
              >
                Moeilijkheidsgraad
              </label>
              <select
                id="difficulty"
                name="difficulty"
                value={formData.difficulty}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-[#FAFAFA] border border-[#E8E4DC] rounded-2xl text-[15px] text-[#1A1A18] focus:outline-none focus:ring-2 focus:ring-[#1A1917] focus:bg-white transition-colors"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Gevorderd</option>
              </select>
            </div>

            {/* Tags */}
            <div>
              <label htmlFor="tags" className="block text-[13px] font-medium text-[#8E8E93] mb-2">
                Tags (optioneel)
              </label>
              <input
                type="text"
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="Voer tags in gescheiden door komma's (bijv. 'Bulk, Hypertrophy')"
                className="w-full px-4 py-3 bg-[#FAFAFA] border border-[#E8E4DC] rounded-2xl text-[15px] text-[#1A1A18] placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#1A1917] focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
              <p className="text-[13px] text-red-700">{error}</p>
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
              className="flex-1 bg-[#1A1917] text-white px-6 py-3 rounded-2xl font-medium text-[15px] hover:bg-[#6d5410] focus:outline-none focus:ring-2 focus:ring-[#1A1917] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center"
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
