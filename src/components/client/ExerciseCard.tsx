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

// v6 Orion tokens
const INK = '#FDFDFE'
const INK_FAINT = 'rgba(253,253,254,0.62)'
const INK_MUTED = 'rgba(253,253,254,0.74)'
const CHECK = '#2FA65A'
const INNER_SURFACE = 'rgba(31,35,32,0.14)'
const INNER_BORDER = 'rgba(253,253,254,0.22)'

export function ExerciseCard({
  exercise,
  completed,
  onToggle,
}: ExerciseCardProps) {
  return (
    <div
      className="v6-card"
      style={{ padding: '16px 16px 18px', overflow: 'hidden' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
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
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: completed ? INK_FAINT : INK,
              textDecoration: completed ? 'line-through' : 'none',
              transition: 'color 180ms ease, text-decoration-color 180ms ease',
            }}
          >
            {exercise.nameNl || exercise.name}
          </h3>

          {/* Sets · reps · rust */}
          <p
            style={{
              fontSize: 13,
              color: INK_MUTED,
              marginTop: 4,
              letterSpacing: '-0.005em',
            }}
          >
            {exercise.sets} sets · {exercise.reps} reps · {exercise.rest}s rust
          </p>

          {/* Notes */}
          {exercise.notes && (
            <div
              style={{
                marginTop: 12,
                background: INNER_SURFACE,
                borderRadius: 12,
                padding: '10px 12px',
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  color: INK_MUTED,
                  fontStyle: 'italic',
                  letterSpacing: '-0.005em',
                }}
              >
                {exercise.notes}
              </p>
            </div>
          )}
        </div>

        {/* Right column: checkbox + video */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button
            onClick={onToggle}
            aria-label={completed ? 'Markeer als incompleet' : 'Markeer als voltooid'}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: completed ? CHECK : 'transparent',
              border: completed ? 'none' : `1.5px solid ${INNER_BORDER}`,
              cursor: 'pointer',
              transition: 'background 180ms ease, border-color 180ms ease',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {completed && <Check size={14} strokeWidth={2.5} className="text-white" />}
          </button>

          {exercise.videoUrl && (
            <a
              href={exercise.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Bekijk video"
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: INNER_SURFACE,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: INK,
                transition: 'background 180ms ease',
              }}
            >
              <Play size={12} strokeWidth={1.8} fill={INK} style={{ marginLeft: 1 }} />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
