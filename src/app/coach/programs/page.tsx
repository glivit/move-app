'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Plus, Archive, ArchiveRestore } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ProgramTemplate {
  id: string
  name: string
  description: string | null
  duration_weeks: number
  days_per_week: number
  difficulty: string
  tags: string[]
  is_archived: boolean
}

const difficultyLabels: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Gevorderd',
}

const difficultyColors: Record<string, string> = {
  beginner: 'bg-blue-100 text-blue-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  advanced: 'bg-orange-100 text-orange-700',
}

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<ProgramTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const supabase = createClient()

  const fetchPrograms = useCallback(async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('program_templates')
        .select('*')
        .order('created_at', { ascending: false })

      if (!showArchived) {
        query = query.eq('is_archived', false)
      }

      const { data, error } = await query

      if (error) throw error
      setPrograms(data || [])
    } catch (error) {
      console.error('Failed to fetch programs:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase, showArchived])

  useEffect(() => {
    fetchPrograms()
  }, [fetchPrograms])

  const handleArchiveToggle = async (program: ProgramTemplate) => {
    try {
      const { error } = await supabase
        .from('program_templates')
        .update({ is_archived: !program.is_archived })
        .eq('id', program.id)

      if (error) throw error

      setPrograms(
        programs.map((p) =>
          p.id === program.id ? { ...p, is_archived: !p.is_archived } : p
        )
      )
    } catch (error) {
      console.error('Failed to update program:', error)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-[32px] font-display font-semibold text-[#1A1A18] mb-4"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Programma's
          </h1>

          {/* Top Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="w-4 h-4 rounded border border-[#D0D0CC] text-[#8B6914]"
                />
                <span className="text-[15px] text-[#8E8E93]">Gearchiveerde tonen</span>
              </label>
            </div>

            <Link href="/coach/programs/new">
              <Button>
                <Plus strokeWidth={1.5} className="w-5 h-5 mr-2" />
                Nieuw programma
              </Button>
            </Link>
          </div>
        </div>

        {/* Programs Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] p-6 animate-pulse"
              >
                <div className="h-6 bg-[#F0F0ED] rounded w-3/4 mb-3" />
                <div className="h-4 bg-[#F0F0ED] rounded w-full mb-4" />
                <div className="flex gap-2 mb-4">
                  <div className="h-6 bg-[#F0F0ED] rounded-full w-20" />
                  <div className="h-6 bg-[#F0F0ED] rounded-full w-24" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-[#F0F0ED] rounded w-1/2" />
                  <div className="h-3 bg-[#F0F0ED] rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : programs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[15px] text-[#8E8E93] mb-4">
              {showArchived ? 'Geen gearchiveerde programma\'s' : 'Nog geen programma\'s'}
            </p>
            {!showArchived && (
              <Link href="/coach/programs/new">
                <Button variant="secondary">
                  Maak je eerste programma
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {programs.map((program) => (
              <Link key={program.id} href={`/coach/programs/${program.id}`}>
                <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#F0F0ED] p-6 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow cursor-pointer h-full flex flex-col">
                  {/* Header with Archive Button */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-[17px] font-semibold text-[#1A1A18] mb-1">
                        {program.name}
                      </h3>
                      {program.description && (
                        <p className="text-[13px] text-[#8E8E93] line-clamp-2">
                          {program.description}
                        </p>
                      )}
                    </div>

                    {/* Archive Toggle Button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleArchiveToggle(program)
                      }}
                      className="p-2 text-[#8E8E93] hover:text-[#1A1A18] hover:bg-[#F5F0E8] rounded-lg transition-colors ml-2 flex-shrink-0"
                      title={program.is_archived ? 'Archivering opheffen' : 'Archiveren'}
                    >
                      {program.is_archived ? (
                        <ArchiveRestore strokeWidth={1.5} className="w-5 h-5" />
                      ) : (
                        <Archive strokeWidth={1.5} className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {/* Difficulty Badge */}
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                        difficultyColors[program.difficulty] || difficultyColors.beginner
                      }`}
                    >
                      {difficultyLabels[program.difficulty] || program.difficulty}
                    </span>

                    {/* Duration and Frequency */}
                    <span className="text-[11px] bg-[#F5F0E8] text-[#8B6914] font-medium px-2.5 py-1 rounded-full">
                      {program.duration_weeks}w
                    </span>
                    <span className="text-[11px] bg-[#F5F0E8] text-[#8B6914] font-medium px-2.5 py-1 rounded-full">
                      {program.days_per_week}d/w
                    </span>
                  </div>

                  {/* Custom Tags */}
                  {program.tags && program.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {program.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[11px] bg-[#F0F0ED] text-[#8E8E93] px-2.5 py-1 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
