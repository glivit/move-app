'use client'

import { Check, Play } from 'lucide-react'
import { ExerciseMedia } from '@/components/ExerciseMedia'

interface ExerciseCardProps {
  exercise: {
    name: string
    nameNl?: string
    bodyPart?: string
    targetMuscle?: string
    equipment?: string
    gifUrl?: string
    sets: number
    reps: string
    rest: number
    notes?: string
    videoUrl?: string
  }
  index: number
  completed: boolean
  onToggle: () => void
}

export function ExerciseCard({
  exercise,
  index,
  completed,
  onToggle,
}: ExerciseCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#F0F0ED] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all">
      <div className="flex items-start gap-3.5 p-5">
        {/* Exercise thumbnail */}
        <ExerciseMedia
          name={exercise.name}
          nameNl={exercise.nameNl}
          bodyPart={exercise.bodyPart || 'chest'}
          targetMuscle={exercise.targetMuscle}
          equipment={exercise.equipment}
          gifUrl={exercise.gifUrl}
          variant="compact"
          showLabels={false}
        />

        {/* Exercise Details */}
        <div className="flex-1 min-w-0">
          <h3
            className={`text-[16px] font-semibold tracking-[-0.01em] transition-all ${
              completed
                ? 'line-through text-[#9C9A95]'
                : 'text-[#1A1917]'
            }`}
          >
            {exercise.nameNl || exercise.name}
          </h3>

          {/* Sets, Reps, Rest */}
          <p className="text-[13px] text-[#9C9A95] mt-1">
            {exercise.sets} sets · {exercise.reps} reps · {exercise.rest}s rust
          </p>

          {/* Notes */}
          {exercise.notes && (
            <div className="mt-3 bg-[#F5F2ED] rounded-xl p-3">
              <p className="text-[13px] text-[#5C5A55] italic">
                {exercise.notes}
              </p>
            </div>
          )}
        </div>

        {/* Right side: checkbox + video */}
        <div className="flex flex-col items-center gap-2.5 shrink-0">
          {/* Checkbox */}
          <button
            onClick={onToggle}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
              completed
                ? 'bg-[#3D8B5C]'
                : 'border-[1.5px] border-[#D1CFC9] hover:border-[#9B7B2E]'
            }`}
            aria-label={completed ? 'Markeer als incompleet' : 'Markeer als voltooid'}
          >
            {completed && <Check size={14} strokeWidth={2.5} className="text-white" />}
          </button>

          {/* Video Button */}
          {exercise.videoUrl && (
            <a
              href={exercise.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-7 h-7 rounded-full bg-[#F5F2ED] flex items-center justify-center hover:bg-[#9B7B2E]/10 transition-colors"
              aria-label="Bekijk video"
            >
              <Play size={13} strokeWidth={1.5} className="text-[#9B7B2E] ml-0.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
