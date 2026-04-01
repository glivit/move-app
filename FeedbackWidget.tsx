'use client'

import { useState } from 'react'

/**
 * FeedbackWidget — Drop-in floating feedback button + modal
 *
 * Requirements:
 * - Supabase client: adjust the import to match your project
 * - A "feedback" table in Supabase with columns:
 *     id (uuid, default gen_random_uuid())
 *     user_id (uuid, references auth.users)
 *     content (text)
 *     type (text, default 'general')
 *     url (text, nullable)
 *     user_agent (text, nullable)
 *     created_at (timestamptz, default now())
 *
 * SQL to create the table:
 *
 *   CREATE TABLE IF NOT EXISTS public.feedback (
 *     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 *     content TEXT NOT NULL,
 *     type TEXT DEFAULT 'general',
 *     url TEXT,
 *     user_agent TEXT,
 *     created_at TIMESTAMPTZ DEFAULT NOW()
 *   );
 *   ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "Users can insert own feedback"
 *     ON public.feedback FOR INSERT
 *     WITH CHECK (auth.uid() = user_id);
 */

// ⚠️ Change this import to match your Supabase client
import { createClient } from '@/lib/supabase'

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedback.trim()) return

    setIsSubmitting(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        console.error('FeedbackWidget: user not authenticated')
        setIsSubmitting(false)
        return
      }

      const { error } = await supabase.from('feedback').insert({
        user_id: user.id,
        content: feedback.trim(),
        type: 'general',
        url: typeof window !== 'undefined' ? window.location.pathname : null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        created_at: new Date().toISOString(),
      })

      if (error) {
        console.error('FeedbackWidget:', error.message)
        return
      }

      setIsSubmitted(true)
      setFeedback('')

      setTimeout(() => {
        setIsOpen(false)
        setIsSubmitted(false)
      }, 2000)
    } catch (err) {
      console.error('FeedbackWidget:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Floating button — bottom right */}
      <button
        onClick={() => setIsOpen(true)}
        style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 40, padding: 14, borderRadius: '50%', background: '#D46A3A', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
        aria-label="Send feedback"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {/* Modal overlay */}
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setIsOpen(false)}>
          <div style={{ background: '#fff', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 420, padding: 24, boxShadow: '0 -4px 24px rgba(0,0,0,0.12)' }} onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: '#1A1917' }}>
                {isSubmitted ? 'Bedankt!' : 'Feedback sturen'}
              </h2>
              <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 8, color: '#6B6862' }} aria-label="Close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Success state */}
            {isSubmitted ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(61,139,92,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <svg width="24" height="24" viewBox="0 0 20 20" fill="#3D8B5C">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <p style={{ fontSize: 14, color: '#6B6862', margin: 0 }}>Je feedback is verzonden!</p>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit}>
                <p style={{ fontSize: 13, color: '#6B6862', margin: '0 0 12px' }}>
                  Bug gevonden of suggestie? Laat het ons weten.
                </p>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Beschrijf wat er mis ging..."
                  disabled={isSubmitting}
                  style={{ width: '100%', minHeight: 120, padding: '12px 14px', borderRadius: 10, border: '1px solid #E8E4DC', fontSize: 14, fontFamily: 'inherit', resize: 'none', outline: 'none', color: '#1A1917', background: '#FAFAF8', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  <span style={{ fontSize: 12, color: '#A09D96' }}>{feedback.length} tekens</span>
                  <button
                    type="submit"
                    disabled={!feedback.trim() || isSubmitting}
                    style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: !feedback.trim() || isSubmitting ? '#E8E4DC' : '#D46A3A', color: !feedback.trim() || isSubmitting ? '#A09D96' : '#fff', fontSize: 14, fontWeight: 500, cursor: !feedback.trim() || isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                    {isSubmitting ? 'Bezig...' : 'Sturen'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
