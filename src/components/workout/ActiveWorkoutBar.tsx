'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Clock, Dumbbell, X } from 'lucide-react'

interface MinimizedWorkout {
  sessionId: string
  dayId: string
  programId: string
  startedAt: string
}

function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function ActiveWorkoutBar() {
  const router = useRouter()
  const pathname = usePathname()
  const [minimized, setMinimized] = useState<MinimizedWorkout | null>(null)
  const [seconds, setSeconds] = useState(0)

  // Don't show on the active workout page itself
  const isOnActiveWorkout = pathname?.startsWith('/client/workout/active')
  const isOnCompleteWorkout = pathname?.startsWith('/client/workout/complete')

  useEffect(() => {
    const check = () => {
      try {
        const raw = localStorage.getItem('move_minimized_workout')
        if (raw) {
          const data = JSON.parse(raw) as MinimizedWorkout
          setMinimized(data)
        } else {
          setMinimized(null)
        }
      } catch {
        setMinimized(null)
      }
    }

    check()
    // Check periodically for changes from other tabs/components
    const interval = setInterval(check, 2000)
    // Also listen for storage events from other tabs
    window.addEventListener('storage', check)
    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', check)
    }
  }, [])

  // Timer
  useEffect(() => {
    if (!minimized) return
    const start = new Date(minimized.startedAt).getTime()
    setSeconds(Math.floor((Date.now() - start) / 1000))
    const interval = setInterval(() => {
      setSeconds(Math.floor((Date.now() - start) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [minimized])

  const handleResume = () => {
    if (!minimized) return
    router.push(`/client/workout/active?dayId=${minimized.dayId}&programId=${minimized.programId}`)
  }

  const handleDismiss = () => {
    try { localStorage.removeItem('move_minimized_workout') } catch { /* ok */ }
    setMinimized(null)
  }

  if (!minimized || isOnActiveWorkout || isOnCompleteWorkout) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 lg:left-[296px] animate-slide-up">
      <div className="max-w-lg mx-auto">
        <div
          className="bg-[#2A2824] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-[#44413D] overflow-hidden"
        >
          <button
            onClick={handleResume}
            className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#353330]"
          >
            {/* Pulsing indicator */}
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 bg-[var(--color-pop)] rounded-xl flex items-center justify-center">
                <Dumbbell size={18} strokeWidth={2} className="text-white" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[var(--color-pop)] rounded-full animate-pulse-subtle" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white">Workout actief</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Clock size={11} strokeWidth={2} className="text-[var(--color-pop)]" />
                <span className="text-[13px] font-semibold text-[var(--color-pop)] tabular-nums">
                  {formatTimer(seconds)}
                </span>
              </div>
            </div>

            <span className="text-[11px] font-semibold text-white uppercase tracking-[0.08em] bg-[var(--color-pop)] px-3 py-1.5 rounded-lg flex-shrink-0">
              Hervat
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
