'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Archive, ArchiveRestore, Plus } from 'lucide-react'

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

interface ProgramsViewProps {
  initialPrograms: ProgramTemplate[]
}

// ─── Difficulty mapping (v3 Orion tones) ─────────────────────────
// beginner  → lime    (#C0FC01)
// intermediate → amber (#E8A93C)
// advanced  → blue    (#A4C7F2)
const DIFFICULTY: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  beginner: {
    label: 'Beginner',
    color: '#C0FC01',
    bg: 'rgba(192,252,1,0.12)',
  },
  intermediate: {
    label: 'Intermediate',
    color: '#E8A93C',
    bg: 'rgba(232,169,60,0.14)',
  },
  advanced: {
    label: 'Gevorderd',
    color: '#A4C7F2',
    bg: 'rgba(164,199,242,0.14)',
  },
}

function diffKey(d: string): keyof typeof DIFFICULTY {
  if (d in DIFFICULTY) return d as keyof typeof DIFFICULTY
  return 'beginner'
}

/**
 * Coach · Programma's (v3 Orion).
 * Dark cards op canvas, dark-pill "Nieuw programma" CTA, v3 tone chips.
 */
export default function ProgramsView({ initialPrograms }: ProgramsViewProps) {
  const [programs, setPrograms] = useState<ProgramTemplate[]>(initialPrograms)
  const [showArchived, setShowArchived] = useState(false)
  const supabase = createClient()

  const filteredPrograms = useMemo(
    () => (showArchived ? programs : programs.filter((p) => !p.is_archived)),
    [programs, showArchived]
  )

  const activeCount = programs.filter((p) => !p.is_archived).length
  const archivedCount = programs.length - activeCount

  const handleArchiveToggle = async (program: ProgramTemplate) => {
    // Optimistic update
    setPrograms((prev) =>
      prev.map((p) =>
        p.id === program.id ? { ...p, is_archived: !p.is_archived } : p
      )
    )
    try {
      const { error } = await supabase
        .from('program_templates')
        .update({ is_archived: !program.is_archived })
        .eq('id', program.id)
      if (error) throw error
    } catch (error) {
      // Rollback on error
      setPrograms((prev) =>
        prev.map((p) =>
          p.id === program.id ? { ...p, is_archived: program.is_archived } : p
        )
      )
      console.error('Failed to update program:', error)
    }
  }

  return (
    <div className="pb-32">
      {/* Header */}
      <div className="flex items-start justify-between pb-[22px] px-0.5 gap-3">
        <div className="min-w-0">
          <h1
            className="text-[30px] font-light tracking-[-0.025em] leading-[1.1] text-[#FDFDFE]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Programma&apos;s
          </h1>
          <div className="mt-1.5 text-[12px] tracking-[0.04em] text-[rgba(253,253,254,0.62)]">
            {activeCount} {activeCount === 1 ? 'template' : 'templates'}
            {archivedCount > 0 && ` · ${archivedCount} gearchiveerd`}
          </div>
        </div>

        <Link
          href="/coach/programs/new"
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-medium whitespace-nowrap shrink-0 transition-opacity active:opacity-70"
          style={{
            background: '#474B48',
            color: '#FDFDFE',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.10)',
          }}
        >
          <Plus strokeWidth={1.75} className="w-4 h-4" />
          Nieuw programma
        </Link>
      </div>

      {/* Toggle archived */}
      <label className="flex items-center gap-2 mb-4 cursor-pointer select-none px-0.5">
        <span
          className={`inline-flex items-center justify-center w-[18px] h-[18px] rounded-[6px] transition-colors ${
            showArchived ? 'bg-[#C0FC01]' : 'bg-[rgba(253,253,254,0.10)]'
          }`}
        >
          {showArchived && (
            <svg
              viewBox="0 0 24 24"
              className="w-3 h-3"
              stroke="#0A0E0B"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </span>
        <input
          type="checkbox"
          checked={showArchived}
          onChange={(e) => setShowArchived(e.target.checked)}
          className="sr-only"
        />
        <span className="text-[12.5px] text-[rgba(253,253,254,0.72)] tracking-[0.01em]">
          Gearchiveerde tonen
        </span>
      </label>

      {/* Programs list */}
      {filteredPrograms.length === 0 ? (
        <div className="bg-[rgba(71,75,72,0.55)] rounded-[18px] px-6 py-10 text-center">
          <p className="text-[14px] text-[rgba(253,253,254,0.62)] mb-4">
            {showArchived
              ? 'Geen gearchiveerde programma\'s'
              : 'Nog geen programma\'s'}
          </p>
          {!showArchived && (
            <Link
              href="/coach/programs/new"
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-medium bg-[rgba(192,252,1,0.14)] text-[#C0FC01]"
            >
              <Plus strokeWidth={1.75} className="w-3.5 h-3.5" />
              Maak je eerste programma
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredPrograms.map((program) => {
            const d = DIFFICULTY[diffKey(program.difficulty)]
            const isArch = program.is_archived
            const metaParts = [
              d.label,
              `${program.duration_weeks} ${program.duration_weeks === 1 ? 'week' : 'weken'}`,
              `${program.days_per_week}×/week`,
            ]
            return (
              <div
                key={program.id}
                className={`group relative rounded-[18px] px-[18px] py-[16px] transition-colors ${
                  isArch
                    ? 'bg-[rgba(71,75,72,0.45)]'
                    : 'bg-[#474B48] active:bg-[#4d524e]'
                }`}
              >
                <Link
                  href={`/coach/programs/${program.id}`}
                  className="block pr-9"
                >
                  {/* Title */}
                  <h3
                    className={`text-[16px] font-medium tracking-[-0.01em] leading-[1.3] truncate ${
                      isArch
                        ? 'text-[rgba(253,253,254,0.55)]'
                        : 'text-[#FDFDFE]'
                    }`}
                  >
                    {program.name}
                  </h3>

                  {/* Meta line: difficulty dot + plain-text meta with separators */}
                  <div className="mt-[6px] flex items-center gap-[8px] text-[12px] text-[rgba(253,253,254,0.55)] tracking-[0.005em]">
                    <span
                      className="inline-block w-[7px] h-[7px] rounded-full shrink-0"
                      style={{ background: d.color }}
                      aria-hidden
                    />
                    <span className="truncate">
                      {metaParts.join(' · ')}
                    </span>
                  </div>

                  {/* Description — 2-line clamp, muted */}
                  {program.description && (
                    <p
                      className={`mt-[10px] text-[13px] leading-[1.45] tracking-[-0.003em] m-0 ${
                        isArch
                          ? 'text-[rgba(253,253,254,0.38)]'
                          : 'text-[rgba(253,253,254,0.62)]'
                      }`}
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {program.description}
                    </p>
                  )}
                </Link>

                {/* Archive toggle — pinned top-right */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleArchiveToggle(program)
                  }}
                  className="absolute top-[12px] right-[12px] w-8 h-8 rounded-full flex items-center justify-center text-[rgba(253,253,254,0.40)] hover:text-[#FDFDFE] hover:bg-[rgba(253,253,254,0.06)] transition-colors"
                  aria-label={isArch ? 'Archivering opheffen' : 'Archiveren'}
                >
                  {isArch ? (
                    <ArchiveRestore strokeWidth={1.75} className="w-4 h-4" />
                  ) : (
                    <Archive strokeWidth={1.75} className="w-4 h-4" />
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
