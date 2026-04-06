'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Minus, Plus } from 'lucide-react'

interface StepperInputProps {
  value: string
  onChange: (value: string) => void
  step?: number
  min?: number
  max?: number
  placeholder?: string
  disabled?: boolean
  inputMode?: 'decimal' | 'numeric'
  /** Width class for the entire stepper (default: w-[120px]) */
  className?: string
  /** ID for auto-focus targeting */
  id?: string
}

export function StepperInput({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 9999,
  placeholder = '—',
  disabled = false,
  inputMode = 'decimal',
  className = '',
  id,
}: StepperInputProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const haptic = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10)
    }
  }, [])

  const clamp = useCallback(
    (n: number) => Math.min(max, Math.max(min, n)),
    [min, max]
  )

  const stepValue = useCallback(
    (direction: 1 | -1) => {
      const current = value ? parseFloat(value) : 0
      const next = clamp(
        Math.round((current + step * direction) * 100) / 100
      )
      onChange(next.toString())
      haptic()
    },
    [value, step, clamp, onChange, haptic]
  )

  const startLongPress = useCallback(
    (direction: 1 | -1) => {
      // First step fires immediately on press
      stepValue(direction)
      // After 400ms, start repeating every 120ms
      timeoutRef.current = setTimeout(() => {
        intervalRef.current = setInterval(() => {
          stepValue(direction)
        }, 120)
      }, 400)
    },
    [stepValue]
  )

  const stopLongPress = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLongPress()
    }
  }, [stopLongPress])

  return (
    <div className={`flex items-center ${className}`}>
      {/* Minus button */}
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault()
          if (!disabled) startLongPress(-1)
        }}
        onPointerUp={stopLongPress}
        onPointerLeave={stopLongPress}
        onContextMenu={(e) => e.preventDefault()}
        disabled={disabled}
        className="w-[34px] h-[40px] flex items-center justify-center bg-[#F0F0EE] rounded-l-lg text-[#888] active:bg-[#E5E5E3] active:scale-95 transition-all touch-manipulation disabled:opacity-30 select-none"
        style={{ WebkitTapHighlightColor: 'transparent' }}
        aria-label="Verlaag"
      >
        <Minus size={14} strokeWidth={2.5} />
      </button>

      {/* Input field */}
      <input
        ref={inputRef}
        id={id}
        type="number"
        step={step}
        min={min}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full h-[40px] px-1 bg-[#F8F8F6] border-y border-[#F0F0EE] text-[14px] text-center font-semibold text-[#1A1917] tabular-nums disabled:opacity-40 focus:border-[#D46A3A] focus:outline-none transition-all placeholder:text-[#C0C0C0] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        onFocus={(e) => e.target.select()}
      />

      {/* Plus button */}
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault()
          if (!disabled) startLongPress(1)
        }}
        onPointerUp={stopLongPress}
        onPointerLeave={stopLongPress}
        onContextMenu={(e) => e.preventDefault()}
        disabled={disabled}
        className="w-[34px] h-[40px] flex items-center justify-center bg-[#F0F0EE] rounded-r-lg text-[#888] active:bg-[#E5E5E3] active:scale-95 transition-all touch-manipulation disabled:opacity-30 select-none"
        style={{ WebkitTapHighlightColor: 'transparent' }}
        aria-label="Verhoog"
      >
        <Plus size={14} strokeWidth={2.5} />
      </button>
    </div>
  )
}
