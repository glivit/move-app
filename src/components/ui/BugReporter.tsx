'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Bug, X, MapPin, Send, Check, Loader2 } from 'lucide-react'

type Phase = 'idle' | 'form' | 'picking' | 'submitted'

export function BugReporter() {
  const pathname = usePathname()
  const supabase = createClient()
  const formRef = useRef<HTMLDivElement>(null)

  const [phase, setPhase] = useState<Phase>('idle')
  const [description, setDescription] = useState('')
  const [clickPos, setClickPos] = useState<{ x: number; y: number } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Check once if current user is among the first 15
  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        const res = await fetch('/api/is-test-user')
        if (cancelled) return
        const { isTestUser: result } = await res.json()
        setIsTestUser(result === true)
      } catch {
        // silently fail — widget just won't show
      } finally {
        if (!cancelled) setChecked(true)
      }
    }
    check()
    return () => { cancelled = true }
  }, [])

  // Handle click-on-screen for bug location picking
  const handleScreenClick = useCallback((e: MouseEvent) => {
    // Ignore clicks on the bug reporter itself
    if (formRef.current?.contains(e.target as Node)) return

    e.preventDefault()
    e.stopPropagation()
    setClickPos({ x: Math.round(e.clientX), y: Math.round(e.clientY) })
    setPhase('form')

    // Remove listener after one pick
    document.removeEventListener('click', handleScreenClick, true)
    document.body.style.cursor = ''
  }, [])

  const startPicking = () => {
    setPhase('picking')
    document.body.style.cursor = 'crosshair'
    // Use capture phase to intercept clicks before anything else
    document.addEventListener('click', handleScreenClick, true)
  }

  const cancelPicking = useCallback(() => {
    document.removeEventListener('click', handleScreenClick, true)
    document.body.style.cursor = ''
    setPhase('form')
  }, [handleScreenClick])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('click', handleScreenClick, true)
      document.body.style.cursor = ''
    }
  }, [handleScreenClick])

  const handleSubmit = async () => {
    if (!description.trim()) return
    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('bug_reports').insert({
        user_id: user.id,
        page_url: pathname,
        description: description.trim(),
        click_x: clickPos?.x ?? null,
        click_y: clickPos?.y ?? null,
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
        user_agent: navigator.userAgent,
      })

      setPhase('submitted')
      setDescription('')
      setClickPos(null)

      // Auto-close after 2s
      setTimeout(() => setPhase('idle'), 2000)
    } catch (err) {
      console.error('Bug report failed:', err)
      alert('Kon bug report niet versturen. Probeer opnieuw.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (phase === 'picking') {
      document.removeEventListener('click', handleScreenClick, true)
      document.body.style.cursor = ''
    }
    setPhase('idle')
    setDescription('')
    setClickPos(null)
  }

  // Don't render until checked, or if not a test user
  if (!checked || !isTestUser) return null

  return (
    <>
      {/* Picking overlay hint */}
      {phase === 'picking' && (
        <div className="fixed inset-0 z-[9998] pointer-events-none">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto bg-[#1A1917] text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Klik waar de bug zich bevindt
            <button
              onClick={cancelPicking}
              className="ml-2 p-0.5 hover:bg-white/20 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Click marker on screen */}
      {clickPos && phase === 'form' && (
        <div
          className="fixed z-[9997] pointer-events-none"
          style={{ left: clickPos.x - 12, top: clickPos.y - 12 }}
        >
          <div className="w-6 h-6 rounded-full border-2 border-[#2563EB] bg-[#2563EB]/20 animate-pulse" />
        </div>
      )}

      {/* Main widget container */}
      <div ref={formRef} className="fixed bottom-24 right-4 z-[9999] lg:bottom-6">
        {/* Floating Action Button */}
        {phase === 'idle' && (
          <button
            onClick={() => setPhase('form')}
            className="w-10 h-10 rounded-full bg-[#2563EB] text-white shadow-lg hover:bg-[#1D4ED8] hover:scale-105 transition-all flex items-center justify-center"
            aria-label="Bug melden"
          >
            <Bug className="w-4.5 h-4.5" strokeWidth={1.8} />
          </button>
        )}

        {/* Success state */}
        {phase === 'submitted' && (
          <div className="bg-[#059669] text-white px-4 py-3 rounded-2xl shadow-lg flex items-center gap-2 text-sm font-medium animate-fade-in">
            <Check className="w-4 h-4" />
            Bedankt! Bug is gemeld.
          </div>
        )}

        {/* Form */}
        {phase === 'form' && (
          <div className="w-72 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#E8E4DD] overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#2563EB] text-white">
              <div className="flex items-center gap-2">
                <Bug className="w-4 h-4" />
                <span className="text-sm font-semibold">Bug melden</span>
              </div>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Auto-filled route */}
              <div>
                <label className="text-[10px] font-semibold text-[#999] uppercase tracking-wider">
                  Pagina
                </label>
                <p className="text-[13px] text-[#1A1917] font-mono bg-[#F5F3EF] px-2 py-1.5 rounded-lg mt-1 truncate">
                  {pathname}
                </p>
              </div>

              {/* Click position */}
              <div>
                <label className="text-[10px] font-semibold text-[#999] uppercase tracking-wider">
                  Locatie op scherm
                </label>
                {clickPos ? (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[12px] text-[#1A1917] bg-[#F5F3EF] px-2 py-1 rounded-lg font-mono">
                      {clickPos.x}, {clickPos.y}
                    </span>
                    <button
                      onClick={startPicking}
                      className="text-[11px] text-[#2563EB] font-medium hover:underline"
                    >
                      Opnieuw
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={startPicking}
                    className="flex items-center gap-1.5 mt-1 text-[12px] text-[#2563EB] font-medium hover:underline"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    Klik op het scherm
                  </button>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-semibold text-[#999] uppercase tracking-wider">
                  Beschrijving *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Wat ging er mis?"
                  rows={3}
                  className="w-full mt-1 px-3 py-2 text-[13px] bg-[#F5F3EF] border border-[#E8E4DD] rounded-xl text-[#1A1917] placeholder-[#C5C2BC] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white resize-none transition-colors"
                  autoFocus
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!description.trim() || submitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#2563EB] text-white rounded-xl text-[13px] font-semibold hover:bg-[#1D4ED8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Versturen
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </>
  )
}
