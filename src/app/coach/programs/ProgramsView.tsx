'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Plus, Archive, ArchiveRestore } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export interface ProgramTemplate {
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

interface ProgramsViewProps {
  initialPrograms: ProgramTemplate[]
}

export default function ProgramsView({ initialPrograms }: ProgramsViewProps) {
  const [programs, setPrograms] = useState<ProgramTemplate[]>(initialPrograms)
  const [showArchived, setShowArchived] = useState(false)
  const supabase = createClient()

  const filteredPrograms = showArchived
    ? programs
    : programs.filter((p) => !p.is_archived)

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
            Programma&apos;s
          </h1>

          {/* Top Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="w-4 h-4 rounded border border-[#D0D0CC] text-[#1A1917]"
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
        {filteredPrograms.length === 0 ? (
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
            {filteredPrograms.map((program) => (
              <Link key={program.id} href={`/coach/programs/${program.id}`}>
                <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E8E4DC] p-6 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow cursor-pointer h-full flex flex-col">
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
                      className="p-2 text-[#8E8E93] hover:text-[#1A1A18] hover:bg-[#EDEAE4] rounded-lg transition-colors ml-2 flex-shrink-0"
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
                    <span className="text-[11px] bg-[#EDEAE4] text-[#1A1917] font-medium px-2.5 py-1 rounded-full">
                      {program.duration_weeks}w
                    </span>
                    <span className="text-[11px] bg-[#EDEAE4] text-[#1A1917] font-medium px-2.5 py-1 rounded-full">
                      {program.days_per_week}d/w
                    </span>
                  </div>

                  {/* Custom Tags */}
                  {program.tags && program.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {program.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[11px] bg-[#E8E4DC] text-[#8E8E93] px-2.5 py-1 rounded-full"
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
