'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { X } from 'lucide-react'

interface RestTimerProps {
  initialSeconds: number
  onComplete?: () => void
  onDismiss?: () => void
}

// Generate a short beep using Web Audio API
function playBeep(frequency = 880, duration = 150, volume = 0.3) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = frequency
    osc.type = 'sine'
    gain.gain.value = volume
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration / 1000)
  } catch {
    // Audio not available — silently fail
  }
}

function triggerVibration(pattern: number | number[]) {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  } catch {
    // Vibration not available
  }
}

export function RestTimer({ initialSeconds, onComplete, onDismiss }: RestTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds)
  const [isRunning, setIsRunning] = useState(true)
  const hasPlayedFinish = useRef(false)

  const handleFinish = useCallback(() => {
    if (!hasPlayedFinish.current) {
      hasPlayedFinish.current = true
      // Triple beep pattern
      playBeep(880, 150, 0.4)
      setTimeout(() => playBeep(880, 150, 0.4), 200)
      setTimeout(() => playBeep(1100, 300, 0.5), 400)
      // Vibration pattern: buzz-pause-buzz-pause-buzz
      triggerVibration([200, 100, 200, 100, 300])
    }
  }, [])

  useEffect(() => {
    if (!isRunning || secondsLeft <= 0) return

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = prev - 1
        // Warning beep at 3 seconds
        if (next === 3) {
          playBeep(660, 80, 0.2)
          triggerVibration(50)
        }
        if (next <= 0) {
          setIsRunning(false)
          handleFinish()
          onComplete?.()
          return 0
        }
        return next
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning, secondsLeft, onComplete, handleFinish])

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const isFinished = secondsLeft === 0
  const progress = ((initialSeconds - secondsLeft) / initialSeconds) * 100

  return (
    <div className="fixed top-4 right-4 z-40 animate-scale-in">
      <div className={`bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.1)] border p-4 min-w-[120px] transition-all ${
        isFinished ? 'border-[#34C759]/30 shadow-[0_4px_20px_rgba(52,199,89,0.15)]' : 'border-[#F0F0ED]'
      }`}>
        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-[0_2px_8px_rgba(0,0,0,0.1)] border border-[#F0F0ED]"
          aria-label="Dismiss timer"
        >
          <X size={16} strokeWidth={2} className="text-text-primary" />
        </button>

        <div className="text-center">
          {/* Timer display */}
          <div className={`font-semibold tabular-nums text-3xl mb-2 transition-colors ${
            isFinished ? 'text-[#34C759]' : secondsLeft <= 3 ? 'text-[#FF9500]' : 'text-text-primary'
          }`}>
            {minutes}:{seconds.toString().padStart(2, '0')}
          </div>

          {/* Label */}
          <p className="text-[12px] text-client-text-secondary font-medium uppercase tracking-wide">
            {isFinished ? 'Klaar!' : secondsLeft <= 3 ? 'Bijna klaar...' : 'Rust'}
          </p>

          {/* Progress bar */}
          <div className="mt-3 h-1 bg-client-surface-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                isFinished ? 'bg-[#34C759]' : secondsLeft <= 3 ? 'bg-[#FF9500]' : 'bg-[#8B6914]'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Pulse animation when done */}
          {isFinished && (
            <style>{`
              @keyframes pulse-timer {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.6; }
              }
              .timer-pulse {
                animation: pulse-timer 1.5s ease-in-out infinite;
              }
            `}</style>
          )}
          {isFinished && (
            <div className="mt-3">
              <button
                onClick={onDismiss}
                className="timer-pulse w-full bg-[#34C759] text-white rounded-lg py-2 text-[13px] font-semibold"
              >
                Volgende set
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
