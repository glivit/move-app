'use client'

import Link from 'next/link'
import { ExerciseMedia } from '@/components/ExerciseMedia'

interface ExerciseCardProps {
  id: string
  name: string
  name_nl?: string
  body_part: string
  target_muscle: string
  equipment: string
  gif_url?: string
}

const bodyPartLabels: Record<string, string> = {
  chest: 'Borst',
  back: 'Rug',
  shoulders: 'Schouders',
  arms: 'Armen',
  legs: 'Benen',
  core: 'Kern',
  cardio: 'Cardio',
  neck: 'Nek',
}

const bodyPartColors: Record<string, string> = {
  chest: '#9B7B2E',
  back: '#3068C4',
  shoulders: '#8B6914',
  arms: '#C47D15',
  legs: '#3D8B5C',
  core: '#C04B37',
  cardio: '#9B7B2E',
}

export function ExerciseCard({
  id,
  name,
  name_nl,
  body_part,
  target_muscle,
  equipment,
  gif_url,
}: ExerciseCardProps) {
  const partColor = bodyPartColors[body_part?.toLowerCase()] || '#9B7B2E'
  const partLabel = bodyPartLabels[body_part?.toLowerCase()] || body_part

  return (
    <Link href={`/coach/exercises/${id}`}>
      <div className="bg-white rounded-2xl border border-[#F0F0ED] overflow-hidden hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-200 cursor-pointer h-full flex flex-col">
        {/* Media area */}
        <ExerciseMedia
          name={name}
          nameNl={name_nl}
          bodyPart={body_part}
          targetMuscle={target_muscle}
          equipment={equipment}
          gifUrl={gif_url}
          variant="card"
          showLabels={false}
        />

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="text-[15px] font-medium text-[#1A1917] mb-3 line-clamp-2 tracking-[-0.01em]">
            {name_nl || name.charAt(0).toUpperCase() + name.slice(1)}
          </h3>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            <span
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full text-white"
              style={{ backgroundColor: partColor }}
            >
              {partLabel}
            </span>

            {equipment && (
              <span className="bg-[#F5F2ED] text-[#5C5A55] text-[11px] font-medium px-2.5 py-1 rounded-full">
                {equipment.charAt(0).toUpperCase() + equipment.slice(1)}
              </span>
            )}
          </div>

          {/* Target Muscle */}
          {target_muscle && (
            <p className="text-[13px] text-[#9C9A95] mt-auto">
              {target_muscle.charAt(0).toUpperCase() + target_muscle.slice(1)}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
