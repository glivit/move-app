'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Dumbbell } from 'lucide-react'

interface ExerciseCardProps {
  id: string
  name: string
  name_nl?: string
  body_part: string
  target_muscle: string
  equipment: string
  gif_url?: string
}

const bodyPartColors: Record<string, string> = {
  chest: 'bg-data-orange',
  back: 'bg-data-blue',
  shoulders: 'bg-data-purple',
  arms: 'bg-data-pink',
  legs: 'bg-data-green',
  core: 'bg-data-red',
  cardio: 'bg-data-yellow',
}

const getBodyPartColor = (bodyPart: string) => {
  const normalized = bodyPart?.toLowerCase() || ''
  return bodyPartColors[normalized] || 'bg-data-blue'
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
  return (
    <Link href={`/coach/exercises/${id}`}>
      <div className="bg-white rounded-2xl shadow-clean border border-client-border overflow-hidden hover:shadow-clean-hover transition-shadow duration-150 cursor-pointer h-full flex flex-col">
        {/* GIF Display Area */}
        <div className="aspect-video bg-[#FAFAFA] flex items-center justify-center overflow-hidden">
          {gif_url ? (
            <img
              src={gif_url}
              alt={name}
              className="w-full h-full object-cover"
              style={{ mixBlendMode: 'multiply' }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-client-text-secondary">
              <Dumbbell className="w-8 h-8 mb-2" strokeWidth={1.5} />
              <span className="text-[13px]">Geen afbeelding</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col">
          {/* Exercise Name */}
          <h3 className="text-[15px] font-medium text-text-primary mb-3 line-clamp-2">
            {name_nl || name.charAt(0).toUpperCase() + name.slice(1)}
          </h3>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            {/* Body Part Badge */}
            <span className={`${getBodyPartColor(body_part)} text-white text-[11px] font-semibold px-2.5 py-1 rounded-full`}>
              {body_part.charAt(0).toUpperCase() + body_part.slice(1)}
            </span>

            {/* Equipment Badge */}
            {equipment && (
              <span className="bg-client-surface-muted text-client-text-secondary text-[11px] font-medium px-2.5 py-1 rounded-full">
                {equipment.charAt(0).toUpperCase() + equipment.slice(1)}
              </span>
            )}
          </div>

          {/* Target Muscle */}
          {target_muscle && (
            <p className="text-[13px] text-client-text-secondary mt-auto">
              {target_muscle.charAt(0).toUpperCase() + target_muscle.slice(1)}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
