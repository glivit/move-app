'use client'

import { Check, Moon } from 'lucide-react'

interface DayPickerProps {
  days: string[]
  activeDay: number
  onDayChange: (index: number) => void
  completedDays?: number[]
}

export function DayPicker({
  days,
  activeDay,
  onDayChange,
  completedDays = [],
}: DayPickerProps) {
  const dutchDayNames = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']

  const getDayName = (index: number): string => {
    return dutchDayNames[index % 7] || `Dag ${index + 1}`
  }

  const hasExercises = (index: number): boolean => {
    return days[index]?.trim().length > 0
  }

  return (
    <div className="overflow-x-auto flex gap-2 px-1 py-4 scrollbar-hide">
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      {days.map((day, index) => {
        const isActive = activeDay === index
        const isCompleted = completedDays.includes(index)
        const hasExercisesToday = hasExercises(index)

        let buttonClasses =
          'w-12 h-16 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all flex-shrink-0'

        if (isActive) {
          buttonClasses += ' bg-[#1A1A18] text-white'
        } else if (isCompleted && hasExercisesToday) {
          buttonClasses += ' bg-data-green/10 text-data-green'
        } else if (!hasExercisesToday) {
          buttonClasses += ' bg-client-surface-muted text-client-text-muted'
        } else {
          buttonClasses += ' bg-transparent text-client-text-secondary'
        }

        return (
          <button
            key={index}
            onClick={() => onDayChange(index)}
            className={buttonClasses}
            aria-label={`Day ${index + 1}`}
          >
            <span className="text-[11px] font-medium">{getDayName(index)}</span>
            <span className="text-[18px] font-bold">{index + 1}</span>
            {isCompleted && hasExercisesToday && (
              <Check size={12} strokeWidth={2.5} />
            )}
            {!hasExercisesToday && <Moon size={12} strokeWidth={1.5} />}
          </button>
        )
      })}
    </div>
  )
}
