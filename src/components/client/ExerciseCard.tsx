'use client'

import { Check, Play } from 'lucide-react'

interface ExerciseCardProps {
  exercise: {
    name: string
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
    <div className="bg-white rounded-2xl p-5 shadow-clean hover:shadow-clean-hover transition-all">
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          className={`w-7 h-7 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
            completed
              ? 'bg-accent border-accent'
              : 'border-accent bg-transparent hover:border-accent'
          }`}
          aria-label={completed ? 'Mark as incomplete' : 'Mark as complete'}
        >
          {completed && <Check size={16} strokeWidth={2.5} className="text-white" />}
        </button>

        {/* Exercise Details */}
        <div className="flex-1 min-w-0">
          <h3
            className={`text-[17px] font-semibold transition-all ${
              completed
                ? 'line-through text-text-primary opacity-50'
                : 'text-text-primary'
            }`}
          >
            {exercise.name}
          </h3>

          {/* Sets, Reps, Rest */}
          <p className="text-[14px] text-client-text-secondary mt-1">
            {exercise.sets} sets · {exercise.reps} reps · {exercise.rest}s rust
          </p>

          {/* Notes */}
          {exercise.notes && (
            <div className="mt-3 bg-client-surface-muted rounded-xl p-3">
              <p className="text-[13px] text-client-text-secondary italic">
                {exercise.notes}
              </p>
            </div>
          )}
        </div>

        {/* Video Button */}
        {exercise.videoUrl && (
          <a
            href={exercise.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 rounded-full bg-client-surface-muted flex items-center justify-center flex-shrink-0 hover:bg-accent/10 transition-colors"
            aria-label="Watch exercise video"
          >
            <Play size={16} strokeWidth={1.5} className="text-accent ml-0.5" />
          </a>
        )}
      </div>
    </div>
  )
}
