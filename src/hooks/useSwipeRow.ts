'use client'

import { useCallback, useRef, useState, useEffect } from 'react'

/**
 * useSwipeRow — horizontal swipe detection for triage rows.
 *
 * Returns a `translateX` value (the current drag offset in pixels) and a set
 * of touch/mouse handlers to attach to the draggable element. When the user
 * drags past `threshold` and releases, `onCommitLeft` or `onCommitRight` is
 * called; if they don't, the row snaps back to 0.
 *
 * The element using this hook should apply `transform: translateX(Xpx)` and
 * `transition-transform` (disabled while dragging).
 *
 * Designed for mobile-first: primarily touch events, but mouse drag is also
 * supported for desktop testing and for coaches on laptops with trackpads.
 */

export interface UseSwipeRowOptions {
  /** px past which a release will commit the swipe. Defaults to 88. */
  threshold?: number
  /** px cap on how far the row can be dragged visually. Defaults to 140. */
  maxTravel?: number
  /** called when the user commits a right-swipe (reveals left background). */
  onCommitRight?: () => void
  /** called when the user commits a left-swipe (reveals right background). */
  onCommitLeft?: () => void
  /** disable swipe entirely (e.g. while a modal is open). */
  disabled?: boolean
}

export interface UseSwipeRowResult {
  translateX: number
  dragging: boolean
  committed: 'left' | 'right' | null
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: (e: React.TouchEvent) => void
    onTouchCancel: (e: React.TouchEvent) => void
    onMouseDown: (e: React.MouseEvent) => void
  }
  /** reset after an external commit animation finishes. */
  reset: () => void
}

export function useSwipeRow({
  threshold = 88,
  maxTravel = 140,
  onCommitRight,
  onCommitLeft,
  disabled = false,
}: UseSwipeRowOptions): UseSwipeRowResult {
  const [translateX, setTranslateX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [committed, setCommitted] = useState<'left' | 'right' | null>(null)

  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const isHorizontalRef = useRef<boolean | null>(null)
  const mouseDownRef = useRef(false)

  const finish = useCallback(
    (delta: number) => {
      isHorizontalRef.current = null
      setDragging(false)
      if (delta > threshold) {
        // Right swipe committed
        setCommitted('right')
        setTranslateX(maxTravel * 1.8) // fly off right
        onCommitRight?.()
      } else if (delta < -threshold) {
        setCommitted('left')
        setTranslateX(-maxTravel * 1.8) // fly off left
        onCommitLeft?.()
      } else {
        // Snap back
        setTranslateX(0)
      }
    },
    [threshold, maxTravel, onCommitRight, onCommitLeft]
  )

  // ─── Touch handlers ─────────────────────────────────────────
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || committed) return
      const t = e.touches[0]
      startXRef.current = t.clientX
      startYRef.current = t.clientY
      isHorizontalRef.current = null
      setDragging(true)
    },
    [disabled, committed]
  )

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || committed || !dragging) return
      const t = e.touches[0]
      const dx = t.clientX - startXRef.current
      const dy = t.clientY - startYRef.current

      // Lock axis on first decisive move
      if (isHorizontalRef.current === null) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
        isHorizontalRef.current = Math.abs(dx) > Math.abs(dy)
      }

      if (!isHorizontalRef.current) {
        // vertical scroll — abort
        setDragging(false)
        setTranslateX(0)
        return
      }

      // Horizontal drag — clamp and apply rubber-band past maxTravel
      let next = dx
      if (next > maxTravel) next = maxTravel + (next - maxTravel) * 0.25
      if (next < -maxTravel) next = -maxTravel + (next + maxTravel) * 0.25
      setTranslateX(next)

      // Prevent page scroll once we've committed to horizontal
      if (e.cancelable) e.preventDefault()
    },
    [disabled, committed, dragging, maxTravel]
  )

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || committed || !dragging) return
      const t = e.changedTouches[0]
      const dx = t.clientX - startXRef.current
      finish(dx)
    },
    [disabled, committed, dragging, finish]
  )

  const onTouchCancel = useCallback(() => {
    if (!dragging) return
    setDragging(false)
    setTranslateX(0)
    isHorizontalRef.current = null
  }, [dragging])

  // ─── Mouse handlers (desktop) ───────────────────────────────
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled || committed) return
      // Only left button
      if (e.button !== 0) return
      mouseDownRef.current = true
      startXRef.current = e.clientX
      startYRef.current = e.clientY
      isHorizontalRef.current = null
      setDragging(true)
    },
    [disabled, committed]
  )

  // Attach global mouse move/up while dragging (so swipe keeps working
  // if the cursor leaves the row)
  useEffect(() => {
    if (!dragging || !mouseDownRef.current) return
    function onMove(e: MouseEvent) {
      const dx = e.clientX - startXRef.current
      const dy = e.clientY - startYRef.current
      if (isHorizontalRef.current === null) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
        isHorizontalRef.current = Math.abs(dx) > Math.abs(dy)
      }
      if (!isHorizontalRef.current) {
        setDragging(false)
        setTranslateX(0)
        mouseDownRef.current = false
        return
      }
      let next = dx
      if (next > maxTravel) next = maxTravel + (next - maxTravel) * 0.25
      if (next < -maxTravel) next = -maxTravel + (next + maxTravel) * 0.25
      setTranslateX(next)
    }
    function onUp(e: MouseEvent) {
      if (!mouseDownRef.current) return
      mouseDownRef.current = false
      const dx = e.clientX - startXRef.current
      finish(dx)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging, maxTravel, finish])

  const reset = useCallback(() => {
    setCommitted(null)
    setTranslateX(0)
    setDragging(false)
  }, [])

  return {
    translateX,
    dragging,
    committed,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel,
      onMouseDown,
    },
    reset,
  }
}
