'use client'

import { ReactNode, useState, useEffect } from 'react'
import { CheckCircle2, Clock } from 'lucide-react'
import { useSwipeRow } from '@/hooks/useSwipeRow'

/**
 * SwipeableRow — wraps a row in a horizontal swipe gesture.
 *
 * - Swipe right (drag the content to the right) → reveals a GREEN "Gezien"
 *   background on the left, calls `onSwipeRight` when committed.
 * - Swipe left → reveals a GREY "Later" background on the right, calls
 *   `onSwipeLeft` when committed.
 *
 * After a commit the row animates out (fly-off + collapse) and the parent
 * is expected to actually remove it from the list, or the row calls
 * `onSwipeRight`/`onSwipeLeft` to update state.
 */

interface Props {
  children: ReactNode
  onSwipeRight?: () => void
  onSwipeLeft?: () => void
  rightLabel?: string
  leftLabel?: string
  disabled?: boolean
  /** Optional className for the outer container (spacing, etc.). */
  className?: string
}

export function SwipeableRow({
  children,
  onSwipeRight,
  onSwipeLeft,
  rightLabel = 'Gezien',
  leftLabel = 'Later',
  disabled = false,
  className = '',
}: Props) {
  const [collapsed, setCollapsed] = useState(false)

  const { translateX, dragging, committed, handlers } = useSwipeRow({
    disabled: disabled || collapsed,
    onCommitRight: onSwipeRight,
    onCommitLeft: onSwipeLeft,
  })

  // After commit, collapse the row for a smooth removal animation.
  useEffect(() => {
    if (committed) {
      const t = setTimeout(() => setCollapsed(true), 180)
      return () => clearTimeout(t)
    }
  }, [committed])

  const revealOpacity = Math.min(Math.abs(translateX) / 88, 1)
  const rightRevealed = translateX > 4
  const leftRevealed = translateX < -4

  return (
    <div
      className={`relative overflow-hidden transition-all duration-300 ease-out ${className}`}
      style={{
        maxHeight: collapsed ? 0 : 500,
        opacity: collapsed ? 0 : 1,
        marginBottom: collapsed ? 0 : undefined,
      }}
    >
      {/* Left background ("Gezien" — revealed by swiping right) */}
      <div
        className="absolute inset-0 flex items-center justify-start pl-6 pointer-events-none rounded-2xl"
        style={{
          backgroundColor: rightRevealed ? '#34C759' : 'transparent',
          opacity: rightRevealed ? revealOpacity : 0,
        }}
      >
        <div className="flex items-center gap-2 text-white">
          <CheckCircle2 size={20} strokeWidth={2.5} />
          <span className="text-[14px] font-semibold">{rightLabel}</span>
        </div>
      </div>

      {/* Right background ("Later" — revealed by swiping left) */}
      <div
        className="absolute inset-0 flex items-center justify-end pr-6 pointer-events-none rounded-2xl"
        style={{
          backgroundColor: leftRevealed ? '#8E8B85' : 'transparent',
          opacity: leftRevealed ? revealOpacity : 0,
        }}
      >
        <div className="flex items-center gap-2 text-white">
          <Clock size={18} strokeWidth={2.5} />
          <span className="text-[14px] font-semibold">{leftLabel}</span>
        </div>
      </div>

      {/* Draggable content */}
      <div
        {...handlers}
        className="relative touch-pan-y"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: dragging ? 'none' : 'transform 260ms cubic-bezier(0.2, 0.9, 0.3, 1)',
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  )
}
