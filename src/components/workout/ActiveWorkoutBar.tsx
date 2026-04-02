'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Play, Square, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'

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

const WORKOUT_CHANGED_EVENT = 'move_workout_changed'

export function notifyWorkoutBarChanged() {
  window.dispatchEvent(new Event(WORKOUT_CHANGED_EVENT))
}

export function ActiveWorkoutBar() {
  const router = useRouter()
  const pathname = usePathname()
  const [minimized, setMinimized] = useState<MinimizedWorkout | null>(null)
  const [seconds, setSeconds] = useState(0)
  const [showStopSheet, setShowStopSheet] = useState(false)
  const [stopping, setStopping] = useState(false)

  const isOnActiveWorkout = pathname?.startsWith('/client/workout/active')
  const isOnCompleteWorkout = pathname?.startsWith('/client/workout/complete')

  const check = useCallback(() => {
    try {
      const raw = localStorage.getItem('move_minimized_workout')
      if (raw) {
        const data = JSON.parse(raw) as MinimizedWorkout
        // Auto-expire workouts older than 6 hours
        const hours = (Date.now() - new Date(data.startedAt).getTime()) / 3600000
        if (hours > 6) {
          localStorage.removeItem('move_minimized_workout')
          localStorage.removeItem('move_active_workout')
          setMinimized(null)
          return
        }
        setMinimized(data)
      } else {
        setMinimized(null)
      }
    } catch {
      setMinimized(null)
    }
  }, [])

  useEffect(() => {
    check()
    window.addEventListener('storage', check)
    window.addEventListener(WORKOUT_CHANGED_EVENT, check)
    return () => {
      window.removeEventListener('storage', check)
      window.removeEventListener(WORKOUT_CHANGED_EVENT, check)
    }
  }, [check])

  useEffect(() => { check() }, [pathname, check])

  useEffect(() => {
    if (!minimized) return
    const start = new Date(minimized.startedAt).getTime()
    setSeconds(Math.floor((Date.now() - start) / 1000))
    const interval = setInterval(() => {
      setSeconds(Math.floor((Date.now() - start) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [minimized])

  const clearState = () => {
    try {
      localStorage.removeItem('move_minimized_workout')
      localStorage.removeItem('move_active_workout')
      notifyWorkoutBarChanged()
    } catch { /* ok */ }
    setMinimized(null)
  }

  const handleResume = () => {
    if (!minimized) return
    router.push(`/client/workout/active?dayId=${minimized.dayId}&programId=${minimized.programId}`)
  }

  const handleFinish = () => {
    if (!minimized) return
    const sid = minimized.sessionId
    clearState()
    router.push(`/client/workout/complete?sessionId=${sid}`)
  }

  const handleDiscard = async () => {
    if (!minimized) return
    setStopping(true)
    try {
      const supabase = createClient()
      await supabase.from('workout_sets').delete().eq('workout_session_id', minimized.sessionId)
      await supabase.from('workout_sessions').delete().eq('id', minimized.sessionId)
    } catch (err) {
      console.error('Discard error:', err)
    }
    clearState()
    setStopping(false)
    setShowStopSheet(false)
  }

  if (!minimized || isOnActiveWorkout || isOnCompleteWorkout) return null

  const isStale = seconds > 7200

  return (
    <>
      {/* Compact bar */}
      <div className="fixed bottom-20 left-4 right-4 z-40 lg:left-[296px] animate-slide-up">
        <div className="max-w-lg mx-auto">
          <div className="bg-[#1A1917] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.25)] overflow-hidden">
            <div className="flex items-center gap-2.5 px-3.5 py-2.5">
              {/* Timer */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isStale ? 'bg-[#C47D15]' : 'bg-[var(--color-pop)]'}`} />
                <span className={`text-[14px] font-bold tabular-nums ${isStale ? 'text-[#C47D15]' : 'text-white'}`}>
                  {formatTimer(seconds)}
                </span>
                {isStale && (
                  <span className="text-[10px] text-[#C47D15] font-medium">Vergeten?</span>
                )}
              </div>

              {/* Stop button */}
              <button
                onClick={() => setShowStopSheet(true)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <Square size={13} strokeWidth={2.5} className="text-[#C4372A]" />
              </button>

              {/* Finish button */}
              <button
                onClick={handleFinish}
                className="px-3 py-1.5 rounded-lg bg-[#3D8B5C] text-white text-[11px] font-bold uppercase tracking-[0.04em] hover:bg-[#357A51] transition-colors"
              >
                Afronden
              </button>

              {/* Resume button */}
              <button
                onClick={handleResume}
                className="px-3 py-1.5 rounded-lg bg-[var(--color-pop)] text-white text-[11px] font-bold uppercase tracking-[0.04em] hover:bg-[#C45E30] transition-colors flex items-center gap-1"
              >
                <Play size={10} strokeWidth={3} fill="white" />
                Hervat
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stop/Discard bottom sheet */}
      {showStopSheet && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={() => setShowStopSheet(false)}>
          <div className="w-full bg-white rounded-t-2xl shadow-xl animate-slide-up pb-safe" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-[#DDD9D0] rounded-full mx-auto mt-3" />
            <div className="p-6">
              <h3 className="text-[18px] font-semibold text-[#1A1917] mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                Workout stoppen?
              </h3>
              <p className="text-[13px] text-[#A09D96] mb-5">
                Kies wat je wilt doen met deze sessie.
              </p>
              <div className="space-y-2.5">
                {/* Option 1: Finish properly */}
                <button
                  onClick={handleFinish}
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-[#3D8B5C]/8 hover:bg-[#3D8B5C]/15 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#3D8B5C] flex items-center justify-center flex-shrink-0">
                    <Play size={16} strokeWidth={2.5} fill="white" className="text-white" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-[#1A1917]">Afronden & feedback</p>
                    <p className="text-[12px] text-[#A09D96]">Sla op en geef je coach feedback</p>
                  </div>
                </button>

                {/* Option 2: Discard */}
                <button
                  onClick={handleDiscard}
                  disabled={stopping}
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-[#C4372A]/5 hover:bg-[#C4372A]/10 transition-colors text-left disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#C4372A] flex items-center justify-center flex-shrink-0">
                    <X size={16} strokeWidth={2.5} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-[#C4372A]">
                      {stopping ? 'Verwijderen...' : 'Verwijderen'}
                    </p>
                    <p className="text-[12px] text-[#A09D96]">Wis deze sessie volledig</p>
                  </div>
                </button>

                {/* Cancel */}
                <button
                  onClick={() => setShowStopSheet(false)}
                  className="w-full py-3.5 text-center text-[14px] font-medium text-[#A09D96]"
                >
                  Annuleren
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
