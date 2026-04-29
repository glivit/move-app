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
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
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

// v6 Orion
const INK = '#1C1E18'
const INK_FAINT = 'rgba(253,253,254,0.55)'
const CHECK = '#2FA65A'
const AMBER = '#E8B948'

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

  const ringStroke = isFinished ? CHECK : secondsLeft <= 3 ? AMBER : INK
  const numberColor = isFinished ? CHECK : secondsLeft <= 3 ? AMBER : INK

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center animate-fade-in"
      style={{
        background: 'rgba(26, 28, 26, 0.92)',
        backdropFilter: 'blur(20px) saturate(1.1)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.1)',
      }}
    >
      {/* Skip icon — rustig hoekje */}
      <button
        onClick={onDismiss}
        aria-label="Overslaan"
        style={{
          position: 'absolute',
          top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
          right: 16,
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          color: INK_FAINT,
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <SkipForward size={18} strokeWidth={1.6} />
      </button>

      {/* Timer ring */}
      <div style={{ position: 'relative', width: 220, height: 220, marginBottom: 32 }}>
        <svg
          style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}
          viewBox="0 0 200 200"
        >
          <circle cx="100" cy="100" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={ringStroke}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1000ms linear, stroke 240ms ease' }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontSize: 56,
              fontWeight: 500,
              letterSpacing: '-0.04em',
              fontVariantNumeric: 'tabular-nums',
              color: numberColor,
              fontFamily: 'var(--font-display, Outfit), Outfit, sans-serif',
              transition: 'color 240ms ease',
            }}
          >
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: INK_FAINT,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginTop: 4,
            }}
          >
            {isFinished ? 'Klaar' : 'Rust'}
          </span>
        </div>
      </div>

      {isFinished ? (
        <button
          onClick={onDismiss}
          style={{
            padding: '14px 28px',
            background: CHECK,
            color: INK,
            borderRadius: 18,
            fontWeight: 600,
            fontSize: 15,
            letterSpacing: '-0.01em',
            boxShadow: '0 6px 22px rgba(47,166,90,0.32)',
            border: 'none',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Volgende set
        </button>
      ) : (
        <button
          onClick={onDismiss}
          style={{
            padding: '12px 22px',
            background: 'rgba(255,255,255,0.08)',
            color: INK_FAINT,
            borderRadius: 14,
            fontWeight: 500,
            fontSize: 14,
            border: 'none',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Overslaan
        </button>
      )}
    </div>
  )
}
