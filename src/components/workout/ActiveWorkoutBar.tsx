'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
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

  // v6: warm amber voor "vergeten?" — lime blijft pure event-paint
  const isStale = seconds > 7200
  const DOT = isStale ? '#E8B948' : '#C0FC01'
  const INK = '#FDFDFE'
  const INK_FAINT = 'rgba(253,253,254,0.55)'
  const DARK = '#474B48'

  return (
    <>
      {/* v6 · compacte, tap-to-resume bar */}
      <div
        className="fixed left-4 right-4 z-40 lg:left-[296px] animate-slide-up"
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="max-w-lg mx-auto">
          <div
            role="group"
            aria-label="Workout bezig"
            style={{
              display: 'flex',
              alignItems: 'stretch',
              gap: 0,
              borderRadius: 18,
              overflow: 'hidden',
              background: DARK,
              boxShadow: '0 8px 24px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            {/* Hoofd-tap zone: hervat */}
            <button
              type="button"
              onClick={handleResume}
              aria-label="Workout hervatten"
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                textAlign: 'left',
                color: INK,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {/* Pulse + timer */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: DOT,
                    boxShadow: `0 0 0 3px ${DOT}22`,
                    animation: 'pulse-dot 1.8s ease-in-out infinite',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    letterSpacing: '-0.01em',
                    fontVariantNumeric: 'tabular-nums',
                    color: INK,
                  }}
                >
                  {formatTimer(seconds)}
                </span>
              </div>

              {/* Label */}
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 400,
                  color: INK_FAINT,
                  letterSpacing: '-0.005em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {isStale ? 'Nog bezig? · tik om verder' : 'Tik om te hervatten'}
              </span>

              {/* Chevron */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke={INK_FAINT}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{ flexShrink: 0 }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            {/* Vertical divider */}
            <div style={{ width: 1, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} aria-hidden="true" />

            {/* Stop / meer-actie */}
            <button
              type="button"
              onClick={() => setShowStopSheet(true)}
              aria-label="Workout stoppen of afronden"
              style={{
                width: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: INK_FAINT,
                WebkitTapHighlightColor: 'transparent',
                flexShrink: 0,
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="5" r="1.4" />
                <circle cx="12" cy="12" r="1.4" />
                <circle cx="12" cy="19" r="1.4" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* v6 · stop-sheet: dark card, rustige hiërarchie */}
      {showStopSheet && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{ background: 'rgba(0,0,0,0.48)', backdropFilter: 'blur(2px)' }}
          onClick={() => setShowStopSheet(false)}
        >
          <div
            className="w-full animate-slide-up"
            style={{
              background: DARK,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              boxShadow: '0 -8px 32px rgba(0,0,0,0.35)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              color: INK,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grip */}
            <div
              style={{
                width: 40,
                height: 4,
                background: 'rgba(255,255,255,0.18)',
                borderRadius: 999,
                margin: '10px auto 0',
              }}
              aria-hidden="true"
            />

            <div style={{ padding: '20px 22px 22px' }}>
              <h3
                style={{
                  fontFamily: 'var(--font-display), Outfit, sans-serif',
                  fontSize: 20,
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                  color: INK,
                  marginBottom: 4,
                }}
              >
                Workout stoppen?
              </h3>
              <p style={{ fontSize: 13, color: INK_FAINT, marginBottom: 18, letterSpacing: '-0.005em' }}>
                Kies wat je wilt doen met deze sessie.
              </p>

              {/* Afronden — primaire, positieve actie */}
              <button
                type="button"
                onClick={handleFinish}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 16px',
                  borderRadius: 16,
                  background: '#2FA65A',
                  color: INK,
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  WebkitTapHighlightColor: 'transparent',
                  marginBottom: 10,
                  boxShadow: '0 4px 14px rgba(47,166,90,0.28)',
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>
                    Afronden
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.82)', marginTop: 2 }}>
                    Opslaan en feedback geven
                  </div>
                </div>
              </button>

              {/* Verwijderen — ingetogen ghost, geen shoutende rood */}
              <button
                type="button"
                onClick={handleDiscard}
                disabled={stopping}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 16px',
                  borderRadius: 16,
                  background: 'rgba(255,255,255,0.04)',
                  color: INK,
                  border: '1px solid rgba(255,255,255,0.08)',
                  cursor: stopping ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  WebkitTapHighlightColor: 'transparent',
                  marginBottom: 10,
                  opacity: stopping ? 0.6 : 1,
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: 'rgba(253,253,254,0.72)',
                  }}
                  aria-hidden="true"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" />
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, letterSpacing: '-0.01em' }}>
                    {stopping ? 'Verwijderen…' : 'Sessie verwijderen'}
                  </div>
                  <div style={{ fontSize: 12, color: INK_FAINT, marginTop: 2 }}>
                    Wis deze workout volledig
                  </div>
                </div>
              </button>

              {/* Annuleren */}
              <button
                type="button"
                onClick={() => setShowStopSheet(false)}
                style={{
                  width: '100%',
                  padding: '12px 0',
                  textAlign: 'center',
                  fontSize: 14,
                  fontWeight: 500,
                  color: INK_FAINT,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  marginTop: 4,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* pulse keyframes — lokaal want globals heeft 'm mogelijk niet */}
      <style jsx>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(0.88); }
        }
      `}</style>
    </>
  )
}
