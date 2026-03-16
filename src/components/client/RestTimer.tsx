'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { SkipForward } from 'lucide-react'

interface RestTimerProps {
  initialSeconds: number
  onComplete?: () => void
  onDismiss?: () => void
}

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
  } catch {}
}

function triggerVibration(pattern: number | number[]) {
  try {
    if ('vibrate' in navigator) navigator.vibrate(pattern)
  } catch {}
}

export function RestTimer({ initialSeconds, onComplete, onDismiss }: RestTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds)
  const [isRunning, setIsRunning] = useState(true)
  const hasPlayedFinish = useRef(false)

  const handleFinish = useCallback(() => {
    if (!hasPlayedFinish.current) {
      hasPlayedFinish.current = true
      playBeep(880, 150, 0.4)
      setTimeout(() => playBeep(880, 150, 0.4), 200)
      setTimeout(() => playBeep(1100, 300, 0.5), 400)
      triggerVibration([200, 100, 200, 100, 300])
    }
  }, [])

  useEffect(() => {
    if (!isRunning || secondsLeft <= 0) return

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = prev - 1
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

  const radius = 90
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - progress / 100)

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#1A1917]/95 backdrop-blur-xl animate-fade-in">
      {/* Skip button */}
      <button
        onClick={onDismiss}
        className="absolute top-6 right-6 p-3 rounded-full bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
        aria-label="Overslaan"
      >
        <SkipForward size={20} strokeWidth={1.5} />
      </button>

      {/* Timer circle */}
      <div className="relative w-[220px] h-[220px] mb-8">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <circle
            cx="100" cy="100" r={radius} fill="none"
            stroke={isFinished ? '#34C759' : secondsLeft <= 3 ? '#FF9500' : '#1A1917'}
            strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-[56px] font-bold tabular-nums tracking-tight transition-colors ${
            isFinished ? 'text-[#34C759]' : secondsLeft <= 3 ? 'text-[#FF9500]' : 'text-white'
          }`}>
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
          <span className="text-[14px] font-medium text-white/50 uppercase tracking-[0.1em]">
            {isFinished ? 'Klaar!' : 'Rust'}
          </span>
        </div>
      </div>

      {isFinished ? (
        <button
          onClick={onDismiss}
          className="px-8 py-4 bg-[#34C759] text-white rounded-2xl font-semibold text-[16px] shadow-[0_4px_24px_rgba(52,199,89,0.3)] hover:bg-[#2DB84E] transition-all"
        >
          Volgende set
        </button>
      ) : (
        <button
          onClick={onDismiss}
          className="px-6 py-3 bg-white/10 text-white/70 rounded-xl font-medium text-[14px] hover:bg-white/20 transition-all"
        >
          Overslaan
        </button>
      )}
    </div>
  )
}
