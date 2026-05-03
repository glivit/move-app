'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Code, X, Crosshair, Send, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase'

/**
 * DevFeedbackWidget — in-app element-picker feedback tool.
 *
 * Flow:
 *   1. ⚙ floating button bottom-right
 *   2. Tap → enters "pick mode" (cursor crosshair, dim overlay)
 *   3. Tap element → captures selector + bbox + computed styles
 *   4. Modal opens met comment + severity + category fields
 *   5. Submit → POST /api/dev-feedback → Supabase row
 *   6. Claude reads via scripts/feedback-inbox.ts
 *
 * Visibility: render alleen als NEXT_PUBLIC_DEV_FEEDBACK === 'true' OF user
 * heeft role coach/admin. Niet zichtbaar voor reguliere clients in productie.
 */

type Severity = 'blocker' | 'major' | 'minor' | 'nit'
type Category = 'visual' | 'interaction' | 'copy' | 'performance' | 'a11y' | 'other'

interface ElementCapture {
  selector: string
  html: string
  text: string
  bbox: { x: number; y: number; width: number; height: number }
  styles: Record<string, string>
}

function generateSelector(el: Element): string {
  // Build a CSS path: stops at #id of body. Max 5 levels deep.
  const path: string[] = []
  let node: Element | null = el
  let depth = 0
  while (node && node.nodeType === 1 && depth < 5) {
    if (node.id) {
      path.unshift(`#${node.id}`)
      break
    }
    let part = node.tagName.toLowerCase()
    const cls = (node.getAttribute('class') || '')
      .split(/\s+/)
      .filter(c => c && !c.match(/^(animate-|stagger-|transition-)/))
      .slice(0, 3)
      .join('.')
    if (cls) part += '.' + cls
    if (node.parentElement) {
      const sib = Array.from(node.parentElement.children).filter(
        (c) => c.tagName === node!.tagName,
      )
      if (sib.length > 1) {
        const idx = sib.indexOf(node) + 1
        part += `:nth-of-type(${idx})`
      }
    }
    path.unshift(part)
    node = node.parentElement
    depth++
  }
  return path.join(' > ')
}

function captureElement(el: Element): ElementCapture {
  const rect = el.getBoundingClientRect()
  const computed = window.getComputedStyle(el as HTMLElement)
  return {
    selector: generateSelector(el),
    html: ((el as HTMLElement).outerHTML || '').slice(0, 2000),
    text: ((el.textContent || '').trim()).slice(0, 200),
    bbox: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
    styles: {
      color: computed.color,
      backgroundColor: computed.backgroundColor,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      padding: computed.padding,
      borderRadius: computed.borderRadius,
      display: computed.display,
      position: computed.position,
    },
  }
}

export function DevFeedbackWidget() {
  const [enabled, setEnabled] = useState(false)
  const [pickMode, setPickMode] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [captured, setCaptured] = useState<ElementCapture | null>(null)
  const [hovered, setHovered] = useState<DOMRect | null>(null)
  const [comment, setComment] = useState('')
  const [severity, setSeverity] = useState<Severity>('minor')
  const [category, setCategory] = useState<Category | ''>('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Visibility — open voor elke geauthenticeerde user (clients incl.).
  // RLS op dev_feedback dwingt af dat enkel auth-users kunnen inserteren.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setEnabled(true)
    })
  }, [])

  // Pick-mode: capture click + ignore widget itself
  useEffect(() => {
    if (!pickMode) return
    document.body.style.cursor = 'crosshair'
    const onMove = (e: MouseEvent) => {
      const target = e.target as Element
      if (target.closest('[data-feedback-widget]')) {
        setHovered(null)
        return
      }
      setHovered(target.getBoundingClientRect())
    }
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element
      if (target.closest('[data-feedback-widget]')) return
      e.preventDefault()
      e.stopPropagation()
      setCaptured(captureElement(target))
      setPickMode(false)
      setModalOpen(true)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPickMode(false)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('click', onClick, { capture: true })
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.cursor = ''
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('click', onClick, { capture: true })
      document.removeEventListener('keydown', onKey)
    }
  }, [pickMode])

  const reset = useCallback(() => {
    setCaptured(null)
    setComment('')
    setSeverity('minor')
    setCategory('')
    setSubmitted(false)
    setModalOpen(false)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/dev-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: window.location.pathname + window.location.search,
          viewport_width: window.innerWidth,
          viewport_height: window.innerHeight,
          user_agent: navigator.userAgent,
          element: captured,
          comment: comment.trim(),
          severity,
          category: category || null,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setSubmitted(true)
      setTimeout(reset, 1500)
    } catch (err) {
      console.error('[DevFeedback] submit failed:', err)
      alert('Kon feedback niet verzenden — probeer opnieuw')
    } finally {
      setSubmitting(false)
    }
  }

  if (!enabled) return null

  return (
    <div data-feedback-widget>
      {/* Floating button — wit cirkeltje met </> */}
      {!pickMode && !modalOpen && (
        <button
          onClick={() => setPickMode(true)}
          aria-label="Feedback geven"
          title="Feedback (klik element op pagina)"
          style={{
            position: 'fixed',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)',
            right: 16,
            zIndex: 9999,
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: '#FFFFFF',
            color: '#1C1E18',
            border: '1px solid rgba(28,30,24,0.10)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 6px 18px rgba(28,30,24,0.18), 0 1px 2px rgba(28,30,24,0.06)',
            WebkitTapHighlightColor: 'transparent',
            transition: 'transform 180ms cubic-bezier(0.16,1,0.3,1)',
          }}
          onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)' }}
          onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          <Code size={18} strokeWidth={2} />
        </button>
      )}

      {/* Pick mode overlay */}
      {pickMode && (
        <div
          ref={overlayRef}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            pointerEvents: 'none',
            background: 'rgba(28,30,24,0.10)',
          }}
        >
          {/* Hover highlight */}
          {hovered && (
            <div
              style={{
                position: 'fixed',
                left: hovered.x,
                top: hovered.y,
                width: hovered.width,
                height: hovered.height,
                pointerEvents: 'none',
                border: '2px solid #C0FC01',
                background: 'rgba(192,252,1,0.10)',
                borderRadius: 4,
                transition: 'all 80ms ease-out',
                boxSizing: 'border-box',
              }}
            />
          )}

          {/* Hint banner */}
          <div
            style={{
              position: 'fixed',
              top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '10px 16px',
              background: 'rgba(28,30,24,0.92)',
              color: '#F2F2EC',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              pointerEvents: 'auto',
              boxShadow: '0 8px 22px rgba(0,0,0,0.20)',
            }}
          >
            <Crosshair size={14} />
            Tik op een element · Esc om te annuleren
            <button
              onClick={() => setPickMode(false)}
              style={{
                marginLeft: 8,
                background: 'transparent',
                border: 'none',
                color: 'rgba(242,242,236,0.62)',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
              }}
              aria-label="Annuleren"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(28,30,24,0.40)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) reset() }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 480,
              background: 'rgba(28,30,24,0.96)',
              backdropFilter: 'blur(20px)',
              color: '#F2F2EC',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: '20px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
              boxShadow: '0 -12px 40px rgba(0,0,0,0.30)',
              animation: 'slideUp 280ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', margin: '0 auto 12px',
                  background: 'rgba(192,252,1,0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Check size={24} color="#C0FC01" strokeWidth={2.4} />
                </div>
                <p style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>Bedankt — Claude pakt het op.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h3 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>Feedback geven</h3>
                  <button
                    type="button"
                    onClick={reset}
                    style={{
                      background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 999,
                      width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: 'rgba(242,242,236,0.65)',
                    }}
                    aria-label="Sluiten"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Element preview */}
                {captured && (
                  <div style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    marginBottom: 14,
                    fontSize: 12,
                    fontFamily: 'ui-monospace, monospace',
                    color: 'rgba(242,242,236,0.78)',
                    overflowX: 'auto',
                    whiteSpace: 'nowrap',
                  }}>
                    <div style={{ color: '#C0FC01', marginBottom: 4 }}>{captured.selector}</div>
                    {captured.text && (
                      <div style={{ color: 'rgba(242,242,236,0.55)' }}>"{captured.text.slice(0, 80)}{captured.text.length > 80 ? '…' : ''}"</div>
                    )}
                  </div>
                )}

                {/* Severity */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(242,242,236,0.55)', marginBottom: 6, display: 'block' }}>
                    Hoe erg?
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['blocker', 'major', 'minor', 'nit'] as Severity[]).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSeverity(s)}
                        style={{
                          flex: 1,
                          padding: '8px 4px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 500,
                          border: '1px solid',
                          borderColor: severity === s ? '#C0FC01' : 'rgba(255,255,255,0.10)',
                          background: severity === s ? 'rgba(192,252,1,0.14)' : 'rgba(255,255,255,0.04)',
                          color: severity === s ? '#C0FC01' : 'rgba(242,242,236,0.65)',
                          cursor: 'pointer',
                          textTransform: 'capitalize',
                          minHeight: 44,
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(242,242,236,0.55)', marginBottom: 6, display: 'block' }}>
                    Categorie (optioneel)
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(['visual', 'interaction', 'copy', 'performance', 'a11y', 'other'] as Category[]).map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCategory(category === c ? '' : c)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 500,
                          border: '1px solid',
                          borderColor: category === c ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.10)',
                          background: category === c ? 'rgba(255,255,255,0.10)' : 'transparent',
                          color: category === c ? '#F2F2EC' : 'rgba(242,242,236,0.55)',
                          cursor: 'pointer',
                          minHeight: 32,
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comment */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(242,242,236,0.55)', marginBottom: 6, display: 'block' }}>
                    Wat moet er anders?
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Bijv: 'Deze knop is wit-op-wit, nauwelijks zichtbaar'"
                    autoFocus
                    rows={3}
                    style={{
                      width: '100%',
                      padding: 12,
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#F2F2EC',
                      fontSize: 16,
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      minHeight: 80,
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={!comment.trim() || submitting}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    borderRadius: 14,
                    background: '#C0FC01',
                    color: '#0E1500',
                    fontSize: 14,
                    fontWeight: 600,
                    border: 'none',
                    cursor: comment.trim() && !submitting ? 'pointer' : 'not-allowed',
                    opacity: comment.trim() && !submitting ? 1 : 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    minHeight: 48,
                  }}
                >
                  {submitting ? 'Verzenden…' : <><Send size={14} /> Stuur naar Claude</>}
                </button>
              </form>
            )}

            <style jsx>{`
              @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
              }
            `}</style>
          </div>
        </div>
      )}
    </div>
  )
}
